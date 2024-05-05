import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: "./index.html",
        background: "./src/utils/background.js",
      },
      output: {
        entryFileNames: ({ name }) =>
          name === "background" ? "[name].js" : "[name]/[name].js",
      },
    },
  },
});
