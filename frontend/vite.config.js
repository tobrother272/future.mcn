import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Read API token from build-time env (passed via Docker build args)
const VITE_API_TOKEN = process.env.VITE_API_TOKEN || "";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".mjs", ".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  define: {
    "window.__MERIDIAN_API_TOKEN": JSON.stringify(VITE_API_TOKEN),
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "recharts": ["recharts"],
          "icons": ["lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
