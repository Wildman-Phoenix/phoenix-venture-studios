import path from "node:path";
import { defineConfig } from "vitest/config";

// RSS tests exercise Node scripts, Sharp, file-system output, and pure editorial
// logic. Loading the React/SWC + jsdom application test stack for this gate can
// leave Vitest idle before collection, so keep the automation gate Node-only.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/rss-engine.test.ts"],
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
