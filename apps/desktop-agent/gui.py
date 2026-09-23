import tkinter as tk
from tkinter import ttk, messagebox
import threading
from typing import Callable, Optional

class AgentGUI:
    def __init__(self, on_arm: Callable, on_disarm: Callable, on_test_alarm: Callable, on_test_motion: Callable, on_stop_alarm: Optional[Callable] = None):
        self.on_arm = on_arm
        self.on_disarm = on_disarm
        self.on_test_alarm = on_test_alarm
        self.on_test_motion = on_test_motion
        self.on_stop_alarm = on_stop_alarm
        self.root: Optional[tk.Tk] = None
        
        self.status_var: Optional[tk.StringVar] = None
        self.connection_var: Optional[tk.StringVar] = None
        self.battery_var: Optional[tk.StringVar] = None
        self.network_var: Optional[tk.StringVar] = None
        self.events_listbox: Optional[tk.Listbox] = None

    def start_gui(self):
        root = tk.Tk()
        self.root = root
        root.title("LaptopGuard AI - Security Agent")
        root.geometry("780x560")
        root.configure(bg="#0B0F19")
        root.minsize(640, 480)
        # Minimize instead of closing to keep background protection alive
        root.protocol("WM_DELETE_WINDOW", root.iconify)

        # Style definitions
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TNotebook", background="#0B0F19", borderwidth=0)
        style.configure("TNotebook.Tab", background="#1E293B", foreground="#94A3B8", padding=[15, 8], font=("Helvetica", 10, "bold"))
        style.map("TNotebook.Tab", background=[("selected", "#00E5FF")], foreground=[("selected", "#0B0F19")])

        # Header Bar
        header = tk.Frame(root, bg="#101827", height=60, padx=20, pady=10)
        header.pack(fill="x")

        logo = tk.Label(header, text="🛡️ LaptopGuard AI", font=("Helvetica", 15, "bold"), fg="#00E5FF", bg="#101827")
        logo.pack(side="left")

        tagline = tk.Label(header, text="Personal Anti-Theft & Device Defense", font=("Helvetica", 9), fg="#64748B", bg="#101827")
        tagline.pack(side="left", padx=15, pady=4)

        self.connection_var = tk.StringVar(value="Connected to Cloud")
        status_badge = tk.Label(header, textvariable=self.connection_var, font=("Helvetica", 9, "bold"), fg="#10B981", bg="#064E3B", padx=8, pady=4)
        status_badge.pack(side="right")

        # Tabs
        notebook = ttk.Notebook(root)
        notebook.pack(expand=True, fill="both", padx=15, pady=15)

        # 1. Overview Page
        tab_overview = tk.Frame(notebook, bg="#0B0F19", padx=20, pady=20)
        notebook.add(tab_overview, text="Overview")
        self._build_overview_tab(tab_overview)

        # 2. Security Page
        tab_security = tk.Frame(notebook, bg="#0B0F19", padx=20, pady=20)
        notebook.add(tab_security, text="Security & Defense")
        self._build_security_tab(tab_security)

        # 3. Live Camera & Privacy Page
        tab_camera = tk.Frame(notebook, bg="#0B0F19", padx=20, pady=20)
        notebook.add(tab_camera, text="Live Camera & Privacy")
        self._build_camera_tab(tab_camera)

        # 4. Events Log Page
        tab_events = tk.Frame(notebook, bg="#0B0F19", padx=20, pady=20)
        notebook.add(tab_events, text="Events Timeline")
        self._build_events_tab(tab_events)

        root.mainloop()

    def _build_overview_tab(self, parent):
        card = tk.Frame(parent, bg="#111827", highlightbackground="#1F2937", highlightthickness=1, padx=25, pady=25)
        card.pack(fill="x", pady=10)

        title = tk.Label(card, text="PROTECTION STATUS", font=("Helvetica", 10, "bold"), fg="#94A3B8", bg="#111827")
        title.pack(anchor="w")

        self.status_var = tk.StringVar(value="ARMED & PROTECTED")
        status_lbl = tk.Label(card, textvariable=self.status_var, font=("Helvetica", 22, "bold"), fg="#00E5FF", bg="#111827")
        status_lbl.pack(anchor="w", pady=6)

        info_lbl = tk.Label(
            card,
            text="Real-time monitoring active: Power line, Wi-Fi integrity, Device lock state, and tamper triggers.",
            font=("Helvetica", 10),
            fg="#64748B",
            bg="#111827"
        )
        info_lbl.pack(anchor="w", pady=(0, 20))

        # Metrics row
        metrics_frame = tk.Frame(card, bg="#111827")
        metrics_frame.pack(fill="x", pady=10)

        self.battery_var = tk.StringVar(value="Battery: 82% (Monitoring AC)")
        b_lbl = tk.Label(metrics_frame, textvariable=self.battery_var, font=("Helvetica", 10), fg="#E2E8F0", bg="#1E293B", padx=12, pady=6)
        b_lbl.pack(side="left", padx=(0, 10))

        self.network_var = tk.StringVar(value="Network: Campus_Secure_5G")
        n_lbl = tk.Label(metrics_frame, textvariable=self.network_var, font=("Helvetica", 10), fg="#E2E8F0", bg="#1E293B", padx=12, pady=6)
        n_lbl.pack(side="left")

        # Quick Arm / Disarm buttons
        btn_frame = tk.Frame(parent, bg="#0B0F19")
        # Quick Arm / Disarm / Alarm buttons
        btn_frame = tk.Frame(parent, bg="#0B0F19")
        btn_frame.pack(fill="x", pady=20)

        arm_btn = tk.Button(
            btn_frame,
            text="🛡️ ARM DEVICE",
            font=("Helvetica", 10, "bold"),
            bg="#00E5FF",
            fg="#0B0F19",
            padx=14,
            pady=8,
            relief="flat",
            cursor="hand2",
            command=self.on_arm
        )
        arm_btn.pack(side="left", padx=(0, 10))

        disarm_btn = tk.Button(
            btn_frame,
            text="🔓 DISARM",
            font=("Helvetica", 10, "bold"),
            bg="#374151",
            fg="#FFFFFF",
            padx=14,
            pady=8,
            relief="flat",
            cursor="hand2",
            command=self.on_disarm
        )
        disarm_btn.pack(side="left", padx=(0, 10))

        alarm_on_btn = tk.Button(
            btn_frame,
            text="🔊 ALARM ON",
            font=("Helvetica", 10, "bold"),
            bg="#D97706",
            fg="#FFFFFF",
            padx=14,
            pady=8,
            relief="flat",
            cursor="hand2",
            command=self.on_test_alarm
        )
        alarm_on_btn.pack(side="left", padx=(0, 10))

        alarm_off_btn = tk.Button(
            btn_frame,
            text="⏹️ ALARM OFF",
            font=("Helvetica", 10, "bold"),
            bg="#DC2626",
            fg="#FFFFFF",
            padx=14,
            pady=8,
            relief="flat",
            cursor="hand2",
            command=self.on_stop_alarm or (lambda: None)
        )
        alarm_off_btn.pack(side="left")

    def _build_security_tab(self, parent):
        lbl = tk.Label(parent, text="Security Triggers & Testing Drill", font=("Helvetica", 13, "bold"), fg="#FFFFFF", bg="#0B0F19")
        lbl.pack(anchor="w", pady=(0, 10))

        card = tk.Frame(parent, bg="#111827", padx=20, pady=20)
        card.pack(fill="x", pady=10)

        p1 = tk.Label(card, text="• Power Disconnect Alert: Monitors AC adapter status instantly", fg="#94A3B8", bg="#111827", font=("Helvetica", 10))
        p1.pack(anchor="w", pady=3)
        p2 = tk.Label(card, text="• Network Change Monitor: Alerts when Wi-Fi SSID switches", fg="#94A3B8", bg="#111827", font=("Helvetica", 10))
        p2.pack(anchor="w", pady=3)
        p3 = tk.Label(card, text="• Physical Movement: Truthful hardware sensor detection", fg="#94A3B8", bg="#111827", font=("Helvetica", 10))
        p3.pack(anchor="w", pady=3)

        btn_box = tk.Frame(parent, bg="#0B0F19")
        btn_box.pack(fill="x", pady=15)

        test_motion_btn = tk.Button(
            btn_box,
            text="Test Motion Alert",
            bg="#1E293B",
            fg="#00E5FF",
            padx=12,
            pady=8,
            relief="flat",
            command=self.on_test_motion
        )
        test_motion_btn.pack(side="left", padx=(0, 10))

        test_alarm_btn = tk.Button(
            btn_box,
            text="🔊 Trigger Siren (ON)",
            bg="#D97706",
            fg="#FFFFFF",
            padx=12,
            pady=8,
            relief="flat",
            command=self.on_test_alarm
        )
        test_alarm_btn.pack(side="left", padx=(0, 10))

        stop_alarm_btn = tk.Button(
            btn_box,
            text="⏹️ Silence Siren (OFF)",
            bg="#DC2626",
            fg="#FFFFFF",
            padx=12,
            pady=8,
            relief="flat",
            command=self.on_stop_alarm or (lambda: None)
        )
        stop_alarm_btn.pack(side="left")

    def _build_camera_tab(self, parent):
        lbl = tk.Label(parent, text="Privacy & Live Camera Policy", font=("Helvetica", 13, "bold"), fg="#FFFFFF", bg="#0B0F19")
        lbl.pack(anchor="w", pady=(0, 10))

        card = tk.Frame(parent, bg="#111827", padx=20, pady=20)
        card.pack(fill="x", pady=10)

        rules = [
            "✔ Legitimate personal anti-theft product only.",
            "✔ Never covert: Visible on-screen red banner is shown whenever camera is active.",
            "✔ Hardware LED indicators are never bypassed or hidden.",
            "✔ Strict 5-minute session maximum with 60-second advance warning.",
            "✔ Complete audit log maintained for all live camera viewings."
        ]
        for r in rules:
            l = tk.Label(card, text=r, fg="#10B981" if "✔" in r else "#94A3B8", bg="#111827", font=("Helvetica", 10))
            l.pack(anchor="w", pady=4)

    def _build_events_tab(self, parent):
        lbl = tk.Label(parent, text="Local Agent Event Timeline", font=("Helvetica", 13, "bold"), fg="#FFFFFF", bg="#0B0F19")
        lbl.pack(anchor="w", pady=(0, 10))

        self.events_listbox = tk.Listbox(parent, bg="#111827", fg="#E2E8F0", font=("Consolas", 10), selectbackground="#1E293B")
        self.events_listbox.pack(expand=True, fill="both")
        
        self.log_event("Agent daemon started successfully.")
        self.log_event("Local security baseline established.")

    def log_event(self, text: str):
        if self.events_listbox:
            self.events_listbox.insert(0, f"• {text}")

    def update_telemetry(self, battery_pct: int, is_charging: bool, ssid: str, is_armed: bool):
        if self.status_var:
            self.status_var.set("ARMED & PROTECTED" if is_armed else "DISARMED (STANDBY)")
        if self.battery_var:
            charging_text = "Charging" if is_charging else "On Battery"
            self.battery_var.set(f"Battery: {battery_pct}% ({charging_text})")
        if self.network_var:
            self.network_var.set(f"Network: {ssid}")
