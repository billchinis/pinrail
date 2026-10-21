// Where each part goes on the canvas. dagre lays the parts out left to
// right along their interactions, and keeps the parts of a lane together
// in a cluster, which the diagram draws as a band behind them.
import dagre from "@dagrejs/dagre";
import type { ExtraDiagram, Part, Payload } from "./types";

export const NODE_HEIGHT = 64;
/** a detailed card has a header with the part's kind and status, and a
 *  footer with the lines it changes */
export const DETAILED_HEIGHT = 96;

/** How the map draws a part: with a header and its line counts, or compact. */
export type CardStyle = "detailed" | "compact";
/** a part with screenshots shows a thumbnail under its title */
export const SHOT_HEIGHT = 84;
/** Room inside a lane around its parts: above, for its title and a selected
 *  part's ring under it, and at the sides and the bottom for the ring. */
const LANE_PAD = 36;
const LANE_SIDE = 20;

export type Box = { x: number; y: number; width: number; height: number };

/** A part's width, from its title, so that dagre and the card agree on it without measuring. */
export function widthOf(part: Part, style: CardStyle = "compact"): number {
  // a detailed card's title has the card's width, without the icon beside it
  const room = style === "detailed" ? 48 : 76;
  return Math.round(Math.min(280, Math.max(style === "detailed" ? 190 : 170, part.title.length * 7.4 + room)));
}

export function heightOf(part: Part, style: CardStyle = "compact"): number {
  return (
    (style === "detailed" ? DETAILED_HEIGHT : NODE_HEIGHT) +
    (part.screens?.some((s) => s.after || s.before) ? SHOT_HEIGHT : 0)
  );
}

/** A label's height on the diagram. */
export const LABEL_HEIGHT = 22;
/** The longest a label gets on the diagram; the rest of it is in its tooltip. */
export const LABEL_MAX = 220;

/** A label's width on the diagram, for the layout to leave room for it. */
export const labelWidth = (label: string, files = 0) =>
  Math.min(LABEL_MAX, Math.round(label.length * 6.7 + 34)) + (files ? 26 : 0);

/** An interaction's line, as dagre routes it clear of the parts, and where its label goes. */
export type Route = { points: { x: number; y: number }[]; label: { x: number; y: number } };

export function layout(
  payload: Payload,
  style: CardStyle = "compact",
): {
  nodes: Map<string, Box>;
  lanes: Map<string, Box>;
  edges: Map<string, Route>;
} {
  const lanes = new Set((payload.lanes ?? []).map((l) => l.id));
  const g = new dagre.graphlib.Graph({ multigraph: true, compound: true });
  // the labels take a rank of their own between the parts, so the ranks
  // themselves sit close
  g.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 40, edgesep: 16, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const lane of lanes)
    g.setNode(`lane:${lane}`, {
      paddingTop: LANE_PAD,
      paddingLeft: LANE_SIDE,
      paddingRight: LANE_SIDE,
      paddingBottom: LANE_SIDE,
    });
  for (const p of payload.nodes) {
    g.setNode(p.id, { width: widthOf(p, style), height: heightOf(p, style) });
    if (p.lane && lanes.has(p.lane)) g.setParent(p.id, `lane:${p.lane}`);
  }
  for (const e of payload.edges ?? []) {
    if (e.from === e.to || !g.hasNode(e.from) || !g.hasNode(e.to)) continue;
    // the label's size, so that the gap between the parts has room for it
    g.setEdge(
      e.from,
      e.to,
      { width: labelWidth(e.label ?? e.kind ?? "call", e.changes?.length), height: 24, labelpos: "c" },
      e.id,
    );
  }
  dagre.layout(g);
  const box = (name: string): Box => {
    const n = g.node(name);
    return { x: n.x - n.width / 2, y: n.y - n.height / 2, width: n.width, height: n.height };
  };
  const nodes = new Map<string, Box>();
  for (const p of payload.nodes) nodes.set(p.id, box(p.id));
  const bands = new Map<string, Box>();
  // A lane's band: around its parts, with room for its title above them.
  // dagre leaves no padding inside a cluster, so the band is drawn from the
  // parts themselves. A lane without parts has none.
  for (const lane of lanes) {
    const parts = payload.nodes.filter((p) => p.lane === lane).map((p) => nodes.get(p.id)!);
    if (!parts.length) continue;
    const left = Math.min(...parts.map((b) => b.x)) - LANE_SIDE;
    const top = Math.min(...parts.map((b) => b.y)) - LANE_PAD;
    const right = Math.max(...parts.map((b) => b.x + b.width)) + LANE_SIDE;
    const bottom = Math.max(...parts.map((b) => b.y + b.height)) + LANE_SIDE;
    bands.set(lane, { x: left, y: top, width: right - left, height: bottom - top });
  }
  const edges = new Map<string, Route>();
  // what a label must clear: the parts, and the labels placed before it
  const taken: Box[] = [...nodes.values()];
  for (const e of payload.edges ?? []) {
    const d =
      g.hasNode(e.from) && g.hasNode(e.to) && e.from !== e.to ? g.edge({ v: e.from, w: e.to, name: e.id }) : null;
    if (!d?.points?.length) continue;
    const size = { width: labelWidth(e.label ?? e.kind ?? "call", e.changes?.length), height: LABEL_HEIGHT };
    // on the line as drawn, which cuts the corners dagre's point may sit in
    const label = onLine(d.points, { x: d.x ?? d.points[0].x, y: d.y ?? d.points[0].y }, size, taken);
    taken.push({ x: label.x - size.width / 2, y: label.y - size.height / 2, ...size });
    edges.set(e.id, { points: d.points, label });
  }
  return { nodes, lanes: bands, edges };
}

