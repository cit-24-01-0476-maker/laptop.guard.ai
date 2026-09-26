; =============================================================================
; LaptopGuard AI - Production Windows Installer Script
; "Protect Your Laptop. Wherever You Go."
; =============================================================================

#define MyAppName "LaptopGuard AI"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "LaptopGuard Security"
#define MyAppURL "https://laptopguard.ai"
#define MyAppExeName "LaptopGuard.Desktop.exe"
#define MyServiceExeName "LaptopGuard.Service.exe"
#define MySessionExeName "LaptopGuard.SessionAgent.exe"

[Setup]
; Unique application GUID
AppId={{5A4C32B8-9D27-4E2B-9A77-F42841B5C82A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Destination Directories
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes

; Visual Styling (Matches professional installer wizard with left banner)
WizardStyle=modern
SetupIconFile=apps\desktop-agent\app_icon.ico
WizardImageFile=apps\desktop-agent\wizard_banner.bmp
WizardSmallImageFile=apps\desktop-agent\wizard_small.bmp

; Output and Compression
OutputDir=dist
OutputBaseFilename=LaptopGuard-Setup
Compression=lzma2/ultra64
SolidCompression=yes
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName} v{#MyAppVersion}

; Version Info in Executable Header
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=LaptopGuard AI - Windows Hardware Security Sentinel Setup
VersionInfoCopyright=Copyright (C) 2026 LaptopGuard Security

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startupicon"; Description: "Launch LaptopGuard Sentinel automatically when Windows boots (Recommended for 24/7 anti-theft watchdog)"; GroupDescription: "Background Protection:"

[Files]
Source: "apps\windows\publish\bundle\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "apps\desktop-agent\app_icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: startupicon
Name: "{userstartup}\{#MyAppName} Service"; Filename: "{app}\{#MyServiceExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: startupicon
Name: "{userstartup}\{#MyAppName} Session Agent"; Filename: "{app}\{#MySessionExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: startupicon

[Run]
; Launch Service, Session Agent and Desktop Dashboard
Filename: "{app}\{#MyServiceExeName}"; Description: "Start Windows Sentinel Service"; Flags: nowait postinstall runhidden
Filename: "{app}\{#MySessionExeName}"; Description: "Start Session Security Agent"; Flags: nowait postinstall runhidden
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Cleanly terminate running processes on uninstall
Filename: "taskkill.exe"; Parameters: "/F /IM {#MyAppExeName}"; Flags: runhidden
Filename: "taskkill.exe"; Parameters: "/F /IM {#MySessionExeName}"; Flags: runhidden
Filename: "taskkill.exe"; Parameters: "/F /IM {#MyServiceExeName}"; Flags: runhidden
