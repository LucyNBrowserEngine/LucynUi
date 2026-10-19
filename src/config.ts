import { resolve } from "node:path";

/** Every field is optional — LucyN UI fills in smart defaults. */
export interface LucynConfig {
  /** Window title. Default: "LucyN App" */
  title?: string;
  /** Window width. Default: 1024 */
  width?: number;
  /** Window height. Default: 768 */
  height?: number;
  /** Port for the local file server. Default: 3927 (falls back to the next free port) */
  port?: number;
  /** Enables hot reload and devtools. Default: false */
  dev?: boolean;
}

/** Config with every field present. */
export type ResolvedConfig = Required<LucynConfig>;

export const DEFAULTS: ResolvedConfig = {
  title: "LucyN App",
  width: 1024,
  height: 768,
  port: 3927,
  dev: false,
};

const CONFIG_FILE = "lucyn.config.ts";

/**
 * Helper for `lucyn.config.ts` so editors give you autocomplete.
 */
export function defineConfig(config: LucynConfig): LucynConfig {
  return config;
}

/**
 * Reads `lucyn.config.ts` from the project root. Missing file or bad config
 * silently falls back to defaults.
 */
export async function loadConfig(root: string = process.cwd()): Promise<ResolvedConfig> {
  const path = resolve(root, CONFIG_FILE);

  if (!(await Bun.file(path).exists())) return { ...DEFAULTS };

  try {
    const module = await import(path);
    return { ...DEFAULTS, ...(module.default ?? {}) };
  } catch (error) {
    console.warn(`[LucyN UI] Could not read ${CONFIG_FILE}, using defaults.`);
    console.warn(error);
    return { ...DEFAULTS };
  }
}
