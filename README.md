# LucyN UI

Desktop apps from plain HTML, CSS and JS. Write web files, get a native window.

Built on a [fork of webview-bun](https://github.com/LucyNBrowserEngine/webview-bun) and [Elysia](https://elysiajs.com), running on Bun.
No React. No Rust. No Electron.

Part of the [LucyN engine family](https://github.com/LucyNBrowserEngine/LucyNEngine).

## Why this exists

Electron is 200+ MB before you've written a line of code. Qt was next — building a UI in QPainter was miserable.
So the question became: can a desktop app just be plain HTML, CSS and JS, no framework underneath? Turned out yes.

The search for a lightweight window led to webview.h, the famous single-header C library. The plan was to write a
Bun wrapper for it — then [webview-bun](https://github.com/tr1ckydev/webview-bun) turned up, already doing exactly
that. So, like any decent open-source citizen: forked it, merged it in, and LucyN UI was born.

## Quick start

Scaffold a new app and start it:

```bash
lucyn create-ui myapp
```

Or, inside an empty folder, install the package and let it set everything up:

```bash
bun add lucynui --trust
```

Either way you end up with a dev server running and a native window on the app. The `--trust` flag matters: Bun blocks
install scripts by default, and this package uses one to scaffold the folder and start dev. If you already ran a plain
`bun add lucynui`, finish with `bun pm trust lucynui`.

A new app is just your files plus a dependency on this package:

```
myapp/
  app.ts              entry point — createApp()
  index.html          your UI
  style.css
  app.js
  lucyn.config.ts     title / size / port
  package.json        depends on lucynui
```

The framework is not copied into the app — it stays in `node_modules/lucynui`. The starter files come from the
[lucynui-template](https://github.com/LucyNBrowserEngine/lucynui-template) repo.

## Commands

```bash
lucyn create-ui <appname>   # clone the template, install, test the build, start dev
lucyn                       # set up the current folder and start it
lucyn dev                   # dev server + window, hot reload on .html/.css/.js changes
lucyn build                 # single binary in ./dist
```

`lucyn dev` serves your project root over `http://localhost:3927`, opens a native window pointed at it and reloads the
window whenever an `.html`, `.css` or `.js` file changes. No browser is opened.

## Config

`lucyn.config.ts` in your project root. Every field is optional.

```ts
export default {
  title: "My App", // default: "LucyN App"
  width: 1200, // default: 1024
  height: 800, // default: 768
  port: 3927, // default: 3927, falls back to the next free port
  dev: false, // default: false
};
```

Missing file or broken config silently falls back to the defaults, so `createApp()` always works.

You can also pass config straight to `createApp({ title: "Override" })` — anything passed there wins over the file.

## Build

`lucyn build` runs:

```bash
bun build --compile --minify ./app.ts --outfile ./dist/<name>
```

The binary name is the `title` from `lucyn.config.ts`, lowercased (`"My App"` → `my-app`). The native window library is
embedded in the binary, so `./dist/<name>` is the only file you need to ship. The build halts with a message if there is
no `app.ts` in your project root.

## What's in the package

```
bin/lucyn.ts        the CLI entry point
cli/                create-ui, init, dev, build, install hook, terminal styling
src/                the framework
  lucyn.ts          createApp — starts the server (in a Worker) + opens the window
  server-worker.ts  runs the Elysia file server, off the main thread
  config.ts         reads lucyn.config.ts
  server.ts         Elysia file server + hot reload
  build.ts          compile step
  index.ts          public exports
webview-bun/        native window bindings + prebuilt libraries for linux, mac and windows
```

## File server

| Request          | Result                       |
| ---------------- | ---------------------------- |
| `GET /`          | `index.html`                 |
| `GET /style.css` | `style.css`                  |
| `GET /app.js`    | `app.js`                     |
| `GET /*`         | any file in the project root |
| anything missing | LucyN branded error page     |

Paths are resolved inside the project root only — anything escaping it gets a 403.

## Architecture note

`webview.run()` is a blocking native call — once the window opens, it freezes Bun's main thread until the window
closes. If the file server ran on that same thread it would go dead the instant the window appeared, so `createApp()`
runs the server in a `Worker` instead, keeping it responsive for the whole life of the window.

## Notes

- On Windows you get a warning on startup: LucyN UI is built and tested on Linux, and Windows builds differ.
- `create-ui` checks for the GTK/WebKit libraries the window needs and installs them with apt on Debian-based Linux.
- If `index.html` is missing, the window shows a helpful error instead of a blank page.
- Ports: if the configured port is taken, LucyN UI keeps incrementing until it finds a free one and logs the port it
  actually used.

## Note

At v1.0.0 this might be done. Elysia isn't updating its API anytime soon, neither is webview, neither is Bun — me
bolting on more APIs after that is just too much work for too little reason. I made this lib because I wanted an
easier alternative to Qt's paint-and-draw, and it works for that. So don't come in acting like this is dead — what
more do you want me to add?
 Lucyn is just a new baby of me being a cpp god but just tired writing ui in cpp forgive me cpp gods i got tired good luck