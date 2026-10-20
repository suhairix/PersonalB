# PersonalB

A calm, local-first bookmark manager that works as a browser homepage. Fork it, host it yourself, and let every visitor keep their own library — in their browser, or in their own GitHub account.

**No backend. No accounts. No database to run.**

![PersonalB](public/wallpapers/emerald.jpg)

## Features

- Beautiful masonry home page with categories (spaces), emoji, accent colors and descriptions
- Add / edit / move / sort / delete bookmarks, with instant undo
- Custom wallpapers: bundled presets, image upload (compressed locally) or image URL
- Wallpaper dim and blur, card opacity, dark and light themes
- ⌘K search across every bookmark, with keyboard navigation
- JSON export / import for portable backups
- **Optional GitHub cloud storage** — your own secret Gist or a file in your own private repo
- Fully static; deploy to GitHub Pages, Vercel, Netlify, Cloudflare Pages or any web server

## Deploy on GitHub Pages

There are two separate repositories in this architecture — don't confuse them:

| Repository | Who owns it | Contains | Visibility |
| --- | --- | --- | --- |
| **App repo** (this project) | You, the host | Code, wallpapers, workflow | Public is simplest (free Pages) |
| **Data repo / gist** | Each end user | Their own bookmarks JSON | Private (recommended) |

Deploying the app does **not** put anyone's bookmarks in your repo. Users bring their own GitHub account later, in the browser.

### Steps

1. Create a new repository and push this project to its `main` branch.
2. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from **Actions**).
4. The included workflow builds with Vite and publishes `dist/` to `https://<user>.github.io/<repo>/`.

Wallpapers are referenced with relative paths, so the app works both at a domain root and under the `/<repo>/` sub-path used by project pages.

> If you use a **custom domain**, add it under **Settings → Pages → Custom domain**. No code changes are needed.

### Private app repo caveat

GitHub Pages only builds from a **private** repository on a paid plan (Pro, Team, or Enterprise). On GitHub Free, the app repo must be **public** to use Pages. In every case the *published site itself is publicly reachable* — private repo ≠ private website. If you need the code hidden, use Vercel/Netlify (both support private repos on free tiers) or make the app repo public while keeping each user's **data** private.

### If your default branch is `master`

The workflow triggers on `main`. Either rename your default branch to `main` (recommended), or change `branches: [main]` in `.github/workflows/deploy.yml`.

### Uploading without git

The GitHub web uploader works, but upload the **source**, not a local build: include `.github/`, `src/`, `public/`, `package.json`, and `package-lock.json`; exclude `node_modules/` and `dist/` (the workflow builds those). Using git or GitHub Desktop is more reliable, especially for the dot-folders.

## Deploy on Vercel

