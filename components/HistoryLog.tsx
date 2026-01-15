import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';

interface HistoryLogProps {
  logs: LogEntry[];
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-full h-48 bg-black/30 rounded-t-3xl backdrop-blur-sm border-t border-white/10 p-4 overflow-hidden flex flex-col">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
        暴躁记录仪
      </h3>
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
        {logs.length === 0 ? (
          <p className="text-gray-600 text-sm text-center mt-8 italic">暂无记录 - 保持平静</p>
        ) : (
          logs.map((log) => (
            <div 
              key={log.id} 
              className={`flex items-center justify-between p-3 rounded-xl text-sm ${
                log.type === 'EXPLOSION' ? 'bg-red-500/20 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-300 font-mono text-xs">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' })}
                </span>
                <span className="text-lg" title={log.animal}>
                  {log.animalEmoji}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                 <span className={`font-bold ${log.type === 'EXPLOSION' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {log.db} dB
                </span>
                <span className="text-xs text-gray-400 bg-black/40 px-2 py-1 rounded hidden sm:inline-block">
                  {log.animal}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};