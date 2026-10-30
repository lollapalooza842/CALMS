# CALMS for Android

A small Android app that opens CALMS (https://calms-ww9l.onrender.com) in its own window: sign-in is kept, the
file picker works for uploading papers, the back button goes back a page, and links to other websites open in the
phone's own apps. The app itself is a WebView written in smali (`app/smali/ph/gr8/calms/`), so it builds without
Android Studio. The built file is `frontend/trail/files/CALMS.apk`, offered on the Downloads page.

- To point it at another address, change `calms-ww9l.onrender.com` in `MainActivity.smali` and `MainActivity$1.smali`.
- To build: `sh android/build.sh` (see the comments at its top).
- The signing key `calms.keystore` is not in git. Keep a copy: Android only accepts an update signed with the same key.
  Its password is in your notes, not here.
- Not on the Play Store, so phones show a one-time "unknown app" warning.
