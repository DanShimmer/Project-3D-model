; Custom NSIS installer script
!macro customInit
  ; Check for running instance
  FindWindow $0 "" "Polyva 3D"
  StrCmp $0 0 notRunning
    MessageBox MB_OK|MB_ICONEXCLAMATION "Polyva 3D is currently running. Please close it before installing." /SD IDOK
    Abort
  notRunning:
!macroend

!macro customInstall
  ; Create file associations
  WriteRegStr HKCR ".p3d" "" "Polyva3DProject"
  WriteRegStr HKCR "Polyva3DProject" "" "Polyva 3D Project"
  WriteRegStr HKCR "Polyva3DProject\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCR "Polyva3DProject\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
!macroend

!macro customUnInstall
  ; Remove file associations
  DeleteRegKey HKCR ".p3d"
  DeleteRegKey HKCR "Polyva3DProject"
!macroend
