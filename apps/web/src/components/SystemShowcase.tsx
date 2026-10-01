import { useState } from 'react';
import { Activity, Camera, ChevronRight, Crosshair, Fingerprint, Lock, MapPin, Monitor, ShieldCheck, Smartphone, Wifi } from 'lucide-react';
import './SystemShowcase.css';

export function SystemShowcase() {
  const [view, setView] = useState<'windows' | 'mobile'>('windows');
  return (
    <div className="lg-showcase" id="system">
      <div className="lg-showcase-grid" aria-hidden="true" />
      <div className="lg-showcase-top"><span><i /> SECURITY ECOSYSTEM</span><span className="lg-demo">UI PREVIEW</span></div>
      <div className="lg-platforms" aria-label="Preview platform">
        <button onClick={() => setView('windows')} aria-pressed={view === 'windows'}><Monitor size={14} /> Windows Sentinel</button>
        <button onClick={() => setView('mobile')} aria-pressed={view === 'mobile'}><Smartphone size={14} /> Mobile Controller</button>
      </div>
      <div className={`lg-device-stage lg-focus-${view}`}>
        <div className="lg-desktop" hidden={view !== 'windows'}>
          <div className="lg-windowbar"><span className="lg-windowdots"><i /><i /><i /></span><span>LAPTOPGUARD / SENTINEL</span><Lock size={10} /></div>
          <div className="lg-desktop-body">
            <aside className="lg-sidebar"><ShieldCheck size={20} /><Monitor size={15} /><Activity size={15} /><Camera size={15} /><MapPin size={15} /></aside>
            <div className="lg-console">
              <div className="lg-console-heading"><div><small>DEVICE OVERVIEW</small><h3>Command center</h3></div><span className="lg-status"><i /> ARMED</span></div>
              <div className="lg-radar"><div className="lg-radar-sweep" /><div className="lg-shield"><ShieldCheck size={38} /></div><span className="lg-radar-dot" /><span className="lg-radar-caption">PERIMETER PROTECTED</span></div>
              <div className="lg-console-metrics"><div><Activity size={13} /><strong>500<span>ms</span></strong><small>Watchdog</small></div><div><Wifi size={13} /><strong>Secure</strong><small>Owner channel</small></div><div><Lock size={13} /><strong>Ready</strong><small>Remote lock</small></div></div>
              <div className="lg-event"><span className="lg-event-icon"><ShieldCheck size={12} /></span><span>Protection enabled<small>Illustrative security event</small></span><span className="lg-bars"><i /><i /><i /><i /><i /></span></div>
            </div>
          </div>
          <div className="lg-desktop-bottom"><span><i /> SENTINEL ACTIVE</span><span>ENCRYPTED ACCESS</span></div>
        </div>
        <div className="lg-phone" hidden={view !== 'mobile'}>
          <div className="lg-phone-camera" />
          <div className="lg-phone-top"><span>9:41</span><Wifi size={10} /></div>
          <div className="lg-phone-title"><ShieldCheck size={17} /><span>LaptopGuard<small>MOBILE CONTROLLER</small></span></div>
          <div className="lg-phone-device"><div className="lg-phone-device-icon"><Monitor size={21} /></div><strong>My Windows PC</strong><span className="lg-phone-status"><i /> Protected</span></div>
          <div className="lg-phone-map"><div className="lg-map-road" /><Crosshair size={23} /><span>DEVICE LOCATION</span><small>Preview map</small></div>
          <div className="lg-phone-actions"><div><Camera size={15} /><span>Camera</span></div><div><Monitor size={15} /><span>Screen</span></div></div>
          <div className="lg-phone-lock"><Lock size={12} /> Remote lock <ChevronRight size={12} /></div>
          <div className="lg-phone-footer"><Fingerprint size={13} /><span>OWNER ACCESS ONLY</span></div>
          <div className="lg-phone-home" />
        </div>
      </div>
      <div className="lg-showcase-foot"><span><i /> TWO DEVICES. ONE OWNER.</span><span>Windows + Android</span></div>
    </div>
  );
}
