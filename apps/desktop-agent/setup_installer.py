"""
LaptopGuard AI - Official Windows Setup Installer
Installs LaptopGuard AI to %LOCALAPPDATA%\\Programs\\LaptopGuard AI,
creates the Desktop shortcut (.lnk) with shield icon, Start Menu shortcut,
and automatically launches the application.
"""

import os
import sys
import shutil
import time
import subprocess
import threading
from pathlib import Path
import customtkinter as ctk

from installer import (
    install_to_pc,
    get_real_desktop_path,
    get_install_directory,
    create_windows_shortcut,
    register_windows_uninstall_entry
)

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")


class LaptopGuardSetupWizard:
    def __init__(self):
        self.root = ctk.CTk()
        self.root.title("LaptopGuard AI - Windows Setup")
        self.root.geometry("540x440")
        self.root.resizable(False, False)

        # Center on screen
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        x = (sw - 540) // 2
        y = (sh - 440) // 2
        self.root.geometry(f"540x440+{x}+{y}")

        # Try to set icon
        icon_path = Path(__file__).resolve().parent / "app_icon.ico"
        if getattr(sys, "frozen", False):
            icon_path = Path(sys._MEIPASS) / "app_icon.ico"
        if icon_path.exists():
            try:
                self.root.iconbitmap(str(icon_path))
            except Exception:
                pass

        self._build_ui()

    def _build_ui(self):
        # Header banner
        header = ctk.CTkFrame(self.root, height=85, corner_radius=0, fg_color="#0F172A")
        header.pack(fill="x", padx=0, pady=0)

        ctk.CTkLabel(
            header,
            text="🛡️ LaptopGuard AI Sentinel",
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color="#38BDF8"
        ).pack(anchor="w", padx=25, pady=(18, 2))

        ctk.CTkLabel(
            header,
            text="Windows Sovereign Hardware Anti-Theft Protection Setup",
            font=ctk.CTkFont(size=11),
            text_color="#94A3B8"
        ).pack(anchor="w", padx=25)

        # Main body
        body = ctk.CTkFrame(self.root, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=25, pady=20)

        ctk.CTkLabel(
            body,
            text="Install LaptopGuard AI on this Computer",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color="#F8FAFC"
        ).pack(anchor="w", pady=(5, 8))

        ctk.CTkLabel(
            body,
            text="This wizard will install LaptopGuard AI to your PC and create\na desktop shortcut with the official shield icon for 1-click access.\n\nIncluded Features:\n• 500ms Real-Time AC Charger Disconnect Watchdog\n• 15-Second Smart Auto-Silence Siren Deterrence\n• Authorized Live Webcam Verification feed\n• Instant Remote Win+L LockWorkStation Command",
            font=ctk.CTkFont(size=12),
            text_color="#CBD5E1",
            justify="left"
        ).pack(anchor="w", pady=(0, 15))

        # Progress bar
        self.progress = ctk.CTkProgressBar(body, width=480, height=8, corner_radius=4)
        self.progress.set(0)
        self.progress.pack(pady=(5, 8))

        self.status_lbl = ctk.CTkLabel(
            body,
            text="Ready to install.",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color="#38BDF8"
        )
        self.status_lbl.pack(anchor="w")

        # Bottom buttons
        btn_frame = ctk.CTkFrame(self.root, height=65, fg_color="#0B1120")
        btn_frame.pack(fill="x", side="bottom")

        self.install_btn = ctk.CTkButton(
            btn_frame,
            text="🛡️ Install & Launch Now",
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color="#0284C7",
            hover_color="#0369A1",
            width=200,
            height=38,
            corner_radius=12,
            command=self.start_installation
        )
        self.install_btn.pack(side="right", padx=20, pady=14)

        self.cancel_btn = ctk.CTkButton(
            btn_frame,
            text="Cancel",
            font=ctk.CTkFont(size=12),
            fg_color="#334155",
            hover_color="#475569",
            width=90,
            height=38,
            corner_radius=12,
            command=self.root.destroy
        )
        self.cancel_btn.pack(side="right", padx=(0, 10), pady=14)

    def start_installation(self):
        self.install_btn.configure(state="disabled")
        self.cancel_btn.configure(state="disabled")

        def _worker():
            try:
                self.status_lbl.configure(text="Preparing installation directory...")
                self.progress.set(0.2)
                time.sleep(0.5)

                install_dir = get_install_directory()
                
                # Locate LaptopGuard-AI.exe to copy
                target_exe = install_dir / "LaptopGuard-AI.exe"
                target_ico = install_dir / "app_icon.ico"

                source_candidates = [
                    Path(__file__).resolve().parent / "dist" / "LaptopGuard-AI.exe",
                    Path(__file__).resolve().parent / "LaptopGuard-AI.exe",
                    Path(sys.executable).parent / "LaptopGuard-AI.exe",
                    Path(getattr(sys, "_MEIPASS", ".")) / "LaptopGuard-AI.exe"
                ]
                source_exe = None
                for c in source_candidates:
                    if c.exists() and c.is_file():
                        source_exe = c
                        break

                self.status_lbl.configure(text="Copying executable to Programs folder...")
                self.progress.set(0.4)
                time.sleep(0.5)

                if source_exe and source_exe.resolve() != target_exe.resolve():
                    shutil.copy2(source_exe, target_exe)

                # Copy icon
                ico_candidates = [
                    Path(__file__).resolve().parent / "app_icon.ico",
                    Path(getattr(sys, "_MEIPASS", ".")) / "app_icon.ico"
                ]
                for ic in ico_candidates:
                    if ic.exists():
                        shutil.copy2(ic, target_ico)
                        break

                self.status_lbl.configure(text="Creating Desktop shortcut with Shield Icon...")
                self.progress.set(0.7)
                time.sleep(0.5)

                # Create desktop & start menu shortcuts
                install_to_pc(target_exe)

                self.progress.set(1.0)
                self.status_lbl.configure(
                    text="✅ Installation Complete! Desktop icon created.",
                    text_color="#10B981"
                )

                time.sleep(1.0)
                # Launch app
                if target_exe.exists():
                    subprocess.Popen([str(target_exe)], creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)

                time.sleep(1.5)
                self.root.destroy()
            except Exception as e:
                self.status_lbl.configure(text=f"Install error: {e}", text_color="#EF4444")
                self.install_btn.configure(state="normal", text="Retry")
                self.cancel_btn.configure(state="normal")

        threading.Thread(target=_worker, daemon=True).start()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = LaptopGuardSetupWizard()
    app.run()
