import { Capacitor } from '@capacitor/core';

type MessageHandler = (data: any) => void;

class RealtimeHubService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: any = null;
  private isConnected = false;
  private userId = 'usr_owner_demo';

  public connect(userId: string = 'usr_owner_demo') {
    if (this.ws) {
      if (this.userId === userId && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }

    this.userId = userId;
    let wsUrl: string;
    if (import.meta.env.VITE_WS_URL) {
      const base = import.meta.env.VITE_WS_URL.replace(/\/$/, '');
      const wsPath = base.endsWith('/ws') ? base : `${base}/ws`;
      wsUrl = `${wsPath}/client/${userId}`;
    } else if (Capacitor.isNativePlatform()) {
      wsUrl = `wss://laptopguard-api.onrender.com/ws/client/${userId}`;
    } else if (typeof window !== 'undefined') {
      const isDevPort = window.location.port === '3000';
      if ((isDevPort || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !Capacitor.isNativePlatform()) {
        wsUrl = `ws://${window.location.hostname}:8000/ws/client/${userId}`;
      } else {
        wsUrl = `wss://laptopguard-api.onrender.com/ws/client/${userId}`;
      }
    } else {
      wsUrl = `wss://laptopguard-api.onrender.com/ws/client/${userId}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyHandlers({ type: 'WS_CONNECTED', isConnected: true });
        // Heartbeat ping
        setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyHandlers(data);
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyHandlers({ type: 'WS_DISCONNECTED', isConnected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.isConnected = false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.userId);
    }, 4000);
  }

  public subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyHandlers(data: any) {
    this.handlers.forEach((h) => h(data));
  }

  public sendSignal(deviceId: string, signal: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'WEBRTC_SIGNAL',
        device_id: deviceId,
        signal
      }));
    }
  }
}

export const realtimeHub = new RealtimeHubService();
