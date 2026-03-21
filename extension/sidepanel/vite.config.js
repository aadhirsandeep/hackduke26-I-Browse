import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../panel",
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
      output: {
        format: "es",
      },
    },
  },
});
