# Ain't Never Gonna Forget Presidents Now

A Minecraft-pixel + Hamilton-playbill PWA for learning all 47 U.S. presidents — by
number, term years, and a fun fact — three at a time.

- **The Cast** — browse every president as a hand-drawn pixel portrait
- **Raise a Glass (Quiz)** — master a trio (3 correct in a row) to unlock the next three; mastered groups resurface occasionally as a "Mastery Check"
- **The Timeline** — fills in as you master each group

Pure HTML/CSS/JS — no build step. Open `index.html` locally, or host as an installable PWA.

## Deploy to GitHub Pages

1. Create a new **empty** public repo on GitHub (no README/license).
2. From this folder:
   ```
   git remote add origin https://github.com/<USERNAME>/<REPO>.git
   git branch -M main
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `root`** → Save.
4. After a minute it's live at `https://<USERNAME>.github.io/<REPO>/`.

## Install on iPhone (PWA)

Open the Pages URL in **Safari** → Share → **Add to Home Screen**. Launches full-screen
with the gold-star icon and works offline (service worker caches everything).
