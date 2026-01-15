import React from 'react';

interface CrackOverlayProps {
  intensity: number; // 0 to 1
}

export const CrackOverlay: React.FC<CrackOverlayProps> = ({ intensity }) => {
  // Pre-defined chaotic paths to simulate glass breaking
  // We use multiple paths and toggle their visibility/opacity based on intensity
  const cracks = [
    // Center spiderweb
    "M50,50 L20,20 M50,50 L80,20 M50,50 L80,80 M50,50 L20,80", 
    // Random jagged lines
    "M10,40 L30,50 L20,70",
    "M90,30 L70,40 L80,60",
    "M30,10 L40,30 L60,10",
    "M40,90 L50,70 L60,90",
    // Long fractures
    "M0,0 L35,35",
    "M100,0 L65,35",
    "M0,100 L35,65",
    "M100,100 L65,65"
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        {cracks.map((d, i) => {
           // Show more cracks as intensity increases. 
           // Intensity 0.3 -> show first 30% of cracks, etc.
           const isVisible = i / cracks.length < intensity;
           const opacity = isVisible ? Math.min(1, intensity * 1.5) : 0;
           
           return (
             <path
               key={i}
               d={d}
               stroke="rgba(255, 255, 255, 0.6)"
               strokeWidth={0.5 + intensity} // Thicker lines for louder sounds
               fill="none"
               style={{
                 opacity: opacity,
                 transition: 'opacity 0.1s linear, stroke-width 0.1s linear',
                 vectorEffect: "non-scaling-stroke"
               }}
             />
           );
        })}
        {/* Full screen tint when very high intensity */}
        <rect 
            x="0" y="0" width="100" height="100" 
            fill="red" 
            className="transition-opacity duration-75"
            style={{ opacity: intensity > 0.8 ? (intensity - 0.8) * 0.5 : 0 }} 
        />
      </svg>
    </div>
  );
};