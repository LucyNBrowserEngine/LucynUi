import { resolve } from "node:path";
import { SizeHint, Webview } from "../webview-bun/src/webview";
import { DEFAULTS, loadConfig, type LucynConfig } from "./config";
import { errorPage, watchForChanges } from "./server";

const WINDOWS_NOTICE =
  "You are on Windows. LucyN UI on Windows is not top grade as Windows builds differ from Linux where the framework was made and tested. If you encounter any bugs or build errors please dont hesitate to open an issue at the LucyN org. Thank you.";

/**
 * Starts the file server, opens the native window and blocks until it closes.
 *
 * The server runs in a Worker: `webview.run()` is a blocking FFI call that
 * freezes Bun's main-thread event loop for as long as the window is open, so
 * the server would never be able to answer requests if it lived there too.
 *
 * Reads `lucyn.config.ts` from the project root; anything passed here wins.
 */
export async function createApp(config: LucynConfig = {}) {
  if (process.platform === "win32") console.warn(WINDOWS_NOTICE);

  const root = resolve(process.cwd());
  const { title, width, height, port, dev } = { ...DEFAULTS, ...(await loadConfig(root)), ...config };

  const worker = new Worker(new URL("./server-worker.ts", import.meta.url).href);
  const actualPort = await new Promise<number>((resolvePort, rejectPort) => {
    worker.onmessage = (e: MessageEvent) => {
      if (e.data?.ready) resolvePort(e.data.port);
    };
    worker.onerror = (err) => rejectPort(err);
    worker.postMessage({ root, port });
  });

  console.log(dev ? `LucyN UI dev server running on http://localhost:${actualPort}` : `LucyN UI running on http://localhost:${actualPort}`);

  const webview = new Webview(dev, { width, height, hint: SizeHint.NONE });
  webview.title = title;

  if (await Bun.file(resolve(root, "index.html")).exists()) {
    webview.navigate(`http://localhost:${actualPort}`);
  } else {
    webview.setHTML(
      errorPage(
        "Missing index.html",
        "No index.html found",
        `<p>LucyN UI looked for <code>${resolve(root, "index.html")}</code> but it isn't there.</p>
         <p>Create an <code>index.html</code> in your project root — that's the page this window shows.</p>`,
      ),
    );
  }

  const watcher = dev ? watchForChanges(root, () => webview.eval("window.location.reload()")) : null;

  webview.run();

  watcher?.close();
  worker.postMessage({ stop: true });
  worker.terminate();
}

if (import.meta.main) {
  await createApp(process.argv.includes("--dev") ? { dev: true } : {});
}