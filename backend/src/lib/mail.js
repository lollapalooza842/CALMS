// Email through any SMTP server; for this project, a Gmail account with an app password.
// Set SMTP_USER and SMTP_PASS in backend/.env (see .env.example). Without them email is "not connected".
const nodemailer = require("nodemailer");
const settings = require("./settings");

let transporter = null;
const configured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);
const account = () => process.env.SMTP_USER || "";

function transport() {
  if (!configured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com", port, secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: String(process.env.SMTP_PASS).replace(/\s+/g, "") }, // Google shows app passwords in groups of four
      connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000,
    });
  }
  return transporter;
}

function from() {
  const name = ((settings.now().company || {}).name || "GR8 Lending Company").replace(/["<>]/g, "");
  return process.env.MAIL_FROM || `"${name}" <${account()}>`;
}

// Throws with a plain message if it cannot send.
async function send(to, subject, text) {
  const t = transport();
  if (!t) throw new Error("Email is not connected.");
  try {
    return await t.sendMail({ from: from(), to, subject, text });
  } catch (e) {
    throw new Error(plain(e));
  }
}
async function check() {
  const t = transport(); if (!t) return { st: "off" };
  const t0 = Date.now();
  try { await t.verify(); return { st: Date.now() - t0 > 5000 ? "slow" : "ok", ms: Date.now() - t0 }; }
  catch (e) { return { st: "down", ms: Date.now() - t0, detail: plain(e) }; }
}
function plain(e) {
  const m = String(e && e.message || e);
  if (/Invalid login|Username and Password not accepted|535/i.test(m)) return "Gmail refused the sign-in. Check SMTP_USER, and that SMTP_PASS is an app password (not your normal Gmail password).";
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|timeout/i.test(m)) return "Could not reach the mail server. Check the internet connection.";
  return m.slice(0, 200);
}
// Addresses under .example can never receive mail (the sample accounts use them).
const deliverable = (a) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a || "") && !/\.(example|test|invalid|localhost)$/i.test(a);

module.exports = { configured, account, send, check, deliverable };
