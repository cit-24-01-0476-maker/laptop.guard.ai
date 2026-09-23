import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string | boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  subtitle = 'Sovereign Hardware Protection',
  className = '',
  onClick
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-11 h-11 sm:w-12 sm:h-12',
    xl: 'w-14 h-14 sm:w-16 sm:h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl'
  };

  const aiPillSizes = {
    sm: 'text-[9px] px-1 py-0.2',
    md: 'text-[10px] sm:text-[11px] px-1.5 py-0.5',
    lg: 'text-xs px-2 py-0.5',
    xl: 'text-sm px-2.5 py-1'
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 sm:gap-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {/* Next-Gen Cyber-Shield Brand Icon */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]}`}>
        {/* Ambient Neon Cyan Aura */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl filter blur-sm opacity-50 group-hover:opacity-80 transition-opacity" />
        
        {/* Core Shield Vector */}
        <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-slate-950 via-[#0B1E48] to-[#030E26] p-1.5 flex items-center justify-center border border-cyan-400/80 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
            {/* Outer Shield Outline */}
            <path
              d="M12 2L20 5.5C20 13.5 16.5 19 12 21.5C7.5 19 4 13.5 4 5.5L12 2Z"
              stroke="url(#brandGrad)"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Inner Shield Fill */}
            <path
              d="M12 4L18 6.5C18 12.5 15.5 16.5 12 18.8C8.5 16.5 6 12.5 6 6.5L12 4Z"
              fill="url(#innerGrad)"
              opacity="0.85"
            />
            {/* Center AI Core Radar Node */}
            <circle cx="12" cy="11.5" r="3.2" fill="#00F2FE" />
            <circle cx="12" cy="11.5" r="1.5" fill="#FFFFFF" />
            <path d="M12 6.5V8.5M12 14.5V16.5M7 11.5H9M15 11.5H17" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
            <defs>
              <linearGradient id="brandGrad" x1="4" y1="2" x2="20" y2="21.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00F2FE" />
                <stop offset="0.5" stopColor="#38BDF8" />
                <stop offset="1" stopColor="#8B5CF6" />
              </linearGradient>
              <linearGradient id="innerGrad" x1="6" y1="4" x2="18" y2="18.8" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0284C7" />
                <stop offset="1" stopColor="#0B1E48" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Hardware Watchdog Online Pulse Beacon */}
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 shadow-sm shadow-emerald-400 animate-ping" />
        </div>
      </div>

      {/* Brand Name Typography */}
      <div>
        <div className="flex items-center gap-1.5 leading-tight">
          <span className={`font-black tracking-tight text-slate-900 font-sans ${textSizes[size]}`}>
            LaptopGuard
          </span>
          <span className={`font-mono font-black rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs shadow-blue-500/30 ${aiPillSizes[size]}`}>
            AI
          </span>
        </div>
        {subtitle && typeof subtitle === 'string' && (
          <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold hidden sm:block mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
