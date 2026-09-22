import os
import sys
import json
import threading
import time
from pathlib import Path
from typing import Callable, Optional
import customtkinter as ctk
import requests

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

CONFIG_DIR = Path.home() / ".laptopguard"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
SESSION_FILE = CONFIG_DIR / "session.json"
try:
    from config import BACKEND_HTTP_URL
    BACKEND_URL = BACKEND_HTTP_URL
except Exception:
    BACKEND_URL = os.getenv("LAPTOPGUARD_API_URL", "https://laptopguard-api.onrender.com/api/v1")

class ModernAgentGUI:
    def __init__(
        self,
        on_arm: Callable,
        on_disarm: Callable,
        on_test_alarm: Callable,
        on_test_motion: Callable,
        on_stop_alarm: Optional[Callable] = None,
        on_lock_device: Optional[Callable] = None,
        on_authenticated: Optional[Callable] = None,
        device_name: str = "Dell G15 5530"
    ):
        self.on_arm = on_arm
        self.on_disarm = on_disarm
        self.on_test_alarm = on_test_alarm
        self.on_test_motion = on_test_motion
        self.on_stop_alarm = on_stop_alarm
        self.on_lock_device = on_lock_device
        self.on_authenticated = on_authenticated
        self.device_name = device_name
        
        self.root: Optional[ctk.CTk] = None
        self.is_armed = True
        self.battery_pct = 99
        self.is_charging = True
        self.current_ssid = "Connected"
        self.cloud_connected = True

        # Auth state
        self.user_token = None
        self.user_email = None
        self.user_name = None
        self._load_session()

        # UI elements
        self.big_power_btn = None
        self.power_sublabel = None
        self.status_badge = None
        self.battery_label = None
        self.battery_progress = None
        self.ac_status_label = None
        self.cloud_badge = None
        self.events_box = None
        self.user_label = None
        self.main_container = None
        self.login_container = None

    def _load_session(self):
        if SESSION_FILE.exists():
            try:
                with open(SESSION_FILE, "r") as f:
                    data = json.load(f)
                    self.user_token = data.get("access_token")
                    self.user_email = data.get("email")
                    self.user_name = data.get("full_name")
            except Exception:
                pass

    def _save_session(self, token: str, email: str, full_name: str):
        self.user_token = token
        self.user_email = email
        self.user_name = full_name
        try:
            with open(SESSION_FILE, "w") as f:
                json.dump({
                    "access_token": token,
                    "email": email,
                    "full_name": full_name
                }, f)
        except Exception:
            pass

    def _clear_session(self):
        self.user_token = None
        self.user_email = None
        self.user_name = None
        if SESSION_FILE.exists():
            try:
                SESSION_FILE.unlink()
            except Exception:
                pass

    def start_gui(self):
        self.root = ctk.CTk()
        self.root.title("LaptopGuard AI - Windows Hardware Sentinel v1.4.2")
        self.root.geometry("880x680")
        self.root.minsize(800, 600)

        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        # 1. Top Glass Header Bar
        header = ctk.CTkFrame(self.root, height=70, corner_radius=0, fg_color=("#E2E8F0", "#0B1120"))
        header.pack(fill="x", padx=0, pady=0)

        title_frame = ctk.CTkFrame(header, fg_color="transparent")
        title_frame.pack(side="left", padx=20, pady=12)

        title = ctk.CTkLabel(
            title_frame,
            text="🛡️ LaptopGuard AI",
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color=("#1E293B", "#38BDF8")
        )
        title.pack(anchor="w")

        subtitle = ctk.CTkLabel(
            title_frame,
            text=f"{self.device_name} • Hardware Sentinel & Anti-Theft Protection",
            font=ctk.CTkFont(size=11),
            text_color=("#64748B", "#94A3B8")
        )
        subtitle.pack(anchor="w")

        # Right Header User Profile & Cloud Badge
        header_right = ctk.CTkFrame(header, fg_color="transparent")
        header_right.pack(side="right", padx=20, pady=15)

        self.user_label = ctk.CTkLabel(
            header_right,
            text=f"👤 {self.user_email}" if self.user_email else "○ Not Signed In",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color="#94A3B8"
        )
        self.user_label.pack(side="left", padx=10)

        self.cloud_badge = ctk.CTkLabel(
            header_right,
            text="● CLOUD ACTIVE",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color="#10B981",
            fg_color=("#DCFCE7", "#064E3B"),
            corner_radius=8,
            padx=10,
            pady=4
        )
        self.cloud_badge.pack(side="left", padx=8)

        # 2. Main Body Container
        self.body = ctk.CTkFrame(self.root, fg_color="transparent")
        self.body.pack(fill="both", expand=True, padx=20, pady=15)

        # Check if user is logged in
        if self.user_token and self.user_email:
            self._render_dashboard()
        else:
            self._render_login_screen()

        self.root.mainloop()

    def _on_close(self):
        if self.root:
            self.root.destroy()
            sys.exit(0)

    # -------------------------------------------------------------
    # LOGIN & REGISTRATION VIEW
    # -------------------------------------------------------------
    def _render_login_screen(self):
        for widget in self.body.winfo_children():
            widget.destroy()

        login_card = ctk.CTkFrame(self.body, corner_radius=24, fg_color=("#F8FAFC", "#111827"), border_width=1, border_color="#1E293B")
        login_card.pack(expand=True, padx=40, pady=30, fill="both")

        ctk.CTkLabel(
            login_card,
            text="🔐 Link Laptop to Your Account",
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color=("#0F172A", "#FFFFFF")
        ).pack(pady=(35, 6))

        ctk.CTkLabel(
            login_card,
            text="Sign in or register to bind this Dell laptop to your private Cloud Guard fleet.",
            font=ctk.CTkFont(size=12),
            text_color="#94A3B8"
        ).pack(pady=(0, 25))

        form_frame = ctk.CTkFrame(login_card, fg_color="transparent", width=420)
        form_frame.pack()

        # Email Input
        ctk.CTkLabel(form_frame, text="Email Address", font=ctk.CTkFont(size=12, weight="bold")).pack(anchor="w", pady=(0, 4))
        email_entry = ctk.CTkEntry(form_frame, placeholder_text="e.g. user@gmail.com", width=400, height=42, corner_radius=12)
        email_entry.pack(pady=(0, 15))
        if getattr(self, "user_email", None):
            email_entry.insert(0, self.user_email)

        # Password Input
        ctk.CTkLabel(form_frame, text="Master Password", font=ctk.CTkFont(size=12, weight="bold")).pack(anchor="w", pady=(0, 4))
        password_entry = ctk.CTkEntry(form_frame, placeholder_text="Enter your password", show="*", width=400, height=42, corner_radius=12)
        password_entry.pack(pady=(0, 20))

        status_msg = ctk.CTkLabel(form_frame, text="", font=ctk.CTkFont(size=11, weight="bold"), text_color="#EF4444")
        status_msg.pack(pady=(0, 10))

        # Sign In Action
        def do_login(is_register=False):
            email = email_entry.get().strip().lower()
            pw = password_entry.get().strip()
            if not email or not pw:
                status_msg.configure(text="Please enter email and password.")
                return

            status_msg.configure(text="Connecting to cloud...", text_color="#38BDF8")
            
            def auth_worker():
                try:
                    endpoint = f"{BACKEND_URL}/auth/register" if is_register else f"{BACKEND_URL}/auth/login"
                    payload = {"email": email, "password": pw, "full_name": email.split("@")[0].title()} if is_register else {"email": email, "password": pw}
                    
                    res = requests.post(endpoint, json=payload, timeout=5)
                    if res.status_code == 200:
                        data = res.json()
                        token = data.get("access_token")
                        user = data.get("user", {})
                        self._save_session(token, user.get("email", email), user.get("full_name", email.split("@")[0]))
                        
                        # Auto-claim device
                        try:
                            headers = {"Authorization": f"Bearer {token}"}
                            claim_payload = {
                                "device_id": "dev_oska_xps15",
                                "device_name": getattr(self, "device_name", "Dell G15 Sentinel"),
                                "battery": getattr(self, "battery_pct", 100),
                                "is_charging": getattr(self, "is_charging", True)
                            }
                            requests.post(f"{BACKEND_URL}/devices/claim-or-register", json=claim_payload, headers=headers, timeout=5)
                        except Exception:
                            pass

                        if self.on_authenticated:
                            self.on_authenticated(user.get("id"), token)

                        self.root.after(0, self._render_dashboard)
                    else:
                        err_detail = res.json().get("detail", "Authentication failed.")
                        self.root.after(0, lambda: status_msg.configure(text=str(err_detail), text_color="#EF4444"))
                except Exception as ex:
                    self.root.after(0, lambda: status_msg.configure(text=f"Connection error: {ex}", text_color="#EF4444"))

            threading.Thread(target=auth_worker, daemon=True).start()

        btn_row = ctk.CTkFrame(form_frame, fg_color="transparent")
        btn_row.pack(fill="x", pady=5)

        login_btn = ctk.CTkButton(
            btn_row,
            text="Sign In & Link PC",
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color="#2563EB",
            hover_color="#1D4ED8",
            height=44,
            corner_radius=12,
            command=lambda: do_login(False)
        )
        login_btn.pack(side="left", fill="x", expand=True, padx=(0, 6))

        reg_btn = ctk.CTkButton(
            btn_row,
            text="Create New Account",
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color="#334155",
            hover_color="#475569",
            height=44,
            corner_radius=12,
            command=lambda: do_login(True)
        )
        reg_btn.pack(side="right", fill="x", expand=True, padx=(6, 0))

    # -------------------------------------------------------------
    # MAIN DASHBOARD VIEW WITH GIANT ON/OFF BUTTON
    # -------------------------------------------------------------
    def _render_dashboard(self):
        for widget in self.body.winfo_children():
            widget.destroy()

        if self.user_label:
            self.user_label.configure(text=f"👤 {self.user_email}")

        # Top Account Bar & Sign Out
        acc_bar = ctk.CTkFrame(self.body, fg_color="transparent")
        acc_bar.pack(fill="x", pady=(0, 10))

        ctk.CTkLabel(
            acc_bar,
            text=f"✅ Bound to Account: {self.user_email}",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color="#10B981"
        ).pack(side="left")

        signout_btn = ctk.CTkButton(
            acc_bar,
            text="Switch Account",
            width=110,
            height=26,
            corner_radius=8,
            font=ctk.CTkFont(size=11),
            fg_color="#334155",
            hover_color="#475569",
            command=self._handle_signout
        )
        signout_btn.pack(side="right")

        # Tabview
        tabview = ctk.CTkTabview(self.body, corner_radius=18)
        tabview.pack(fill="both", expand=True)

        tab_overview = tabview.add("Overview & Shield")
        tab_watchdogs = tabview.add("Watchdogs & Policy")
        tab_camera = tabview.add("Live Camera Feed")
        tab_events = tabview.add("Audit Trail")

        self._build_overview_tab(tab_overview)
        self._build_watchdogs_tab(tab_watchdogs)
        self._build_camera_tab(tab_camera)
        self._build_events_tab(tab_events)

    def _handle_signout(self):
        self._clear_session()
        self._render_login_screen()

    def _toggle_power_shield(self):
        if self.is_armed:
            self.on_disarm()
        else:
            self.on_arm()

    def _build_overview_tab(self, parent):
        # GIANT HERO POWER BUTTON CONTAINER
        hero_card = ctk.CTkFrame(parent, corner_radius=24, fg_color=("#F8FAFC", "#0F172A"), border_width=2, border_color="#059669" if self.is_armed else "#334155")
        hero_card.pack(fill="x", padx=10, pady=10)
        self.hero_card = hero_card

        hero_inner = ctk.CTkFrame(hero_card, fg_color="transparent")
        hero_inner.pack(expand=True, pady=25)

        # GIANT POWER BUTTON
        self.big_power_btn = ctk.CTkButton(
            hero_inner,
            text="🛡️ SHIELD ARMED (ON)" if self.is_armed else "🛡️ SHIELD DISARMED (OFF)",
            font=ctk.CTkFont(size=20, weight="bold"),
            fg_color="#059669" if self.is_armed else "#334155",
            hover_color="#047857" if self.is_armed else "#475569",
            width=360,
            height=80,
            corner_radius=22,
            command=self._toggle_power_shield
        )
        self.big_power_btn.pack(pady=(5, 8))

        self.power_sublabel = ctk.CTkLabel(
            hero_inner,
            text="● 500ms AC Charger Watchdog Active • Auto-Siren Armed • Webcam Sentinel Ready" if self.is_armed else "○ Monitoring paused. You can safely unplug your charger without alarm.",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color="#10B981" if self.is_armed else "#94A3B8"
        )
        self.power_sublabel.pack()

        # Telemetry Row
        telem_row = ctk.CTkFrame(parent, fg_color="transparent")
        telem_row.pack(fill="x", padx=10, pady=5)

        # Battery Meter
        bat_card = ctk.CTkFrame(telem_row, corner_radius=16, fg_color=("#F8FAFC", "#111827"))
        bat_card.pack(side="left", fill="both", expand=True, padx=(0, 6))

        ctk.CTkLabel(bat_card, text="BATTERY & POWER LEVEL", font=ctk.CTkFont(size=11, weight="bold"), text_color="#64748B").pack(anchor="w", padx=18, pady=(12, 2))
        self.battery_label = ctk.CTkLabel(bat_card, text=f"{self.battery_pct}% (Plugged In)", font=ctk.CTkFont(size=16, weight="bold"), text_color="#38BDF8")
        self.battery_label.pack(anchor="w", padx=18)

        self.battery_progress = ctk.CTkProgressBar(bat_card, width=200, height=8, corner_radius=4)
        self.battery_progress.set(self.battery_pct / 100.0)
        self.battery_progress.pack(anchor="w", padx=18, pady=(6, 14))

        # AC Sentinel Status
        ac_card = ctk.CTkFrame(telem_row, corner_radius=16, fg_color=("#F8FAFC", "#111827"))
        ac_card.pack(side="right", fill="both", expand=True, padx=(6, 0))

        ctk.CTkLabel(ac_card, text="AC POWER LINE STATUS", font=ctk.CTkFont(size=11, weight="bold"), text_color="#64748B").pack(anchor="w", padx=18, pady=(12, 2))
        self.ac_status_label = ctk.CTkLabel(ac_card, text="AC ADAPTER CONNECTED", font=ctk.CTkFont(size=16, weight="bold"), text_color="#10B981")
        self.ac_status_label.pack(anchor="w", padx=18)
        ctk.CTkLabel(ac_card, text="500ms Win32 AC Sentinel Watchdog", font=ctk.CTkFont(size=11), text_color="#64748B").pack(anchor="w", padx=18, pady=(2, 14))

        # Quick Action Buttons
        btn_frame = ctk.CTkFrame(parent, fg_color="transparent")
        btn_frame.pack(fill="x", padx=10, pady=10)

        r1 = ctk.CTkFrame(btn_frame, fg_color="transparent")
        r1.pack(fill="x", pady=3)

        alarm_on = ctk.CTkButton(
            r1,
            text="🔊 SOUND SIREN (15s Max)",
            font=ctk.CTkFont(size=12, weight="bold"),
            fg_color="#D97706",
            hover_color="#B45309",
            height=40,
            corner_radius=12,
            command=self.on_test_alarm
        )
        alarm_on.pack(side="left", fill="x", expand=True, padx=(0, 6))

        alarm_off = ctk.CTkButton(
            r1,
            text="⏹️ STOP ALARM (MUTE)",
            font=ctk.CTkFont(size=12, weight="bold"),
            fg_color="#DC2626",
            hover_color="#B91C1C",
            height=40,
            corner_radius=12,
            command=self.on_stop_alarm or (lambda: None)
        )
        alarm_off.pack(side="right", fill="x", expand=True, padx=(6, 0))

        if self.on_lock_device:
            lock_btn = ctk.CTkButton(
                btn_frame,
                text="🔒 LOCK WINDOWS WORKSTATION (user32.LockWorkStation)",
                font=ctk.CTkFont(size=12, weight="bold"),
                fg_color="#0F172A",
                hover_color="#1E293B",
                height=38,
                corner_radius=12,
                command=self.on_lock_device
            )
            lock_btn.pack(fill="x", pady=4)

    def _build_watchdogs_tab(self, parent):
        box = ctk.CTkFrame(parent, corner_radius=16, fg_color=("#F8FAFC", "#111827"))
        box.pack(fill="both", expand=True, padx=10, pady=10)

        ctk.CTkLabel(box, text="ACTIVE HARDWARE WATCHDOGS", font=ctk.CTkFont(size=13, weight="bold")).pack(anchor="w", padx=20, pady=(15, 10))

        items = [
            ("⚡ AC Charger Disconnect Watchdog", "500ms Win32 polling. Triggers siren if unplugged while armed.", True),
            ("📡 Wi-Fi BSSID Network Sentinel", "Monitors active SSID changes. Triggers alert on unfamiliar network.", True),
            ("⏱️ Smart 15-Second Auto-Silence", "Limits deterrence siren to 15 seconds to prevent non-stop noise.", True),
            ("🔊 Volume Unmute & Auto-Boost", "Win32 VK_VOLUME_UP boost ensures alarm is audible at max level.", True),
            ("🔒 Remote LockWorkStation Instruction", "Signed authenticated remote lock via WebSocket.", True)
        ]

        for name, desc, state in items:
            row = ctk.CTkFrame(box, fg_color="transparent")
            row.pack(fill="x", padx=20, pady=6)
            cbox = ctk.CTkCheckBox(row, text=name, font=ctk.CTkFont(size=12, weight="bold"), text_color="#E2E8F0")
            if state:
                cbox.select()
            cbox.pack(anchor="w")

            desc_lbl = ctk.CTkLabel(row, text=desc, font=ctk.CTkFont(size=11), text_color="#64748B")
            desc_lbl.pack(anchor="w", padx=28)

    def _build_camera_tab(self, parent):
        box = ctk.CTkFrame(parent, corner_radius=16, fg_color=("#F8FAFC", "#111827"))
        box.pack(fill="both", expand=True, padx=10, pady=10)

        ctk.CTkLabel(box, text="AUTHORIZED LIVE WEBCAM FEED", font=ctk.CTkFont(size=13, weight="bold")).pack(anchor="w", padx=20, pady=(15, 5))
        ctk.CTkLabel(
            box,
            text="Privacy notice: Hardware camera LED remains illuminated whenever live video is accessed.",
            font=ctk.CTkFont(size=11),
            text_color="#94A3B8"
        ).pack(anchor="w", padx=20, pady=(0, 10))

        preview_box = ctk.CTkFrame(box, height=220, fg_color="#020617", corner_radius=14)
        preview_box.pack(fill="x", padx=20, pady=10)

        ctk.CTkLabel(
            preview_box,
            text="📷 Physical Webcam Stream Active\nHardware LED on Dell G15 illuminated during live owner feed\nStream: http://localhost:8000/api/v1/camera/stream/dev_oska_xps15",
            font=ctk.CTkFont(size=12),
            text_color="#38BDF8"
        ).pack(expand=True, pady=40)

    def _build_events_tab(self, parent):
        box = ctk.CTkFrame(parent, corner_radius=16, fg_color=("#F8FAFC", "#111827"))
        box.pack(fill="both", expand=True, padx=10, pady=10)

        ctk.CTkLabel(box, text="SECURITY AUDIT TRAIL LOG", font=ctk.CTkFont(size=13, weight="bold")).pack(anchor="w", padx=20, pady=(15, 5))

        self.events_box = ctk.CTkTextbox(box, corner_radius=12, font=ctk.CTkFont(family="Consolas", size=11))
        self.events_box.pack(fill="both", expand=True, padx=20, pady=(5, 15))
        self.log_event("Hardware sentinel initialized. Armed and active.")

    def log_event(self, message: str):
        if self.events_box:
            timestamp = time.strftime("%H:%M:%S")
            self.events_box.insert("end", f"[{timestamp}] {message}\n")
            self.events_box.see("end")

    def update_telemetry(self, battery: int, is_charging: bool, ssid: str, is_armed: bool):
        self.battery_pct = battery
        self.is_charging = is_charging
        self.current_ssid = ssid
        self.is_armed = is_armed

        if self.root:
            self.root.after(0, self._apply_telemetry_updates)

    def _apply_telemetry_updates(self):
        if self.battery_label:
            charging_str = "Plugged In" if self.is_charging else "Discharging"
            self.battery_label.configure(text=f"{self.battery_pct}% ({charging_str})")
        if self.battery_progress:
            self.battery_progress.set(self.battery_pct / 100.0)
        if self.ac_status_label:
            if self.is_charging:
                self.ac_status_label.configure(text="AC ADAPTER CONNECTED", text_color="#10B981")
            else:
                self.ac_status_label.configure(text="ON BATTERY (UNPLUGGED)", text_color="#EF4444")
        if self.big_power_btn:
            if self.is_armed:
                self.big_power_btn.configure(text="🛡️ SHIELD ARMED (ON)", fg_color="#059669", hover_color="#047857")
                if hasattr(self, 'hero_card') and self.hero_card:
                    self.hero_card.configure(border_color="#059669")
                if self.power_sublabel:
                    self.power_sublabel.configure(
                        text="● 500ms AC Charger Watchdog Active • Auto-Siren Armed • Webcam Sentinel Ready",
                        text_color="#10B981"
                    )
            else:
                self.big_power_btn.configure(text="🛡️ SHIELD DISARMED (OFF)", fg_color="#334155", hover_color="#475569")
                if hasattr(self, 'hero_card') and self.hero_card:
                    self.hero_card.configure(border_color="#334155")
                if self.power_sublabel:
                    self.power_sublabel.configure(
                        text="○ Monitoring paused. You can safely unplug your charger without alarm.",
                        text_color="#94A3B8"
                    )
