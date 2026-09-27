import { defineConfig } from "vite";

// Rutas relativas: el build funciona en cualquier hosting o subcarpeta.
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
  },
  server: { open: true },
});