/** A state's size: a dot for the start and the end, a card otherwise,
 *  with room for its name and, when it has files, their count. */
export const DOT = 22;
export function stateSize(
  title: string | undefined,
  kind: string | undefined,
  files = 0,
): { width: number; height: number } {
  if (kind === "initial" || kind === "final") return { width: DOT, height: DOT };
  const room = 44 + (files ? 34 : 0);
  return { width: Math.round(Math.min(280, Math.max(110, (title ?? "").length * 7.8 + room))), height: 44 };
}

/** Which way a state diagram runs: left to right, or top to bottom. */
export type Direction = "LR" | "TB";

/** A transition back to its own state: a loop above the state when the
 *  diagram runs left to right, and beside it when it runs top to bottom,
 *  out of the way of the transitions in and out. `label` is the label's
 *  middle, beyond the loop. */
export type Loop = { path: string; label: Point };
function loopOf(box: Box, direction: Direction, label: { width: number; height: number }): Loop {
  if (direction === "LR") {
    const x = box.x + box.width / 2;
    const y = box.y;
    return {
      path: `M ${x - 14},${y} C ${x - 30},${y - 46} ${x + 30},${y - 46} ${x + 14},${y}`,
      label: { x, y: y - 36 - label.height / 2 },
    };
  }
  const x = box.x + box.width;
  const y = box.y + box.height / 2;
  return {
    path: `M ${x},${y - 12} C ${x + 46},${y - 30} ${x + 46},${y + 30} ${x},${y + 12}`,
    label: { x: x + 40 + label.width / 2, y },
  };
}

/** Where each state goes, the routes of the transitions between different
 *  states, and the loops of the transitions back to the same state. Each
 *  label sits on its line, clear of the states and of the labels placed
 *  before it. */
export function stateLayout(
  diagram: ExtraDiagram,
  direction: Direction = "LR",
): { nodes: Map<string, Box>; edges: Map<string, Route>; loops: Map<string, Loop> } {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  // top to bottom, labels sit across the lines, and two lines between the
  // same states bow toward each other, so their labels need the room to
  // sit one above the other
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: direction === "TB" ? 96 : 40,
    edgesep: 16,
    marginx: direction === "TB" ? 120 : 24,
    marginy: 48,
  });
  g.setDefaultEdgeLabel(() => ({}));
  for (const s of diagram.states ?? []) g.setNode(s.id, stateSize(s.title, s.kind, s.changes?.length ?? 0));
  for (const t of diagram.transitions ?? []) {
    if (t.from === t.to || !g.hasNode(t.from) || !g.hasNode(t.to)) continue;
    const label = t.label ?? "";
    g.setEdge(
      t.from,
      t.to,
      { width: label ? labelWidth(label, t.changes?.length) : 1, height: label ? LABEL_HEIGHT : 1, labelpos: "c" },
      t.id,
    );
  }
  dagre.layout(g);
  const nodes = new Map<string, Box>();
  for (const s of diagram.states ?? []) {
    const n = g.node(s.id);
    nodes.set(s.id, { x: n.x - n.width / 2, y: n.y - n.height / 2, width: n.width, height: n.height });
  }
  const edges = new Map<string, Route>();
  const loops = new Map<string, Loop>();
  const taken: Box[] = [...nodes.values()];
  const take = (at: Point, size: { width: number; height: number }) =>
    taken.push({ x: at.x - size.width / 2, y: at.y - size.height / 2, ...size });
  // the loops first: their place is fixed, and the other labels make room for them
  for (const t of diagram.transitions ?? []) {
    const box = t.from === t.to ? nodes.get(t.from) : undefined;
    if (!box) continue;
    const size = { width: t.label ? labelWidth(t.label, t.changes?.length) : 0, height: t.label ? LABEL_HEIGHT : 0 };
    const loop = loopOf(box, direction, size);
    loops.set(t.id, loop);
    if (t.label) take(loop.label, size);
  }
  for (const t of diagram.transitions ?? []) {
    const d =
      t.from !== t.to && g.hasNode(t.from) && g.hasNode(t.to) ? g.edge({ v: t.from, w: t.to, name: t.id }) : null;
    if (!d?.points?.length) continue;
    const size = { width: t.label ? labelWidth(t.label, t.changes?.length) : 1, height: t.label ? LABEL_HEIGHT : 1 };
    // on the line as drawn, which cuts the corners dagre's point may sit in
    const label = onLine(d.points, { x: d.x ?? d.points[0].x, y: d.y ?? d.points[0].y }, size, taken);
    if (t.label) take(label, size);
    edges.set(t.id, { points: d.points, label });
  }
  return { nodes, edges, loops };
}

