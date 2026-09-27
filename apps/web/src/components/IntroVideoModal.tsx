import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  ChevronRight, 
  RotateCcw, 
  Maximize2, 
  Check, 
  Radio, 
  Zap,
  Download
} from 'lucide-react';

interface IntroVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterApp?: () => void;
}

export const IntroVideoModal: React.FC<IntroVideoModalProps> = ({
  isOpen,
  onClose,
  onEnterApp
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(true);
    setVideoError(false);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay policy might require mute
        setIsMuted(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [isOpen]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(curr);
    setDuration(dur);
    setProgress((curr / dur) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('laptopguard_skip_intro', 'true');
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
    if (onEnterApp) onEnterApp();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl text-white select-none overflow-hidden font-sans p-3 sm:p-6"
    >
      {/* CINEMATIC CYBER VIDEO CARD */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col justify-between rounded-3xl bg-slate-950/95 border border-cyan-500/40 shadow-[0_0_60px_rgba(0,242,254,0.25)] overflow-hidden">
        
        {/* TOP HUD HEADER */}
        <div className="relative z-30 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-cyan-500/20 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black tracking-wide text-white font-mono">
                  LAPTOPGUARD AI
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-400/30 font-mono">
                  OFFICIAL DEMO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans hidden sm:block">
                Powered by Google Flow AI Cinematic Engine
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleFinish}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <span>Skip to App</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CENTER VIDEO STAGE */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group">
          <video
            ref={videoRef}
            src="/laptopguard_flow_demo.mp4"
            poster="/flow_video_poster.jpg"
            className="w-full h-full object-contain cursor-pointer"
            playsInline
            autoPlay
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleFinish}
            onError={() => setVideoError(true)}
            onClick={togglePlay}
          />

          {/* Corner Cyber HUD Accents */}
          <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI NEURAL SENTINEL ACTIVE</span>
          </div>

          <div className="absolute top-3 right-3 pointer-events-none px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
            720p HD // 24 FPS
          </div>

          {/* Center Play Overlay Icon when paused */}
          {!isPlaying && (
            <div 
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center shadow-2xl shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all">
                <Play className="w-8 h-8 fill-slate-950 translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Video Error Fallback */}
          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
              <Zap className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
              <h3 className="text-base font-bold text-white mb-1">Video Stream Initializing</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                The demonstration video is loading from high-speed cache.
              </p>
              <button
                onClick={handleFinish}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold"
              >
                Proceed to App
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM VIDEO CONTROLS & TIMELINE */}
        <div className="relative z-30 px-4 sm:px-6 py-3 bg-slate-900/95 border-t border-cyan-500/20 backdrop-blur-md space-y-2.5">
          
          {/* Seekable Progress Bar */}
          <div 
            onClick={handleSeek}
            className="group/bar relative w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer hover:h-2.5 transition-all"
          >
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-75 shadow-[0_0_10px_#00F2FE]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-between gap-3 text-xs">
            {/* Play, Mute, Timestamps */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-cyan-300 transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-cyan-300" />}
              </button>

              <button
                onClick={toggleMute}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 transition-all cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
              </button>

              <span className="font-mono text-[11px] text-slate-300">
                {formatTime(currentTime)} <span className="text-slate-500">/ {formatTime(duration)}</span>
              </span>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-all cursor-pointer hidden sm:flex"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <a
                href="/laptopguard_flow_demo.mp4"
                download="LaptopGuard_AI_Flow_Demo.mp4"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-all cursor-pointer hidden sm:flex"
                title="Download MP4"
              >
                <Download className="w-4 h-4" />
              </a>

              <button
                onClick={handleFinish}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>ENTER APP</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer preference */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span>Don't show video on startup</span>
            </label>
            <span className="text-[10px] font-mono text-cyan-400/80">
              FLOW AI SCENE: D9DA0D5C
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
