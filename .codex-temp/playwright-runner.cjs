const path = require("path");
const fs = require("fs");
const base = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
const dirs = fs.readdirSync(base, { withFileTypes: true }).filter((entry) => entry.isDirectory());
for (const dir of dirs) {
  const candidate = path.join(base, dir.name, "node_modules", "playwright");
  if (fs.existsSync(candidate)) {
    module.paths.unshift(path.join(base, dir.name, "node_modules"));
    break;
  }
}
require(path.join(process.cwd(), ".codex-temp", "playwright-check.cjs"));
