const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const kitDir = path.join(root, "node_modules", "@sveltejs", "kit");
const kitDataDir = path.join(kitDir, "src", "runtime", "server", "data");
const kitDataIndex = path.join(kitDataDir, "index.js");

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

if (fs.existsSync(kitDataIndex)) {
  process.exit(0);
}

if (!fs.existsSync(kitDir)) {
  console.error("[fix-svelte-kit] @sveltejs/kit is not installed yet.");
  process.exit(1);
}

let kitVersion = "";
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  kitVersion =
    (pkg.devDependencies && pkg.devDependencies["@sveltejs/kit"]) || "";
} catch {
  kitVersion = "";
}

if (!kitVersion) {
  console.error("[fix-svelte-kit] Could not determine @sveltejs/kit version.");
  process.exit(1);
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-kit-"));
let tgzName = "";

try {
  tgzName = execSync(`npm pack @sveltejs/kit@${kitVersion}`, {
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
  execSync(`tar -xf "${tgzPath}" -C "${tmpRoot}"`, { stdio: "ignore" });

  const packedData = path.join(
    tmpRoot,
    "package",
    "src",
    "runtime",
    "server",
    "data"
  );

  if (!fs.existsSync(packedData)) {
    throw new Error("packed @sveltejs/kit data folder not found");
  }

  ensureDir(kitDataDir);
  fs.cpSync(packedData, kitDataDir, { recursive: true });
  console.log("[fix-svelte-kit] Restored @sveltejs/kit server data files.");

  safeRm(tgzPath);
} catch (err) {
  console.error("[fix-svelte-kit] Failed to restore @sveltejs/kit data files.");
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
} finally {
  safeRm(tmpRoot);
}
