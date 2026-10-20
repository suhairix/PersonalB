# Deploying lumilist

> Starting fresh? The main [README](README.md) covers GitHub Pages, Vercel and the optional GitHub cloud storage. This file goes deeper on Vercel.

## GitHub Pages

The repo includes `.github/workflows/deploy.yml`. Push to `main`, then set **Settings → Pages → Source: GitHub Actions**. The site is published at `https://<user>.github.io/<repo>/`; relative asset paths make the sub-path work automatically. No secrets or environment variables are required.

## Vercel

lumilist is a static Vite app. There is no server, database, or environment variable — Vercel just serves the built `dist/` folder.

## Option A — Dashboard (recommended)

1. Push this project to a GitHub, GitLab, or Bitbucket repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import that repository.
3. Vercel auto-detects the **Vite** framework preset. Confirm these settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Leave environment variables empty and click **Deploy**.
5. Every push to the main branch now redeploys automatically. Pull requests get preview URLs.

`vercel.json` in the repo root already contains these build settings, so the defaults should be correct.

## Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel          # first run: links the project and creates a preview deployment
vercel --prod   # promote to your production URL
```

Run these commands from the project root (the folder containing `package.json`).

## What gets deployed

- `dist/index.html` — the app, with JS and CSS inlined by `vite-plugin-singlefile`
- `dist/wallpapers/*` — the bundled wallpaper images

The `public/` folder is copied into `dist/` at build time. Keep `public/wallpapers/` in version control so the preset wallpapers resolve on the deployed site.

## After deploying

1. Open the production URL and confirm your bookmarks load.
2. Optional: add a custom domain under **Project → Settings → Domains**.
3. To use it as your Chrome homepage: **Chrome Settings → On startup → Open a specific page → Add a new page**, then paste the deployed URL.
   - You can also set it as the startup page via a new-tab extension; Chrome doesn't allow overriding the new-tab page without one.

## Important: your data is per-browser

Bookmarks, categories, theme, and wallpapers are stored in `localStorage` for the current browser profile. Deploying the site does **not** upload or sync your data.

To move your library to another device or browser:

1. Open **Settings → Your data → Export** on the original browser.
2. Open the deployed site on the new device.
3. Choose **Import** and select the JSON backup.

If you ever need real cross-device sync, that requires a backend (e.g. Supabase or Vercel Postgres plus auth) — the current build is intentionally local-first.

## Troubleshooting

- **404 for `/wallpapers/...`:** verify the `public/wallpapers` files were committed and that the build output directory is `dist`.
- **Blank page:** check that the framework preset is Vite (not "Other") and that the build log completed without errors.
- **Favicons missing:** the app requests icons from Google's favicon service, so icons need network access. Letter fallbacks appear otherwise.
- **Build fails on Vercel but passes locally:** run `npm install && npm run build` locally once to regenerate `package-lock.json`, then commit it.
