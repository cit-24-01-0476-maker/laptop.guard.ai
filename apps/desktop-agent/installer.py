"""
LaptopGuard AI - Windows Application Installer & Shortcut Manager
Handles:
- Installing app to %LOCALAPPDATA%\\Programs\\LaptopGuard AI
- Creating Desktop shortcut (.lnk) with shield icon
- Creating Start Menu shortcut (.lnk)
- Registering Windows Startup (Run key)
- Registering Windows Add/Remove Programs entry
"""

import os
import sys
import shutil
import logging
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger("LaptopGuard.Installer")

APP_NAME = "LaptopGuard AI"
APP_DESCRIPTION = "Sovereign Hardware Anti-Theft & Surveillance Sentinel for Windows"
INSTALL_SUBDIR = "LaptopGuard AI"


def get_real_desktop_path() -> Path:
    """Returns the true user desktop path (including OneDrive synchronized desktop)."""
    try:
        cmd = '[Environment]::GetFolderPath("Desktop")'
        res = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", cmd],
            capture_output=True, text=True, timeout=5,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        if res.returncode == 0 and res.stdout.strip():
            p = Path(res.stdout.strip())
            if p.exists():
                return p
    except Exception:
        pass

    # Fallbacks
    home = Path.home()
    onedrive_desk = home / "OneDrive" / "Desktop"
    if onedrive_desk.exists():
        return onedrive_desk
    standard_desk = home / "Desktop"
    if standard_desk.exists():
        return standard_desk
    return home


