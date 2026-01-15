import React, { useState, useCallback, useRef } from 'react';
import { audioService } from './services/audioService';
import { CrackOverlay } from './components/CrackOverlay';
import { SoothingCard } from './components/SoothingCard';
import { HistoryLog } from './components/HistoryLog';
import { AppState, LogEntry, THRESHOLDS } from './types';

const COOLDOWN_MS = 4000;

// Deterministic mapping based on DB levels
const getSpiritAnimal = (db: number) => {
  if (db < 40) return { emoji: '🐇', name: '乖巧白兔', desc: '岁月静好' };
  if (db < 60) return { emoji: '🐱', name: '慵懒猫咪', desc: '温柔低语' };
  if (db < 70) return { emoji: '🦆', name: '嘎嘎鸭', desc: '喋喋不休' };
  if (db < 80) return { emoji: '🐕', name: '修勾', desc: '大声喧哗' };
  if (db < 90) return { emoji: '🦍', name: '银背猩猩', desc: '情绪激动' };
  if (db < 100) return { emoji: '🐯', name: '东北虎', desc: '震慑全场' };
  return { emoji: '🦁', name: '河东狮', desc: '毁灭性打击' };
};

export default function App() {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [db, setDb] = useState(30);
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [soothingType, setSoothingType] = useState<'WARNING' | 'EXPLOSION' | null>(null);
  
  // Refs for logic that shouldn't trigger re-renders or needs immediate access
  const lastTriggerTimeRef = useRef<number>(0);
  const maxDbRef = useRef<number>(30); 

  // Visual Intensity (0 - 1) derived from dB
  const intensity = Math.max(0, Math.min(1, (db - 30) / (THRESHOLDS.MAX - 30)));
  
  // Determine if we should shake the screen
  const shakeClass = db > THRESHOLDS.EXPLOSION ? 'animate-shake-hard' : (db > THRESHOLDS.PEACEFUL ? 'animate-shake-light' : '');

  // Current displayed animal
  const currentAnimal = getSpiritAnimal(db);

  // Main Audio Processing Logic
  const handleDecibelUpdate = useCallback((currentDb: number) => {
    setDb(currentDb);
    maxDbRef.current = Math.max(maxDbRef.current, currentDb);

    const now = Date.now();
    const isCoolingDown = now - lastTriggerTimeRef.current < COOLDOWN_MS;
    
    if (currentDb > 85 && !isCoolingDown) {
      // Trigger Event
      lastTriggerTimeRef.current = now;
      
      const isExplosion = currentDb > THRESHOLDS.EXPLOSION;
      const type = isExplosion ? 'EXPLOSION' : 'WARNING';
      
      // Calculate the animal state at this exact moment for the log
      const logAnimal = getSpiritAnimal(currentDb);
      
      // Update State for UI
      setSoothingType(type);

      // Add to Log with animal info
      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: now,
        db: currentDb,
        type: type,
        message: isExplosion ? '情绪爆发' : '音量预警',
        animal: logAnimal.name,
        animalEmoji: logAnimal.emoji
      };
      setHistory(prev => [...prev, newLog]);

      // Physical Feedback
      if (navigator.vibrate) {
        navigator.vibrate(isExplosion ? [200, 100, 200, 100, 500] : [200]);
      }
      
      // Audio Feedback (Crack sound)
      if (currentDb > 90) {
        audioService.playCrackSound();
      }

      // Auto dismiss modal after cooldown
      setTimeout(() => {
        setSoothingType(null);
      }, COOLDOWN_MS);
    }
  }, []);

  const startApp = async () => {
    try {
      await audioService.startListening(handleDecibelUpdate);
      setState(AppState.LISTENING);
    } catch (e) {
      console.error(e);
      setState(AppState.ERROR);
    }
  };

  const getBackgroundColor = () => {
    if (soothingType === 'EXPLOSION') return 'bg-orange-900'; 
    if (soothingType === 'WARNING') return 'bg-indigo-900';
    
    if (db < THRESHOLDS.PEACEFUL) return 'bg-slate-900';
    if (db < THRESHOLDS.EXPLOSION) return 'bg-purple-900';
    return 'bg-red-950';
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden transition-colors duration-700 ease-in-out ${getBackgroundColor()} ${shakeClass}`}>
      
      {/* 1. Visual Effects Layer */}
      <CrackOverlay intensity={intensity} />

      {/* 2. Main Content */}
      <div className="relative z-30 flex flex-col h-full">
        
        {/* Header / Meter Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          
          {state === AppState.IDLE && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
              <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-400">
                河东狮吼<br/>灭火器
              </h1>
              <p className="text-gray-400">检测分贝 · 形象映射 · 情绪守护</p>
              <button 
                onClick={startApp}
                className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform active:scale-95"
              >
                开启守护
              </button>
            </div>
          )}

          {state === AppState.LISTENING && (
            <div className="text-center relative flex flex-col items-center w-full">
              
              {/* Animal Avatar Display */}
              <div className="mb-8 relative group transition-all duration-300">
                {/* Pulse ring representing sound energy */}
                <div 
                   className="absolute inset-0 rounded-full bg-white/10 blur-2xl transition-all duration-75"
                   style={{ 
                     transform: `scale(${1 + intensity * 0.8})`, 
                     opacity: 0.3 + intensity * 0.7 
                   }}
                />
                
                {/* Animal Emoji */}
                <div 
                   className="text-[9rem] md:text-[11rem] transition-transform duration-100 ease-out select-none relative z-10 drop-shadow-[0_0_25px_rgba(0,0,0,0.6)]"
                   style={{ transform: `scale(${1 + intensity * 0.2})` }}
                >
                   {currentAnimal.emoji}
                </div>
                
                {/* Animal Label */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-bold text-white tracking-widest drop-shadow-md">
                      {currentAnimal.name}
                    </span>
                    <span className="text-xs font-medium text-white/60 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm mt-1">
                      {currentAnimal.desc}
                    </span>
                  </div>
                </div>
              </div>

               {/* DB Display */}
              <div className="relative mt-8">
                <span className={`text-6xl font-black font-mono tracking-tighter transition-colors duration-100 ${db > 90 ? 'text-red-500' : 'text-white'}`}>
                  {db}
                </span>
                <span className="text-xl font-bold text-gray-500 ml-2">dB</span>
              </div>

            </div>
          )}

          {state === AppState.ERROR && (
             <div className="text-center text-red-400 p-4 border border-red-500/50 rounded-lg bg-red-950/50">
               <p>无法访问麦克风。</p>
               <p className="text-sm mt-2">请刷新页面并允许权限。</p>
             </div>
          )}
        </div>

        {/* Bottom History Log (Sticky) */}
        {state === AppState.LISTENING && (
           <div className="w-full max-w-md mx-auto">
             <HistoryLog logs={history} />
           </div>
        )}
      </div>

      {/* 3. Modal Layer */}
      <SoothingCard 
        isVisible={!!soothingType} 
        type={soothingType || 'WARNING'} 
      />

    </div>
  );
}