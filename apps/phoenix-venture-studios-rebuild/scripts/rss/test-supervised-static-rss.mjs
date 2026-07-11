import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runFeedChild, runSupervisedGeneration } from "./supervised-static-rss.mjs";
import { createHash } from "node:crypto";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const RSS_DIR = path.join(APP_ROOT, "public/rss");

function makeConfig(id) {
  return {
    id,
    outputFiles: {
      xml: `${id}.xml`,
      json: `${id}.json`,
      items: `${id}-items.json`,
      reportMd: `${id}-run-report.md`,
      reportJson: `${id}-run-report.json`,
    },
  };
}

function makeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.exitCode = null;
  child.killed = false;
  child.kill = (signal = "SIGTERM") => {
    child.killed = true;
    setImmediate(() => {
      child.exitCode = signal === "SIGKILL" ? 137 : 1;
      child.emit("close", null, signal);
    });
    return true;
  };
  return child;
}

async function writeValidFeed(config, reportPatch = {}) {
  await fs.mkdir(RSS_DIR, { recursive: true });
  await fs.writeFile(path.join(RSS_DIR, config.outputFiles.xml), `<?xml version="1.0" encoding="UTF-8"?><rss><channel><item><title>Supervisor Test</title></item></channel></rss>\n`, "utf8");
  await fs.writeFile(path.join(RSS_DIR, config.outputFiles.json), JSON.stringify({ items: [{ id: "supervisor-test" }] }), "utf8");
  await fs.writeFile(path.join(RSS_DIR, config.outputFiles.items), JSON.stringify([{ id: "supervisor-test" }]), "utf8");
  await fs.writeFile(path.join(RSS_DIR, config.outputFiles.reportMd), "# Supervisor Test\n", "utf8");
  await fs.writeFile(path.join(RSS_DIR, config.outputFiles.reportJson), JSON.stringify({
    feedId: config.id,
    feedValid: true,
    preservedPreviousFeed: false,
    items: { selected: 1, held: 0 },
    sources: { warnings: [], errors: [] },
    images: { warnings: [], errors: [] },
    validation: { errors: [] },
    ...reportPatch,
  }, null, 2), "utf8");
}

async function cleanup(config) {
  await Promise.all(Object.values(config.outputFiles).map((file) =>
    fs.rm(path.join(RSS_DIR, file), { force: true }).catch(() => {})
  ));
}

async function testSuccessfulChild() {
  const config = makeConfig("supervisor-test-success");
  await cleanup(config);
  const result = await runFeedChild(config, {
    timeoutMs: 1000,
    spawnImpl: () => {
      const child = makeChild();
      setImmediate(async () => {
        await writeValidFeed(config);
        child.exitCode = 0;
        child.emit("close", 0, null);
      });
      return child;
    },
  });
  assert.equal(result.feedValid, true);
  assert.equal(result.safeOutput, true);
  assert.equal(result.timedOut, false);
  assert.ok(result.outputFilesChanged.includes(config.outputFiles.xml));
  await cleanup(config);
}

async function testTimedOutChild() {
  const config = makeConfig("supervisor-test-timeout");
  await cleanup(config);
  const result = await runFeedChild(config, {
    timeoutMs: 20,
    killGraceMs: 5,
    spawnImpl: () => makeChild(),
  });
  assert.equal(result.timedOut, true);
  assert.equal(result.safeOutput, false);
  assert.ok(result.errors.some((error) => error.includes("child exited")));
  await cleanup(config);
}

async function testPreservedPreviousOutput() {
  const config = makeConfig("supervisor-test-preserved");
  await cleanup(config);
  await writeValidFeed(config, {
    feedValid: false,
    preservedPreviousFeed: true,
    items: { selected: 0, held: 1 },
  });
  const result = await runFeedChild(config, {
    timeoutMs: 1000,
    spawnImpl: () => {
      const child = makeChild();
      setImmediate(() => {
        child.exitCode = 1;
        child.emit("close", 1, null);
      });
      return child;
    },
  });
  assert.equal(result.feedValid, false);
  assert.equal(result.preservedPreviousFeed, true);
  assert.equal(result.safeOutput, true);
  await cleanup(config);
}

async function testFailedStagedRunPreservesPublicBundle() {
  const manifestPath = path.join(RSS_DIR, "bundle-manifest.json");
  const before = createHash("sha256").update(await fs.readFile(manifestPath)).digest("hex");
  const config = makeConfig("supervisor-test-bundle-failure");
  const report = await runSupervisedGeneration({
    feedConfigs: [config],
    timeoutMs: 1000,
    spawnImpl: () => {
      const child = makeChild();
      setImmediate(() => {
        child.exitCode = 1;
        child.emit("close", 1, null);
      });
      return child;
    },
  });
  const after = createHash("sha256").update(await fs.readFile(manifestPath)).digest("hex");
  assert.equal(report.allSafe, false);
  assert.equal(after, before, "failed staged generation must not change the public bundle");
}

await testSuccessfulChild();
await testTimedOutChild();
await testPreservedPreviousOutput();
await testFailedStagedRunPreservesPublicBundle();
console.log("Phoenix RSS supervisor smoke tests passed.");
