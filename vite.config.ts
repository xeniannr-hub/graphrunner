import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative Pfade: So läuft der Build unter jedem GitHub-Pages-Unterpfad.
  base: "./",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
