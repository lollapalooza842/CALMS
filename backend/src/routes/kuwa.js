// Kuwa, the talking guide on the public site (no sign-in).
//   POST /api/public/kuwa   { messages: [{ role: "user"|"kuwa", text }] }  ->  { reply, go: [...], human, source }
// human: true when the question needs a real person (their own application or account, a complaint, a payment problem,
// anything Kuwa can't answer from the facts, or the visitor asks for a person). The page then offers a live agent (routes/live.js).
// Kuwa answers questions about GR8 Lending's loans from what CALMS itself holds (the products and their rates, read live),
// through an AI service chosen by what is in the server's .env:
//   GEMINI_API_KEY     Google Gemini (has a free tier)      KUWA_MODEL to put a model first (default gemini-2.5-flash-lite, then 2.5-flash)
//   ANTHROPIC_API_KEY  Anthropic Claude                      KUWA_MODEL to change the model (default claude-haiku-4-5)
// With neither, Kuwa still answers the common questions from a small built-in list, so the site never shows him broken.
// Kuwa never sees or asks for anyone's personal details, cannot look up an application, and never promises approval.
// A visitor may ask 12 questions a minute and 150 a day (per address), so nobody can run up the bill.
const express = require("express");
const db = require("../db");
const loans = require("../lib/loans");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const peso = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- how often a visitor may ask ----
const hits = new Map();
function allowed(ip) {
  const now = Date.now(), h = hits.get(ip) || { min: [], day: 0, dayStart: now };
  if (now - h.dayStart > 864e5) { h.day = 0; h.dayStart = now; }
  h.min = h.min.filter((t) => now - t < 6e4);
  if (h.min.length >= 12 || h.day >= 150) { hits.set(ip, h); return false; }
  h.min.push(now); h.day++; hits.set(ip, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.dayStart > 864e5) hits.delete(k);
  return true;
}

// ---- what Kuwa knows: the loans as CALMS holds them, with worked examples so he never has to do the arithmetic ----
let facts = null, factsAt = 0;
async function knowledge() {
  if (facts && Date.now() - factsAt < 5 * 6e4) return facts;
  const { rows } = await db.query("select name, min_amount, max_amount, terms_months, monthly_rate, interest_method, processing_fee, late_penalty from loan_products order by min_amount");
  const lines = rows.map((p) => {
    const rate = Number(p.monthly_rate), terms = p.terms_months, fee = Number(p.processing_fee);
    const ex = [50000, 100000].filter((a) => a >= Number(p.min_amount) && a <= Number(p.max_amount)).map((a) => terms.map((t) =>
      `${peso(a)} over ${t} months: ${peso(loans.round(loans.installment(a, t, rate, p.interest_method)))} a month, fee ${peso(a * fee)}, you receive ${peso(a - a * fee)}`).join("; ")).join("; ");
    return `- ${p.name}: ${(rate * 100).toFixed(1)}% a month (${p.interest_method === "flat" ? "flat, on the amount borrowed" : "diminishing, on the balance left"}); borrow ${peso(p.min_amount)} to ${peso(p.max_amount)}; months ${terms.join(", ")}; processing fee ${(fee * 100).toFixed(1)}% taken from the release; late penalty ${(Number(p.late_penalty) * 100).toFixed(0)}% of the late amount per month late. Examples: ${ex || "none in range"}.`;
  });
  facts = lines.join("\n"); factsAt = Date.now(); return facts;
}

