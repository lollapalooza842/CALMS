// Practice mode: the code in DEV_MFA_CODE (6 digits) is accepted wherever an authenticator code is asked
// for, so a class demo works without phones. It is never on when NODE_ENV is "production".
// It is not hidden: /api/health reports it, the sign-in screen and every page show a "Practice mode"
// ribbon, the server says so when it starts, and the audit log notes each time the practice code is used.
// To switch it off: remove DEV_MFA_CODE (on Render: the service's Environment tab), or set NODE_ENV=production.
const CODE = () => String(process.env.DEV_MFA_CODE || "");
const on = () => process.env.NODE_ENV !== "production" && /^\d{6}$/.test(CODE());
const isCode = (code) => on() && String(code == null ? "" : code).trim() === CODE();
module.exports = { on, isCode };
