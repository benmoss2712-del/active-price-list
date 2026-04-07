# Active price list

Cross-platform mobile app (iOS + Android) built with [Expo](https://expo.dev) and React Native. Shows a searchable, filterable price list with pull-to-refresh (ready to wire to your API).

## Run locally

```bash
cd active-price-list
npm install
npx expo start
```

- Install **Expo Go** on your phone and scan the QR code, or press `i` / `a` for iOS Simulator / Android emulator.

## Customize prices

- Edit **`src/data/prices.ts`** — replace `ACTIVE_PRICES` and `PRICE_LIST_VERSION` (or load from your backend in `App.tsx` `onRefresh`).

## Next steps

- Point `onRefresh` to `fetch('https://your-api.com/prices')` and store results in state.
- Add EAS Build when you are ready to publish: [Expo Application Services](https://docs.expo.dev/build/introduction/).
