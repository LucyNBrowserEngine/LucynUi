import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as ui from "./ui";

/** Marks the root of a LucyN UI project. */
export const CONFIG_FILE = "lucyn.config.ts";

/** Absolute path to the package root, wherever it is installed. */
export function packageRoot() {
  return fileURLToPath(new URL("..", import.meta.url));
}

/** Absolute path to a file inside the framework's own `src/`, wherever the package is installed. */
export function frameworkPath(file: string) {
  return fileURLToPath(new URL(`../src/${file}`, import.meta.url));
}

/** Absolute path to the package's own `template/` folder, wherever it is installed. */
export function templatePath() {
  return fileURLToPath(new URL("../template", import.meta.url));
}

export async function packageVersion() {
  const pkg = await Bun.file(new URL("../package.json", import.meta.url)).json();
  return String(pkg.version ?? "0.0.0");
}

/** Bun on PATH, or in the default install location. */
export function findBun(): string | null {
  const onPath = Bun.which("bun");
  if (onPath) return onPath;

  const fallback = join(homedir(), ".bun", "bin", "bun");
  return existsSync(fallback) ? fallback : null;
}

export function requireProject() {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error("No lucyn.config.ts found. Are you inside a LucyN UI project?");
  }
}

/**
 * Runs a program with its output going straight to the terminal and returns its exit code.
 * `stdin` is only inherited for commands that need to prompt the user.
 */
export async function run(dir: string, cmd: string[], stdin: "ignore" | "inherit" = "ignore"): Promise<number> {
  const head = cmd[0];
  if (!head) throw new Error("empty command");

  let child;
  try {
    child = Bun.spawn(cmd, { cwd: dir, stdin, stdout: "inherit", stderr: "inherit" });
  } catch {
    throw new Error(`could not run ${head} — is it installed?`);
  }

  return await child.exited;
}

export async function runStep(dir: string, cmd: string[], stdin: "ignore" | "inherit" = "ignore") {
  const code = await run(dir, cmd, stdin);
  if (code !== 0) throw new Error(`${cmd.join(" ")} failed (exit code ${code})`);
}

/** Returns bun, installing it first when it is missing. */
export async function ensureBun(): Promise<string> {
  const found = findBun();
  if (found) return found;

  ui.info("Bun not found. Installing bun...");
  await runStep(process.cwd(), ["bash", "-c", "curl -fsSL https://bun.sh/install | bash"]);

  const installed = findBun();
  if (!installed) {
    throw new Error("bun was installed but is not on PATH yet — restart your shell and run lucyn again");
  }

  ui.ok("Bun installed successfully");
  return installed;
}

/** Installs the GTK/WebKit libraries the window needs. Linux only. */
export async function ensureSystemDeps() {
  if (process.platform !== "linux") return;
  if (!Bun.which("dpkg")) return;

  const probe = Bun.spawnSync(["dpkg", "-l", "libwebkitgtk-6.0-4"]);
  if (probe.exitCode === 0 && probe.stdout.toString().includes("ii")) return;

  ui.info("Installing system dependencies...");
  await runStep(process.cwd(), ["sudo", "apt", "install", "-y", "libgtk-4-1", "libwebkitgtk-6.0-4"], "inherit");
  ui.ok("Dependencies installed");
}