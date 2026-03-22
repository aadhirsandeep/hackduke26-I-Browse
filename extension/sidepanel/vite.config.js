import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
