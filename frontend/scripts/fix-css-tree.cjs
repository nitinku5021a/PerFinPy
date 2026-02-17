const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const cssTreeDir = path.join(root, "node_modules", "css-tree");
const dataDir = path.join(cssTreeDir, "data");
const patchJson = path.join(dataDir, "patch.json");

function safeRm(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    // no-op
  }
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

if (fs.existsSync(patchJson)) {
  process.exit(0);
}

if (!fs.existsSync(cssTreeDir)) {
  console.error("[fix-css-tree] css-tree is not installed yet.");
  process.exit(1);
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "css-tree-"));
let tgzName = "";

try {
  tgzName = execSync("npm pack css-tree@2.3.1", {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  })
    .toString()
    .trim()
    .split(/\r?\n/)
    .pop();

  if (!tgzName) {
    throw new Error("npm pack did not return a tarball name");
  }

  const tgzPath = path.join(root, tgzName);
  execSync(`tar -xf "${tgzPath}" -C "${tmpRoot}"`, {
    stdio: "ignore"
  });

  const packedData = path.join(tmpRoot, "package", "data");
  if (!fs.existsSync(packedData)) {
    throw new Error("packed css-tree data folder not found");
  }

  ensureDir(dataDir);
  fs.cpSync(packedData, dataDir, { recursive: true });
  console.log("[fix-css-tree] Restored css-tree data files.");

  safeRm(tgzPath);
} catch (err) {
  console.error("[fix-css-tree] Failed to restore css-tree data files.");
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
} finally {
  safeRm(tmpRoot);
}
