import { startServer } from "./server";

declare const self: Worker;

self.onmessage = async (e: MessageEvent) => {
  const { root, port } = e.data as { root: string; port: number };
  const server = await startServer(root, port);
  self.postMessage({ ready: true, port: server.port });

  self.onmessage = (stop: MessageEvent) => {
    if (stop.data?.stop) {
      server.stop().then(() => process.exit(0));
    }
  };
};