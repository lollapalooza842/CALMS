; The CALMS installer's western look (electron-builder includes this file; see "nsis" in package.json).
; The pictures are drawn by design/installer/make.py: installerSidebar.bmp (welcome and finish),
; uninstallerSidebar.bmp (Kuwa asleep), installerHeader.bmp (the strip at the top of the other pages).

; parchment pages with dark brown ink: the welcome and finish pages and the header strip
!define MUI_BGCOLOR "F3E3C3"
!define MUI_TEXTCOLOR "3F2414"

!macro customHeader
  BrandingText "CALMS ${VERSION} - GR8 Lending Company"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to CALMS Setup"
  !define MUI_WELCOMEPAGE_TEXT "This will install CALMS, the Credit Approval and Loan Management System of GR8 Lending Company, on this computer.$\r$\n$\r$\nCALMS opens in its own window, with a Start menu entry and a desktop shortcut.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend

; the finish page (electron-builder adds it, with "Run CALMS"): our words for it
!define MUI_FINISHPAGE_TITLE "CALMS is ready"
!define MUI_FINISHPAGE_TEXT "CALMS has been installed on this computer. You will find it in the Start menu and on your desktop.$\r$\n$\r$\nSign in with the username and password your System Administrator gave you."
!define MUI_FINISHPAGE_RUN_TEXT "Open CALMS now"

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Removing CALMS"
  !define MUI_WELCOMEPAGE_TEXT "This will remove CALMS from this computer. Kuwa will take a nap.$\r$\n$\r$\nYour records are not touched: they stay on the office server or in Supabase.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
