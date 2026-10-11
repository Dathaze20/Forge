// Writes public/version.json with the exact commit this build was made
// from, so the running app (which embeds this same value into its bundle
// via vite.config.ts) can compare itself against whatever version.json the
// live deployment is currently serving.
//
// Deliberately has no dependency on the GitHub API, a personal access
// token, or any credential: in CI it reads the commit SHA GitHub Actions
// already injects as an environment variable, and locally it falls back to
// plain `git rev-parse HEAD`.
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function resolveCommit() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot }).toString().trim();
  } catch {
    // No git available (e.g. a source archive with no .git folder) - fall
    // back to a value that is at least unique per build, so the app still
    // runs and update checks simply always report "up to date" against
    // themselves rather than crashing.
    return `dev-${Date.now()}`;
  }
}

const manifest = {
  commit: resolveCommit(),
  builtAt: new Date().toISOString(),
};

mkdirSync(join(repoRoot, "public"), { recursive: true });
writeFileSync(
  join(repoRoot, "public", "version.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);

console.log("[generate-version] wrote public/version.json:", manifest);
