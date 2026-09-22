import os
import io
import zipfile
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, JSONResponse, FileResponse, RedirectResponse

router = APIRouter(prefix="/api/v1/downloads", tags=["Downloads & Updates"])

CURRENT_VERSION = "1.4.2"
RELEASE_DATE = "2026-09-22"

@router.get("/manifest")
async def get_version_manifest():
    """
    Returns the latest software version manifest.
    Used by the Mobile App and Desktop Agent to detect and apply Over-The-Air (OTA) updates automatically.
    """
    return {
        "latest_version": CURRENT_VERSION,
        "release_date": RELEASE_DATE,
        "auto_update_supported": True,
        "force_update": False,
        "release_notes": "Added 15s smart auto-silence siren, iOS liquid glass light UI, and low-latency webcam streaming.",
        "download_urls": {
            "windows_agent": "/api/v1/downloads/windows-agent",
            "windows_exe": "/api/v1/downloads/windows-exe",
            "android_apk": "/api/v1/downloads/android-apk"
        }
    }

@router.get("/windows-agent")
async def download_windows_agent():
    """
    Delivers a full, pre-configured Windows Desktop Agent package (zip bundle with launcher).
    Packages all source files from apps/desktop-agent so it runs with a single click.
    """
    root = Path(__file__).resolve().parents[3]
    agent_dir = root / "apps" / "desktop-agent"
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Launcher script
        launcher_bat = (
            "@echo off\r\n"
            "title LaptopGuard AI - Desktop Sentinel v1.4.2\r\n"
            "echo ====================================================\r\n"
            "echo     LaptopGuard AI - Windows Hardware Sentinel\r\n"
            "echo ====================================================\r\n"
            "echo Checking Python dependencies...\r\n"
            "python -m pip install customtkinter requests websockets psutil pillow --quiet\r\n"
            "echo Launching Sentinel GUI...\r\n"
            "python desktop_app.py\r\n"
            "pause\r\n"
        )
        zf.writestr("Run-LaptopGuard.bat", launcher_bat)

        # Instructions
        readme_txt = (
            f"LaptopGuard AI - Windows Desktop Sentinel v{CURRENT_VERSION}\r\n"
            "====================================================\r\n"
            "1. Extract this entire zip archive to your laptop.\r\n"
            "2. Double-click 'Run-LaptopGuard.bat'.\r\n"
            "3. Sign in with your LaptopGuard account (same as Web Dashboard).\r\n"
            "4. Your laptop is now protected with 500ms AC disconnect watchdog,\r\n"
            "   15-second auto-silence siren, and instant remote lock!\r\n"
        )
        zf.writestr("README.txt", readme_txt)

        # Include agent source code files
        if agent_dir.exists():
            for file_path in agent_dir.rglob("*"):
                if file_path.is_file():
                    # Skip cache and local state files
                    if any(part in file_path.parts for part in ["__pycache__", ".git", ".venv", "csharp-agent"]):
                        continue
                    if file_path.name in ["session.json", "offline_events.enc.json"]:
                        continue
                    arcname = file_path.relative_to(agent_dir)
                    zf.write(file_path, arcname=str(arcname))

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=LaptopGuard-Windows-Agent-v{CURRENT_VERSION}.zip"
        }
    )

@router.get("/windows-exe")
async def download_windows_exe():
    """
    Delivers the compiled standalone LaptopGuard-AI.exe executable.
    If available locally on disk, serves it directly.
    Otherwise, redirects to GitHub Release binary.
    """
    root = Path(__file__).resolve().parents[3]
    exe_path = root / "dist" / "LaptopGuard-AI.exe"
    if not exe_path.exists():
        exe_path = root / "dist" / "LaptopGuard-AI" / "LaptopGuard-AI.exe"
    
    if exe_path.exists():
        return FileResponse(
            path=str(exe_path),
            filename=f"LaptopGuard-AI-v{CURRENT_VERSION}.exe",
            media_type="application/octet-stream"
        )
    
    # Fallback to GitHub Release permanent download link
    release_url = f"https://github.com/cit-24-01-0476-maker/laptop.guard.ai/releases/download/v{CURRENT_VERSION}/LaptopGuard-AI.exe"
    return RedirectResponse(url=release_url, status_code=302)

@router.get("/android-apk")
async def download_android_apk():
    """
    Delivers the compiled Android Mobile App installer package (APK).
    If available locally on disk, serves it directly.
    Otherwise, redirects to the high-speed GitHub Release CDN.
    """
    root = Path(__file__).resolve().parents[3]
    apk_path = root / "dist" / "LaptopGuard-AI.apk"
    if not apk_path.exists():
        apk_path = root / "apps" / "web" / "android" / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"

    if apk_path.exists():
        return FileResponse(
            path=str(apk_path),
            filename=f"LaptopGuard-AI-Mobile-v{CURRENT_VERSION}.apk",
            media_type="application/vnd.android.package-archive"
        )

    release_url = f"https://github.com/cit-24-01-0476-maker/laptop.guard.ai/releases/download/v{CURRENT_VERSION}/LaptopGuard-AI.apk"
    return RedirectResponse(url=release_url, status_code=302)


# Root alias router for /downloads/*
alias_router = APIRouter(prefix="/downloads", tags=["Downloads & Updates"])
alias_router.add_api_route("/manifest", get_version_manifest, methods=["GET"])
alias_router.add_api_route("/windows-agent", download_windows_agent, methods=["GET"])
alias_router.add_api_route("/windows-exe", download_windows_exe, methods=["GET"])
alias_router.add_api_route("/android-apk", download_android_apk, methods=["GET"])
