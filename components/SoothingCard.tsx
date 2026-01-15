import React from 'react';
import { MESSAGES } from '../types';

interface SoothingCardProps {
  isVisible: boolean;
  type: 'WARNING' | 'EXPLOSION';
  onDismiss?: () => void;
}

export const SoothingCard: React.FC<SoothingCardProps> = ({ isVisible, type }) => {
  if (!isVisible) return null;

  const content = type === 'EXPLOSION' ? MESSAGES.EXPLOSION : MESSAGES.WARNING;
  
  // Use a warm, calming background transition instead of harsh solid colors.
  // We use a gradient from a warm hue to the dark stone base.
  const containerClass = type === 'EXPLOSION' 
    ? 'bg-gradient-to-b from-orange-900/90 to-stone-950/95 border-orange-400/30' 
    : 'bg-gradient-to-b from-teal-900/90 to-stone-950/95 border-teal-400/30';

  const icon = type === 'EXPLOSION' ? '☕️' : '🤫';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
      <div className={`w-full max-w-sm rounded-3xl backdrop-blur-2xl border shadow-2xl overflow-hidden p-8 text-center transition-all duration-700 ${containerClass}`}>
        
        {/* Gentle pulsing 'breathe' animation for the icon */}
        <div className="mb-6 text-7xl animate-breathe inline-block">
          {icon}
        </div>
        
        <h2 className="text-2xl font-bold mb-4 text-white leading-relaxed tracking-wide">
          {content.main}
        </h2>
        
        <p className="text-white/80 text-lg font-medium">
          {content.sub}
        </p>

        {/* Progress bar visual to suggest cooling down */}
        <div className="mt-8 h-1 w-full bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-white/80 animate-[width_4s_linear] w-full origin-left shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
        </div>
      </div>
    </div>
  );
};