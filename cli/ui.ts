/** Every line the LucyN CLI prints goes through here. */

import { openSync, writeSync } from "node:fs";

type Rgb = readonly [number, number, number];

const TEXT: Rgb = [0xe8, 0xea, 0xf0];
const GOLD: Rgb = [0xe0, 0xb3, 0x4d];
const ERROR: Rgb = [0xff, 0x6b, 0x6b];
const SUCCESS: Rgb = [0x69, 0xdb, 0x7c];

const RESET = "\x1b[0m";

function paint([r, g, b]: Rgb, value: string) {
  return `\x1b[38;2;${r};${g};${b}m${value}${RESET}`;
}

export const text = (value: string) => paint(TEXT, value);
export const gold = (value: string) => paint(GOLD, value);
export const error = (value: string) => paint(ERROR, value);
export const success = (value: string) => paint(SUCCESS, value);
/** Gold and bold — used for labels and commands. */
export const accent = (value: string) => `\x1b[1m${paint(GOLD, value)}`;

let sink = (value: string) => console.log(value);

/**
 * Sends everything straight to the terminal.
 *
 * Needed when we run as an install script: package managers swallow the streams
 * of lifecycle scripts, so without this the user stares at a blank screen.
 */
export function useTerminal() {
  try {
    const fd = openSync("/dev/tty", "a");
    sink = (value: string) => writeSync(fd, value + "\n");
  } catch {
    // No terminal to talk to — stdout is the best we have.
  }
}

function emit(value: string) {
  sink(value);
}

export const info = (message: string) => emit(text(message));
export const warn = (message: string) => emit(gold(message));
export const ok = (message: string) => emit(success(message));
export const fail = (message: string) => emit(error(message));
/** A blank line. */
export const line = (value = "") => emit(value);

/** The Windows warning, printed before anything else. */
export const WINDOWS_NOTICE = `You are on Windows. LucyN UI on Windows is not top grade
as Windows builds differ from Linux where the framework
was made and tested. If you encounter any bugs or build
errors please dont hesitate to open an issue at the LucyN
org. Thank you.`;

/** Prints a numbered step, e.g. `1. cloning the template`. */
export function step(index: number, message: string) {
  emit(`${accent(`${index}.`)} ${text(message)}`);
}

/** Prints the result of the step above it. */
export function done(message: string) {
  emit(`   ${success("✓")} ${text(message)}`);
}

const BANNER_WIDTH = 32;

function centered(value: string, width: number) {
  if (value.length >= width) return value;
  const left = Math.floor((width - value.length) / 2);
  return " ".repeat(left) + value + " ".repeat(width - value.length - left);
}

/** The gold double-bordered box drawn once a new app is running. */
export function banner(value: string) {
  const inner = `  ${centered(value, BANNER_WIDTH)}  `;
  const edge = "═".repeat(inner.length);
  return [gold(`╔${edge}╗`), gold("║") + accent(inner) + gold("║"), gold(`╚${edge}╝`)].join("\n");
}

/** The closing message after a successful scaffold. */
export function ready(appName: string) {
  line();
  emit(banner("LucyN UI Ready!"));
  line();
  emit(`  ${accent("App:")} ${text(appName)}`);
  line();
  emit(text("  Next steps:"));
  line();
  emit("  " + accent(`cd ${appName}`));
  emit("  " + accent("lucyn dev"));
  line();
}
