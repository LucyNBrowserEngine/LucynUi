import { cp } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as proc from "./proc";
import * as ui from "./ui";

const SERVER_READY = /dev server running on http:\/\/localhost:(\d+)/;
const TEMPLATE_FILES = ["index.html", "style.css", "app.js", "app.ts", "lucyn.config.ts", "tsconfig.json", ".gitignore", "package.json"];

const bun = () => proc.findBun() ?? "bun";

function templateDir(): string {
  return fileURLToPath(new URL("../template", import.meta.url));
}

/* ------------------------------------------------------------------ commands */

export async function dev(): Promise<never> {
  proc.requireProject();
  process.exit(await proc.run(process.cwd(), [bun(), proc.frameworkPath("lucyn.ts"), "--dev"]));
}

export async function build(): Promise<never> {
  proc.requireProject();
  ui.info("Building your app...");
  const code = await proc.run(process.cwd(), [bun(), proc.frameworkPath("build.ts")]);
  if (code !== 0) process.exit(code);
  ui.ok("Build complete! Check ./dist");
  process.exit(0);
}

/** `lucyn create-ui <appname>` */
export async function create(appName: string): Promise<never> {
  if (process.platform === "win32") ui.warn(ui.WINDOWS_NOTICE);
  await proc.ensureBun();
  await proc.ensureSystemDeps();

  ui.step(1, "copying template files");
  await scaffoldInto(join(process.cwd(), appName));
  ui.done(`app created in ./${appName}`);

  ui.line();
  ui.info(`  cd ${appName}`);
  ui.info("  bun install");
  ui.info("  bun run dev");
  ui.line();

  process.exit(0);
}

/** `lucyn` / `lucyn init` */
export async function init(): Promise<never> {
  await proc.ensureBun();
  await proc.ensureSystemDeps();

  if (await isProject(process.cwd())) {
    ui.info("Already a LucyN UI app. Run: bun run dev");
    process.exit(0);
  }

  ui.step(1, "copying template files");
  await scaffoldInto(process.cwd());
  ui.done("done");

  ui.line();
  ui.info("  bun install");
  ui.info("  bun run dev");
  ui.line();

  process.exit(0);
}

/* ------------------------------------------------------------------- helpers */

export function isProject(dir: string) {
  return Bun.file(join(dir, proc.CONFIG_FILE)).exists();
}

export async function scaffoldInto(dir: string) {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(dir, { recursive: true });

  const source = templateDir();

  for (const file of TEMPLATE_FILES) {
    const target = join(dir, file);
    if (file !== "package.json" && await Bun.file(target).exists()) continue;
    await cp(join(source, file), target);
  }
}

async function runDev(dir: string, onReady: (port: number) => void): Promise<number> {
  const child = Bun.spawn([bun(), proc.frameworkPath("lucyn.ts"), "--dev"], {
    cwd: dir,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "inherit",
  });

  const decoder = new TextDecoder();
  let seen = "";
  let announced = false;

  for await (const chunk of child.stdout) {
    process.stdout.write(chunk);
    if (announced) continue;
    seen += decoder.decode(chunk, { stream: true });
    const port = SERVER_READY.exec(seen)?.[1];
    if (port) {
      announced = true;
      onReady(Number(port));
    }
  }

  return await child.exited;
}
