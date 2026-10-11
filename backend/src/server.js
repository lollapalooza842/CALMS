// CALMS back end. Serves the API under /api and the front end (../frontend) under /.
require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const db = require("./db");
const auth = require("./lib/auth");
const audit = require("./lib/audit");

const app = express();
app.set("trust proxy", 1);
app.use(compression());                      // the screens and the API answers travel zipped: several times smaller, so pages open faster
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'"],
    },
  },
}));
// Filing a paper sends the file inside the request (up to 10 MB, a third more once encoded),
// so these addresses accept bigger bodies; everything else stays small.
const bigJson = express.json({ limit: "15mb" });
app.post("/api/applications", bigJson);
app.post("/api/applications/:ref/documents", bigJson);
app.post("/api/applications/:ref/offers/:n/answer", bigJson);      // a photo of the borrower's signed answer
app.post("/api/applications/:ref/agreement/signed", bigJson);
app.post("/api/pdf", bigJson);                                     // a long audit-log extract as a PDF      // the scan of the signed agreement
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

// ---- the API ----
app.get("/api/health", async (req, res) => {
  try {
    await db.query("select 1");
    res.json({ ok: true, time: new Date().toISOString(), practice: require("./lib/practice").on() });   // practice: the practice code is accepted (index.js shows a ribbon)
  } catch (e) {
    res.status(503).json({ ok: false, error: "The database is not answering." });
  }
});
// Any change (a POST, PUT, PATCH or DELETE) clears what the server keeps for a few seconds to answer page loads fast:
// the signed-in users (lib/auth.js) and the side rail's counts (routes/queues.js).
app.use("/api", (req, res, next) => { if (req.method !== "GET") res.on("finish", () => { auth.forgetUser(); require("./routes/queues").forgetRail(); }); next(); });
app.use("/api/auth", require("./routes/auth"));
// Everything below needs a signed-in user (checked once per request).
app.use("/api", (req, res, next) => Promise.resolve(auth.requireUser(req, res, next)).catch(next));
app.use("/api/applications/:ref", require("./routes/verification"));
app.use("/api/applications/:ref", require("./routes/underwriting"));
app.use("/api/applications/:ref", require("./routes/servicing"));
app.use("/api", require("./routes/accounts"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/me", require("./routes/me"));
app.use("/api", require("./routes/admin"));
app.use("/api", require("./routes/oversight"));
app.use("/api", require("./routes/queues"));
app.use("/api", require("./routes/papers"));
app.get("/api/audit/verify", auth.allow("compliance_auditor", "system_administrator"), async (req, res, next) => {
  try {
    const broken = await audit.verify();
    res.json({ unbroken: broken === null, firstBrokenEntry: broken });
  } catch (e) { next(e); }
});
app.use("/api", (req, res) => res.status(404).json({ error: "No such address." }));

// ---- the front end ----
// Pictures, sounds and fonts hardly ever change: the browser keeps them for a day instead of asking again on every page.
// Pages, styles and scripts are checked each time (a quick "not changed" when they have not), so an update shows at once.
app.use(express.static(path.join(__dirname, "..", "..", "frontend"), { extensions: ["html"], setHeaders: (res, file) => {
  if (/\.(png|jpe?g|webp|gif|svg|ico|mp3|ogg|wav|woff2?|otf|ttf)$/i.test(file)) res.setHeader("Cache-Control", "public, max-age=86400");
  else res.setHeader("Cache-Control", "no-cache");
} }));

// ---- errors ----
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Try again." });
});

const port = Number(process.env.PORT || 3000);
// The jobs that run by themselves. Started by npm start below, and by the desktop app when it runs the back end inside itself.
let jobsStarted = false;
function startJobs() {
  if (jobsStarted) return; jobsStarted = true;
  // Every five minutes: escalate applications that have waited too long at one step.
  const sweep = () => require("./routes/queues").escalate().catch((e) => console.error("Escalation check failed:", e.message));
  setTimeout(sweep, 5000).unref(); setInterval(sweep, 5 * 60000).unref();
  // Every half hour: make the reports for the regulator that have come due (the 5th of the month, and Mondays).
  const reports = () => require("./routes/papers").runDue().then((n) => n && console.log(`Made ${n} scheduled report(s) for the regulator.`)).catch((e) => console.error("Scheduled reports failed:", e.message));
  setTimeout(reports, 15000).unref(); setInterval(reports, 30 * 60000).unref();
  // Every minute: queue new notices and borrower messages, and send what is waiting (only when email is connected).
  const mailer = () => require("./lib/outbox").tick().catch((e) => console.error("Email:", e.message));
  if (require("./lib/mail").configured()) console.log("Email is connected (" + process.env.SMTP_USER + ").");
  setTimeout(mailer, 20000).unref(); setInterval(mailer, 60000).unref();
}
app.startJobs = startJobs;
if (require.main === module) {
  startJobs();
  app.listen(port, () => { console.log(`CALMS is running at http://localhost:${port}`); if (require("./lib/practice").on()) console.log("PRACTICE MODE: the practice code (DEV_MFA_CODE) is accepted in place of the authenticator. Set DEV_MFA_CODE=off before real use."); })
    .on("error", (e) => {
      if (e.code !== "EADDRINUSE") throw e;
      console.error(`Port ${port} is already in use. CALMS is probably still running in another terminal window:`);
      console.error("close that window (or press Ctrl+C in it) and run npm start again.");
      console.error(`Or use another port: set PORT=${port + 1} in backend/.env`);
      process.exit(1);
    });
}
module.exports = app;
