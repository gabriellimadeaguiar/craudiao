; Instalador do ExitLag Analyzer (Inno Setup 6). Gera um único ExitLagAnalyzer-Setup.exe com tudo o que o
; windeployqt juntou em dist/. Compilado pelo workflow do GitHub Actions:
;   iscc /DAppVersion=0.1.0 /DSourceDir=<pasta dist> /DOutputDir=<pasta de saída> qt\installer\ExitLagAnalyzer.iss
; Instala por usuário (sem pedir administrador), em %LOCALAPPDATA%\Programs\ExitLag Analyzer.

#ifndef AppVersion
  #define AppVersion "0.1.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\..\dist"
#endif
#ifndef OutputDir
  #define OutputDir "..\..\installer-out"
#endif
#define AppName "ExitLag Analyzer"
#define AppExe "ExitLagAnalyzer.exe"

[Setup]
AppId={{6E0B4C9A-2F7D-4B8E-9D35-1C2A7E5F8B41}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=ExitLag
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=ExitLagAnalyzer-Setup
SetupIconFile=..\resources\app.ico
UninstallDisplayIcon={app}\{#AppExe}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "ptbr"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; dist/ já traz o runtime do Visual C++ ao lado do .exe (deploy app-local), então não precisa de administrador
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

