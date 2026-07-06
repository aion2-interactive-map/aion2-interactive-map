import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/src/**/*.test.{ts,tsx}",
      "packages/**/test/**/*.test.ts",
      "apps/**/src/**/*.test.{ts,tsx}",
    ],
    environment: "node",
  },
});
