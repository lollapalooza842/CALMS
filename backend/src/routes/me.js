// My profile: the signed-in person's own account.
//   GET  /api/me                          who I am, how to reach me, my notice choices, my sign-in settings
//   PUT  /api/me/mobile                   { mobile }
//   PUT  /api/me/notifications            { prefs, quiet }
//   POST /api/me/password                 { current, next }      ends every other session
//   POST /api/me/mfa/start                                       a new authenticator key (not saved until confirmed)
//   POST /api/me/mfa/confirm              { token, code }
//   POST /api/me/mfa/off                  { password }           only where the role does not require it
//   POST /api/me/sign-out-others
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const audit = require("../lib/audit");
const auth = require("../lib/auth");
const totp = require("../lib/totp");
const { DEFAULT_PREFS } = require("./oversight");
const mail = require("../lib/mail");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const me = async (id) => (await db.query("select * from users where id = $1", [id])).rows[0];
const when = (d) => (d ? new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "");
const rec = (u) => "User: " + u.username;

// Password rules (NFR): at least 12 characters and three kinds of character.
function pwProblem(p) {
  if (p.length < 12) return "Use at least 12 characters.";
  if ([/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length < 3) return "Use at least three of: small letters, capital letters, numbers, symbols.";
  if (p.length > 200) return "That password is too long.";
  return "";
}

router.get("/", wrap(async (req, res) => {
  const u = req.user;
  const signIns = (await db.query("select at, ip from audit_log where user_id = $1 and kind = 'login' and action like 'Signed in%' order by id desc limit 2", [u.id])).rows;
  res.json({
    user: { ...auth.publicUser(u), email: u.email, mobile: u.mobile || "", branch: u.branch || "Malolos" },
    signedIn: signIns[0] ? when(signIns[0].at) : "", before: signIns[1] ? when(signIns[1].at) + (signIns[1].ip ? ", from " + signIns[1].ip : "") : "",
    mfa: { on: auth.MFA_ROLES.includes(u.role) || u.mfa_enabled, required: auth.MFA_ROLES.includes(u.role) },
    prefs: Array.isArray(u.notify_prefs) ? u.notify_prefs : DEFAULT_PREFS, quiet: u.quiet_hours || { on: false, from: "19:00", to: "07:00" },
    passwordChanged: when(u.password_changed_at), mustChangePassword: !!u.must_change_password,
    mail: { on: mail.configured(), deliverable: mail.deliverable(u.email) },
  });
}));

router.put("/mobile", wrap(async (req, res) => {
  const d = String(req.body.mobile || "").replace(/\D/g, "");
  if (d && !/^09\d{9}$/.test(d)) return res.status(400).json({ error: "That is not a mobile number. It needs 11 digits starting with 09.", field: "mob" });
  await db.query("update users set mobile = $2 where id = $1", [req.user.id, d || null]);
  await audit.write({ user: req.user, kind: "data", action: "Changed own mobile number", record: rec(req.user), before: { mobile: req.user.mobile || "none" }, after: { mobile: d || "none" }, ip: req.ip });
  res.json({ mobile: d });
}));

router.put("/notifications", wrap(async (req, res) => {
  const p = req.body.prefs, q = req.body.quiet || {};
  if (!Array.isArray(p) || p.length !== DEFAULT_PREFS.length || p.some((r) => !Array.isArray(r) || r.length !== 3)) return res.status(400).json({ error: "Those choices could not be read." });
  const prefs = p.map((r, i) => r.map((v, j) => ((i === 6 || i === 7) && j === 0 ? 1 : v ? 1 : 0)));  // the two "always sent" kinds always show inside CALMS
  const hh = /^([01]\d|2[0-3]):00$/, quiet = { on: !!q.on, from: hh.test(q.from) ? q.from : "19:00", to: hh.test(q.to) ? q.to : "07:00" };
  if (quiet.on && quiet.from === quiet.to) return res.status(400).json({ error: "The quiet hours start and end at the same time; choose two different times." });
  await db.query("update users set notify_prefs = $2, quiet_hours = $3 where id = $1", [req.user.id, JSON.stringify(prefs), JSON.stringify(quiet)]);
  res.json({ prefs, quiet });
}));

router.post("/password", wrap(async (req, res) => {
  const cur = String(req.body.current || ""), next = String(req.body.next || ""), u = await me(req.user.id);
  if (!(await bcrypt.compare(cur, u.password_hash))) return res.status(400).json({ error: "Your current password is not right.", field: "cur" });
  const p = pwProblem(next); if (p) return res.status(400).json({ error: p, field: "nw" });
  if (next === cur) return res.status(400).json({ error: "The new password must be different from the current one.", field: "nw" });
  const old = (await db.query("select hash from password_history where user_id = $1 order by id desc limit 4", [u.id])).rows;
  for (const h of old) if (await bcrypt.compare(next, h.hash)) return res.status(400).json({ error: "That is one of your last five passwords. Choose a new one.", field: "nw" });
  const hash = await bcrypt.hash(next, 10);
  const fresh = await db.transaction(async (tx) => {
    await tx.query("insert into password_history (user_id, hash) values ($1, $2)", [u.id, u.password_hash]);
    const r = await tx.query("update users set password_hash = $2, password_changed_at = now(), must_change_password = false, session_version = session_version + 1 where id = $1 returning *", [u.id, hash]);
    await audit.write({ user: u, kind: "login", action: "Changed own password", record: rec(u), after: { note: "Every other session was ended" }, ip: req.ip }, tx);
    return r.rows[0];
  });
  auth.setSession(res, fresh); // this window stays signed in
  res.json({ ok: true });
}));

const SECRET = process.env.SESSION_SECRET;
router.post("/mfa/start", wrap(async (req, res) => {
  const u = req.user;
  if (auth.MFA_ROLES.includes(u.role) && u.mfa_secret) return res.status(409).json({ error: "Your role always uses a second factor, and yours is already set up." });
  const secret = totp.newSecret();
  const token = jwt.sign({ sub: u.id, kind: "mfa-setup", secret }, SECRET, { expiresIn: 600 });
  res.json({ token, secret, uri: `otpauth://totp/CALMS:${encodeURIComponent(u.username)}?secret=${secret}&issuer=CALMS` });
}));
router.post("/mfa/confirm", wrap(async (req, res) => {
  let t; try { t = jwt.verify(String(req.body.token || ""), SECRET); } catch { t = null; }
  if (!t || t.kind !== "mfa-setup" || t.sub !== req.user.id) return res.status(400).json({ error: "The set-up took too long. Start again." });
  const code = String(req.body.code || "").trim();
  const dev = process.env.NODE_ENV !== "production" && process.env.DEV_MFA_CODE && code === process.env.DEV_MFA_CODE;
  if (!dev && !totp.check(t.secret, code)) return res.status(400).json({ error: "That code is not right. Type the 6 digits your authenticator shows now.", field: "code" });
  await db.transaction(async (tx) => {
    await tx.query("update users set mfa_enabled = true, mfa_secret = $2 where id = $1", [req.user.id, t.secret]);
    await audit.write({ user: req.user, kind: "login", action: "Turned on own second factor", record: rec(req.user), before: { secondFactor: req.user.mfa_enabled ? "on" : "off" }, after: { secondFactor: "on, new authenticator" }, ip: req.ip }, tx);
  });
  res.json({ on: true });
}));
router.post("/mfa/off", wrap(async (req, res) => {
  const u = await me(req.user.id);
  if (auth.MFA_ROLES.includes(u.role)) return res.status(409).json({ error: "Your role requires a second factor, so it cannot be switched off." });
  if (!(await bcrypt.compare(String(req.body.password || ""), u.password_hash))) return res.status(400).json({ error: "Type your password to switch it off.", field: "mfapw" });
  await db.transaction(async (tx) => {
    await tx.query("update users set mfa_enabled = false where id = $1", [u.id]);
    await audit.write({ user: u, kind: "login", action: "Turned off own second factor", record: rec(u), before: { secondFactor: "on" }, after: { secondFactor: "off" }, ip: req.ip }, tx);
  });
  res.json({ on: false });
}));

router.post("/sign-out-others", wrap(async (req, res) => {
  const r = await db.query("update users set session_version = session_version + 1 where id = $1 returning *", [req.user.id]);
  await audit.write({ user: req.user, kind: "login", action: "Signed out every other session", record: rec(req.user), ip: req.ip });
  auth.setSession(res, r.rows[0]);
  res.json({ ok: true });
}));

module.exports = router;
