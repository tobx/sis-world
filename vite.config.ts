import * as packageJson from "./package.json";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      output: {
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: ({ name }) => {
          if (name?.endsWith(".png")) {
            return "assets/images/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  define: {
    __APP_AUTHOR_URL__: JSON.stringify(packageJson.author.url),
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_URL__: JSON.stringify(packageJson.homepage),
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
