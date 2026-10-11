// Practice mode: the practice code (246810 unless DEV_MFA_CODE says otherwise) is accepted wherever an
// authenticator code is asked for, so a class demo works without phones. It is ON by default for now,
// even on Render. A real authenticator code still works as well.
// It is not hidden: /api/health reports it, the sign-in screen and every page show a "Practice mode"
// ribbon, the server says so when it starts, and the audit log notes each time the practice code is used.
// To switch it off later: set DEV_MFA_CODE=off (on Render: the service's Environment tab).
const CODE = () => String(process.env.DEV_MFA_CODE || "246810");
const on = () => /^\d{6}$/.test(CODE());
const isCode = (code) => on() && String(code == null ? "" : code).trim() === CODE();
module.exports = { on, isCode };
