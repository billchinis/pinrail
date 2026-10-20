#!/usr/bin/env node
// Notes what a change map leaves out, before it is submitted: the changed
// files that nothing on the map names, other than changelogs and lock
// files, which have no place on a map, the new or changed parts and
// interactions without lines, and lines in files the change does not
// touch. Leaving something out can be right, such as an abstract part or
// an interaction in code the change does not touch, so these are notes to
// decide on, not errors.
//
//   node check.mjs map.json

import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node check.mjs map.json");
  process.exit(1);
}
const read = JSON.parse(fs.readFileSync(file, "utf8"));
// a payload, or a whole request with the payload in it
const map = read.payload ?? read;

const changed = new Set((map.files ?? []).map((f) => f.path));
const named = new Set();
const outside = [];
/** Records the files a thing names, and those outside the change. */
const note = (what, changes) => {
  for (const c of changes ?? []) {
    named.add(c.file);
    if (!changed.has(c.file)) outside.push(`${what}: ${c.file}`);
  }
};

const bare = [];
for (const n of map.nodes ?? []) {
  note(`part ${n.id}`, n.changes);
  if ((n.status ?? "changed") !== "context" && !n.changes?.length) bare.push(`part ${n.id}`);
}
for (const e of map.edges ?? []) {
  note(`interaction ${e.id}`, e.changes);
  if ((e.status ?? "changed") !== "unchanged" && !e.changes?.length) bare.push(`interaction ${e.id}`);
}
for (const d of map.diagrams ?? [])
  for (const x of [...(d.participants ?? []), ...(d.messages ?? []), ...(d.states ?? []), ...(d.transitions ?? [])])
    note(`${d.id} ${x.id}`, x.changes);

// files a map leaves out as a matter of course: changelogs, and the lock
// files package managers write
const LOCKS = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "Cargo.lock",
  "mix.lock",
  "Gemfile.lock",
  "poetry.lock",
  "uv.lock",
  "Pipfile.lock",
  "composer.lock",
  "go.sum",
  "Package.resolved",
  "pubspec.lock",
]);
const routine = (path) => {
  const name = path.split("/").pop();
  return LOCKS.has(name) || /^(CHANGELOG|CHANGES|HISTORY)(\.[a-z]+)?$/i.test(name);
};

const unnamed = [...changed].filter((p) => !named.has(p) && !routine(p));
const sections = [
  ["Changed files no part, interaction or diagram names:", unnamed],
  ["New or changed parts and interactions without lines:", bare],
  ["Lines in files the change does not touch:", outside],
].filter(([, items]) => items.length);

if (!sections.length) process.stdout.write("Nothing is left out.\n");
else
  process.stdout.write(
    sections.map(([title, items]) => [title, ...items.map((i) => `  ${i}`)].join("\n")).join("\n\n") + "\n",
  );
