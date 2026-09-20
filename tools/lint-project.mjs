import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }

if (existsSync(join(root, "package-lock.json"))) {
  fail("package-lock.json nao e permitido: Bun e o gerenciador canonico.");
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (typeof pkg.packageManager !== "string" || !pkg.packageManager.startsWith("bun@")) {
  fail("package.json deve declarar packageManager bun@...");
}

for (const layer of ["src/game", "src/formats"]) {
  for (const file of walk(join(root, layer))) {
    if (!file.endsWith(".ts")) continue;
    const source = readFileSync(file, "utf8");
    const code = stripComments(source);
    if (/\bdocument\./.test(code) || /\bwindow\./.test(code)) {
      fail(`${relative(root, file)} acessa DOM; mova essa responsabilidade para input/ui/render/app.`);
    }
  }
}

const REFERENCE_SECRET_PATHS = [
  "BASE759/SOURCERS/Source do Servidor/Code/DBSrv/dbMySQL.h",
  "BASE759/SOURCERS/Source do Servidor/Code/TMSrv/wMySQL.h",
];

for (const relativePath of REFERENCE_SECRET_PATHS) {
  const file = join(root, relativePath);
  if (!existsSync(file)) continue;
  const source = stripComments(readFileSync(file, "utf8"));
  if (/^\s*#define\s+PASS\s+"(?!CHANGE_ME_LOCAL_ONLY")[^"]+"/m.test(source)) {
    fail(`${relativePath} contem senha de referencia nao sanitizada.`);
  }
}

const secretPatterns = [
  /#define\s+PASS\w*\s+"[^"]+"/i,
  /\b(?:password|passwd|pwd|secret)\b\s*[:=]\s*["'][^"'\n]{4,}["']/i,
];

for (const base of ["src", "tools"]) {
  for (const file of walk(join(root, base))) {
    if (![".ts", ".js", ".mjs", ".c", ".cc", ".cpp", ".h", ".hpp", ".json"].includes(extname(file).toLowerCase())) continue;
    const source = readFileSync(file, "utf8");
    const code = stripComments(source);
    if (secretPatterns.some((pattern) => pattern.test(code))) {
      fail(`${relative(root, file)} parece conter credencial hardcoded.`);
    }
    const lines = source.split("\n").length;
    if (lines > 1800) warn(`${relative(root, file)} possui ${lines} linhas; considere decompor o modulo.`);
  }
}

for (const message of warnings) console.warn(`WARN: ${message}`);
if (failures.length) {
  for (const message of failures) console.error(`ERRO: ${message}`);
  process.exit(1);
}
console.log("Lint estrutural concluido sem erros.");

function walk(path) {
  if (!existsSync(path)) return [];
  const info = statSync(path);
  if (info.isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}
