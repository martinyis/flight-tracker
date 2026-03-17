import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./src",
    environment: "node",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["services/**", "middleware/**", "controllers/**"],
      exclude: ["generated/**", "__tests__/**"],
    },
    mockReset: true,
    restoreMocks: true,
  },
});
