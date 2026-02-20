import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  publicDir: path.resolve(__dirname, "../shared/public"),
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
    extensions: [".ts", ".js", ".mjs", ".json"],
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
  assetsInclude: ["**/*.jpg", "**/*.png"],
});
