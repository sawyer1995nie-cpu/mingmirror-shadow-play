import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  server: {
    port: 4173,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
});