Import the repo at [vercel.com/new](https://vercel.com/new). The included `vercel.json` sets the Vite preset, `npm run build`, and `dist`. See [DEPLOY.md](DEPLOY.md) for details.

## GitHub as cloud storage

This is the interesting part: the deployed site remains a static page, but bookmarks can be backed up into the user's **own** GitHub account through the GitHub REST API. Tokens are supplied by the user at runtime and stay in their browser.

Open **Cloud icon (header) → GitHub**, or **Customize → GitHub**, then pick one of two storage modes:

### Option 1 — Secret Gist (easiest)

1. Create a **classic** personal access token: <https://github.com/settings/tokens/new?scopes=gist>
2. Enable only the **`gist`** scope.
3. Paste it into PersonalB and connect.
4. PersonalB looks for a file named `PersonalB-bookmarks.json` in the user's gists. If none exists, it creates a **secret gist** on first sync.

On a second device, connect with the same token — the app finds the same gist automatically (or paste the Gist ID shown on GitHub).

### Option 2 — Repository file (most private)

0. Each user creates **their own** empty private repo (the app never creates repos; it only writes a file inside an existing one).
1. Create a repository, private is recommended.
2. Create a **fine-grained** token under **Only select repositories**, choosing that repo.
3. Set **Repository permissions → Contents: Read and write**. Nothing else is needed.
4. Connect with `owner/repo`, an optional branch and file path (default `PersonalB/bookmarks.json`).

The file and directories are created automatically on the first sync.

### What syncs

- Categories, their emoji/accent/description and every bookmark
- Theme, wallpaper preset, dim, blur and card opacity
- **Not** custom wallpaper uploads — those stay on the device that added them to keep the GitHub file small

### Conflict handling

Each sync writes an `updatedAt` timestamp into the cloud file. When a device sees a newer cloud copy that differs from its local copy, it stops and offers three choices:

- **Merge both** — union of categories by name and bookmarks by URL/title
- **Use cloud copy** — replace this device's library with GitHub's
- **Keep this device** — overwrite the cloud copy

Automatic sync is debounced after edits; the **Sync now** button forces a pull/push. Cloud changes are also checked once on startup.

### Security and privacy notes

- The token is stored in `localStorage` in the browser that entered it. It is sent **only** to `api.github.com`.
- The token is **never** included in exported library JSON, and there is no PersonalB server collecting anything.
- Prefer a fine-grained token limited to one private repository. Secret gists are unlisted but readable by anyone who has the link.
- Revoke the token on GitHub at any time; the app will report that sync needs reconnecting.
- Bookmark data may include internal URLs — avoid syncing if that is a concern.
- Anyone with access to a browser profile's localStorage can read it. Don't connect on a shared computer.

## FAQ

**Does the site owner see users' bookmarks or tokens?**
No. The app is static HTML/JS with no analytics or server calls. Tokens and libraries stay in each browser, and GitHub requests go directly from the browser to `api.github.com`.

**Can a user sync between their laptop and phone?**
Yes. Connect both browsers to the same gist (or the same repo path) with a token. The first device creates the gist; on the second, leave the Gist ID empty so PersonalB finds the existing file, or paste the Gist ID. A token must be entered on each browser — tokens are deliberately never stored in the synced file.

**What if two devices change things at once?**
PersonalB compares the cloud file's `updatedAt` with the last sync. A clean device automatically adopts newer cloud data; if both sides have new edits, it shows a merge/cloud/device choice instead of silently overwriting.

**Will my custom wallpaper sync?**
No. Uploaded wallpapers stay on the device. Preset wallpapers, theme, dim, blur and card opacity do sync.

**How do I disconnect or revoke access?**
Use **Disconnect** in the GitHub panel to forget the token locally, and revoke it at [github.com/settings/tokens](https://github.com/settings/tokens). Bookmark data stays in the browser.

**Can I keep a single shared cloud file for many users?**
You can, but each user would need a token that can write to that repo/gist and they'd overwrite each other. The intended pattern is one personal gist or repo per user.

## Self-hosting for your own users

One deployment can serve many people without sharing data:

- The site is purely static, so hosting is free on GitHub Pages.
- Each visitor optionally connects **their own** GitHub token and chooses **their own** gist/repo.
- Without connecting GitHub, the library is stored only in that visitor's browser.
- Users can export a JSON backup before moving devices; or use GitHub sync to move seamlessly.

## Local development

```bash
npm install
npm run dev
```

Build the static site:

```bash
npm run build     # outputs dist/
npm run preview   # serve the production build
```

## Project layout

```
src/
  App.tsx                  app shell, state wiring, keyboard shortcuts
  components/
    Header.tsx             new-tab header, category tabs, actions
    BookmarkCard.tsx       masonry cards + focused category view
    BookmarkModals.tsx     add/edit bookmark & category dialogs
    Overlays.tsx           settings sheet, search palette, help, empty states
    GitHubPanel.tsx        GitHub cloud storage connection + sync UI
    ui.tsx                 modal/sheet/favicon/slider primitives
  hooks/
    useBookmarks.ts        local-first data model, localStorage persistence
    useGitHubSync.ts       cloud sync state machine and conflict resolution
  lib/
    github.ts              GitHub REST client (gist + repository contents), merge logic
    storage.ts             normalization, validation, wallpaper compression
  data/defaults.ts         sample library, wallpapers, palettes
public/
  wallpapers/              bundled wallpaper images
  .nojekyll                keeps GitHub Pages from processing the static output
.github/workflows/deploy.yml  GitHub Pages build & deploy
vercel.json                Vercel build configuration
```

## License

This project is provided as a starting point for your own bookmark homepage. Add the license that suits your use.
