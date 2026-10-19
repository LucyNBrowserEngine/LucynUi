import { cp } from "node:fs/promises";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

if (!import.meta.dir.includes("node_modules")) process.exit(0);
if (process.env.LUCYN_SKIP_POSTINSTALL) process.exit(0);

const projectDir = process.env.INIT_CWD
  ?? process.env.npm_config_local_prefix
  ?? (() => {
    const i = import.meta.dir.lastIndexOf(`${sep}node_modules${sep}`);
    return i === -1 ? null : import.meta.dir.slice(0, i);
  })();

if (!projectDir) process.exit(0);

const template = fileURLToPath(new URL("../template", import.meta.url));
const FILES = ["index.html", "style.css", "app.js", "app.ts", "lucyn.config.ts", "tsconfig.json", ".gitignore", "package.json"];

for (const file of FILES) {
  const target = join(projectDir, file);
  if (file !== "package.json" && await Bun.file(target).exists()) continue;
  await cp(join(template, file), target);
}

console.log("\n  LucyN UI ready.\n\n    bun install\n    bun run dev\n");
