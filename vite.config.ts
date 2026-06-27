import {defineConfig, type Plugin} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import {tanstackRouter} from '@tanstack/router-plugin/vite'
import {execSync} from "node:child_process";
import path from "path";
import fs from "node:fs";

function getGitVersion() {
  return execSync("git rev-parse HEAD").toString().trim();
}

// Serve the sibling `resource` repo's `UI/` folder at `/UI` in dev, replacing
// the old `frontend/public/UI` junction. The resource repo lives next to
// `frontend/` in the workspace; override with RESOURCE_UI_DIR if needed.
const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

function resourceUiProxy(): Plugin {
  const uiDir = path.resolve(
    __dirname,
    process.env.RESOURCE_UI_DIR ?? "../resource/UI",
  );
  return {
    name: "resource-ui-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith("/UI/")) return next();
        const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/UI\//, "");
        // Prevent path traversal.
        const filePath = path.join(uiDir, rel);
        if (!filePath.startsWith(uiDir)) return next();
        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) return next();
          res.setHeader(
            "Content-Type",
            MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
          );
          res.setHeader("Cache-Control", "no-cache");
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
  };
}

const buildTime = process.env.BUILD_TIME ?? Date.now().toString();

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_PUBLIC_BASE || '/',
  plugins: [
    resourceUiProxy(),
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
    }),
    react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __BUILD_GIT_COMMIT__: JSON.stringify(getGitVersion()),
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            // --- 1. React core bundle ---
            {
              name: "vendor-react",
              test: /node_modules\/react(\/|$)|node_modules\/react-dom(\/|$)/,
            },

            // --- 2. UI & Helpers (FontAwesome, Embla, Markdown, YAML) ---
            {
              name: "vendor-ui",
              test: /node_modules\/(@fortawesome|embla-carousel|react-markdown|remark|rehype|yaml)(\/|$)/,
            },

            // --- 3. Map engine bundle ---
            {
              name: "vendor-map",
              test: /node_modules\/(leaflet|react-leaflet)(\/|$)/,
            },

            // --- 4. i18n bundle ---
            {
              name: "vendor-i18n",
              test: /node_modules\/(i18next|i18next-http-backend|i18next-browser-languagedetector)(\/|$)/,
            },
          ],
        }
      },
    },
  }
})
