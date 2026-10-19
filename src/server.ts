import { Elysia } from "elysia";
import { statSync, watch, type FSWatcher } from "node:fs";
import { extname, resolve, sep } from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};

/** Only these files trigger a reload in dev mode. */
const RELOAD_EXTENSIONS = new Set([".html", ".css", ".js"]);
const RELOAD_DEBOUNCE_MS = 100;

/** Folders that should never trigger a reload. */
const IGNORED = /(^|[\\/])(node_modules|\.git|dist|out)([\\/]|$)/;

const PORT_ATTEMPTS = 100;

export interface LucynServer {
  /** The port actually in use — may be higher than the requested one. */
  port: number;
  stop(): Promise<void>;
}

/**
 * The LucyN branded error page used for 404s and other fatal problems.
 */
export function errorPage(status: string, title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${status} — LucyN UI</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #0d0f14; color: #e8eaf0; padding: 2rem;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
      }
      .card {
        max-width: 42rem; padding: 2rem; border: 1px solid #232838;
        border-radius: 14px; background: #141824;
      }
      .brand {
        margin-bottom: 1.25rem; font-size: .75rem; letter-spacing: .22em;
        text-transform: uppercase; color: #e0b34d;
      }
      h1 { margin: 0 0 .75rem; font-size: 1.4rem; }
      p { margin: 0 0 .75rem; line-height: 1.65; color: #a3abbf; }
      code { padding: .15rem .4rem; border-radius: 5px; background: #1d2231; color: #e8eaf0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">LucyN UI</div>
      <h1>${title}</h1>
      ${message}
    </div>
  </body>
</html>`;
}

/**
 * Serves every file in `root` and keeps serving until the window closes.
 * Falls back to `port + 1` while the requested port is taken.
 */
export async function startServer(root: string, port: number): Promise<LucynServer> {
  // `reusePort` would let a second app silently share a taken port, so the
  // port-in-use fallback below would never trigger.
  const app = new Elysia({ serve: { reusePort: false } }).get("/*", ({ params }) => serveFile(root, params["*"] ?? ""));

  for (let offset = 0; offset < PORT_ATTEMPTS; offset++) {
    try {
      app.listen(port + offset);
      return {
        port: port + offset,
        stop: async () => {
          await app.stop();
        },
      };
    } catch (error) {
      if (!isPortInUse(error)) throw error;
    }
  }

  throw new Error(`[LucyN UI] Ports ${port}-${port + PORT_ATTEMPTS - 1} are all in use.`);
}

/**
 * Watches the project for changes to `.html`, `.css` and `.js` files and calls
 * `onReload` at most once every 100ms.
 */
export function watchForChanges(root: string, onReload: () => void): FSWatcher {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return watch(root, { recursive: true }, (_event, filename) => {
    if (filename) {
      const name = String(filename);
      if (IGNORED.test(name)) return;
      if (!RELOAD_EXTENSIONS.has(extname(name).toLowerCase())) return;
    }

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onReload();
    }, RELOAD_DEBOUNCE_MS);
  });
}

async function serveFile(root: string, urlPath: string) {
  const relative = decodeURIComponent(urlPath).replace(/^\/+/, "");
  const target = resolve(root, relative || "index.html");

  if (target !== root && !target.startsWith(root + sep)) {
    return new Response(errorPage("403", "Not allowed", "<p>That path lives outside the project root.</p>"), {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const stats = statSync(target, { throwIfNoEntry: false });
  if (!stats?.isFile()) {
    return new Response(
      errorPage(
        "404",
        "File not found",
        `<p>Nothing at <code>/${relative || "index.html"}</code>.</p>
         <p>LucyN UI serves every file inside <code>${root}</code>, so check the path or create the file.</p>`,
      ),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  return new Response(Bun.file(target), {
    headers: { "Content-Type": MIME_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream" },
  });
}

function isPortInUse(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  if ((error as { code?: string }).code === "EADDRINUSE") return true;
  return /port .*in use|address already in use/i.test((error as Error).message ?? "");
}