const SYSTEM = (products) => `You are Kuwa, the friendly owl guide of GR8 Lending Company (a lending company in Malolos, Bulacan, Philippines). You wear a cowboy hat and a red bandana; you are warm, plain-spoken and a little playful, never pushy. You speak on a website, and your replies are also read aloud, so:
- Answer in 1 to 3 short sentences (at most about 60 words). No lists, no markdown, no emojis.
- Use plain English. If the visitor writes in Filipino or Taglish, answer in the same easy Taglish.
- Only talk about GR8 Lending, its loans, applying, paying, and using this website. For anything else, say kindly that you only know about GR8 loans.
- Use ONLY the facts below. Never invent rates, fees, promos, phone numbers or addresses. If you do not know, say the branch can help.
- Never promise approval or an amount; an underwriter decides. Never ask for or repeat ID numbers, passwords, codes or account numbers. You cannot look up anyone's application: send them to the Track page or My GR8.
- Answer simple, general questions yourself. When the question needs a real person, say in one short sentence that someone from the GR8 team can help and end with the tag [[human]]. A person is needed for: anything about the visitor's own application, loan, balance, payment or documents; complaints, disputes or problems; restructuring, extensions or special requests; anything you cannot answer from the facts below; or when the visitor asks for a person, agent, staff or human. Never use [[human]] for questions the facts already answer.
- When a page would help, end your reply with one or two tags from this list, exactly as written: [[go:apply]] [[go:loans]] [[go:calc]] [[go:track]] [[go:signin]] [[go:downloads]] [[go:faq]]

FACTS
Loans (live from GR8's system):
${products}
How a loan goes: 1 apply online (about ten minutes) or with an agent; 2 a loan processor checks the ID and papers and says exactly what is missing; 3 an underwriter reviews income and the credit report (CIC); 4 decision: approved as asked, or a counter-offer the borrower may accept or decline at no cost; 5 the borrower reads and signs the agreement with every peso spelled out; 6 the money is released to GCash or a bank account and the payment schedule starts. The borrower gets a text at each step.
Papers: every loan needs a government ID (PhilSys, TIN, SSS, driver's license or passport) and the signed consent form. Salary loan: pay stubs, certificate of employment, proof of billing, bank statement. Personal loan: proof of income, proof of billing. SME loan: DTI or SEC registration, financial statements, proof of address, business permit, bank statements.
Paying: cash at the branch, bank deposit, GCash, salary deduction (salary loans), or cheque. Every payment gets a receipt in My GR8. A payment is applied to penalty first, then interest, then principal, oldest due first. Paying early is allowed.
Only one open application per kind of loan at a time. Borrowers sign in to My GR8 with their mobile number and a texted code. Tracking needs the reference number (like APP-2026-0412) and the mobile number. Staff use the CALMS app (Resources, Downloads).
Branch: Malolos, Monday to Saturday, 8:00 to 5:00. Privacy: only staff working on a loan can open its papers, ID numbers stay hidden unless needed, and every look is logged (Data Privacy Act of 2012).`;

// ---- when there is no AI key: the common questions, by keyword ----
const CANNED = [
  [/\b(agent|human|person|tao|representative|someone|complain|reklamo|problem|dispute|refund|my (loan|account|balance|payment|application))\b/i, "Someone from the GR8 team can help you with that. [[human]]"],
  [/paper|requirement|document|kailangan|need to apply/i, "Every loan needs a government ID and the signed consent form. A salary loan also asks for pay stubs and a certificate of employment, and an SME loan asks for your business registration and permit. [[go:loans]]"],
  [/how much|magkano|compute|monthly|calculat|interest|rate/i, "Rates start at 1.5% a month for SME loans, 1.6% for salary loans and 1.8% for personal loans. Slide the amount on the calculator and you'll see the monthly payment, the fee and the total. [[go:calc]]"],
  [/track|status|where is my|nasaan/i, "Type your reference number and the mobile number you applied with on the Track page, and I'll show you the step your loan is at. [[go:track]]"],
  [/pay|bayad|gcash|bank/i, "You can pay at the branch, by bank deposit, GCash, salary deduction or cheque. Every payment gets a receipt in My GR8. [[go:signin]]"],
  [/late|penalt|delay/i, "A late payment adds 3% of the late amount for every month or part of a month it stays unpaid, so it helps to pay what's due as soon as you can."],
  [/apply|loan|utang|borrow/i, "We have salary, personal and SME loans. Applying online takes about ten minutes, and a real person checks every step. [[go:apply]] [[go:loans]]"],
  [/hour|open|branch|where|address/i, "The Malolos branch is open Monday to Saturday, 8:00 to 5:00."],
  [/staff|employee|calms|download/i, "GR8 staff can download the CALMS app from Resources, or open CALMS in the browser. [[go:downloads]]"],
];
function canned(q) { for (const [re, a] of CANNED) if (re.test(q)) return a; return "Howdy! I can tell you about our loans, the papers you need, what a loan costs, or how to apply and pay. What would you like to know? [[go:loans]]"; }

