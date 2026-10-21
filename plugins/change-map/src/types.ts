// The payload the agent sends and the decision the view returns, as the
// schemas in schemas/ describe them.

export type Attachment = { $attachment: string };

export type Range = [number, number];
export type FileChange = { file: string; lines?: Range[] };

export type NodeKind = "ui" | "module" | "service" | "endpoint" | "store" | "job" | "external" | "config" | "test";
export type NodeStatus = "added" | "changed" | "removed" | "context";
export type EdgeKind = "call" | "data" | "event" | "import" | "render";
export type EdgeStatus = "added" | "changed" | "removed" | "unchanged";

/** A screen of an interface part: screenshots before and after, or a
 *  recording of the part in use. */
export type Screen = { title?: string; before?: Attachment; after?: Attachment; video?: Attachment };

export type Part = {
  id: string;
  title: string;
  kind?: NodeKind;
  lane?: string;
  status?: NodeStatus;
  summary?: string;
  changes?: FileChange[];
  screens?: Screen[];
};

export type Link = {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind?: EdgeKind;
  status?: EdgeStatus;
  summary?: string;
  detail?: { request?: string; response?: string };
  changes?: FileChange[];
};

export type ChangedFile = {
  path: string;
  status?: "added" | "modified" | "deleted" | "renamed";
  was?: string;
  diff: string;
};

/** A status of an entity of an extra diagram. */
export type ItemStatus = "added" | "changed" | "removed" | "context" | "unchanged";

/** What every entity of an extra diagram has, as a part of the map does. */
type Entity = { id: string; status?: ItemStatus; summary?: string; changes?: FileChange[] };

export type Participant = Entity & { title: string; kind?: NodeKind; node?: string };
export type Message = Entity & {
  from: string;
  to: string;
  label?: string;
  kind?: "call" | "async" | "reply" | "self";
  edge?: string;
};
export type Group = { id: string; kind: "alt" | "opt" | "loop" | "par"; label?: string; first: string; last: string };
export type State = Entity & { title?: string; kind?: "state" | "initial" | "final" };
export type Transition = Entity & { from: string; to: string; label?: string };

/** A sequence or a state diagram beside the map. */
export type ExtraDiagram = {
  id: string;
  kind: "sequence" | "state";
  title: string;
  summary?: string;
  participants?: Participant[];
  messages?: Message[];
  groups?: Group[];
  states?: State[];
  transitions?: Transition[];
};

export type Payload = {
  change?: {
    ref?: string;
    title?: string;
    url?: string;
    source?: string;
    target?: string;
    description?: string;
  };
  summary?: string;
  lanes?: { id: string; title: string }[];
  nodes: Part[];
  edges?: Link[];
  diagrams?: ExtraDiagram[];
  files: ChangedFile[];
};

/** What a comment is on. */
export type Target =
  | { node: string }
  | { edge: string }
  | ItemTarget
  | { file: string; line: number; start_line?: number; side?: "old" | "new" }
  | ScreenTarget;

/** An area of a screenshot, as fractions of the image's size. */
export type Region = { x: number; y: number; width: number; height: number };
/** An area of a node's screens[index], on its before or its after image. */
export type ScreenTarget = {
  screen: { node: string; index: number; image: "before" | "after" };
  region: Region;
  /** the same area in the image's own pixels, and the image's size */
  pixels?: Region;
  image_size?: { width: number; height: number };
};
export const isScreen = (t: Target): t is ScreenTarget => "screen" in t;
/** An entity of an extra diagram that has no part or interaction of the map. */
export type ItemTarget = { diagram: string; item: string };
export const isItem = (t: Target | NonNullable<Selection>): t is ItemTarget => "diagram" in t;

export type Comment = { target: Target; body: string };

export type Verdict = "approve" | "request_changes";

export type Decision = { verdict: Verdict; comments: Comment[]; reviewed?: string[] };

/** What the person has entered so far, kept across reloads. */
export type Draft = { verdict: Verdict | null; comments: Comment[]; reviewed: string[] };

/** The selection: a part or an interaction of the map, or an entity of an
 *  extra diagram that has none. */
export type Selection = { node: string } | { edge: string } | ItemTarget | null;

/** An entity of an extra diagram, found by its ids, with what it is. */
export type Found =
  | { diagram: ExtraDiagram; kind: "participant"; item: Participant }
  | { diagram: ExtraDiagram; kind: "message"; item: Message }
  | { diagram: ExtraDiagram; kind: "state"; item: State }
  | { diagram: ExtraDiagram; kind: "transition"; item: Transition };

