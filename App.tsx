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
  const startTimeRef = useRef<number>(0);

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
      startTimeRef.current = Date.now();
      maxDbRef.current = 30; // Reset max db
      setHistory([]); // Reset history
      await audioService.startListening(handleDecibelUpdate);
      setState(AppState.LISTENING);
    } catch (e) {
      console.error(e);
      setState(AppState.ERROR);
    }
  };

  const stopApp = () => {
    audioService.stop();
    setState(AppState.SUMMARY);
  };

  const restartApp = () => {
    setState(AppState.IDLE);
    setDb(30);
    setSoothingType(null);
  };

  const getBackgroundColor = () => {
    if (state === AppState.SUMMARY) return 'bg-slate-900';
    if (soothingType === 'EXPLOSION') return 'bg-orange-950'; 
    if (soothingType === 'WARNING') return 'bg-indigo-950';
    
    if (db < THRESHOLDS.PEACEFUL) return 'bg-slate-900';
    if (db < THRESHOLDS.EXPLOSION) return 'bg-purple-950';
    return 'bg-red-950';
  };

  // Summary Calculation Logic
  const getSummaryData = () => {
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const timeString = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
    
    const explosionCount = history.filter(h => h.type === 'EXPLOSION').length;
    const warningCount = history.filter(h => h.type === 'WARNING').length;
    
    let advice = "";
    let title = "";
    
    if (explosionCount > 5) {
      title = "🔥 情绪过山车";
      advice = "今天的你承受了太多压力。虽然发泄出来了，但现在的你一定很累吧？记得给自己一个大大的拥抱，喝杯热茶，今晚早点休息。";
    } else if (explosionCount > 0 || warningCount > 3) {
      title = "🌊 些许波澜";
      advice = "生活总有不如意，适度的宣泄是有益身心健康的。你控制得很棒，现在试着深呼吸三次，让心跳慢下来。";
    } else {
      title = "🕊️ 内心平和大师";
      advice = "太强了！在如此嘈杂的世界中，你依然保持着内心的宁静。这种情绪稳定性简直就是超能力，继续保持这份从容吧！";
    }

    return { timeString, explosionCount, warningCount, title, advice, maxDb: maxDbRef.current };
  };

  const summary = state === AppState.SUMMARY ? getSummaryData() : null;

  return (
    <div className={`relative w-full h-screen overflow-hidden transition-colors duration-300 ease-out ${getBackgroundColor()} ${shakeClass}`}>
      
      {/* 1. Visual Effects Layer */}
      {state === AppState.LISTENING && <CrackOverlay intensity={intensity} />}
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
            <div className="text-center relative flex flex-col items-center w-full h-full justify-center">
              
              {/* Fun Quote Bubble */}
              <div className={`absolute top-10 sm:top-20 left-1/2 -translate-x-1/2 w-64 transition-all duration-300 ${db > 50 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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
              
              {/* Stop Button */}
              <button 
                onClick={stopApp}
                className="absolute top-4 right-4 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-full p-4 backdrop-blur-md border border-red-500/30 transition-all active:scale-95 group z-50"
                title="结束记录"
              >
                <div className="w-4 h-4 bg-red-400 rounded-sm group-hover:bg-red-200 transition-colors"></div>
              </button>

            </div>
          )}

          {state === AppState.SUMMARY && summary && (
            <div className="w-full max-w-sm mx-auto animate-in slide-in-from-bottom-10 fade-in duration-500">
              <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                
                {/* Decorative blob */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl"></div>

                <div className="relative z-10 text-center">
                  <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
                    {summary.title}
                  </h2>
                  <p className="text-gray-400 text-sm mb-8">本次情绪记录报告</p>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-black/20 p-3 rounded-2xl">
                       <div className="text-2xl font-mono font-bold text-white">{summary.timeString}</div>
                       <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">记录时长</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-2xl">
                       <div className="text-2xl font-mono font-bold text-red-400">{summary.maxDb}</div>
                       <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">最高分贝</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-2xl">
                       <div className="text-2xl font-mono font-bold text-orange-400">{summary.explosionCount}</div>
                       <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">情绪爆发</div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-5 rounded-2xl text-left border-l-4 border-purple-400 mb-8">
                    <p className="text-gray-200 leading-relaxed text-sm">
                      “{summary.advice}”
                    </p>
                  </div>

                  <button 
                    onClick={restartApp}
                    className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors active:scale-95 shadow-lg"
                  >
                    再次开启 🕊️
                  </button>
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