// Sessions and access control.
// A session is a signed cookie that lasts SESSION_IDLE_MINUTES and is renewed on every request,
// so it ends after that long without activity (FR-114).
const jwt = require("jsonwebtoken");
const db = require("../db");
const settings = require("./settings");

// How long a session lasts without activity: the System Administrator sets it on Products and rules.
const idleMinutes = () => Number(settings.now().idle_minutes) || 15;
const SECRET = process.env.SESSION_SECRET;
if (!SECRET || SECRET.length < 32) {
  console.error("SESSION_SECRET is missing or too short (use at least 32 characters).");
  process.exit(1);
}

// Roles that must always pass a second factor (FR-112): approval, disbursement, administration.
const MFA_ROLES = ["underwriter", "lead_underwriter", "operations_manager", "disbursement_officer", "system_administrator"];   // the Operations Manager signs the largest approvals

const ROLE_NAMES = {
  sales_agent: "Sales Agent", loan_processor: "Loan Processor", underwriter: "Underwriter",
  lead_underwriter: "Lead Underwriter", disbursement_officer: "Disbursement Officer",
  loan_account_officer: "Loan Account Officer", operations_manager: "Operations Manager",
  compliance_auditor: "Compliance Auditor", system_administrator: "System Administrator",
};

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "1", maxAge: maxAgeMs, path: "/",
});

// sv: the account's session version. Raising it (password changed, "sign out everywhere", deactivated)
// ends every session made before.
function setSession(res, user) {
  const m = idleMinutes();
  const token = jwt.sign({ sub: user.id, kind: "session", sv: user.session_version || 0 }, SECRET, { expiresIn: m * 60 });
  res.cookie("calms_session", token, cookieOptions(m * 60000));
}

// Between the password step and the code step: proves the password was right, for five minutes.
function setPending(res, user) {
  const token = jwt.sign({ sub: user.id, kind: "pending" }, SECRET, { expiresIn: 300 });
  res.cookie("calms_pending", token, cookieOptions(300000));
}

// First sign-in of someone who must use a second factor but has no authenticator yet: the new key,
// held in a signed cookie for ten minutes until they type a code from it (routes/auth.js).
function setEnrol(res, user, secret) {
  const token = jwt.sign({ sub: user.id, kind: "enrol", secret }, SECRET, { expiresIn: 600 });
  res.cookie("calms_enrol", token, cookieOptions(600000));
}
const readEnrol = (req, userId) => { const d = readPayload(req, "calms_enrol", "enrol"); return d && d.sub === userId ? d.secret : null; };

function readPayload(req, name, kind) {
  try {
    const data = jwt.verify(req.cookies[name] || "", SECRET);
    return data.kind === kind ? data : null;
  } catch {
    return null;
  }
}
const readToken = (req, name, kind) => { const d = readPayload(req, name, kind); return d ? d.sub : null; };

function clear(res) {
  res.clearCookie("calms_session", { path: "/" });
  res.clearCookie("calms_pending", { path: "/" });
  res.clearCookie("calms_enrol", { path: "/" });
}

function publicUser(u) {
  return { id: u.id, username: u.username, name: u.full_name, shortName: u.short_name, role: u.role, roleName: ROLE_NAMES[u.role], mustChangePassword: !!u.must_change_password };
}

// Each page asks the server for several things at once, and every request checks the user again. The user's row is
// kept for a few seconds so those checks cost one database trip, not one each. A sign-out, lock or deactivation still
// takes effect within that time (and at once for anything that changes the row: forgetUser).
const USERS_FOR = 5000, users = new Map();
async function userById(id) {
  const k = users.get(id); if (k && Date.now() - k.t < USERS_FOR) return k.u;
  const { rows } = await db.query("select * from users where id = $1", [id]);
  if (rows[0]) users.set(id, { t: Date.now(), u: rows[0] }); else users.delete(id);
  return rows[0];
}
function forgetUser(id) { if (id) users.delete(id); else users.clear(); }

// Middleware: the request must come from a signed-in, active user.
async function requireUser(req, res, next) {
  const tok = readPayload(req, "calms_session", "session");
  if (!tok) return res.status(401).json({ error: "Please sign in." });
  await settings.load();
  const user = await userById(tok.sub);
  if (!user || !user.is_active) {
    clear(res);
    return res.status(401).json({ error: "This account can no longer sign in." });
  }
  if ((tok.sv || 0) !== (user.session_version || 0)) {
    clear(res);
    return res.status(401).json({ error: "You were signed out. Please sign in again." });
  }
  req.user = user;
  setSession(res, user); // sliding expiry
  next();
}

// Middleware: the user's role must be one of these (FR-111).
const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "Your role cannot open this." });

module.exports = { forgetUser, MFA_ROLES, ROLE_NAMES, idleMinutes, setSession, setPending, setEnrol, readEnrol, readToken, clear, publicUser, requireUser, allow };
