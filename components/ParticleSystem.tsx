import React, { useEffect, useRef } from 'react';

interface ParticleSystemProps {
  intensity: number; // 0 to 1
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ intensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const createParticle = () => {
      // Only create particles if intensity is high enough
      if (intensity < 0.2) return;
      
      const count = Math.floor(intensity * 5); // More intensity = more particles
      
      for (let i = 0; i < count; i++) {
        const x = canvas.width / 2;
        const y = canvas.height / 2 + 50; // Start from center-ish (animal position)
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + intensity * 10;
        
        // Colors based on intensity
        const colors = intensity > 0.8 
          ? ['#ef4444', '#f97316', '#fbbf24'] // Red/Orange for high rage
          : ['#60a5fa', '#a78bfa', '#ffffff']; // Blue/Purple for mid levels

        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          size: Math.random() * 5 + 2,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Spawn new particles
      createParticle();

      // Update existing
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.size *= 0.95; // Shrink
        
        // Gravity effect
        p.vy += 0.1;

        if (p.life <= 0) {
          particles.current.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [intensity]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-10 pointer-events-none"
    />
  );
};