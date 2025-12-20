import index from "./index.html";

const DELIVERYGAME_EXTERNAL = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "three",
  "@react-three/fiber",
  "@react-three/drei",
] as const;

function isSafeSubPath(path: string) {
  // Reject traversal and absolute-ish paths. (Router params don't include a leading slash.)
  const normalized = path.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("\0")) return false;
  return !normalized
    .split("/")
    .some((part) => part === "" || part === ".." || part === "." || part.startsWith("."));
}

async function buildDeliverygameIndexJs() {
  const result = await Bun.build({
    entrypoints: ["./games/deliverygame/index.tsx"],
    target: "browser",
    splitting: false,
    minify: false,
    external: [...DELIVERYGAME_EXTERNAL],
    write: false,
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    return null;
  }

  const js = result.outputs.find((o) => o.path.endsWith(".js")) ?? result.outputs[0];
  if (!js) return null;

  return js;
}

function isAddrInUse(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "EADDRINUSE"
  );
}

function createServer(port: number) {
  return Bun.serve({
    port,
    routes: {
      "/": index,
      "/index.html": index,
      "/games/deliverygame/index.js": {
        GET: async () => {
          const output = await buildDeliverygameIndexJs();
          if (!output) return new Response("Build failed", { status: 500 });

          return new Response(output, {
            headers: {
              "Content-Type": "text/javascript; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
        },
      },
      "/games/*": {
        GET: async (req) => {
          const url = new URL(req.url);

          // Bun wildcard routes don't always populate req.params["*"] across versions,
          // so derive the subpath from the URL instead.
          const prefix = "/games/";
          const relRaw = url.pathname.startsWith(prefix)
            ? url.pathname.slice(prefix.length)
            : "";

          // Bun's wildcard param may or may not include a trailing "/" depending on how
          // the URL was entered. Treat "folder-ish" paths as directories and serve
          // their index.html by default.
          const hasExtension = /\.[a-z0-9]+$/i.test(relRaw);
          let rel =
            relRaw === ""
              ? "index.html"
              : relRaw.endsWith("/")
                ? `${relRaw}index.html`
                : hasExtension
                  ? relRaw
                  : `${relRaw}/index.html`;

          if (!isSafeSubPath(rel)) return new Response("Bad Request", { status: 400 });

          const filePath = `./games/${rel}`;
          const file = Bun.file(filePath);

          if (!(await file.exists())) {
            return new Response("Not Found", { status: 404 });
          }

          return new Response(file);
        },
      },
      "/images/:file": {
        GET: async (req) => {
          const fileName = req.params.file;

          // Basic hardening: params can't contain "/" in this router, but guard anyway.
          if (!fileName || fileName.includes("..") || fileName.includes("/")) {
            return new Response("Bad Request", { status: 400 });
          }

          const file = Bun.file(`./images/${fileName}`);
          if (!(await file.exists()))
            return new Response("Not Found", { status: 404 });

          return new Response(file);
        },
      },
    },
    development: {
      hmr: true,
      console: true,
    },
  });
}

const preferredPort = process.env.PORT ? Number(process.env.PORT) : 3000;
const hasExplicitPort = typeof process.env.PORT === "string";

let server: ReturnType<typeof createServer> | undefined;
let lastErr: unknown;

for (let i = 0; i < 20; i++) {
  const port = preferredPort + i;
  try {
    server = createServer(port);
    break;
  } catch (err) {
    lastErr = err;
    if (!isAddrInUse(err)) throw err;
  }
}

// If the user didn't force a port, fall back to a random free port.
if (!server && !hasExplicitPort) {
  server = createServer(0);
}

if (!server) throw lastErr;

console.log(`Norine Igre dev server: http://localhost:${server.port}`);