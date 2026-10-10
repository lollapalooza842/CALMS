// Signing in and out.
//   POST /api/auth/login   { username, password }  -> { step: "mfa" } or { step: "done", user }
//   POST /api/auth/verify  { code }                -> { step: "done", user }
//   POST /api/auth/logout
//   GET  /api/auth/me                              -> { user }
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const audit = require("../lib/audit");
const totp = require("../lib/totp");
const practice = require("../lib/practice");
const auth = require("../lib/auth");
const settings = require("../lib/settings");

const router = express.Router();
const MAX_ATTEMPTS = 5; // NFR-017
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// "3 tries left" for a name that does not exist must look the same as for a real one,
// or the count would tell a stranger which usernames are real. Unknown names are counted here,
// in memory only, and forgotten after half an hour.
const ghosts = new Map();
function ghostTry(name) {
  const now = Date.now();
  for (const [k, v] of ghosts) if (now - v.at > 30 * 60000) ghosts.delete(k);
  if (ghosts.size > 5000) ghosts.clear();
  const g = ghosts.get(name) || { n: 0, at: now }; g.n += 1; g.at = now; ghosts.set(name, g);
  return g.n;
}
const triesLeft = (n) => (n === 1 ? "1 try left" : n + " tries left") + " before the account locks.";
const LOCKED = "This account is locked after too many wrong attempts. Ask the System Administrator to unlock it.";

async function fail(user, req, why) {
  const attempts = user.failed_attempts + 1;
  const lock = attempts >= MAX_ATTEMPTS;
  await db.query("update users set failed_attempts = $1, locked_at = case when $2 then now() else locked_at end where id = $3",
    [attempts, lock, user.id]);
  await audit.write({ actor: "Unknown", kind: "login", action: lock ? "Failed sign-in; account locked" : "Failed sign-in",
    record: "User: " + user.username, after: { reason: why, attempts }, ip: req.ip });
  return { lock, left: MAX_ATTEMPTS - attempts };
}

router.post("/login", wrap(async (req, res) => {
  await settings.load();
  const username = String(req.body.username || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!username || !password) return res.status(400).json({ error: "Enter your username and password." });
  // Signing in ends whoever was signed in before on this browser, so a half-finished sign-in
  // (password given, code not yet) never leaves the previous person's session behind.
  res.clearCookie("calms_session", { path: "/" });

  const { rows } = await db.query("select * from users where username = $1", [username]);
  const user = rows[0];
  // The same message whether the username or the password is wrong, so neither can be guessed.
  const wrong = (left) => ({ error: "That username or password is not right. " + triesLeft(left), left });
  if (!user) {
    await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuuJ0yXv7b1rA5oG6oT1mVq0sVZ8m0b1eC"); // spend the same time
    const n = ghostTry(username);
    if (n > MAX_ATTEMPTS) return res.status(423).json({ error: LOCKED });
    if (n === MAX_ATTEMPTS) return res.status(423).json({ error: "Too many wrong attempts. The account is now locked; ask the System Administrator to unlock it." });
    return res.status(401).json(wrong(MAX_ATTEMPTS - n));
  }
  if (!user.is_active) return res.status(403).json({ error: "This account has been deactivated. Ask the System Administrator." });
  if (user.locked_at) return res.status(423).json({ error: LOCKED });

  if (!(await bcrypt.compare(password, user.password_hash))) {
    const f = await fail(user, req, "wrong password");
    return res.status(f.lock ? 423 : 401).json(f.lock
      ? { error: "Too many wrong attempts. The account is now locked; ask the System Administrator to unlock it." }
      : wrong(f.left));
  }

  if (auth.MFA_ROLES.includes(user.role) || user.mfa_enabled) {
    auth.setPending(res, user);
    if (!user.mfa_secret) {                 // no authenticator yet (a new account, or the administrator reset it): set one up now
      const secret = totp.newSecret();
      auth.setEnrol(res, user, secret);
      return res.json({ step: "enrol", secret, uri: `otpauth://totp/CALMS:${encodeURIComponent(user.username)}?secret=${secret}&issuer=CALMS` });
    }
    return res.json({ step: "mfa" });
  }
  await finish(user, req, res, false);
}));

router.post("/verify", wrap(async (req, res) => {
  const id = auth.readToken(req, "calms_pending", "pending");
  if (!id) return res.status(401).json({ error: "Sign in with your password first." });
  const { rows } = await db.query("select * from users where id = $1", [id]);
  const user = rows[0];
  if (!user || !user.is_active || user.locked_at) return res.status(401).json({ error: "Sign in again." });

  const code = String(req.body.code || "").trim();
  const enrolling = !user.mfa_secret, secret = enrolling ? auth.readEnrol(req, user.id) : user.mfa_secret;
  if (enrolling && !secret) return res.status(401).json({ error: "Setting up the authenticator took too long. Sign in again to get a new key." });
  const dev = practice.isCode(code);
  if (!dev && !totp.check(secret, code)) {
    const f = await fail(user, req, "wrong code");
    return res.status(f.lock ? 423 : 401).json({ error: f.lock
      ? "Too many wrong attempts. The account is now locked; ask the System Administrator to unlock it."
      : "That code is not right. Check your authenticator and try the new one. " + triesLeft(f.left), left: f.left });
  }
  if (enrolling) {
    await db.transaction(async (tx) => {
      await tx.query("update users set mfa_secret = $2, mfa_enabled = true where id = $1", [user.id, secret]);
      await audit.write({ user, kind: "login", action: "Set up own authenticator at first sign-in", record: "User: " + user.username, after: { secondFactor: "on, new authenticator" }, ip: req.ip }, tx);
    });
    res.clearCookie("calms_enrol", { path: "/" });
  }
  await finish(user, req, res, dev ? "practice" : true);
}));

async function finish(user, req, res, secondFactor) {
  await db.query("update users set failed_attempts = 0, last_sign_in_at = now() where id = $1", [user.id]);
  await audit.write({ user, kind: "login", action: secondFactor === "practice" ? "Signed in with the practice code (practice mode)" : secondFactor ? "Signed in with a second factor" : "Signed in",
    record: "User: " + user.username, ip: req.ip });
  res.clearCookie("calms_pending", { path: "/" });
  auth.setSession(res, user);
  res.json({ step: "done", user: auth.publicUser(user) });
}

router.post("/logout", wrap(async (req, res) => {
  const id = auth.readToken(req, "calms_session", "session");
  if (id) {
    const { rows } = await db.query("select * from users where id = $1", [id]);
    if (rows[0]) await audit.write({ user: rows[0], kind: "login", action: "Signed out", record: "User: " + rows[0].username, ip: req.ip });
  }
  auth.clear(res);
  res.json({ ok: true });
}));

router.get("/me", auth.requireUser, (req, res) => res.json({ user: auth.publicUser(req.user) }));

module.exports = router;
