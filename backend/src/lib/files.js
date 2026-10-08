// Checks an uploaded file: only PDF, JPG and PNG, up to 10 MB, and the bytes must really be that
// kind of file (a renamed .exe is refused even if it is called "consent.pdf").
const crypto = require("crypto");

const MAX = 10 * 1024 * 1024;
const KINDS = [
  { mime: "application/pdf", ext: /\.pdf$/i, magic: [0x25, 0x50, 0x44, 0x46] },          // %PDF
  { mime: "image/jpeg", ext: /\.jpe?g$/i, magic: [0xff, 0xd8, 0xff] },
  { mime: "image/png", ext: /\.png$/i, magic: [0x89, 0x50, 0x4e, 0x47] },
];

// file: { name, data } where data is base64. Returns { error } or { name, mime, bytes, size, sha256 }.
function readUpload(file) {
  if (!file || typeof file.name !== "string" || typeof file.data !== "string") return { error: "Attach the file." };
  const name = file.name.replace(/[\\/]/g, "_").slice(0, 160).trim();
  const kind = KINDS.find((k) => k.ext.test(name));
  if (!kind) return { error: "That file type is not accepted. Use a PDF, JPG or PNG." };
  const bytes = Buffer.from(file.data, "base64");
  if (!bytes.length) return { error: "The file is empty." };
  if (bytes.length > MAX) return { error: "That file is larger than 10 MB. Scan it at a lower resolution and try again." };
  if (!kind.magic.every((b, i) => bytes[i] === b)) return { error: `“${name}” is not really a ${kind.mime === "application/pdf" ? "PDF" : kind.mime === "image/png" ? "PNG" : "JPG"} file.` };
  return { name, mime: kind.mime, bytes, size: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
}

module.exports = { readUpload, MAX };