// ---- the AI services ----
// Gemini: a light, fast model first; when Google says it is busy (or it takes too long), the next one is tried.
// KUWA_MODEL in .env puts a model of your choice first.
const GEMINI_MODELS = () => [...new Set([process.env.KUWA_MODEL, "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"].filter(Boolean))];
async function askGeminiModel(model, sys, msgs) {
  const generationConfig = { maxOutputTokens: 1200, temperature: .6 };
  if (/2\.5/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };   /* short answers: no thinking time, so replies come fast */
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(12000),
    body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: msgs.map((m) => ({ role: m.role === "kuwa" ? "model" : "user", parts: [{ text: m.text }] })), generationConfig }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((d.error && d.error.message) || "Gemini " + r.status); e.status = r.status; throw e; }
  const text = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini gave an empty answer");
  return text;
}
async function askGemini(sys, msgs) {
  let last; const t0 = Date.now();
  for (const model of GEMINI_MODELS()) {
    if (Date.now() - t0 > 18000) break;   /* the visitor has waited long enough: answer from the built-in list */
    try { return await askGeminiModel(model, sys, msgs); }
    catch (e) { last = e; console.error(`Kuwa (${model}):`, e.message);
      if (e.status && ![404, 429, 500, 503].includes(e.status)) throw e; }   /* a wrong key won't work on any model: stop */
  }
  throw last;
}
async function askClaude(sys, msgs) {
  const model = process.env.KUWA_MODEL || "claude-haiku-4-5";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ model, max_tokens: 300, system: sys, messages: msgs.map((m) => ({ role: m.role === "kuwa" ? "assistant" : "user", content: m.text })) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.message) || "Claude " + r.status);
  return (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
}

const GO = ["apply", "loans", "calc", "track", "signin", "downloads", "faq"];
function shape(text, source) {
  const go = []; let human = false;
  text = String(text || "").replace(/\[\[human\]\]/gi, () => { human = true; return ""; }).replace(/\[\[go:(\w+)\]\]/g, (_, k) => { if (GO.includes(k) && !go.includes(k)) go.push(k); return ""; })
    .replace(/[*_#`]/g, "").replace(/\s+/g, " ").trim();
  return { reply: text || "Sorry, partner, I lost my words for a second. Could you ask that again?", go: go.slice(0, 2), human, source };
}

router.get("/", (req, res) => res.json({ ai: process.env.GEMINI_API_KEY ? "gemini" : process.env.ANTHROPIC_API_KEY ? "claude" : "builtin" }));

router.post("/", wrap(async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
  if (!allowed(ip)) return res.status(429).json({ error: "Kuwa needs a short rest. Try again in a minute." });
  const msgs = (Array.isArray(req.body && req.body.messages) ? req.body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "kuwa") && typeof m.text === "string" && m.text.trim())
    .slice(-10).map((m) => ({ role: m.role, text: m.text.trim().slice(0, 600) }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();           /* the services want the user first */
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return res.status(400).json({ error: "Ask Kuwa something." });
  const last = msgs[msgs.length - 1].text;
  try {
    const sys = SYSTEM(await knowledge());
    if (process.env.GEMINI_API_KEY) return res.json(shape(await askGemini(sys, msgs), "gemini"));
    if (process.env.ANTHROPIC_API_KEY) return res.json(shape(await askClaude(sys, msgs), "claude"));
  } catch (e) { console.error("Kuwa:", e.message); }
  res.json(shape(canned(last), "builtin"));
}));

module.exports = router;
