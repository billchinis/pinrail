#!/usr/bin/env node
// Prints the payload's `files` for a change map: each file the change
// touches, with its status and its unified diff, as JSON. The change is
// what the working tree holds, committed or not, against where it left the
// base branch.
//
//   node files.mjs [base]        # base: origin/main, else main
//
// Run it in the repository of the change, and put its output in the
// payload's `files`.

import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

/** The first of these refs that exists. */
function firstRef(refs) {
  for (const ref of refs) {
    try {
      git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`);
      return ref;
    } catch {
      // try the next one
    }
  }
  throw new Error(`none of ${refs.join(", ")} is a commit here: give the base branch, as in node files.mjs develop`);
}

const base = firstRef(process.argv[2] ? [process.argv[2]] : ["origin/main", "main", "origin/master", "master"]);
const from = git("merge-base", base, "HEAD").trim();
const STATUS = { A: "added", M: "modified", D: "deleted", R: "renamed" };

/** The changes `git diff --name-status -z` lists: each a status code, then
 *  its path, or for a rename its old path and its new one. */
function changes(listed) {
  const parts = listed.split("\0").filter(Boolean);
  const rows = [];
  for (let i = 0; i < parts.length;) {
    const code = parts[i++];
    const renamed = code.startsWith("R") || code.startsWith("C");
    rows.push(renamed ? [code, parts[i++], parts[i++]] : [code, parts[i++]]);
  }
  return rows;
}

const files = [];
// tracked files changed since the base, renames followed
for (const [code, first, second] of changes(git("diff", "-M", "--name-status", "-z", from))) {
  const status = STATUS[code[0]] ?? "modified";
  const path = second ?? first;
  const diff = git("diff", "-M", from, "--", ...(second ? [first, second] : [first]));
  files.push({ path, status, ...(second ? { was: first } : {}), diff });
}
// new files not yet added to git
for (const path of git("ls-files", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean)) {
  let diff = "";
  try {
    git("diff", "--no-index", "--", "/dev/null", path);
  } catch (e) {
    // git diff --no-index exits with 1 when the files differ
    diff = e.stdout ?? "";
  }
  files.push({ path, status: "added", diff });
}

process.stdout.write(JSON.stringify(files, null, 2) + "\n");