export function findItem(payload: Payload, at: ItemTarget): Found | null {
  const diagram = payload.diagrams?.find((d) => d.id === at.diagram);
  if (!diagram) return null;
  const pick = <T extends { id: string }>(list?: T[]) => list?.find((x) => x.id === at.item);
  const p = pick(diagram.participants);
  if (p) return { diagram, kind: "participant", item: p };
  const m = pick(diagram.messages);
  if (m) return { diagram, kind: "message", item: m };
  const s = pick(diagram.states);
  if (s) return { diagram, kind: "state", item: s };
  const t = pick(diagram.transitions);
  if (t) return { diagram, kind: "transition", item: t };
  return null;
}

/** What selecting an entity selects: the map's part or interaction it
 *  names, when there is one, and the entity itself otherwise. */
export function selectionOf(
  payload: Payload,
  diagram: string,
  item: Participant | Message | State | Transition,
): Selection {
  if ("node" in item && item.node && payload.nodes.some((n) => n.id === item.node)) return { node: item.node };
  if ("edge" in item && item.edge && payload.edges?.some((e) => e.id === item.edge)) return { edge: item.edge };
  return { diagram, item: item.id };
}

/** The id the badges and the reviewed mark keep a selection under. */
export function markOf(selection: NonNullable<Selection>): string {
  if ("node" in selection) return selection.node;
  if ("edge" in selection) return selection.edge;
  return `${selection.diagram}:${selection.item}`;
}

export const sameSelection = (a: Selection, b: Selection) => JSON.stringify(a) === JSON.stringify(b);

/** The file changes of a selection whose files are in the change. */
export function changesOf(payload: Payload, selection: Selection): FileChange[] {
  if (!selection) return [];
  const owner =
    "node" in selection
      ? payload.nodes.find((n) => n.id === selection.node)
      : "edge" in selection
        ? payload.edges?.find((e) => e.id === selection.edge)
        : findItem(payload, selection)?.item;
  return (owner?.changes ?? []).filter((c) => payload.files.some((f) => f.path === c.file));
}

/** Whether a selection is an interaction, a message or a transition, whose
 *  label reads as code and shows in monospace, as on the diagrams. */
export function namedAsCode(payload: Payload, selection: Selection): boolean {
  if (!selection || "node" in selection) return false;
  if ("edge" in selection) return true;
  const kind = findItem(payload, selection)?.kind;
  return kind === "message" || kind === "transition";
}

/** The title of a selection, to name it. */
export function titleOf(payload: Payload, selection: Selection): string {
  if (!selection) return "";
  if ("node" in selection) return payload.nodes.find((n) => n.id === selection.node)?.title ?? selection.node;
  if ("edge" in selection) return payload.edges?.find((x) => x.id === selection.edge)?.label ?? selection.edge;
  const found = findItem(payload, selection);
  return found ? itemTitle(found) : selection.item;
}

/** An entity's name: its title or label, or what it is without one. */
export function itemTitle(found: Found): string {
  const { kind, item } = found;
  if (kind === "participant") return item.title;
  if (kind === "state")
    return item.title || (item.kind === "initial" ? "Start" : item.kind === "final" ? "End" : item.id);
  return item.label || (kind === "message" ? "Message" : "Transition");
}

/** Every entity of the extra diagrams that is its own, with its mark id,
 *  to count the comments on the lines it covers. */
export function ownItems(payload: Payload): { id: string; changes?: FileChange[] }[] {
  const out: { id: string; changes?: FileChange[] }[] = [];
  for (const d of payload.diagrams ?? [])
    for (const item of [
      ...(d.participants ?? []),
      ...(d.messages ?? []),
      ...(d.states ?? []),
      ...(d.transitions ?? []),
    ]) {
      const sel = selectionOf(payload, d.id, item);
      if (sel && isItem(sel)) out.push({ id: markOf(sel), changes: item.changes });
    }
  return out;
}

/** Whether two file changes are the same one: the same file and ranges. */
export const sameChange = (a?: FileChange, b?: FileChange) =>
  !!a && !!b && a.file === b.file && JSON.stringify(a.lines ?? []) === JSON.stringify(b.lines ?? []);

