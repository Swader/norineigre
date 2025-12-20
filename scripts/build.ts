import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";

async function removeDotfiles(dir: string) {
  let entries: Array<{ name: string; isDirectory: () => boolean }> = [];
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as unknown as typeof entries;
  } catch {
    return;
  }

  await Promise.all(
    entries.map(async (ent) => {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        // Skip node_modules entirely (shouldn't be in dist anyway)
        if (ent.name === "node_modules") return;
        await removeDotfiles(full);
        return;
      }

      if (ent.name.startsWith(".")) {
        try {
          await rm(full, { force: true });
        } catch {
          // ignore
        }
      }
    }),
  );
}

async function main() {
  // In some restricted environments, dist/ may contain ignored/locked files (e.g. .env.local).
  // Best effort cleanup; continue if we can't fully remove it.
  try {
    await rm("./dist", { recursive: true, force: true });
  } catch (err) {
    console.warn("Warning: failed to fully remove ./dist (continuing):", err);
  }
  await mkdir("./dist", { recursive: true });

  // Compile TS -> JS (single bundle)
  const result = await Bun.build({
    entrypoints: ["./frontend.ts"],
    outdir: "./dist",
    minify: true,
    target: "browser",
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }

  // Copy static files
  await cp("./images", "./dist/images", { recursive: true });
  await cp("./games", "./dist/games", {
    recursive: true,
    filter: (src) => {
      const name = basename(src);
      // Never copy dotfiles or env files into a static build (avoid leaking secrets).
      if (name.startsWith(".")) return false;
      if (name.startsWith("node_modules")) return false;
      return true;
    },
  });
  await cp("./styles.css", "./dist/styles.css");

  // Best-effort removal of any dotfiles that may already exist in dist (e.g. from previous builds).
  await removeDotfiles("./dist");

  // Build the delivery game (TSX -> JS) into dist, while keeping heavy deps external
  // (they're loaded via importmap/CDN in games/deliverygame/index.html).
  await mkdir("./dist/games/deliverygame", { recursive: true });
  const delivery = await Bun.build({
    entrypoints: ["./games/deliverygame/index.tsx"],
    outdir: "./dist/games/deliverygame",
    minify: true,
    target: "browser",
    splitting: false,
    external: [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
    ],
  });

  if (!delivery.success) {
    for (const log of delivery.logs) console.error(log);
    process.exit(1);
  }

  // Produce a production HTML that points at compiled JS.
  const html = await Bun.file("./index.html").text();
  const prodHtml = html.replaceAll("./frontend.ts", "./frontend.js");
  await Bun.write("./dist/index.html", prodHtml);

  // GitHub Pages helpers:
  // - ".nojekyll" disables Jekyll processing (prevents odd edge-cases with folders)
  // - "CNAME" enables custom domain if present at repo root
  await Bun.write("./dist/.nojekyll", "");
  const cname = Bun.file("./CNAME");
  if (await cname.exists()) {
    await Bun.write("./dist/CNAME", await cname.text());
  }
}

main();


