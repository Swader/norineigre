# Norine igre

A website for Nora, a girl vibe-coding video games.

The website looks like a piece of paper on a table with crayons.

The piece of paper has two sides: the landing page says Norine Igre, and contains two drawn "cards" for two current games. These images are collage / colored pencil renditions of a screen from each game - contained in images as chickengame.png and deliverygame.png. As you hover over each image, it tilts slightly to indicate it's interactive / clickable. Clicking on it leads to an external link of that particular game.

The first two games are:

1. Fashion Chicken Express where a royal chicken with a crown in a princess peach dress jumps on top of train wagons and avoids cooks trying to grab it. The image is a scene from the game, stylized childishly.
2. Delivery man: a game of delivering packages. The player takes a package or more from the prep screen and then has to deliver to marked houses on the map. The image is the cockpit of the truck with a steering wheel and bobblehead visible, and houses in the distance.

Examples of how the website should roughly look are in ./example_visuals folder.

There is a "flip page" button in the right side, or the bottom right of the paper, somewhere visible but not too obvious, which allows visitors to flip the page. Flipping the page turns the paper around, and this side has "O Meni", which will feature handwritten text from Nora about herself.

The piece of paper is on a desk of crayons, the image of which is in the ./images folder as desk.png.

The website should not use node for any reason whatsoever, only Bun is allowed as the JS runtime. The website should be statically hostable, so it should compile into a static bundle with a command like bun run build or similar.

## Running

### Dev (with HMR)

```sh
bun run dev
```

Then open the URL it prints (defaults to `http://localhost:3000`).

### Build (static `dist/`)

```sh
bun run build
```

### Preview the build

```sh
bun run preview
```

## Customize content

- Update the two game links in `index.html` (currently `./games/chickengame/` and `./games/deliverygame/`).
- Replace the "O meni" text in `index.html` with Nora's handwritten copy.

## Delivery game (offline missions)

`games/deliverygame/` now reads missions from a local `missions.json` file (no API key required).

To regenerate 1000 missions:

```sh
bun run generate:delivery-missions
```

## Deploy to GitHub Pages (with a custom domain)

This repo is set up to deploy the static build output (`dist/`) to **GitHub Pages** using **GitHub Actions** on every push to the `master` branch.

### Paths in production

- This build uses **relative** URLs for assets and game links, so it can be mounted under a subpath like `/igre/`.
- When mounted at `/igre/`:
  - **Launcher**: `/igre/`
  - **Games**: `/igre/games/chickengame/` and `/igre/games/deliverygame/`

### 1) Add the GitHub Actions workflow (already included)

The workflow file is:

- `/.github/workflows/pages.yml`

It runs `bun install` + `bun run build` and publishes the `dist/` folder to Pages.

### 2) (Recommended) Add a `CNAME` file to the repo root

Create a file named `CNAME` in the repo root **with exactly one line**: your custom domain (for example):

```txt
norineigre.com
```

On build, this gets copied into `dist/CNAME` automatically.

### 3) Enable GitHub Pages in repo settings

In GitHub:

- Go to **Repo → Settings → Pages**
- Under **Build and deployment**
  - Set **Source** to **GitHub Actions**
- Under **Custom domain**
  - Enter your domain (if it isn’t already set) and save
  - Enable **Enforce HTTPS** once it becomes available

### 4) Push to GitHub

Commit and push to `master`:

```sh
git add -A
git commit -m "Deploy: enable GitHub Pages"
git push origin master
```

### 5) Watch the deploy

- Open **Repo → Actions**
- Click **Deploy to GitHub Pages**
- Wait for it to finish (it will deploy to the `github-pages` environment)

After that, your site should be live on your custom domain (and also available on the default Pages URL).
