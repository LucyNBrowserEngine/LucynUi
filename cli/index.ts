import * as create from "./create";
import * as ui from "./ui";

const HELP = `${ui.accent("lucyn")} — desktop apps from plain HTML, CSS and JS

  ${ui.accent("lucyn create-ui <appname>")}   scaffold a new app and start it
  ${ui.accent("lucyn")}                       set up the current folder and start it
  ${ui.accent("lucyn dev")}                   start dev mode with hot reload
  ${ui.accent("lucyn build")}                 build your app into a single binary

Inside an empty folder, ${ui.accent("bun add lucynui --trust")} runs all four steps on its own.
`;

export async function run(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  try {
    switch (command) {
      case "create-ui":
      case "create": {
        const appName = rest[0];
        if (!appName) throw new Error("usage: lucyn create-ui <appname>");
        await create.create(appName);
        return;
      }

      case "dev":
        await create.dev();
        return;

      case "build":
        await create.build();
        return;

      case "init":
      case undefined:
        await create.init();
        return;

      case "help":
      case "--help":
      case "-h":
        console.log(HELP);
        return;

      default:
        throw new Error(`unknown command: ${command} — try lucyn help`);
    }
  } catch (error) {
    ui.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
