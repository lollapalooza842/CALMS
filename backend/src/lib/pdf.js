// Real PDF files for the papers CALMS issues and for exported tables (audit log, reports).
// Made on the server so they come out the same in every browser and in the desktop app.
//   paper(d)  a numbered paper on the letterhead: d = { title, number, period?, to?, issuedAt, issuedBy, company, sections, signs }
//             sections: { h } heading, { p } paragraph, { pre } fixed-width block, { rows: [[k, v]] }, { table: { head, rows } }
//   table(t)  t = { title, sub, rows } (the first row is the header), landscape when wide
const path = require("path");
const PDFDocument = require("pdfkit");

const FONTS = path.join(__dirname, "..", "..", "fonts");
const F = { body: path.join(FONTS, "DejaVuSans.ttf"), bold: path.join(FONTS, "DejaVuSans-Bold.ttf"), head: path.join(FONTS, "DejaVuSerif-Bold.ttf"), mono: path.join(FONTS, "DejaVuSansMono.ttf") };
const INK = "#21170F", MUTED = "#5B4A3A", RULE = "#B8A68E", SHADE = "#F3ECE1", HEAD = "#E7DCCB";
const s = (v) => (v == null ? "" : String(v));

function start(opts) {
  const doc = new PDFDocument({ size: "A4", margins: { top: 46, bottom: 50, left: 44, right: 44 }, bufferPages: true, ...opts });
  Object.entries(F).forEach(([k, f]) => doc.registerFont(k, f));
  doc.font("body").fontSize(9.5).fillColor(INK);
  return doc;
}
function finish(doc, footer) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - 34, w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const m = doc.page.margins.bottom; doc.page.margins.bottom = 0;
    doc.font("body").fontSize(7.5).fillColor(MUTED).text(footer, doc.page.margins.left, y, { width: w - 70, lineBreak: false, ellipsis: true });
    doc.text(`Page ${i + 1} of ${range.count}`, doc.page.margins.left + w - 70, y, { width: 70, align: "right", lineBreak: false });
    doc.page.margins.bottom = m;
  }
  doc.end();
  return new Promise((resolve, reject) => { const out = []; doc.on("data", (c) => out.push(c)); doc.on("end", () => resolve(Buffer.concat(out))); doc.on("error", reject); });
}
const left = (doc) => doc.page.margins.left;
const width = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;
const room = (doc, h) => { if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage(); };

// A table with wrapped cells; the header repeats on each new page. widths: fractions of the full width.
function grid(doc, head, rows, widths, o = {}) {
  const W = width(doc), x0 = left(doc), pad = 4, size = o.size || 8.5;
  const cols = widths.map((f) => f * W);
  const heightOf = (cells, font) => Math.max(...cells.map((c, i) => doc.font(o.keyCol && i === 0 && font !== "bold" ? "bold" : font).fontSize(size).heightOfString(s(c), { width: cols[i] - pad * 2 }))) + pad * 2;
  const draw = (cells, font, fill, keyCol) => {
    const h = heightOf(cells, font); room(doc, h);
    const y = doc.y; let x = x0;
    cells.forEach((c, i) => {
      const bg = fill || (keyCol && i === 0 ? SHADE : null);
      if (bg) doc.rect(x, y, cols[i], h).fill(bg);
      doc.rect(x, y, cols[i], h).lineWidth(0.5).stroke(RULE);
      doc.fillColor(INK).font(keyCol && i === 0 ? "bold" : font).fontSize(size).text(s(c), x + pad, y + pad, { width: cols[i] - pad * 2, align: o.right && o.right.includes(i) && font !== "bold" ? "right" : "left" });
      x += cols[i];
    });
    doc.x = x0; doc.y = y + h;
  };
  if (head) draw(head, "bold", HEAD);
  rows.forEach((r) => {
    if (head && doc.y + heightOf(r, "body") > doc.page.height - doc.page.margins.bottom) { doc.addPage(); draw(head, "bold", HEAD); }
    draw(r, "body", null, o.keyCol);
  });
  doc.moveDown(0.6);
}
// Column widths: every column is at least as wide as its longest word (so names never break mid-word),
// and the room left is shared by how much text each column usually holds.
function widthsFor(head, rows, W, size) {
  const sample = rows.slice(0, 400), cw = size * 0.72, n = head.length;
  const longestWord = (v) => Math.max(0, ...s(v).split(/\s+/).map((w) => Math.min(w.length, 28)));
  const min = head.map((h, i) => (Math.max(longestWord(h), ...sample.map((r) => longestWord(r[i]))) * cw + 10));
  const avg = head.map((h, i) => Math.max(3, sample.reduce((t, r) => t + Math.min(80, s(r[i]).length), 0) / Math.max(1, sample.length)));
  let total = min.reduce((a, b) => a + b, 0);
  if (total >= W) return min.map((m) => m / total);
  const spare = W - total, sum = avg.reduce((a, b) => a + b, 0);
  return min.map((m, i) => (m + spare * avg[i] / sum) / W);
}

