// The plugin version check, on a scratch repository with release tags.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { stampChangelogs, unbumped, unlogged } from "./plugin-versions.mjs";

function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-versions-"));
  const git = (...args) =>
    execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: root, stdio: "pipe" });
  git("init", "-q", "-b", "main");
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const manifest = (name, version) => write(`plugins/${name}/manifest.json`, JSON.stringify({ name, version }));
  const commit = (message) => {
    git("add", "-A");
    git("commit", "-q", "-m", message);
  };
  return { root, git, write, manifest, commit };
}

test("a plugin whose shipped files changed since the last release must raise its version", () => {
  const r = repository();
  r.manifest("list", "1.0.0");
  r.write("plugins/list/view/index.html", "one");
  r.manifest("image", "1.0.0");
  r.commit("first");
  r.git("tag", "v1.0.0");

  // no change since the release: nothing to say
  assert.deepEqual(unbumped(r.root, ["list", "image"]), []);

  // a view changed, a test changed: only the view counts
  r.write("plugins/list/view/index.html", "two");
  r.write("plugins/image/tests/image.spec.ts", "a test");
  r.commit("changes");
  assert.deepEqual(unbumped(r.root, ["list", "image"]), [{ name: "list", version: "1.0.0", since: "v1.0.0" }]);

  r.manifest("list", "1.0.1");
  r.commit("bump");
  assert.deepEqual(unbumped(r.root, ["list", "image"]), []);
});

test("a plugin new since the release, or no release yet, needs nothing", () => {
  const r = repository();
  r.manifest("list", "1.0.0");
  r.commit("first");
  assert.deepEqual(unbumped(r.root, ["list"]), [], "no release tag");

  r.git("tag", "v1.0.0");
  r.manifest("markdown", "1.0.0");
  r.write("plugins/markdown/src/view.js", "x");
  r.commit("a new plugin");
  assert.deepEqual(unbumped(r.root, ["list", "markdown"]), []);
});

test("a plugin's changelog must have a section for the version in its manifest", () => {
  const r = repository();
  r.manifest("list", "1.1.0");
  r.manifest("image", "1.0.0");
  r.manifest("markdown", "1.0.0");
  r.write(
    "plugins/list/CHANGELOG.md",
    "# Changelog\n\n## [1.1.0] - Unreleased\n\n- New.\n\n## [1.0.0] - Pinrail 0.1.0\n",
  );
  // a section for the version before, but not this one
  r.manifest("image", "1.0.1");
  r.write("plugins/image/CHANGELOG.md", "# Changelog\n\n## [1.0.0] - Pinrail 0.1.0\n");
  // no changelog at all
  assert.deepEqual(unlogged(r.root, ["list", "image", "markdown"]), [
    { name: "image", version: "1.0.1" },
    { name: "markdown", version: "1.0.0" },
  ]);
  // a version that only starts like this one is not it
  r.manifest("list", "1.1.0");
  r.write("plugins/list/CHANGELOG.md", "## [1.1.01] - Unreleased\n");
  assert.deepEqual(unlogged(r.root, ["list"]), [{ name: "list", version: "1.1.0" }]);
});

test("a release names itself in the plugins' unreleased sections, and leaves the rest", () => {
  const r = repository();
  r.manifest("list", "1.1.0");
  r.manifest("image", "1.0.0");
  r.write("plugins/list/CHANGELOG.md", "## [1.1.0] - Unreleased\n\n- New.\n\n## [1.0.0] - Pinrail 0.1.0\n");
  r.write("plugins/image/CHANGELOG.md", "## [1.0.0] - Pinrail 0.1.0\n");
  assert.deepEqual(stampChangelogs(r.root, ["list", "image", "markdown"], "0.2.0"), ["plugins/list/CHANGELOG.md"]);
  assert.equal(
    fs.readFileSync(path.join(r.root, "plugins/list/CHANGELOG.md"), "utf8"),
    "## [1.1.0] - Pinrail 0.2.0\n\n- New.\n\n## [1.0.0] - Pinrail 0.1.0\n",
  );
  assert.equal(
    fs.readFileSync(path.join(r.root, "plugins/image/CHANGELOG.md"), "utf8"),
    "## [1.0.0] - Pinrail 0.1.0\n",
  );
});
