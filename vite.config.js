import { defineConfig, loadEnv } from "vite";
import seo from "./scripts/vite-plugin-seo.js";
import { CONFIG } from "./src/config.js";

// Rutas relativas: el build funciona en cualquier hosting o subcarpeta.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: "./",
    plugins: [seo({ siteUrl: env.SITE_URL || CONFIG.siteUrl })],
    build: {
      target: "es2020",
      assetsInlineLimit: 0,
    },
    server: { open: true },
  };
});