// A sequence diagram: a column per participant, from left to right, and a
// row per message, from top to bottom. Frames around runs of messages take
// room above their first row for their label, and a little below their last.
export const HEAD_HEIGHT = 44;
const ROW = 50;
const SELF_ROW = 64;
const FRAME_LABEL = 26;
const FRAME_END = 12;
const FRAME_PAD = 14;
const COLUMN_GAP = 40;

export type SequenceLayout = {
  /** each participant's head */
  heads: Map<string, Box>;
  /** the x of each participant's lifeline */
  lines: Map<string, number>;
  /** each message's row: from the left end to the right end, or the loop to the right of a self message */
  rows: Map<string, Box & { self: boolean; leftward: boolean }>;
  /** each frame, inset by how deep it is nested */
  frames: Map<string, Box>;
  /** where the lifelines end */
  bottom: number;
};

/** A hidden participant's head, to measure titles in. */
let probe: HTMLSpanElement | null = null;

/** How wide a participant's title is drawn: measured in a hidden head with
 *  the same classes, since the system font differs from one platform to
 *  the next, or about 8 pixels a character outside a page. */
function titleWidth(title: string): number {
  if (typeof document === "undefined" || !document.body) return title.length * 8;
  if (!probe) {
    const head = document.createElement("div");
    head.className = "cm-part cm-seq-head";
    head.setAttribute("aria-hidden", "true");
    head.style.cssText = "position: absolute; top: 0; left: -10000px; visibility: hidden";
    probe = document.createElement("span");
    probe.className = "cm-part-title";
    probe.style.cssText = "flex: none; overflow: visible";
    head.append(probe);
    document.body.append(head);
  }
  probe.textContent = title;
  return Math.ceil(probe.getBoundingClientRect().width);
}

