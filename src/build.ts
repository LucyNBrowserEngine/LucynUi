import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadConfig } from "./config";

const root = resolve(process.cwd());
const entry = join(root, "app.ts");

if (!(await Bun.file(entry).exists())) {
  console.error(`[LucyN UI] No app.ts in ${root}. Create one that calls createApp() and build again.`);
  process.exit(1);
}

const { title } = await loadConfig(root);
const name = binaryName(title);
const outfile = join(root, "dist", name);

await mkdir(join(root, "dist"), { recursive: true });
console.log(`[LucyN UI] Building ./dist/${name} from app.ts`);

const build = Bun.spawn([process.execPath, "build", "--compile", "--minify", entry, "--outfile", outfile], {
  stdout: "inherit",
  stderr: "inherit",
});

const code = await build.exited;

if (code !== 0) {
  console.error("[LucyN UI] Build failed.");
  process.exit(code);
}

console.log(`[LucyN UI] Done — ./dist/${name}`);

function binaryName(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "lucyn-app"
  );
}
