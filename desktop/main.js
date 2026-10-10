// CALMS desktop app. Opens the same screens as the web version in their own window.
//
// It picks one of three ways to run, in this order:
//   1. Thin client.  CALMS_SERVER_URL is set: the window opens that address. The back end and the
//      database password live on one office server, not on each PC. Use this for a real office.
//   2. All in one.   DATABASE_URL is set: the Express back end starts inside this app, on this
//      computer only (127.0.0.1), and talks to Supabase. Use this for development and the demo.
//   3. Demo.         Neither is set (or the database cannot be reached, or you start with --demo):
//      the screens open straight from the folder with their built-in sample data.
//
// Settings are read from calms.env in the app's settings folder (menu: CALMS > Open settings
// folder), and while developing also from ../backend/.env.
const { app, BrowserWindow, Menu, shell, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const packaged = app.isPackaged;
const RES = packaged ? process.resourcesPath : path.join(__dirname, "..");
const FRONTEND = path.join(RES, "frontend");
const BACKEND = path.join(RES, "backend");
const ICON = path.join(__dirname, "build", "icon.png");
const DEMO_FLAG = process.argv.includes("--demo");

app.setName("CALMS");
if (process.platform === "win32") app.setAppUserModelId("ph.edu.bulsu.cpe3c.calms");

// ---- settings: KEY=value lines; values already in the environment win ----
function readEnv(file) {
  let text; try { text = fs.readFileSync(file, "utf8"); } catch (e) { return false; }
  text.split(/\r?\n/).forEach((line) => {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line); if (!m || line.trim().startsWith("#")) return;
    let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v !== "" && process.env[m[1]] === undefined) process.env[m[1]] = v;
  });
  return true;
}
function settingsFile() { return path.join(app.getPath("userData"), "calms.env"); }
function ensureSettingsFile() {
  const f = settingsFile(); if (fs.existsSync(f)) return f;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, [
    "# CALMS desktop settings. Lines starting with # are ignored. Restart CALMS after changing this file.",
    "#",
    "# Option 1, office server: the address where the CALMS back end is running.",
    "# CALMS_SERVER_URL=https://calms.example.com",
    "#",
    "# Option 2, all in one: this computer runs the back end and connects to Supabase itself.",
    "# Easiest: copy every line of backend\\.env (the one you use with npm start) to the end of this file.",
    "# DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
    "# SESSION_SECRET=a-long-random-string",
    "# DEV_MFA_CODE=246810",
    "# SMTP_USER=the-gmail-account-for-calms@gmail.com",
    "# SMTP_PASS=the 16-letter app password",
    "#",
    "# With neither set, CALMS opens with sample data.",
    "",
  ].join("\n"));
  return f;
}

