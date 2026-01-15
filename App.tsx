import React, { useState, useCallback, useRef, useMemo } from 'react';
import { audioService } from './services/audioService';
import { CrackOverlay } from './components/CrackOverlay';
import { SoothingCard } from './components/SoothingCard';
import { HistoryLog } from './components/HistoryLog';
import { ParticleSystem } from './components/ParticleSystem';
import { AppState, LogEntry, THRESHOLDS } from './types';

const COOLDOWN_MS = 4000;

// Funny/Witty quotes for each level to add personality
const ANIMAL_QUOTES = {
  rabbit: ["是在修仙吗？🤫", "保持这个节奏...", "嘘...老板在看"],
  cat: ["刚好，适合摸鱼 🐟", "这就对了喵", "岁月静好"],
  duck: ["听取哇声一片 🦆", "稍微有点大声哦", "嘎嘎嘎！"],
  dog: ["谁把音箱打开了？🔊", "有点吵了汪！", "警觉起来了"],
  gorilla: ["返祖现象严重 🦍", "这是要变身了吗？", "情绪正在加载..."],
  tiger: ["百兽之王申请出战 🔥", "气场两米八！", "嗷呜！！！"],
  lion: ["嗓子眼通大海？🌊", "毁灭吧赶紧的！", "输出全靠吼！！"]
};

// Deterministic mapping based on DB levels
const getSpiritAnimal = (db: number) => {
  if (db < 40) return { emoji: '🐇', name: '乖巧白兔', desc: '岁月静好', quotes: ANIMAL_QUOTES.rabbit };
  if (db < 60) return { emoji: '🐱', name: '慵懒猫咪', desc: '温柔低语', quotes: ANIMAL_QUOTES.cat };
  if (db < 70) return { emoji: '🦆', name: '嘎嘎鸭', desc: '喋喋不休', quotes: ANIMAL_QUOTES.duck };
  if (db < 80) return { emoji: '🐕', name: '修勾', desc: '大声喧哗', quotes: ANIMAL_QUOTES.dog };
  if (db < 90) return { emoji: '🦍', name: '银背猩猩', desc: '情绪激动', quotes: ANIMAL_QUOTES.gorilla };
  if (db < 100) return { emoji: '🐯', name: '东北虎', desc: '震慑全场', quotes: ANIMAL_QUOTES.tiger };
  return { emoji: '🦁', name: '河东狮', desc: '毁灭性打击', quotes: ANIMAL_QUOTES.lion };
};

