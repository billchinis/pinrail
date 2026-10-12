// Checks that each official plugin the app carries raised its version if
// what it ships changed since the last release of the app, and that its
// changelog has a section for the version its manifest gives:
//
//   node scripts/plugin-versions.mjs
//
// An installed official plugin is offered an update only when the app
// carries a higher version, so a change shipped under the same version
// would never reach the people who installed it. What counts is what the
// plugin ships or builds from: its manifest, icon, README and licence, its
// schemas, view, templates and samples, and the source and package files of
// a view with a build. Its tests and fixtures do not count.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The files and folders of a plugin whose change is a change it ships. */
const SHIPPED = [
  "manifest.json",
  "icon.svg",
  "README.md",
  "LICENSE",
  "schemas",
  "view",
  "templates",
  "samples",
  "src",
  "package.json",
  "package-lock.json",
  "vite.config.mjs",
];

const semver = (text) => text.split(".").map(Number);
const newer = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

/** The last release of the app: its newest `v<major>.<minor>.<patch>` tag. */
function lastRelease(git) {
  const tags = git("tag", "--list", "v*")
    .split("\n")
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
  return tags.sort((a, b) => (newer(a.slice(1), b.slice(1)) ? -1 : 1))[0] ?? null;
}

/**
 * The plugins among `names` whose shipped files changed since the last
 * release while their version stayed the same or went down, each with the
 * version it has and the release it is compared with.
 */
export function unbumped(root, names) {
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const since = lastRelease(git);
  if (!since) return [];
  const found = [];
  for (const name of names) {
    const dir = `plugins/${name}`;
    let before;
    try {
      before = JSON.parse(git("show", `${since}:${dir}/manifest.json`)).version;
    } catch {
      continue; // not carried at that release
    }
    const changed = git("diff", "--name-only", since, "--", ...SHIPPED.map((p) => `${dir}/${p}`));
    if (!changed) continue;
    const now = JSON.parse(fs.readFileSync(path.join(root, dir, "manifest.json"), "utf8")).version;
    if (!newer(now, before)) found.push({ name, version: now, since });
  }
  return found;
}

/** A changelog's heading for one version: `## [1.1.0] - …`. */
const heading = (version) => new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\]`, "m");

/**
 * The plugins among `names` whose CHANGELOG.md has no section for the
 * version in their manifest, each with that version.
 */
export function unlogged(root, names) {
  const found = [];
  for (const name of names) {
    const dir = path.join(root, "plugins", name);
    const version = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")).version;
    let changelog = "";
    try {
      changelog = fs.readFileSync(path.join(dir, "CHANGELOG.md"), "utf8");
    } catch {
      // no changelog at all
    }
    if (!heading(version).test(changelog)) found.push({ name, version });
  }
  return found;
}

/**
 * Names the app release in each plugin's changelog: a section headed
 * `## [1.1.0] - Unreleased` becomes `## [1.1.0] - Pinrail 0.2.0`. Returns
 * the changelogs it changed, relative to `root`.
 */
export function stampChangelogs(root, names, appVersion) {
  const changed = [];
  for (const name of names) {
    const file = path.join("plugins", name, "CHANGELOG.md");
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    const before = fs.readFileSync(full, "utf8");
    const after = before.replace(/^(## \[[^\]]+\]) - Unreleased$/gm, `$1 - Pinrail ${appVersion}`);
    if (after !== before) {
      fs.writeFileSync(full, after);
      changed.push(file);
    }
  }
  return changed;
}

/** The plugins the app's catalog carries, as desktop/core/build.rs lists them. */
export function catalog(root) {
  const build = fs.readFileSync(path.join(root, "desktop/core/build.rs"), "utf8");
  const list = /const CATALOG: &\[&str\] = &\[([^\]]*)\]/.exec(build);
  if (!list) throw new Error("no CATALOG in desktop/core/build.rs");
  return [...list[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const names = catalog(root);
  const found = unbumped(root, names);
  for (const { name, version, since } of found) {
    console.error(
      `plugins/${name} changed since ${since} but is still at ${version}: raise its version in its manifest.json`,
    );
  }
  const missing = unlogged(root, names);
  for (const { name, version } of missing) {
    console.error(
      `plugins/${name}/CHANGELOG.md has no section for ${version}: add "## [${version}] - Unreleased" with what changed`,
    );
  }
  process.exit(found.length || missing.length ? 1 : 0);
}
