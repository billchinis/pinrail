// The skill's script that builds the payload's `files` from git, run in a
// scratch repository.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const script = path.join(__dirname, "..", "skill", "scripts", "files.mjs");

test("the files of a change since it left main, committed, renamed, deleted or not yet added", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "change-map-files-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  fs.writeFileSync(path.join(dir, "keep.ts"), "export const a = 1;\n");
  fs.writeFileSync(path.join(dir, "old.ts"), "export const moved = 'a long enough line to be a rename';\n");
  fs.writeFileSync(path.join(dir, "gone.ts"), "export const gone = 1;\n");
  git("add", ".");
  git("commit", "-q", "-m", "base");
  git("checkout", "-q", "-b", "change");
  fs.writeFileSync(path.join(dir, "keep.ts"), "export const a = 2;\n");
  git("mv", "old.ts", "new.ts");
  git("rm", "-q", "gone.ts");
  git("commit", "-q", "-am", "change");
  // not committed, and not added
  fs.writeFileSync(path.join(dir, "fresh.ts"), "export const fresh = true;\n");

  const files = JSON.parse(execFileSync("node", [script], { cwd: dir, encoding: "utf8" }));
  const by = Object.fromEntries(files.map((f) => [f.path, f]));
  assert.deepEqual(Object.keys(by).sort(), ["fresh.ts", "gone.ts", "keep.ts", "new.ts"]);
  assert.equal(by["keep.ts"].status, "modified");
  assert.match(by["keep.ts"].diff, /^-export const a = 1;$/m);
  assert.match(by["keep.ts"].diff, /^\+export const a = 2;$/m);
  assert.equal(by["new.ts"].status, "renamed");
  assert.equal(by["new.ts"].was, "old.ts");
  assert.equal(by["gone.ts"].status, "deleted");
  assert.equal(by["fresh.ts"].status, "added");
  assert.match(by["fresh.ts"].diff, /^\+export const fresh = true;$/m);
});
