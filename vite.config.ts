/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // REACT_APP_ is kept so the existing Cloudflare build variable
  // (REACT_APP_TWITCH_CLIENT_ID) carries over from the CRA setup.
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { port: 3000 },
  preview: { port: 3000 },
  build: { outDir: "build" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: { REACT_APP_TWITCH_CLIENT_ID: "test-client-id" },
  },
});
