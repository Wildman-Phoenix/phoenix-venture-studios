import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith("--")) pairs.push([value.slice(2), values[index + 1]]);
  return pairs;
}, []));
const root = path.resolve(args.root || process.cwd());
const output = path.resolve(args.output || path.join(root, "phoenix-release-candidate-manifest.json"));
const base = args.base || "";
const statusRaw = base
  ? execFileSync("git", ["diff", "--name-status", "-z", base, "HEAD"], { cwd: root })
  : execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: root });
const rawEntries = statusRaw.toString("utf8").split("\0").filter(Boolean);
const entries = base
  ? rawEntries.reduce((result, value, index) => {
      if (index % 2 === 0 && rawEntries[index + 1]) result.push(`${value.padEnd(2)} ${rawEntries[index + 1]}`);
      return result;
    }, [])
  : rawEntries;
const files = [];
const secretAssignment = /^(HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN|SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN)[ \t]*=[ \t]*([^\r\n]*)$/gm;

for (const entry of entries) {
  const status = entry.slice(0, 2);
  const relativePath = entry.slice(3);
  if (!relativePath || relativePath.includes(" -> ")) continue;
  const absolutePath = path.join(root, relativePath);
  const stat = await fs.stat(absolutePath).catch(() => null);
  if (!stat?.isFile()) continue;
  const body = await fs.readFile(absolutePath);
  if (body.length < 2_000_000) {
    const text = body.toString("utf8");
    for (const match of text.matchAll(secretAssignment)) {
      const value = match[2].trim().replace(/^['"]|['"]$/g, "");
      if (value && !/your|replace|example|placeholder|<|\$\{/i.test(value)) {
        throw new Error(`Private credential value found in release candidate: ${relativePath}`);
      }
    }
  }
  files.push({
    path: relativePath,
    status,
    bytes: stat.size,
    sha256: createHash("sha256").update(body).digest("hex"),
  });
}

files.sort((a, b) => a.path.localeCompare(b.path));
const manifest = {
  generatedAt: new Date().toISOString(),
  root,
  baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  comparedTo: base || "working-tree",
  fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  credentialMarkerScanPassed: true,
  files,
};
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Release candidate manifest written: ${files.length} files, ${manifest.totalBytes} bytes.`);
