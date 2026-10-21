// How many lines a part adds and removes, counted in the diffs of the
// change's files over the part's own ranges, so that a card can say how
// large its part of the change is without the agent sending the numbers.
import type { FileChange, Part, Payload } from "./types";

export type LineCount = { added: number; removed: number };

/** Each added line of a diff by its number on the new side, and each
 *  removed line by its number on the old side and by the new line it was
 *  removed before, `at`. */
function lines(diff: string): { added: number[]; removed: { old: number; at: number }[] } {
  const added: number[] = [];
  const removed: { old: number; at: number }[] = [];
  let at = 0;
  let old = 0;
  for (const line of diff.split("\n")) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      old = Number(hunk[1]);
      at = Number(hunk[2]);
      continue;
    }
    if (!at || line.startsWith("\\")) continue;
    if (line.startsWith("+")) added.push(at++);
    else if (line.startsWith("-")) removed.push({ old: old++, at });
    else {
      at++;
      old++;
    }
  }
  return { added, removed };
}

/** Whether a change covers a line, by its number on the new side: all of
 *  its file without ranges, or one of its ranges. */
const covers = (change: FileChange, n: number) =>
  !change.lines || change.lines.some(([from, to]) => n >= from && n <= to);

/** Whether a change covers a removed line, which sat between the new lines
 *  `at - 1` and `at`: a range that reaches either of them covers it. */
const coversRemoved = (change: FileChange, at: number) => covers(change, at) || covers(change, at - 1);

/** The lines a part's changes add and remove, or null for a part with no
 *  changes, such as one shown for context. A change without ranges counts
 *  its whole file. */
export function lineCount(payload: Payload, part: Part): LineCount | null {
  const changes: FileChange[] = part.changes ?? [];
  if (!changes.length) return null;
  const count = { added: 0, removed: 0 };
  for (const change of changes) {
    const file = payload.files.find((f) => f.path === change.file);
    if (!file) continue;
    const { added, removed } = lines(file.diff);
    count.added += added.filter((n) => covers(change, n)).length;
    count.removed += removed.filter((r) => coversRemoved(change, r.at)).length;
  }
  return count;
}

/** Files a map leaves out as a matter of course, as the skill's check does:
 *  changelogs, and the lock files package managers write. */
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
export function routine(path: string): boolean {
  const name = path.split("/").pop() ?? path;
  return LOCKS.has(name) || /^(CHANGELOG|CHANGES|HISTORY)(\.[a-z]+)?$/i.test(name);
}

/** The changed lines of a file that nothing on the map covers: the added
 *  ones by their new number, the removed ones by their old. */
export type Unmapped = { added: Set<number>; removed: Set<number> };

/** How much of the change the map covers: its changed lines, outside
 *  changelogs and lock files, how many of them a part, an interaction or
 *  an entity of a diagram covers, and by file those none does. */
export function coverage(payload: Payload): { total: number; mapped: number; unmapped: Map<string, Unmapped> } {
  const changes: FileChange[] = [
    ...payload.nodes.flatMap((n) => n.changes ?? []),
    ...(payload.edges ?? []).flatMap((e) => e.changes ?? []),
    ...(payload.diagrams ?? []).flatMap((d) =>
      [...(d.participants ?? []), ...(d.messages ?? []), ...(d.states ?? []), ...(d.transitions ?? [])].flatMap(
        (x) => x.changes ?? [],
      ),
    ),
  ];
  let total = 0;
  let mapped = 0;
  const unmapped = new Map<string, Unmapped>();
  for (const file of payload.files) {
    if (routine(file.path)) continue;
    const mine = changes.filter((c) => c.file === file.path);
    const { added, removed } = lines(file.diff);
    const missing: Unmapped = {
      added: new Set(added.filter((n) => !mine.some((c) => covers(c, n)))),
      removed: new Set(removed.filter((r) => !mine.some((c) => coversRemoved(c, r.at))).map((r) => r.old)),
    };
    total += added.length + removed.length;
    mapped += added.length + removed.length - missing.added.size - missing.removed.size;
    if (missing.added.size || missing.removed.size) unmapped.set(file.path, missing);
  }
  return { total, mapped, unmapped };
}