// ---- the back end, inside this app ----
let server = null, mode = "demo", origin = null, why = "";
function listen(expressApp, port) {
  return new Promise((resolve, reject) => {
    const s = http.createServer(expressApp);
    s.once("error", reject);
    s.listen(port, "127.0.0.1", () => resolve(s));       // this computer only; nothing on the network can reach it
  });
}
function healthy(base) {
  return new Promise((resolve) => {
    const req = http.get(base + "/api/health", (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on("error", () => resolve(false)); req.setTimeout(8000, () => { req.destroy(); resolve(false); });
  });
}
async function startBackend() {
  if (!process.env.SESSION_SECRET) {                        // one secret per installation, made on first run
    const f = path.join(app.getPath("userData"), "session.key");
    try { process.env.SESSION_SECRET = fs.readFileSync(f, "utf8").trim(); } catch (e) {
      process.env.SESSION_SECRET = require("crypto").randomBytes(48).toString("hex");
      fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, process.env.SESSION_SECRET, { mode: 0o600 });
    }
  }
  const expressApp = require(path.join(BACKEND, "src", "server.js"));
  const want = Number(process.env.CALMS_DESKTOP_PORT || 3210);
  try { server = await listen(expressApp, want); } catch (e) { server = await listen(expressApp, 0); }   // 3210 taken: any free port
  const base = "http://127.0.0.1:" + server.address().port;
  if (!(await healthy(base))) { server.close(); server = null; throw new Error("The database did not answer."); }
  if (typeof expressApp.startJobs === "function") expressApp.startJobs();   // escalations, email, regulator reports
  return base;
}
// The address of the online CALMS, written into desktop/server.json before npm run dist.
// It holds no password: the back end and the database password stay on the server.
function builtInServer() {
  try { const u = String(JSON.parse(fs.readFileSync(path.join(__dirname, "server.json"), "utf8")).url || "").trim(); return /^https:\/\//.test(u) ? u.replace(/\/+$/, "") : ""; } catch (e) { return ""; }
}
async function decide() {
  if (DEMO_FLAG) { why = "Started with --demo."; return; }
  if (process.env.CALMS_SERVER_URL) { mode = "client"; origin = process.env.CALMS_SERVER_URL.replace(/\/+$/, ""); return; }
  if (!process.env.DATABASE_URL) {
    // No settings on this computer: use the online CALMS this installer was built for (desktop/server.json), if any.
    const built = builtInServer();
    if (built) { mode = "client"; origin = built; return; }
    why = "No database is set up yet."; return;
  }
  if (!fs.existsSync(path.join(BACKEND, "node_modules"))) { why = "The back end's packages are not installed (run npm install in the backend folder)."; return; }
  try { origin = await startBackend(); mode = "local"; } catch (e) { why = e.message || "The back end could not start."; }
}

// ---- the window ----
let win = null;
function inApp(url) {
  if (mode === "demo") return url.startsWith("file:");
  try { return new URL(url).origin === new URL(origin).origin; } catch (e) { return false; }
}
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 420, minHeight: 600,
    title: "CALMS", icon: ICON, backgroundColor: "#1a0f08", show: false, autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, autoplayPolicy: "no-user-gesture-required" },   // the intro's music may start by itself in the app
  });
  win.once("ready-to-show", () => { win.maximize(); win.show(); });
  win.on("page-title-updated", (e, title) => { e.preventDefault(); win.setTitle(mode === "demo" ? title + " (sample data)" : title); });
  // links to anywhere else open in the normal browser, never inside the app
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url) && !inApp(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!inApp(url)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.webContents.on("did-fail-load", (e, code, desc, url, isMain) => {
    if (!isMain || code === -3) return;
    dialog.showMessageBox(win, { type: "warning", title: "CALMS", message: "CALMS could not reach " + (mode === "client" ? "the office server." : "its back end."), detail: desc + "\n" + url, buttons: ["Try again", "Open with sample data", "Quit"], cancelId: 2 })
      .then((r) => { if (r.response === 0) win.reload(); else if (r.response === 1) { mode = "demo"; home(); } else app.quit(); });
  });
  win.on("closed", () => { win = null; });
  home();
}
function home() { if (mode === "demo") win.loadFile(path.join(FRONTEND, "index.html")); else win.loadURL(origin + "/index.html"); }

function menu() {
  const how = { demo: "Sample data (no database)", local: "This computer + Supabase", client: "Online: " + (origin || "").replace(/^https?:\/\//, "") }[mode];
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "CALMS", submenu: [
      { label: "Running on: " + how, enabled: false },
      { label: "Back to sign-in", click: () => win && home() },
      { type: "separator" },
      { label: "Open settings folder", click: () => shell.showItemInFolder(ensureSettingsFile()) },
      { type: "separator" },
      { role: "quit", label: "Quit CALMS" },
    ] },
    { label: "View", submenu: [
      { role: "reload" }, { role: "forceReload" }, { type: "separator" },
      { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" },
      { role: "togglefullscreen" }, { role: "toggleDevTools" },
    ] },
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
  ]));
}

// ---- start ----
if (!app.requestSingleInstanceLock()) { app.quit(); } else {
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(async () => {
    readEnv(ensureSettingsFile());
    if (!packaged) readEnv(path.join(BACKEND, ".env"));
    // nothing in CALMS needs the camera, microphone, location or notifications: refuse them all
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(false));
    await decide();
    menu(); createWindow();
    if (mode === "demo" && why && !DEMO_FLAG && process.env.DATABASE_URL) {
      dialog.showMessageBox(win, { type: "info", title: "CALMS", message: "Opened with sample data.", detail: why + "\n\nCheck the settings file (menu: CALMS > Open settings folder), then start CALMS again." });
    }
    if (process.env.CALMS_SELFTEST) selftest();
  });
  app.on("window-all-closed", () => { if (server) server.close(); app.quit(); });
}

// Used only by the project's own check: CALMS_SELFTEST=<png path> saves a picture of the window and quits.
function selftest() {
  const out = process.env.CALMS_SELFTEST;
  setTimeout(async () => {
    try { const img = await win.webContents.capturePage(); fs.writeFileSync(out, img.toPNG());
      const info = await win.webContents.executeJavaScript("JSON.stringify({url: location.href, app: window.CALMS && window.CALMS.app, online: window.CALMS && window.CALMS.online, cls: document.documentElement.className, fonts: [document.fonts.check('16px Ovo'), document.fonts.check('700 16px \"Courier Prime\"', '\\u20b1')]})");
      console.log("SELFTEST " + mode + " " + info + (why ? " WHY " + why : "")); } catch (e) { console.log("SELFTEST failed " + e.message); }
    app.quit();
  }, Number(process.env.CALMS_SELFTEST_WAIT || 4000));
}