/** A key for a target, to compare and to group by. */
export function keyOf(target: Target): string {
  if ("node" in target) return `node:${target.node}`;
  if ("edge" in target) return `edge:${target.edge}`;
  if ("diagram" in target) return `item:${target.diagram}:${target.item}`;
  if ("screen" in target) {
    const { node, index, image } = target.screen;
    const r = target.region;
    return `screen:${node}:${index}:${image}:${r.x},${r.y},${r.width},${r.height}`;
  }
  return `line:${target.file}:${target.side ?? "new"}:${target.start_line ?? target.line}-${target.line}`;
}

export const nodeStatus = (p: Part): NodeStatus => p.status ?? "changed";
export const edgeStatus = (l: Link): EdgeStatus => l.status ?? "changed";

/** The lines of a unified diff's hunks, each hunk with its @@ header,
 *  without git's header lines (diff --git, new file mode, index, --- and
 *  +++), which come before the first hunk of a file. */
export function hunkLines(diff: string): string[] {
  const out: string[] = [];
  let inHunk = false;
  for (const raw of diff.replace(/\n$/, "").split("\n")) {
    if (raw.startsWith("@@")) inHunk = true;
    else if (raw.startsWith("diff --git ")) inHunk = false;
    if (inHunk && !raw.startsWith("\\")) out.push(raw);
  }
  return out;
}

/** The added and removed lines of a unified diff. */
export function countLines(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of hunkLines(diff)) {
    if (line.startsWith("@@")) continue;
    if (line.startsWith("+")) added++;
    else if (line.startsWith("-")) removed++;
  }
  return { added, removed };
}

/** A line, or the lines from start_line to line, of a file on one side. */
export type LineTarget = { file: string; line: number; start_line?: number; side?: "old" | "new" };
/** The first line of a line target. */
export const firstLine = (t: LineTarget) => t.start_line ?? t.line;
/** Whether a line target takes in a line of its side. */
export const takesIn = (t: LineTarget, side: "old" | "new", line: number) =>
  (t.side ?? "new") === side && line >= firstLine(t) && line <= t.line;
export const isLine = (t: Target): t is LineTarget => "file" in t;

/** Whether a part's or an interaction's file change covers a commented
 *  line: the whole file without ranges, and a line in one of them with.
 *  A removed line has no number on the new side, so it counts for the file. */
export function covers(changes: FileChange[] | undefined, at: LineTarget): boolean {
  return (changes ?? []).some(
    (c) =>
      c.file === at.file &&
      (!c.lines?.length ||
        (at.side ?? "new") === "old" ||
        c.lines.some(([a, b]) => firstLine(at) <= b && at.line >= a)),
  );
}

/** The text of a target's lines, from its first to its last, on its side;
 *  empty when the diff does not show them. */
export function linesText(payload: Payload, target: LineTarget): string[] {
  const file = payload.files.find((f) => f.path === target.file);
  if (!file) return [];
  const old = (target.side ?? "new") === "old";
  const first = firstLine(target);
  const out: string[] = [];
  let o = 0;
  let n = 0;
  const take = (at: number, text: string) => {
    if (at >= first && at <= target.line) out.push(text);
  };
  for (const raw of hunkLines(file.diff)) {
    const hunk = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      o = Number(hunk[1]);
      n = Number(hunk[2]);
      continue;
    }
    const text = raw.slice(1);
    if (raw.startsWith("+")) {
      if (!old) take(n, text);
      n++;
    } else if (raw.startsWith("-")) {
      if (old) take(o, text);
      o++;
    } else {
      take(old ? o : n, text);
      o++;
      n++;
    }
  }
  return out;
}

