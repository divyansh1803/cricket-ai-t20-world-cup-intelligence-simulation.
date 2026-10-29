import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, Flame, Star, Volume2 } from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { CountryFlag } from '../common/CricketIdentity';

interface Trophy3DViewerProps {
  championName: string;
  championCountryCode: string;
  winProbability: number;
}

export const Trophy3DViewer: React.FC<Trophy3DViewerProps> = ({
  championName,
  championCountryCode,
  winProbability,
}) => {
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isCelebrationActive, setIsCelebrationActive] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Smooth continuous auto-rotation
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 1.2) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const handleCelebrate = () => {
    setIsCelebrationActive(true);
    cricketAudio.playVictory();
    setTimeout(() => {
      setIsCelebrationActive(false);
    }, 3500);
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
      {/* Stadium Spotlight Beams */}
      <div className="absolute -top-12 inset-x-0 flex justify-center pointer-events-none">
        <div className="w-[500px] h-[300px] bg-gradient-to-b from-amber-400/20 via-amber-500/5 to-transparent blur-3xl rounded-full" />
      </div>

      {/* Confetti Sparks during celebration */}
      {isCelebrationActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400 animate-ping"
              style={{
                top: `${15 + Math.random() * 70}%`,
                left: `${15 + Math.random() * 70}%`,
                animationDuration: `${0.8 + Math.random() * 0.8}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 3D Trophy Stage */}
      <div
        className="relative h-60 w-60 sm:h-68 sm:w-68 flex items-center justify-center cursor-pointer group"
        onMouseEnter={() => setAutoRotate(false)}
        onMouseLeave={() => setAutoRotate(true)}
        onClick={handleCelebrate}
        title="Click for Champion Victory Fanfare!"
      >
        {/* Glow halo behind trophy */}
        <div className="absolute h-52 w-52 rounded-full bg-radial from-amber-400/30 via-amber-500/10 to-transparent blur-2xl animate-pulse" />

        {/* 3D Perspective Rotation SVG Trophy */}
        <div
          className="relative transition-transform duration-100 ease-out z-10"
          style={{
            transform: `perspective(600px) rotateY(${rotationAngle}deg)`,
          }}
        >
          <svg
            viewBox="0 0 240 280"
            className="w-48 h-56 sm:w-56 sm:h-64 drop-shadow-[0_15px_30px_rgba(245,158,11,0.5)]"
          >
            <defs>
              <linearGradient id="goldSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF2A3" />
                <stop offset="30%" stopColor="#F59E0B" />
                <stop offset="60%" stopColor="#D97706" />
                <stop offset="85%" stopColor="#FCD34D" />
                <stop offset="100%" stopColor="#78350F" />
              </linearGradient>

              <linearGradient id="silverSheen" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E2E8F0" />
                <stop offset="50%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#94A3B8" />
              </linearGradient>

              <radialGradient id="cupCenter" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="60%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#451A03" />
              </radialGradient>
            </defs>

            {/* Pedestal Base */}
            <path
              d="M 50 245 L 190 245 L 180 270 L 60 270 Z"
              fill="url(#goldSheen)"
              stroke="#B45309"
              strokeWidth="2"
            />
            <rect x="70" y="235" width="100" height="12" rx="3" fill="#1E293B" stroke="#D97706" strokeWidth="1.5" />

            {/* Stem & Column */}
            <path d="M 105 180 L 135 180 L 128 235 L 112 235 Z" fill="url(#silverSheen)" />
            <circle cx="120" cy="180" r="14" fill="url(#goldSheen)" />

            {/* Main Cup Body */}
            <path
              d="M 65 60 Q 65 170 120 175 Q 175 170 175 60 Z"
              fill="url(#cupCenter)"
              stroke="url(#goldSheen)"
              strokeWidth="4"
            />

            {/* Trophy Fluted Rim */}
            <ellipse cx="120" cy="60" rx="55" ry="12" fill="url(#goldSheen)" stroke="#FFF" strokeWidth="1.5" />

            {/* World Cup Cricket Ball on Crown */}
            <circle cx="120" cy="38" r="20" fill="url(#goldSheen)" stroke="#B45309" strokeWidth="2" />
            {/* Seam stitches */}
            <path d="M 102 38 Q 120 30 138 38" fill="none" stroke="#FFF" strokeWidth="2" strokeDasharray="3,2" />
            <path d="M 102 38 Q 120 46 138 38" fill="none" stroke="#FFF" strokeWidth="2" strokeDasharray="3,2" />

            {/* Curved Left Handle */}
            <path
              d="M 65 75 C 20 85 20 145 75 155 C 60 145 50 100 65 75 Z"
              fill="url(#goldSheen)"
              stroke="#B45309"
              strokeWidth="1.5"
            />

            {/* Curved Right Handle */}
            <path
              d="M 175 75 C 220 85 220 145 165 155 C 180 145 190 100 175 75 Z"
              fill="url(#goldSheen)"
              stroke="#B45309"
              strokeWidth="1.5"
            />

            {/* Gleaming Specular Star */}
            <polygon
              points="120,95 124,106 136,106 126,113 130,124 120,117 110,124 114,113 104,106 116,106"
              fill="#FFFFFF"
              className="animate-pulse"
            />
          </svg>
        </div>

        {/* Hover / Tap Hint */}
        <div className="absolute bottom-0 inset-x-0 flex justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="rounded-full bg-slate-900/90 border border-amber-500/40 px-3 py-1 text-[10px] font-mono font-bold text-amber-300 shadow-md">
            Tap to Celebrate!
          </span>
        </div>
      </div>

      {/* Engraved Plaque on Pedestal */}
      <div className="mt-2 space-y-1 z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-slate-900/90 px-4 py-1.5 shadow-xl">
          <CountryFlag countryCode={championCountryCode} size="sm" />
          <span className="text-sm font-black text-white tracking-wide">{championName.toUpperCase()}</span>
          <span className="text-xs font-mono font-black text-amber-400">({winProbability}%)</span>
        </div>
        <p className="text-[11px] font-mono text-slate-400">
          OFFICIAL 2026 ICC T20 WORLD CUP TROPHY PEDESTAL
        </p>
      </div>
    </div>
  );
};
