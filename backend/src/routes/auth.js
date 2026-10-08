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
const auth = require("../lib/auth");
const settings = require("../lib/settings");

const router = express.Router();
const MAX_ATTEMPTS = 5; // NFR-017
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

async function fail(user, req, why) {
  const attempts = user.failed_attempts + 1;
  const lock = attempts >= MAX_ATTEMPTS;
  await db.query("update users set failed_attempts = $1, locked_at = case when $2 then now() else locked_at end where id = $3",
    [attempts, lock, user.id]);
  await audit.write({ actor: "Unknown", kind: "login", action: lock ? "Failed sign-in; account locked" : "Failed sign-in",
    record: "User: " + user.username, after: { reason: why, attempts }, ip: req.ip });
  return lock;
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
  const wrong = { error: "That username or password is not right." };
  if (!user) {
    await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuuJ0yXv7b1rA5oG6oT1mVq0sVZ8m0b1eC"); // spend the same time
    return res.status(401).json(wrong);
  }
  if (!user.is_active) return res.status(403).json({ error: "This account has been deactivated. Ask the System Administrator." });
  if (user.locked_at) return res.status(423).json({ error: "This account is locked after too many wrong attempts. Ask the System Administrator to unlock it." });

  if (!(await bcrypt.compare(password, user.password_hash))) {
    const locked = await fail(user, req, "wrong password");
    return res.status(locked ? 423 : 401).json(locked
      ? { error: "Too many wrong attempts. The account is now locked; ask the System Administrator to unlock it." }
      : wrong);
  }

  if (auth.MFA_ROLES.includes(user.role) || user.mfa_enabled) {
    auth.setPending(res, user);
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
  const dev = process.env.NODE_ENV !== "production" && process.env.DEV_MFA_CODE && code === process.env.DEV_MFA_CODE;
  if (!dev && !totp.check(user.mfa_secret, code)) {
    const locked = await fail(user, req, "wrong code");
    return res.status(locked ? 423 : 401).json({ error: locked
      ? "Too many wrong attempts. The account is now locked."
      : "That code is not right. Check your authenticator and try the new one." });
  }
  await finish(user, req, res, true);
}));

async function finish(user, req, res, secondFactor) {
  await db.query("update users set failed_attempts = 0, last_sign_in_at = now() where id = $1", [user.id]);
  await audit.write({ user, kind: "login", action: secondFactor ? "Signed in with a second factor" : "Signed in",
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
