import os
import sys
import glob
import cv2
import numpy as np

def create_promo_video():
    brain_dir = r"C:\Users\Oshadhaperer\.gemini\antigravity\brain\00ce5253-0b15-4f64-82b1-ca95bcd80657"
    out_video_path = os.path.join(brain_dir, "LaptopGuard_AI_Promo.mp4")
    desktop_path = os.path.expanduser(r"~\Desktop\LaptopGuard_AI_Promo.mp4")
    
    # Locate generated images
    scene1_files = glob.glob(os.path.join(brain_dir, "ai_video_scene1_*.jpg"))
    scene2_files = glob.glob(os.path.join(brain_dir, "ai_video_scene2_*.jpg"))
    scene3_files = glob.glob(os.path.join(brain_dir, "ai_video_scene3_*.jpg"))
    
    if not (scene1_files and scene2_files and scene3_files):
        print("Missing scene images!")
        return
        
    s1 = cv2.imread(scene1_files[0])
    s2 = cv2.imread(scene2_files[0])
    s3 = cv2.imread(scene3_files[0])
    
    width, height = 1280, 720
    fps = 30
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(out_video_path, fourcc, fps, (width, height))
    
    def resize_crop(img, w, h):
        ih, iw = img.shape[:2]
        scale = max(w / iw, h / ih)
        nw, nh = int(iw * scale), int(ih * scale)
        res = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_CUBIC)
        # Center crop
        cx, cy = nw // 2, nh // 2
        return res[cy - h//2 : cy + h//2, cx - w//2 : cx + w//2]
        
    s1 = resize_crop(s1, width, height)
    s2 = resize_crop(s2, width, height)
    s3 = resize_crop(s3, width, height)
    
    def add_hud_overlay(frame, title, subtitle, tag, progress):
        overlay = frame.copy()
        # Top cyber bar
        cv2.rectangle(overlay, (0, 0), (width, 60), (10, 10, 15), -1)
        # Bottom cyber bar
        cv2.rectangle(overlay, (0, height - 90), (width, height), (10, 10, 15), -1)
        
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
        
        # Cyber grid scanlines
        for y in range(0, height, 4):
            frame[y:y+1, :] = (frame[y:y+1, :] * 0.88).astype(np.uint8)
            
        # Top Bar text
        cv2.putText(frame, "LAPTOPGUARD AI // MISSION CRITICAL SECURITY", (30, 40), 
                    cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 255, 255), 2)
        cv2.putText(frame, f"[ STATUS: {tag} ]", (width - 320, 40), 
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 255, 0), 2)
        
        # Bottom Bar text
        cv2.putText(frame, title, (40, height - 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.95, (255, 255, 255), 2)
        cv2.putText(frame, subtitle, (40, height - 20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.60, (0, 200, 255), 1)
        
        # Progress bar
        bar_w = int(width * progress)
        cv2.rectangle(frame, (0, height - 4), (bar_w, height), (0, 255, 255), -1)

    def render_scene(base_img, title, subtitle, tag, duration_sec=5, zoom_in=True):
        total_frames = int(duration_sec * fps)
        for i in range(total_frames):
            prog = i / float(total_frames)
            # Smooth Ken-Burns Zoom
            if zoom_in:
                zoom = 1.0 + 0.12 * prog
            else:
                zoom = 1.12 - 0.12 * prog
                
            zw, zh = int(width * zoom), int(height * zoom)
            scaled = cv2.resize(base_img, (zw, zh), interpolation=cv2.INTER_LINEAR)
            cx, cy = zw // 2, zh // 2
            cropped = scaled[cy - height//2 : cy + height//2, cx - width//2 : cx + width//2]
            
            # Glitch effect in first 5 frames
            if i < 5:
                cropped = np.roll(cropped, (5 - i) * 8, axis=1)
                
            add_hud_overlay(cropped, title, subtitle, tag, prog)
            out.write(cropped)

    def render_intro(title, subtitle, duration_sec=3):
        total_frames = int(duration_sec * fps)
        for i in range(total_frames):
            prog = i / float(total_frames)
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            # Glowing cyber lines
            cv2.line(frame, (100, height//2 - 50), (width - 100, height//2 - 50), (0, 180, 255), 2)
            cv2.line(frame, (100, height//2 + 50), (width - 100, height//2 + 50), (0, 180, 255), 2)
            
            # Flashing text
            alpha = min(1.0, prog * 2)
            cv2.putText(frame, title, (width//2 - 380, height//2 + 10), 
                        cv2.FONT_HERSHEY_DUPLEX, 1.4, (0, 255, 255), 3)
            cv2.putText(frame, subtitle, (width//2 - 280, height//2 + 100), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, (200, 200, 200), 2)
            
            # Scanlines
            for y in range(0, height, 4):
                frame[y:y+1, :] = (frame[y:y+1, :] * 0.75).astype(np.uint8)
                
            out.write(frame)

    print("Rendering Intro...")
    render_intro("LAPTOPGUARD AI", "AUTONOMOUS ANTI-THEFT & PHYSICAL CYBER DEFENSE", 3.5)
    
    print("Rendering Scene 1...")
    render_scene(s1, "01. AI FACE INTRUDER DETECTION", 
                 "Real-time Neural YuNet Model instantly detects theft attempts and locks the workstation.", 
                 "AI ACTIVE", 5.5, zoom_in=True)
                 
    print("Rendering Scene 2...")
    render_scene(s2, "02. MOBILE COMMAND & 3D DIGITAL TWIN", 
                 "Live GPS Radar, Remote 100dB Siren Activation & Fluid 30FPS Remote Mirroring.", 
                 "LINKED", 5.5, zoom_in=False)
                 
    print("Rendering Scene 3...")
    render_scene(s3, "03. BADUSB HARDWARE TRAP & EVIDENCE CAPTURE", 
                 "Automatic storage sandbox traps rogue keystroke injectors & snaps forensic portraits.", 
                 "DEFENDING", 5.5, zoom_in=True)

    print("Rendering Outro...")
    render_intro("PROTECT YOUR LAPTOP ANYWHERE", "AVAILABLE ON WINDOWS & ANDROID // POWERED BY AI", 3.0)
    
    out.release()
    print("Saved Promo Video to:", out_video_path)
    
    # Also copy to desktop for easy 1-click access
    try:
        import shutil
        shutil.copy2(out_video_path, desktop_path)
        print("Copied to Desktop:", desktop_path)
    except Exception as e:
        print("Desktop copy skipped:", e)

if __name__ == "__main__":
    create_promo_video()
