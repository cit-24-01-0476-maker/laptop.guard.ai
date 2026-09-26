; Inno Setup Script for LaptopGuard AI
; Matches standard professional Windows Setup wizard (like Notepad++)

#define MyAppName "LaptopGuard AI"
#define MyAppVersion "1.5.2"
#define MyAppPublisher "LaptopGuard Security"
#define MyAppURL "https://laptopguard.ai"
#define MyAppExeName "LaptopGuard-AI.exe"

[Setup]
; Basic Application Info
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

; User Privileges: Allows standard install without UAC prompt or system-wide
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Visual Styling (Matches professional wizard with left banner)
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
Name: "startupicon"; Description: "Launch LaptopGuard Sentinel automatically when Windows boots (Recommended for watchdog protection)"; GroupDescription: "Background Protection:"

[Files]
Source: "apps\desktop-agent\dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "apps\desktop-agent\app_icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startupicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
