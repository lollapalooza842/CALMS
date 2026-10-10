# CALMS desktop app

The same CALMS screens in their own window, with a Start menu entry, a taskbar
icon and an installer. Built with Electron. Nothing in `frontend/` is copied:
the app opens those files directly.

## Run it

You need Node.js 18 or newer.

```
cd desktop
npm install        # once; downloads Electron (about 100 MB)
npm start
```

`npm run demo` always opens with sample data, even when a database is set up.

## Three ways it can run

The app decides when it starts. The menu **CALMS > Running on** shows which one it picked.

| Mode | When | What happens |
|---|---|---|
| Sample data | No database is set up, the database cannot be reached, or `npm run demo` | The screens open from the folder with their built-in sample data, as when you open `frontend/index.html` in a browser. The window title says "(sample data)". |
| This computer + Supabase | `DATABASE_URL` is set | The Express back end starts inside the app, on this computer only (127.0.0.1, port 3210), and talks to Supabase. Run `npm install` in `backend/` once first. |
| Office server | `CALMS_SERVER_URL` is set | The window opens that address. The back end and the database password stay on one server, not on every PC. This is the right setup for a real office. |

## Settings

While developing, the app reads `backend/.env`, the same file the back end uses.

The installed app reads `calms.env` in its settings folder. Open it from the
menu **CALMS > Open settings folder** (press Alt if the menu bar is hidden). The
file explains itself; restart CALMS after changing it.

On first run with a database, the app makes its own session secret and keeps it
in `session.key` in the same folder, unless `SESSION_SECRET` is set.

## Build the installer

```
npm run dist             # Windows installer: desktop/dist/CALMS Setup 0.1.0.exe
npm run dist:portable    # a single CALMS.exe that runs without installing
```

Run `npm install` in `backend/` before building, so the back end's packages go
into the installer. Your `.env` is never included.

Windows will warn that the installer is from an unknown publisher, because it is
not code-signed. Click **More info > Run anyway**. Signing needs a paid
certificate and is not needed for the defense.

## Safety choices

- The window cannot run Node.js code from the pages (context isolation,
  sandbox, no node integration). The pages are the same ones a browser gets.
- The built-in back end listens on 127.0.0.1 only; other computers on the
  network cannot reach it.
- Links to other websites open in the normal browser, never inside CALMS.
- Camera, microphone, location and notification requests are refused.
- Only one CALMS window runs at a time; opening it again focuses the first.

## Files

- `main.js`: the whole app: picks the mode, starts the back end, opens the window, builds the menu.
- `package.json`: scripts and the installer settings (`build`).
- `build/icon.ico`, `build/icon.png`: the app icon, drawn by `design/app-icon/app_icon.py`.
