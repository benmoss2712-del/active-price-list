import type { ExpoConfig } from "expo/config";

// `experiments.baseUrl` lets the static web export work when served from a
// non-root path (e.g. GitHub Pages project sites at `/<repo>/`). Set the
// `EXPO_BASE_URL` env var at build time — the GitHub Pages workflow sets
// it to `/${{ github.event.repository.name }}`. For local dev, native
// builds, and root-domain deployments we leave it empty.
const baseUrl = (process.env.EXPO_BASE_URL ?? "").trim();

const config: ExpoConfig = {
  name: "active-price-list",
  slug: "active-price-list",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
    // single-page; static rendering needs expo-router which this app
    // does not use (we're on @react-navigation/* with bottom tabs).
    output: "single",
  },
  experiments: baseUrl ? { baseUrl } : {},
};

export default config;
