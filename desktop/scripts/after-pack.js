// Runs while the installer is being built. Copies the back end, with its installed packages,
// next to the app. (electron-builder leaves node_modules out of extraResources on purpose,
// so the back end is copied here instead.) The .env file and the database scripts are never copied.
const fs = require("fs");
const path = require("path");

module.exports = async function afterPack(context) {
  const from = path.join(__dirname, "..", "..", "backend");
  if (!fs.existsSync(path.join(from, "node_modules"))) {
    throw new Error("Run npm install in the backend folder first, so the back end's packages go into the installer.");
  }
  const resources = context.electronPlatformName === "darwin"
    ? path.join(context.appOutDir, context.packager.appInfo.productFilename + ".app", "Contents", "Resources")
    : path.join(context.appOutDir, "resources");
  const to = path.join(resources, "backend");
  const skip = new Set([".env", "scripts", "README.md", ".gitignore"]);
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => { const rel = path.relative(from, src); const top = rel.split(path.sep)[0]; return !(skip.has(top) || /^\.env\./.test(top)); },
  });
};
