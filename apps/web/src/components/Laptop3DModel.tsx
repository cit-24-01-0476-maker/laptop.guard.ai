import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, Maximize2, Laptop, ShieldCheck, Zap, Wifi, Eye } from 'lucide-react';
import { Device } from '../types';

interface Laptop3DModelProps {
  device?: Device | null;
  isArmed?: boolean;
}

export const Laptop3DModel: React.FC<Laptop3DModelProps> = ({ device, isArmed = true }) => {
  // 3D rotation state (degrees)
  const [rotX, setRotX] = useState<number>(14);
  const [rotY, setRotY] = useState<number>(-22);
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(true);
  const [lidAngle, setLidAngle] = useState<number>(112); // 112 degrees open, 0 is closed
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-spin animation loop
  useEffect(() => {
    let animId: number;
    const spin = () => {
      if (isAutoSpinning && !isDragging) {
        setRotY(prev => (prev + 0.5) % 360);
      }
      animId = requestAnimationFrame(spin);
    };
    animId = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(animId);
  }, [isAutoSpinning, isDragging]);

  // Mouse & Touch Drag Handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    lastPosRef.current = { x: clientX, y: clientY };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - lastPosRef.current.x;
    const deltaY = clientY - lastPosRef.current.y;
    lastPosRef.current = { x: clientX, y: clientY };

    setRotY(prev => prev + deltaX * 0.7);
    setRotX(prev => Math.max(-25, Math.min(50, prev - deltaY * 0.5)));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setRotX(14);
    setRotY(-22);
    setLidAngle(112);
    setIsAutoSpinning(true);
  };

  const toggleLid = () => {
    setLidAngle(prev => (prev > 30 ? 0 : 112));
  };

  const deviceName = device?.device_name || 'DELL G15 5530';
  const batteryPct = device?.battery ?? 85;
  const isCharging = device?.is_charging ?? true;
  const currentSsid = device?.current_ssid || (device as any)?.metadata?.wifi_ssid || "Oshadha's A56";
  const localIp = device?.ip_address || (device as any)?.metadata?.ip_address || '192.168.1.12';

  return (
    <div className="w-full flex flex-col items-center">
      {/* 3D Interactive Stage Container */}
      <div
        className="w-full relative select-none cursor-grab active:cursor-grabbing overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-[#0B1222] to-slate-950 border border-slate-800 shadow-2xl flex flex-col items-center justify-center"
        style={{ minHeight: '340px', height: '360px', perspective: '1100px' }}
        onMouseDown={e => handlePointerDown(e.clientX, e.clientY)}
        onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={e => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handlePointerUp}
      >
        {/* Subtle Ambient Background Grid & Neon Aura */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Real Hardware Model Badge (Dell G15 5530) */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 shadow-lg">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-400 text-black font-black text-[11px] flex items-center justify-center shadow-xs">
            G
          </div>
          <div>
            <span className="text-[11px] font-black text-white tracking-wide block leading-tight">DELL G15 5530</span>
            <span className="text-[9px] text-cyan-400 font-mono block leading-tight">Dark Shadow Gray • Gaming Edition</span>
          </div>
        </div>

        {/* Controls Overlay (Auto-spin & Lid toggle) */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              toggleLid();
            }}
            className="p-2 rounded-xl bg-black/70 backdrop-blur-md hover:bg-black/90 text-cyan-300 border border-white/10 shadow-sm transition-all cursor-pointer text-[10px] font-bold flex items-center gap-1"
            title="Open or Close Laptop Lid"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lidAngle > 30 ? 'Close Lid' : 'Open Lid'}</span>
          </button>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsAutoSpinning(!isAutoSpinning);
            }}
            className={`p-2 rounded-xl backdrop-blur-md border border-white/10 shadow-sm transition-all cursor-pointer ${
              isAutoSpinning ? 'bg-blue-600 text-white' : 'bg-black/70 text-slate-400 hover:text-white'
            }`}
            title="Toggle 360° Auto Rotation"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAutoSpinning ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              resetView();
            }}
            className="p-2 rounded-xl bg-black/70 backdrop-blur-md hover:bg-black/90 text-slate-300 border border-white/10 shadow-sm transition-all cursor-pointer"
            title="Reset 3D Perspective"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3D LAPTOP WORLD ROOT */}
        <div
          className="relative transition-transform duration-75 ease-out select-none pointer-events-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`
          }}
        >
          {/* Ambient Liquid Shadow underneath Laptop */}
          <div
            className="absolute rounded-full filter blur-xl transition-all duration-300 pointer-events-none"
            style={{
              width: '280px',
              height: '190px',
              left: '-140px',
              top: '-30px',
              transform: 'rotateX(90deg) translateZ(-40px)',
              background: isArmed
                ? 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.45) 0%, rgba(16, 185, 129, 0) 70%)'
                : 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0) 70%)'
            }}
          />

          {/* ======================================================== */}
          {/* 1. LAPTOP BASE / KEYBOARD CHASSIS (DELL G15 GEOMETRY)    */}
          {/* ======================================================== */}
          <div
            className="relative"
            style={{
              width: '240px',
              height: '160px',
              transformStyle: 'preserve-3d',
              transform: 'translate(-50%, -50%)',
              position: 'absolute'
            }}
          >
            {/* Top Keyboard Deck Face */}
            <div
              className="absolute inset-0 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col justify-between p-2.5 overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #1E232E, #141720 70%, #0F1219)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 20px 40px rgba(0,0,0,0.8)'
              }}
            >
              {/* Distinctive Dell G15 Rear Thermal Exhaust Shelf */}
              <div className="w-full flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[7px] font-black text-orange-400 font-mono tracking-widest uppercase">G-SERIES 5530</span>
                </div>
                {/* Honeycomb venting dots */}
                <div className="flex gap-0.5 opacity-60">
                  <div className="w-1 h-1 rounded-full bg-slate-600" />
                  <div className="w-1 h-1 rounded-full bg-slate-600" />
                  <div className="w-1 h-1 rounded-full bg-slate-600" />
                  <div className="w-1 h-1 rounded-full bg-slate-600" />
                </div>
                {/* Power button */}
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                  <div className={`w-1 h-1 rounded-full ${isArmed ? 'bg-emerald-400' : 'bg-orange-500'} shadow-xs`} />
                </div>
              </div>

              {/* Chiclet Keyboard Simulation with Coral/Cyan Backlight */}
              <div className="w-full my-auto rounded-lg bg-slate-950/70 p-1.5 border border-slate-800/80 shadow-inner">
                {/* Key rows with Dell G15 WASD highlighted style */}
                <div className="grid grid-cols-12 gap-0.5 mb-0.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-1.5 rounded-[1.5px] bg-slate-800/90 shadow-[0_0_2px_rgba(56,189,248,0.3)]" />
                  ))}
                </div>
                <div className="grid grid-cols-12 gap-0.5 mb-0.5">
                  <div className="col-span-2 h-2 rounded-[2px] bg-slate-800" />
                  {/* WASD Gaming Cluster Highlight */}
                  <div className="h-2 rounded-[2px] bg-orange-600/90 shadow-[0_0_4px_rgba(249,115,22,0.6)]" />
                  <div className="h-2 rounded-[2px] bg-orange-600/90 shadow-[0_0_4px_rgba(249,115,22,0.6)]" />
                  <div className="h-2 rounded-[2px] bg-orange-600/90 shadow-[0_0_4px_rgba(249,115,22,0.6)]" />
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-2 rounded-[2px] bg-slate-800/90 shadow-[0_0_2px_rgba(56,189,248,0.3)]" />
                  ))}
                </div>
                <div className="grid grid-cols-12 gap-0.5 mb-0.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-2 rounded-[2px] bg-slate-800/90 shadow-[0_0_2px_rgba(56,189,248,0.3)]" />
                  ))}
                </div>
                <div className="grid grid-cols-12 gap-0.5">
                  <div className="col-span-3 h-2 rounded-[2px] bg-slate-800" />
                  <div className="col-span-6 h-2 rounded-[2px] bg-cyan-900/60 border border-cyan-500/30 shadow-[0_0_6px_rgba(6,182,212,0.5)]" />
                  <div className="col-span-3 h-2 rounded-[2px] bg-slate-800" />
                </div>
              </div>

              {/* Precision Trackpad & Intel Core Badge */}
              <div className="w-full flex items-center justify-between pt-0.5">
                <div className="w-4 h-3 rounded-[2px] bg-gradient-to-br from-blue-700 to-indigo-900 border border-blue-400/40 text-[5px] font-bold text-white flex items-center justify-center font-mono">
                  intel
                </div>
                {/* Centered Trackpad */}
                <div className="w-16 h-8 rounded-lg bg-slate-900/90 border border-slate-700/60 shadow-inner" />
                <div className="w-4 h-3 rounded-[2px] bg-gradient-to-br from-emerald-800 to-green-950 border border-emerald-400/40 text-[5px] font-bold text-emerald-300 flex items-center justify-center font-mono">
                  RTX
                </div>
              </div>
            </div>

            {/* Base Thickness & Side Ports */}
            <div
              className="absolute inset-0 rounded-2xl bg-[#0F1219] border border-slate-900"
              style={{ transform: 'translateZ(-8px)' }}
            />
            {/* Orange G-logo on side vent */}
            <div
              className="absolute left-[-2px] top-6 w-1 h-4 bg-orange-500 rounded-sm shadow-[0_0_8px_rgba(249,115,22,0.8)]"
              style={{ transform: 'rotateY(-90deg)' }}
            />

            {/* ======================================================== */}
            {/* 2. LAPTOP SCREEN LID (HINGED AT REAR OF BASE)           */}
            {/* ======================================================== */}
            <div
              className="absolute left-0 right-0 top-0 transition-transform duration-500 ease-out"
              style={{
                height: '155px',
                transformOrigin: 'top center',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${-lidAngle}deg)`
              }}
            >
              {/* INNER DISPLAY FACE (Front View) */}
              <div
                className="absolute inset-0 rounded-2xl bg-black border-2 border-slate-700/90 shadow-2xl p-2 flex flex-col justify-between overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  background: 'linear-gradient(160deg, #020617, #070e1d)'
                }}
              >
                {/* Top Bezel with Hardware Webcam Lens */}
                <div className="w-full flex items-center justify-between px-2 pt-0.5">
                  <div className="text-[7px] text-slate-500 font-mono font-bold tracking-wider">120Hz FHD</div>
                  {/* Real WebCam lens with active LED */}
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                    <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center shadow-xs">
                      <div className="w-1 h-1 rounded-full bg-cyan-400" />
                    </div>
                  </div>
                  <div className="text-[7px] text-emerald-400 font-mono font-bold tracking-wider">720p HD</div>
                </div>

                {/* Display Screen: Live LaptopGuard AI HUD */}
                <div className="w-full flex-1 my-1 rounded-xl bg-gradient-to-br from-slate-950 via-[#030d22] to-[#010613] border border-cyan-500/30 p-2 flex flex-col justify-between relative overflow-hidden shadow-inner">
                  {/* Glowing cyber grid pattern on screen */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(rgba(6,182,212,0.4) 1px, transparent 1px)',
                      backgroundSize: '12px 12px'
                    }}
                  />

                  {/* HUD Header on Screen */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-md bg-blue-600 flex items-center justify-center shadow-xs">
                        <ShieldCheck className="w-2 h-2 text-white" />
                      </div>
                      <span className="text-[8px] font-black text-white tracking-wider">LAPTOPGUARD AI</span>
                    </div>
                    <span className={`px-1 py-0.2 rounded text-[7px] font-bold ${isArmed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700 text-slate-300'}`}>
                      {isArmed ? 'ARMED' : 'STANDBY'}
                    </span>
                  </div>

                  {/* Center Sentinel Target Visual */}
                  <div className="flex flex-col items-center justify-center my-auto z-10">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className={`absolute inset-0 rounded-full border border-dashed animate-spin ${isArmed ? 'border-emerald-500/60' : 'border-blue-500/60'}`} style={{ animationDuration: '8s' }} />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isArmed ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-blue-500/20 text-blue-300'}`}>
                        <Laptop className="w-4 h-4" />
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-slate-200 mt-1">{deviceName}</span>
                  </div>

                  {/* Bottom Telemetry Footer on Screen */}
                  <div className="flex items-center justify-between text-[7px] text-slate-400 z-10 font-mono pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      <Zap className="w-2 h-2 text-amber-400" />
                      <span>{batteryPct}%</span>
                    </div>
                    <div className="flex items-center gap-1 truncate max-w-[80px]">
                      <Wifi className="w-2 h-2 text-blue-400" />
                      <span className="truncate">{currentSsid}</span>
                    </div>
                    <span>{localIp}</span>
                  </div>
                </div>

                {/* Bottom Bezel with Chrome Dell Logo */}
                <div className="w-full flex items-center justify-center py-0.5">
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-400/80 flex items-center justify-center bg-slate-900 shadow-xs">
                    <span className="text-[6px] font-black text-slate-300 font-serif italic tracking-tighter">DELL</span>
                  </div>
                </div>
              </div>

              {/* OUTER LID REAR FACE (Dell Logo & G15 Geometric Lines) */}
              <div
                className="absolute inset-0 rounded-2xl border-2 border-slate-700/80 p-4 flex flex-col items-center justify-center shadow-2xl"
                style={{
                  transform: 'rotateY(180deg)',
                  backfaceVisibility: 'hidden',
                  background: 'linear-gradient(135deg, #2A303C, #181D26 60%, #10141C)',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 20px 40px rgba(0,0,0,0.85)'
                }}
              >
                {/* Signature Dell G15 Faceted Triangular Ridges */}
                <div className="absolute inset-x-6 top-3 h-[1px] bg-gradient-to-r from-transparent via-slate-500/40 to-transparent" />
                <div className="absolute inset-x-10 bottom-3 h-[1px] bg-gradient-to-r from-transparent via-slate-500/40 to-transparent" />

                {/* Iconic Dell Chrome Circle Badge */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-slate-400 border border-white/80 p-[1.5px] shadow-lg flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#181D26] flex items-center justify-center border border-black/40">
                    <span className="text-sm font-black text-slate-200 font-serif italic tracking-tighter drop-shadow-sm">DELL</span>
                  </div>
                </div>

                {/* Bottom Corner Orange 'G' Badge */}
                <div className="absolute bottom-2 right-2.5 flex items-center gap-1">
                  <span className="text-[7px] font-black text-orange-500 font-mono">G15</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Interaction Tip Pill */}
        <div className="absolute bottom-3 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-xl text-[9px] font-mono text-slate-300 border border-white/10 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>👆 Drag to inspect in 360° • Touch-enabled</span>
          </div>

          <div className="bg-black/75 backdrop-blur-md px-2 py-1 rounded-xl text-[9px] font-mono text-emerald-400 border border-white/10 shadow-sm">
            {lidAngle > 30 ? 'Lid: Open (112°)' : 'Lid: Closed'}
          </div>
        </div>
      </div>

      {/* Hardware Specifications Information Grid */}
      <div className="w-full mt-3 p-3.5 rounded-3xl bg-white/80 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shadow-xs">
              G15
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Dell G15 5530 Gaming Sentinel</h4>
              <span className="text-[10px] text-slate-500 font-mono">Serial: 6YZ9BX3 • x64 Architecture</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
            AUTHENTIC
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2.5 text-[11px]">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[9px] text-slate-400 block font-medium">Chassis & Finish</span>
            <span className="font-bold text-slate-800">Dark Shadow Gray</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[9px] text-slate-400 block font-medium">Display Bezel</span>
            <span className="font-bold text-slate-800">15.6" FHD 120Hz Anti-Glare</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[9px] text-slate-400 block font-medium">Active Wi-Fi Link</span>
            <span className="font-bold text-slate-800 truncate block" title={currentSsid}>{currentSsid}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[9px] text-slate-400 block font-medium">Win32 Power Loop</span>
            <span className="font-bold text-emerald-600">{isCharging ? 'AC Powered (500ms Watchdog)' : 'Battery Mode'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