async function paper(d) {
  const doc = start({ info: { Title: `${s(d.title)} ${s(d.number)}`, Author: s((d.company || {}).name) || "CALMS" } });
  const c = d.company || {}, W = width(doc), x0 = left(doc);
  // letterhead
  doc.font("head").fontSize(17).fillColor(INK).text(c.name || "GR8 Lending Company", x0, doc.y, { width: W * 0.6 });
  doc.font("body").fontSize(9).fillColor(MUTED).text(s(c.address), x0, doc.y, { width: W * 0.6 });
  const reg = [c.secNo && "SEC Registration No. " + c.secNo, c.caNo && "Certificate of Authority No. " + c.caNo].filter(Boolean).join(" · ");
  const right = [reg, [c.phone, c.email].filter(Boolean).join(" · ")].filter(Boolean).join("\n");
  if (right) doc.fontSize(8.5).text(right, x0 + W * 0.45, 48, { width: W * 0.55, align: "right" });
  doc.y = Math.max(doc.y, 86); doc.moveTo(x0, doc.y).lineTo(x0 + W, doc.y).lineWidth(1.5).stroke(INK); doc.moveDown(0.15);
  doc.moveTo(x0, doc.y).lineTo(x0 + W, doc.y).lineWidth(0.5).stroke(INK); doc.moveDown(1);
  // title
  doc.font("head").fontSize(15).fillColor(INK).text(s(d.title).toUpperCase(), x0, doc.y, { characterSpacing: 0.6 });
  const when = d.issuedAt ? new Date(d.issuedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  doc.font("body").fontSize(9).fillColor(MUTED).text(["No. " + s(d.number), d.period && "Period: " + d.period.label, d.to, when && "Issued " + when].filter(Boolean).join("  ·  "));
  doc.moveDown(0.8);
  for (const x of d.sections || []) {
    if (x.h) { room(doc, 40); doc.moveDown(0.3); doc.font("bold").fontSize(10.5).fillColor(INK).text(s(x.h), x0); const y = doc.y + 1; doc.moveTo(x0, y).lineTo(x0 + W, y).lineWidth(0.5).stroke(RULE); doc.moveDown(0.4); }
    if (x.p) { doc.font("body").fontSize(9.5).fillColor(INK).text(s(x.p), x0, doc.y, { width: W, lineGap: 1.5 }); doc.moveDown(0.6); }
    if (x.pre) { doc.font("mono").fontSize(8.5); const h = doc.heightOfString(s(x.pre), { width: W - 16 }) + 14; room(doc, Math.min(h, 200)); const y = doc.y;
      doc.rect(x0, y, W, h).lineWidth(0.5).stroke(RULE); doc.fillColor(INK).text(s(x.pre), x0 + 8, y + 7, { width: W - 16 }); doc.x = x0; doc.y = Math.max(doc.y, y + h); doc.moveDown(0.6); }
    if (x.rows) grid(doc, null, x.rows.map((r) => [r[0], r[1]]), [0.34, 0.66], { keyCol: true, size: 9 });
    if (x.table && x.table.head) {
      const money = x.table.head.map((h, i) => i).filter((i) => x.table.rows.some((r) => /^₱|^-?₱/.test(s(r[i]))));
      grid(doc, x.table.head, x.table.rows, widthsFor(x.table.head, x.table.rows, W, 8.5), { right: money, size: 8.5 });
    }
  }
  const by = d.issuedBy || {};
  if (d.signs) {
    room(doc, 80); doc.moveDown(2.5); const y = doc.y, half = (W - 40) / 2;
    doc.moveTo(x0, y).lineTo(x0 + half, y).lineWidth(0.7).stroke(INK); doc.moveTo(x0 + half + 40, y).lineTo(x0 + W, y).stroke(INK);
    doc.font("body").fontSize(9).fillColor(INK).text("Prepared by: " + s(by.name) + (by.role ? ", " + by.role : ""), x0, y + 4, { width: half });
    doc.text("Certified correct: authorized officer", x0 + half + 40, y + 4, { width: half });
  } else { doc.moveDown(0.8); doc.font("body").fontSize(9).fillColor(MUTED).text("Issued by " + s(by.name) + (by.role ? ", " + by.role : "") + ".", x0); }
  return finish(doc, `Made by CALMS for ${c.name || "GR8 Lending Company"}. Kept on record as No. ${s(d.number)}; reprints are logged.`);
}

async function table(t) {
  const head = t.rows[0] || [], rows = t.rows.slice(1), wide = head.length > 5;
  const doc = start({ layout: wide ? "landscape" : "portrait", info: { Title: s(t.title), Author: "CALMS" } });
  doc.font("head").fontSize(15).fillColor(INK).text(s(t.title)); doc.font("body").fontSize(9).fillColor(MUTED).text(s(t.sub)); doc.moveDown(0.8);
  if (!rows.length) doc.font("body").fontSize(10).fillColor(INK).text("Nothing to show.");
  else grid(doc, head, rows, widthsFor(head, rows, width(doc), wide ? 7.5 : 8.5), { size: wide ? 7.5 : 8.5 });
  return finish(doc, s(t.title) + " · made by CALMS on " + new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }));
}

module.exports = { paper, table };