/** The references the payload makes that it cannot keep, to say so above the diagram. */
export function problemsOf(payload: Payload): string[] {
  const out: string[] = [];
  const nodes = new Set(payload.nodes.map((n) => n.id));
  const edges = new Set((payload.edges ?? []).map((e) => e.id));
  const lanes = new Set((payload.lanes ?? []).map((l) => l.id));
  const files = new Set(payload.files.map((f) => f.path));
  for (const n of payload.nodes) {
    if (n.lane && !lanes.has(n.lane)) out.push(`Part “${n.title}” names an unknown lane, ${n.lane}.`);
    for (const c of n.changes ?? [])
      if (!files.has(c.file)) out.push(`Part “${n.title}” names a file that is not in the change, ${c.file}.`);
  }
  for (const e of payload.edges ?? []) {
    for (const end of [e.from, e.to])
      if (!nodes.has(end)) out.push(`Interaction ${e.label ?? e.id} names an unknown part, ${end}.`);
    for (const c of e.changes ?? [])
      if (!files.has(c.file))
        out.push(`Interaction ${e.label ?? e.id} names a file that is not in the change, ${c.file}.`);
  }
  for (const d of payload.diagrams ?? []) {
    const named = `${d.kind === "sequence" ? "Sequence" : "State diagram"} “${d.title}”`;
    const ends = new Set([...(d.participants ?? []), ...(d.states ?? [])].map((x) => x.id));
    const messages = new Set((d.messages ?? []).map((m) => m.id));
    for (const p of d.participants ?? [])
      if (p.node && !nodes.has(p.node)) out.push(`${named} names an unknown part, ${p.node}.`);
    for (const m of [...(d.messages ?? []), ...(d.transitions ?? [])])
      for (const end of [m.from, m.to]) if (!ends.has(end)) out.push(`${named} names an unknown end, ${end}.`);
    for (const m of d.messages ?? [])
      if (m.edge && !edges.has(m.edge)) out.push(`${named} names an unknown interaction, ${m.edge}.`);
    for (const g of d.groups ?? [])
      for (const end of [g.first, g.last])
        if (!messages.has(end)) out.push(`${named} names an unknown message, ${end}.`);
    for (const x of [...(d.participants ?? []), ...(d.messages ?? []), ...(d.states ?? []), ...(d.transitions ?? [])])
      for (const c of x.changes ?? [])
        if (!files.has(c.file)) out.push(`${named} names a file that is not in the change, ${c.file}.`);
  }
  return out;
}

/** The comments that reach a diagram's entities, each counted once: those
 *  on its own entities, on the map's parts and interactions it links, on
 *  the lines their files cover, and on the linked parts' screenshots. */
export function diagramComments(payload: Payload, diagram: ExtraDiagram, comments: Comment[]): number {
  const nodes = new Set((diagram.participants ?? []).flatMap((p) => (p.node ? [p.node] : [])));
  const edges = new Set((diagram.messages ?? []).flatMap((m) => (m.edge ? [m.edge] : [])));
  const items = [
    ...(diagram.participants ?? []),
    ...(diagram.messages ?? []),
    ...(diagram.states ?? []),
    ...(diagram.transitions ?? []),
  ];
  const changes = items.flatMap((item) => changesOf(payload, selectionOf(payload, diagram.id, item)));
  return comments.filter((c) => {
    const t = c.target;
    if ("diagram" in t) return t.diagram === diagram.id;
    if ("node" in t) return nodes.has(t.node);
    if ("edge" in t) return edges.has(t.edge);
    if (isScreen(t)) return nodes.has(t.screen.node);
    if (isLine(t)) return covers(changes, t);
    return false;
  }).length;
}

/** Of the owners whose files cover commented lines, the one a diagram
 *  badges for the comment: the narrowest range that holds all the lines,
 *  or without one, the range that holds the most of them, then the
 *  narrowest; the first owner on a tie. A file named without ranges, or a
 *  line on the old side, counts as holding all of them at the widest. */
export function narrowest(owners: { id: string; changes?: FileChange[] }[], at: LineTarget): string | null {
  const first = firstLine(at);
  const lines = at.line - first + 1;
  let best: string | null = null;
  let score: [number, number] = [-1, 0];
  for (const owner of owners) {
    if (!covers(owner.changes, at)) continue;
    // [the commented lines a range holds, minus the range's width]: more
    // lines first, then the narrower range
    let mine: [number, number] = [0, Number.NEGATIVE_INFINITY];
    for (const c of owner.changes ?? []) {
      if (c.file !== at.file) continue;
      if (!c.lines?.length || (at.side ?? "new") === "old") {
        mine = better(mine, [lines, Number.NEGATIVE_INFINITY]);
        continue;
      }
      for (const [a, b] of c.lines) {
        const held = Math.min(b, at.line) - Math.max(a, first) + 1;
        if (held > 0) mine = better(mine, [held, -(b - a + 1)]);
      }
    }
    if (better(score, mine) !== score) {
      best = owner.id;
      score = mine;
    }
  }
  return best;
}

const better = (a: [number, number], b: [number, number]) => (b[0] > a[0] || (b[0] === a[0] && b[1] > a[1]) ? b : a);