export function sequenceLayout(diagram: ExtraDiagram): SequenceLayout {
  const people = diagram.participants ?? [];
  const messages = (diagram.messages ?? []).filter(
    (m) => people.some((p) => p.id === m.from) && people.some((p) => p.id === m.to),
  );
  const order = new Map(messages.map((m, i) => [m.id, i]));
  // a column's width: its head, and the labels of the messages that start
  // from it to its right-hand neighbour
  const heads = new Map<string, Box>();
  const lines = new Map<string, number>();
  // the head's icon, padding and border, and its bold title, up to the
  // widest a part of the map gets
  const widths = people.map((p) => Math.round(Math.min(280, Math.max(120, titleWidth(p.title) + 62))));
  const gaps = people.map(() => COLUMN_GAP);
  for (const m of messages) {
    const a = people.findIndex((p) => p.id === m.from);
    const b = people.findIndex((p) => p.id === m.to);
    const want = labelWidth(m.label ?? "", m.changes?.length) + 16;
    if (a === b) gaps[a] = Math.max(gaps[a], want + 40 - widths[a] / 2);
    else {
      // the label sits over the span between the two lifelines
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      let span = 0;
      for (let i = lo; i < hi; i++) span += widths[i] / 2 + gaps[i] + widths[i + 1] / 2;
      if (span < want && hi - lo === 1) gaps[lo] += want - span;
    }
  }
  let x = 24;
  people.forEach((p, i) => {
    heads.set(p.id, { x, y: 24, width: widths[i], height: HEAD_HEIGHT });
    lines.set(p.id, x + widths[i] / 2);
    x += widths[i] + gaps[i];
  });
  // the frames that open and close at each message, outer ones first
  const groups = (diagram.groups ?? [])
    .filter((g) => order.has(g.first) && order.has(g.last) && order.get(g.first)! <= order.get(g.last)!)
    .sort((a, b) => order.get(a.first)! - order.get(b.first)! || order.get(b.last)! - order.get(a.last)!);
  const depth = new Map<string, number>();
  for (const g of groups) {
    const inside = groups.filter(
      (o) =>
        o !== g &&
        depth.has(o.id) &&
        order.get(o.first)! <= order.get(g.first)! &&
        order.get(o.last)! >= order.get(g.last)!,
    );
    depth.set(g.id, inside.length);
  }
  const rows = new Map<string, Box & { self: boolean; leftward: boolean }>();
  const tops = new Map<string, number>();
  const ends = new Map<string, number>();
  let y = 24 + HEAD_HEIGHT + 16;
  for (const m of messages) {
    for (const g of groups.filter((g) => g.first === m.id)) {
      tops.set(g.id, y);
      y += FRAME_LABEL;
    }
    const a = lines.get(m.from)!;
    const b = lines.get(m.to)!;
    const self = m.from === m.to || m.kind === "self";
    const height = self ? SELF_ROW : ROW;
    if (self)
      rows.set(m.id, {
        x: a,
        y,
        width: Math.max(60, labelWidth(m.label ?? "", m.changes?.length) + 40),
        height,
        self,
        leftward: false,
      });
    else rows.set(m.id, { x: Math.min(a, b), y, width: Math.abs(b - a), height, self, leftward: b < a });
    y += height;
    for (const g of groups.filter((g) => g.last === m.id).reverse()) {
      ends.set(g.id, y);
      y += FRAME_END;
    }
  }
  const frames = new Map<string, Box>();
  for (const g of groups) {
    const inside = messages.slice(order.get(g.first)!, order.get(g.last)! + 1);
    const xs = inside.flatMap((m) => {
      const r = rows.get(m.id)!;
      return [r.x, r.x + r.width];
    });
    const inset = depth.get(g.id)! * 8;
    const left = Math.min(...xs) - FRAME_PAD * 2 + inset;
    const right = Math.max(...xs) + FRAME_PAD * 2 - inset;
    frames.set(g.id, { x: left, y: tops.get(g.id)!, width: right - left, height: ends.get(g.id)! - tops.get(g.id)! });
  }
  return { heads, lines, rows, frames, bottom: y + 16 };
}

type Point = { x: number; y: number };

/** The curves of a route's line, as routePath draws them: each bends
 *  toward a point and turns halfway to the next, so the line keeps within
 *  the corners of its points and never swings past a turn. A curve is its
 *  start, its control point and its end. */
function curves(points: Point[]): [Point, Point, Point][] {
  const n = points.length;
  if (n < 3) return [[points[0], points[0], points[n - 1]]];
  const out: [Point, Point, Point][] = [];
  let from = points[0];
  for (let i = 1; i < n - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    const end = i === n - 2 ? q : { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    out.push([from, p, end]);
    from = end;
  }
  return out;
}

/** A smooth line through a route's points, as dagre laid it out. */
export function routePath(points: Point[]): string {
  if (points.length < 3)
    return `M ${points[0].x},${points[0].y} L ${points[points.length - 1].x},${points[points.length - 1].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (const [, c, end] of curves(points)) d += ` Q ${c.x},${c.y} ${end.x},${end.y}`;
  return d;
}

/** Where a label goes on a route's drawn line: the point nearest `at`,
 *  where dagre put it, at which a label of `size` clears every box in
 *  `boxes`, the parts and the other labels. The line cuts the corners of the route, so dagre's
 *  point can lie beside the line, and the line's nearest point can lie
 *  close to a part. Without such a point, dagre's own, which it kept clear
 *  of the parts, if no label took it since; else the nearest. */
export function onLine(points: Point[], at: Point, size?: { width: number; height: number }, boxes: Box[] = []): Point {
  const along: Point[] = [];
  for (const [a, c, b] of curves(points))
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const u = 1 - t;
      along.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
    }
  const near = (p: Point) => Math.hypot(p.x - at.x, p.y - at.y);
  along.sort((p, q) => near(p) - near(q));
  // a few pixels between a label and a part
  const GAP = 4;
  const clear = (p: Point) =>
    !size ||
    boxes.every(
      (b) =>
        p.x + size.width / 2 + GAP <= b.x ||
        p.x - size.width / 2 - GAP >= b.x + b.width ||
        p.y + size.height / 2 + GAP <= b.y ||
        p.y - size.height / 2 - GAP >= b.y + b.height,
    );
  return along.find(clear) ?? (clear(at) ? at : along[0]);
}