export default function App() {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [db, setDb] = useState(30);
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [soothingType, setSoothingType] = useState<'WARNING' | 'EXPLOSION' | null>(null);
  
  // State for the funny quote bubble
  const [currentQuote, setCurrentQuote] = useState("");
  const lastQuoteTimeRef = useRef(0);
  
  // Refs for logic that shouldn't trigger re-renders or needs immediate access
  const lastTriggerTimeRef = useRef<number>(0);
  const maxDbRef = useRef<number>(30); 

  // Visual Intensity (0 - 1) derived from dB
  const intensity = Math.max(0, Math.min(1, (db - 30) / (THRESHOLDS.MAX - 30)));
  
  // Determine if we should shake the screen
  const shakeClass = db > THRESHOLDS.EXPLOSION ? 'animate-shake-hard' : (db > THRESHOLDS.PEACEFUL ? 'animate-shake-light' : '');

  // Current displayed animal
  const currentAnimal = useMemo(() => getSpiritAnimal(db), [db]);

  // Main Audio Processing Logic
  const handleDecibelUpdate = useCallback((currentDb: number) => {
    setDb(currentDb);
    maxDbRef.current = Math.max(maxDbRef.current, currentDb);

    const now = Date.now();
    const isCoolingDown = now - lastTriggerTimeRef.current < COOLDOWN_MS;

    // Logic to update the funny quote occasionally (every 2.5s)
    if (now - lastQuoteTimeRef.current > 2500) {
       const animalData = getSpiritAnimal(currentDb);
       const randomQuote = animalData.quotes[Math.floor(Math.random() * animalData.quotes.length)];
       setCurrentQuote(randomQuote);
       lastQuoteTimeRef.current = now;
    }
    
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
    if (soothingType === 'EXPLOSION') return 'bg-orange-950'; 
    if (soothingType === 'WARNING') return 'bg-indigo-950';
    
    if (db < THRESHOLDS.PEACEFUL) return 'bg-slate-900';
    if (db < THRESHOLDS.EXPLOSION) return 'bg-purple-950';
    return 'bg-red-950';
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden transition-colors duration-300 ease-out ${getBackgroundColor()} ${shakeClass}`}>
      
      {/* 1. Visual Effects Layer */}
      <CrackOverlay intensity={intensity} />
      {state === AppState.LISTENING && <ParticleSystem intensity={intensity} />}

      {/* 2. Main Content */}
      <div className="relative z-30 flex flex-col h-full">
        
        {/* Header / Meter Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 pb-20">
          
          {state === AppState.IDLE && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500 z-40">
              <div className="relative inline-block">
                 <span className="text-7xl absolute -top-8 -left-8 animate-bounce delay-100">🦁</span>
                 <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-orange-500 to-red-600 drop-shadow-lg">
                  河东狮吼<br/>灭火器
                </h1>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-xs mx-auto">
                 <p className="text-gray-200 text-lg font-medium">释放你的压力</p>
                 <p className="text-gray-400 text-sm mt-1">看看你心里住着哪只猛兽</p>
              </div>

              <button 
                onClick={startApp}
                className="group relative px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full font-bold text-xl shadow-[0_0_30px_rgba(234,88,12,0.5)] hover:scale-105 transition-all active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 skew-x-12 -ml-4 w-full"></div>
                <span className="relative flex items-center gap-2">
                   🎙️ 开始吼叫检测
                </span>
              </button>
            </div>
          )}

          {state === AppState.LISTENING && (
            <div className="text-center relative flex flex-col items-center w-full">
              
              {/* Fun Quote Bubble */}
              <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-64 transition-all duration-300 ${db > 50 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                 <div className="bg-white text-slate-900 px-4 py-3 rounded-2xl rounded-bl-none shadow-[0_0_15px_rgba(255,255,255,0.3)] font-bold text-lg relative animate-in zoom-in slide-in-from-bottom-2">
                    {currentQuote}
                    <div className="absolute -bottom-2 left-0 w-4 h-4 bg-white clip-polygon-corner"></div>
                 </div>
              </div>

              {/* Animal Avatar Display */}
              <div className="relative group transition-all duration-100 mb-4" style={{ transform: `scale(${1 + intensity * 0.15})` }}>
                {/* Pulse ring representing sound energy */}
                <div 
                   className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/30 to-purple-600/30 blur-3xl transition-all duration-75"
                   style={{ 
                     opacity: 0.3 + intensity * 0.7,
                     transform: `scale(${1 + intensity})`
                   }}
                />
                
                {/* Animal Emoji */}
                <div 
                   className="text-[10rem] md:text-[13rem] transition-all duration-150 ease-out select-none relative z-10 drop-shadow-[0_10px_35px_rgba(0,0,0,0.5)] filter"
                   style={{ 
                     transform: `rotate(${Math.sin(Date.now() / 100) * intensity * 10}deg)` // Jiggle effect
                   }}
                >
                   {currentAnimal.emoji}
                </div>
              </div>

              {/* Info Pill */}
              <div className="flex flex-col items-center gap-2 z-20">
                 <div className="bg-black/30 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full flex items-center gap-3">
                    <span className="text-2xl font-bold text-white tracking-widest">
                      {currentAnimal.name}
                    </span>
                    <div className="w-px h-4 bg-white/20"></div>
                    <span className="text-sm font-medium text-white/70">
                      {currentAnimal.desc}
                    </span>
                 </div>

                 {/* DB Display */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className={`text-7xl font-black font-mono tracking-tighter tabular-nums transition-colors duration-100 ${db > 90 ? 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]' : 'text-white/90'}`}>
                    {db}
                  </span>
                  <span className="text-xl font-bold text-white/40">dB</span>
                </div>
              </div>

            </div>
          )}

          {state === AppState.ERROR && (
             <div className="text-center text-red-400 p-6 border-2 border-dashed border-red-500/50 rounded-2xl bg-red-950/50 max-w-xs">
               <div className="text-4xl mb-4">🎤🚫</div>
               <p className="font-bold text-lg">无法听到你的声音</p>
               <p className="text-sm mt-2 opacity-80">请允许麦克风权限，让我们开始咆哮吧！</p>
             </div>
          )}
        </div>

        {/* Bottom History Log (Sticky) */}
        {state === AppState.LISTENING && (
           <div className="w-full max-w-md mx-auto z-40 relative">
             <HistoryLog logs={history} />
           </div>
        )}
      </div>

      {/* 3. Modal Layer */}
      <SoothingCard 
        isVisible={!!soothingType} 
        type={soothingType || 'WARNING'} 
      />
      
      {/* CSS Helper for the bubble tail */}
      <style>{`
        .clip-polygon-corner {
          clip-path: polygon(0 0, 100% 0, 100% 100%);
        }
      `}</style>

    </div>
  );
}