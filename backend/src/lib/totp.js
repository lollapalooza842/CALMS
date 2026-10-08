// Time-based one-time passwords (RFC 6238), the 6-digit codes an authenticator app shows.
const crypto = require("crypto");

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function fromBase32(text) {
  let bits = "";
  for (const ch of text.replace(/=+$/, "").toUpperCase()) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codeAt(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = crypto.createHmac("sha1", fromBase32(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  const number = (mac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(number).padStart(6, "0");
}

// Accepts the current code and the ones just before and after, to allow for clock drift.
function check(secret, code, now = Date.now()) {
  if (!secret || !/^\d{6}$/.test(code)) return false;
  const step = Math.floor(now / 30000);
  return [-1, 0, 1].some((d) => codeAt(secret, step + d) === code);
}

function newSecret() {
  let out = "";
  for (const b of crypto.randomBytes(20)) out += ALPHABET[b % 32];
  return out;
}

module.exports = { check, codeAt, newSecret };
