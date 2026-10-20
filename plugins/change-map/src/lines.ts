// How many lines a part adds and removes, counted in the diffs of the
// change's files over the part's own ranges, so that a card can say how
// large its part of the change is without the agent sending the numbers.
import type { FileChange, Part, Payload } from "./types";

export type LineCount = { added: number; removed: number };

/** Each added line of a diff by its number on the new side, and each
 *  removed line by the new line it was removed before. */
function lines(diff: string): { added: number[]; removed: number[] } {
  const added: number[] = [];
  const removed: number[] = [];
  let at = 0;
  for (const line of diff.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      at = Number(hunk[1]);
      continue;
    }
    if (!at || line.startsWith("\\")) continue;
    if (line.startsWith("+")) added.push(at++);
    else if (line.startsWith("-")) removed.push(at);
    else at++;
  }
  return { added, removed };
}

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
    const inside = (n: number) => !change.lines || change.lines.some(([from, to]) => n >= from && n <= to);
    count.added += added.filter(inside).length;
    count.removed += removed.filter(inside).length;
  }
  return count;
}
