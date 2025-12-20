import { extname, join, normalize } from "node:path";

const port = process.env.PORT ? Number(process.env.PORT) : 4173;
const distRoot = join(import.meta.dir, "..", "dist");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml; charset=utf-8",
};

function toSafeFsPath(urlPathname: string) {
  let pathname = urlPathname;
  if (pathname === "/") pathname = "/index.html";
  else if (pathname.endsWith("/")) pathname = `${pathname}index.html`;
  // Block dotfiles (e.g. .env.local) from ever being served.
  if (pathname.split("/").some((part) => part.startsWith(".") && part.length > 1)) {
    return null;
  }
  const normalized = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(distRoot, normalized);
}

const server = Bun.serve({
  port,
  fetch: async (req) => {
    const url = new URL(req.url);
    let filePath = toSafeFsPath(url.pathname);
    if (!filePath) return new Response("Not Found", { status: 404 });
    let file = Bun.file(filePath);

    if (!(await file.exists())) {
      // Convenience: if they hit /games/chickengame (no trailing slash), try directory index.
      const pathnameHasExt = extname(url.pathname) !== "";
      if (!pathnameHasExt && !url.pathname.endsWith("/")) {
        const dirIndexPath = toSafeFsPath(`${url.pathname}/index.html`);
        if (!dirIndexPath) return new Response("Not Found", { status: 404 });
        const dirIndex = Bun.file(dirIndexPath);
        if (await dirIndex.exists()) {
          filePath = dirIndexPath;
          file = dirIndex;
        } else {
          return new Response("Not Found", { status: 404 });
        }
      } else {
        return new Response("Not Found", { status: 404 });
      }
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
      },
    });
  },
});

console.log(`Preview server: http://localhost:${server.port}`);


