; Polyva 3D NSIS Installer Script
!macro customHeader
  !system "echo '' > /dev/null"
!macroend

!macro preInit
  ; Set default install directory
  SetRegView 64
!macroend

!macro customInstall
  ; Create file associations or custom install steps here
!macroend

!macro customUnInstall
  ; Custom uninstall steps
!macroend
