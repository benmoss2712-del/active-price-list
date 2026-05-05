# Active price list

Cross-platform sales companion (iOS + Android + Web) built with [Expo](https://expo.dev) and React Native. Salespeople sign in with a PIN, browse the live price list, build quotations, save them to "My Quotes", and print or share them.

## Run locally

```bash
cd active-price-list
npm install
npx expo start
```

- Press `w` for web, `i` / `a` for iOS Simulator / Android emulator, or scan the QR code with **Expo Go** on your phone.

## Customize prices

- Edit **`src/data/prices.ts`** — replace `ACTIVE_PRICES` and `PRICE_LIST_VERSION` (or load from your backend in `App.tsx` `onRefresh`).

## Publish as a website (GitHub Pages)

The repo ships with a GitHub Actions workflow at `.github/workflows/pages.yml` that builds a static web bundle and publishes it to GitHub Pages on every push to `main` — same idea as the Intabastockweekly site, just with a build step.

One-time setup:

1. Create a repo on GitHub (suggested name: `active-price-list`) and push this folder to it.
2. On GitHub, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow runs, builds, and the URL appears under **Actions → Deploy website to GitHub Pages → deploy**.

Your site will be at `https://<github-username>.github.io/<repo-name>/`.

### Building the website locally

```bash
EXPO_BASE_URL=/<repo-name> npm run build:web
# Output: ./dist
npx serve dist   # optional preview, install `serve` first
```

`EXPO_BASE_URL` should match the path your site lives under (`/active-price-list` for a project repo, empty string for a custom domain or `<user>.github.io` repo). The CI workflow sets it automatically from the GitHub repo name.

## Next steps

- Wire `submitQuotationDraft` to a real backend by setting `EXPO_PUBLIC_COMPANY_API_BASE_URL` (see `src/integration/`).
- Add EAS Build when you're ready to publish native binaries: [Expo Application Services](https://docs.expo.dev/build/introduction/).
