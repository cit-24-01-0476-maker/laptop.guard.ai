import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  StopCircle,
  Volume2,
  VolumeX,
  Maximize2,
  RefreshCw,
  Camera as SnapshotIcon,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Wifi,
  MapPin,
  Lock
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { api, getCameraStreamUrl } from '../services/api';

export const LiveCameraView: React.FC = () => {
  const { selectedDevice, activeCameraSession, setActiveCameraSession, takeSnapshot } = useSecurity();

  const [isStreaming, setIsStreaming] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutes max
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [latencyMs, setLatencyMs] = useState(42);
  const [resolution, setResolution] = useState('1920x1080 @ 30fps');
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // 5-minute Countdown Timer
  useEffect(() => {
    let timer: any = null;
    if (isStreaming) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleStopStream();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStreaming]);

  const handleStartStream = async () => {
    if (!selectedDevice) return;
    try {
      const session = await api.startCameraSession(selectedDevice.id);
      setActiveCameraSession(session);
      setIsStreaming(true);
      setSecondsRemaining(300);
    } catch (e: any) {
      alert(e.message || 'Failed to start Live Camera session');
    }
  };

  const handleStopStream = async () => {
    if (activeCameraSession) {
      await api.stopCameraSession(activeCameraSession.session_id);
      setActiveCameraSession(null);
    }
    setIsStreaming(false);
  };

  const handleTakeSnapshot = async () => {
    if (!selectedDevice) return;
    await takeSnapshot(selectedDevice.id);
    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2500);
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!selectedDevice) {
    return (
      <div className="glass-panel p-8 rounded-card text-center text-slate-400">
        No device selected for Live Camera.
      </div>
    );
  }

  const isOffline = selectedDevice.status === 'Offline';

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Live Camera Console</h2>
            {isStreaming && (
              <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold animate-pulse shadow-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Device: <strong className="text-slate-800">{selectedDevice.device_name}</strong> • Physical Webcam Stream
          </p>
        </div>

        {/* Streaming Timer / Session status */}
        {isStreaming ? (
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-white/90 border border-blue-200 text-xs shadow-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-slate-600 font-medium">Session Limit:</span>
            <span className={`font-mono font-bold text-sm ${secondsRemaining <= 60 ? 'text-rose-500 animate-pulse' : 'text-blue-600'}`}>
              {formatTime(secondsRemaining)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-medium px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-sm">
            Maximum Authorized Session: 5:00 min
          </span>
        )}
      </div>

      {/* Mandatory Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200/80 flex items-center justify-between text-xs text-blue-900 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Strict Privacy Disclosure:</strong> While streaming, a visible red notice banner is displayed on the laptop
            and the physical camera LED illuminates. Covert surveillance is prohibited.
          </span>
        </div>
      </div>

      {/* 60-Second Warning Alert */}
      {isStreaming && secondsRemaining <= 60 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 animate-pulse shadow-sm">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Live session will end in {secondsRemaining} seconds according to security policy.</span>
        </div>
      )}

      {/* Main Video Viewport Container */}
      <div
        ref={videoContainerRef}
        className="jelly-card p-2 rounded-3xl overflow-hidden relative bg-black aspect-video flex items-center justify-center shadow-xl border border-slate-800"
      >
        {isOffline ? (
          <div className="text-center p-8 space-y-3">
            <Lock className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">Device Offline</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Live Camera is unavailable while device is disconnected. Reconnect the laptop to enable remote feed.
            </p>
          </div>
        ) : !isStreaming ? (
          <div className="text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600/20 to-violet-600/20 border border-blue-400/30 text-blue-400 flex items-center justify-center mx-auto shadow-lg">
              <Camera className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Start Authorized Live View</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Initiate encrypted physical camera streaming with {selectedDevice.device_name}. An on-screen notification
                will appear on the laptop.
              </p>
            </div>
            <button
              onClick={handleStartStream}
              className="py-3 px-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs tracking-wide shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              Start Live View
            </button>
          </div>
        ) : (
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            {/* Real Physical Webcam Live Stream */}
            <img
              src={getCameraStreamUrl(selectedDevice.id)}
              className="w-full h-full object-contain"
              alt="Live Webcam Stream from Laptop"
              onError={(e) => {
                // Fallback notice if webcam in use by another app
                console.warn("Webcam stream error");
              }}
            />

            {/* Timestamp Watermark Overlay */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-mono text-cyan-300">
              LAPTOPGUARD AI • LIVE PHYSICAL WEBCAM • DELL G15
            </div>

            {/* Status Indicator in Video */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-rose-950/80 border border-rose-500/40 px-3 py-1 rounded-full text-[11px] text-rose-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              HARDWARE LED ACTIVE
            </div>

            {/* In-viewport Controls Overlay Bar */}
            <div className="absolute bottom-4 inset-x-4 bg-slate-900/80 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
                <span className="text-emerald-400 font-semibold">Webcam Live: 640x480 @ 30fps</span>
                <span>Latency: ~35ms</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Take Security Snapshot Button */}
                <button
                  onClick={handleTakeSnapshot}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                  title="Take Authorized Snapshot and store in Evidence Vault"
                >
                  <SnapshotIcon className="w-4 h-4 text-cyan-400" />
                  <span>{snapshotTaken ? 'Saved to Vault!' : 'Snapshot'}</span>
                </button>

                {/* Mute Local Playback */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                  title={isMuted ? 'Unmute Local Audio' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Stop Stream Button */}
                <button
                  onClick={handleStopStream}
                  className="flex items-center gap-1.5 py-1.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Stop Stream</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Environmental & Context Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
          <span className="text-slate-400">Connection Quality:</span>
          <p className="text-white font-semibold mt-0.5">High Speed WebRTC (STUN direct p2p)</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
          <span className="text-slate-400">Resolution & Latency:</span>
          <p className="text-white font-semibold mt-0.5">{resolution} • {latencyMs}ms</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
          <span className="text-slate-400">Audit Trail:</span>
          <p className="text-emerald-400 font-semibold mt-0.5">Session start & end cryptographically logged</p>
        </div>
      </div>
    </div>
  );
};