def get_real_programs_path() -> Path:
    """Returns the user Start Menu Programs path."""
    try:
        cmd = '[Environment]::GetFolderPath("Programs")'
        res = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", cmd],
            capture_output=True, text=True, timeout=5,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        if res.returncode == 0 and res.stdout.strip():
            p = Path(res.stdout.strip())
            if p.exists():
                return p
    except Exception:
        pass

    appdata = os.environ.get("APPDATA")
    if appdata:
        p = Path(appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs"
        if p.exists():
            return p
    return Path.home()


def get_install_directory() -> Path:
    """Returns %LOCALAPPDATA%\\Programs\\LaptopGuard AI"""
    localappdata = os.environ.get("LOCALAPPDATA")
    if localappdata:
        base = Path(localappdata) / "Programs" / INSTALL_SUBDIR
    else:
        base = Path.home() / "AppData" / "Local" / "Programs" / INSTALL_SUBDIR
    base.mkdir(parents=True, exist_ok=True)
    return base


def create_windows_shortcut(shortcut_path: Path, target_exe: Path, icon_path: Optional[Path] = None) -> bool:
    """Creates a Windows .lnk shortcut using WScript.Shell."""
    try:
        target_str = str(target_exe.resolve())
        work_dir = str(target_exe.parent.resolve())
        shortcut_str = str(shortcut_path.resolve())

        ps_script = f"""
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{shortcut_str}")
$Shortcut.TargetPath = "{target_str}"
$Shortcut.WorkingDirectory = "{work_dir}"
$Shortcut.Description = "{APP_DESCRIPTION}"
"""
        if icon_path and icon_path.exists():
            ps_script += f'\n$Shortcut.IconLocation = "{str(icon_path.resolve())}, 0"'
        else:
            ps_script += f'\n$Shortcut.IconLocation = "{target_str}, 0"'

        ps_script += '\n$Shortcut.Save()'

        res = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", ps_script],
            capture_output=True, text=True, timeout=10,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        if res.returncode == 0 and shortcut_path.exists():
            logger.info(f"Shortcut created: {shortcut_path}")
            return True
        else:
            logger.warning(f"PowerShell shortcut creation returned {res.returncode}: {res.stderr}")
            return False
    except Exception as e:
        logger.error(f"Failed to create shortcut at {shortcut_path}: {e}")
        return False


def install_to_pc(source_exe: Optional[Path] = None) -> Path:
    """
    Installs the software permanently to %LOCALAPPDATA%\\Programs\\LaptopGuard AI,
    creates Desktop and Start Menu shortcuts, and returns the installed executable path.
    """
    if source_exe is None:
        source_exe = Path(sys.executable if getattr(sys, "frozen", False) else __file__).resolve()

    install_dir = get_install_directory()
    installed_exe = install_dir / "LaptopGuard-AI.exe"
    installed_ico = install_dir / "app_icon.ico"

    # Find icon
    source_ico = None
    candidate_icons = [
        source_exe.parent / "app_icon.ico",
        Path(__file__).resolve().parent / "app_icon.ico",
        Path(getattr(sys, "_MEIPASS", ".")) / "app_icon.ico"
    ]
    for ci in candidate_icons:
        if ci.exists():
            source_ico = ci
            break

    # Copy icon if found
    if source_ico and source_ico.exists():
        try:
            shutil.copy2(source_ico, installed_ico)
        except Exception:
            pass

    # Copy executable if not already in install directory
    if source_exe.resolve() != installed_exe.resolve():
        try:
            logger.info(f"Copying {source_exe} -> {installed_exe}")
            shutil.copy2(source_exe, installed_exe)
        except Exception as e:
            logger.error(f"Error copying executable to install directory: {e}")

    final_ico = installed_ico if installed_ico.exists() else None

    # 1. Create Desktop Shortcut
    desktop = get_real_desktop_path()
    desktop_shortcut = desktop / "LaptopGuard AI.lnk"
    create_windows_shortcut(desktop_shortcut, installed_exe, final_ico)

    # 2. Create Start Menu Shortcut
    programs = get_real_programs_path()
    start_shortcut = programs / "LaptopGuard AI.lnk"
    create_windows_shortcut(start_shortcut, installed_exe, final_ico)

    # 3. Register in Windows Registry (Uninstall & Run)
    register_windows_uninstall_entry(installed_exe, final_ico)

    logger.info(f"LaptopGuard AI successfully installed to {install_dir}!")
    return installed_exe


def register_windows_uninstall_entry(exe_path: Path, icon_path: Optional[Path]):
    """Registers app in Windows Add/Remove Programs so it looks official."""
    try:
        import winreg
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\LaptopGuardAI"
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, "LaptopGuard AI Sentinel")
            winreg.SetValueEx(key, "DisplayVersion", 0, winreg.REG_SZ, "1.4.2")
            winreg.SetValueEx(key, "Publisher", 0, winreg.REG_SZ, "LaptopGuard Security")
            winreg.SetValueEx(key, "InstallLocation", 0, winreg.REG_SZ, str(exe_path.parent))
            winreg.SetValueEx(key, "DisplayIcon", 0, winreg.REG_SZ, str(icon_path or exe_path))
            winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, f'cmd.exe /c del "{exe_path}"')
    except Exception as e:
        logger.debug(f"Could not write registry uninstall entry: {e}")


def ensure_desktop_icon():
    """Checks if Desktop shortcut exists; if missing or outside programs folder, installs to PC and creates Desktop icon."""
    try:
        current_exe = Path(sys.executable if getattr(sys, "frozen", False) else __file__).resolve()
        desktop = get_real_desktop_path()
        shortcut = desktop / "LaptopGuard AI.lnk"

        install_dir = get_install_directory()
        installed_exe = install_dir / "LaptopGuard-AI.exe"

        if getattr(sys, "frozen", False) and current_exe.resolve() != installed_exe.resolve():
            install_to_pc(current_exe)
        else:
            if not shortcut.exists():
                ico_path = current_exe.parent / "app_icon.ico"
                if not ico_path.exists():
                    ico_path = None
                create_windows_shortcut(shortcut, current_exe, ico_path)
                logger.info("Automatically generated Desktop shortcut on first run.")
    except Exception as e:
        logger.debug(f"Could not auto-create desktop icon: {e}")
