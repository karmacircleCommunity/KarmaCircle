import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [
    svgr(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      manifest: {
        short_name: "NgoWorld",
        name: "NgoWorld",
        start_url: ".",
        display: "standalone",
        theme_color: "#000000",
        background_color: "#ffffff",
        icons: [
          {
            src: "assets/icons/icon-48x48.png",
            sizes: "48x48",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        runtimeCaching: [
          {
            urlPattern: new RegExp(
              "^https://fonts.(?:googleapis|gstatic).com/(.*)",
            ),
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          {
            urlPattern: /\.(?:png|gif|jpg|jpeg|svg|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 60,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@components": path.resolve(import.meta.dirname, "./src/components"),
      "@hooks": path.resolve(import.meta.dirname, "./src/hooks"),
      "@pages": path.resolve(import.meta.dirname, "./src/pages"),
      "@redux": path.resolve(import.meta.dirname, "./src/redux"),
      "@service": path.resolve(import.meta.dirname, "./src/service"),
      "@utils": path.resolve(import.meta.dirname, "./src/utils"),
      "@styles": path.resolve(import.meta.dirname, "./src/styles"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: true,
    strictPort: true,
    port: 3000,
  },
  watch: {
    usePolling: true,
  },
});
