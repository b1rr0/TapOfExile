import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    allowedHosts: [".ngrok-free.dev"],
  },
  build: {
    outDir: "dist",
  },
  assetsInclude: ["**/*.jpg", "**/*.png"],
});
