// The diagram: a card per part, in bands for the lanes, and a line per
// interaction between parts. A click on a card or a line selects it.
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  AppWindow,
  Box as BoxIcon,
  Check,
  Clock,
  Database,
  FileCode,
  FlaskConical,
  Globe,
  Maximize,
  MessageCircle,
  Minus,
  PanelTop,
  Plus,
  RectangleHorizontal,
  Route,
  Server,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { createContext, memo, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { heightOf, layout, routePath, widthOf, type CardStyle, type Route as LineRoute } from "./layout";
import { lineCount, type LineCount } from "./lines";
import {
  changesOf,
  edgeStatus,
  nodeStatus,
  type Link,
  type NodeKind,
  type Part,
  type Payload,
  type Selection,
} from "./types";

/** What the diagram shows on each part and interaction, by its id. */
export type Marks = Map<string, { comments: number; reviewed: boolean }>;

export type Shared = {
  selection: Selection;
  marks: Marks;
  /** the address of each screenshot, by attachment name, once resolved */
  images: Map<string, string>;
  select(selection: Selection): void;
};

export const SharedContext = createContext<Shared>(null!);

export const kindIcon: Record<NodeKind, LucideIcon> = {
  ui: AppWindow,
  module: BoxIcon,
  service: Server,
  endpoint: Route,
  store: Database,
  job: Clock,
  external: Globe,
  config: Settings2,
  test: FlaskConical,
};

export const kindLabel: Record<NodeKind, string> = {
  ui: "Interface",
  module: "Module",
  service: "Service",
  endpoint: "Endpoint",
  store: "Store",
  job: "Job",
  external: "External",
  config: "Configuration",
  test: "Tests",
};

export const statusLabel: Record<string, string> = {
  added: "new",
  changed: "changed",
  removed: "removed",
  context: "unchanged",
  unchanged: "unchanged",
};

/** `lines`: what the part adds and removes, for a detailed card */
type PartData = { part: Part; style: CardStyle; lines: LineCount | null };
type PartNodeType = Node<PartData, "part">;
type LaneData = { title: string };
type LaneNodeType = Node<LaneData, "lane">;
/** `route`: the line and the label's place, as the layout routed them clear
 *  of the parts; `files`: how many files implement the interaction */
type LinkData = { link: Link; route?: LineRoute; files: number };
type LinkEdgeType = Edge<LinkData, "link">;

/** The number of files behind an interaction, a message or a transition,
 *  on its label, so that one with code to read stands out from one
 *  without. Nothing without files. */
export function FilesMark({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="cm-link-files" aria-hidden="true">
      <FileCode />
      {count}
    </span>
  );
}

/** How a label names its files, for its accessible name. */
export const filesSaid = (count: number) => (count ? `, ${count} ${count === 1 ? "file" : "files"}` : "");

/** Badges on a part's corner, or beside an interaction's label: its
 *  comments, and whether it was reviewed. */
export function Marked({ id, corner }: { id: string; corner?: boolean }) {
  const { marks } = useContext(SharedContext);
  const mark = marks.get(id);
  if (!mark || (!mark.comments && !mark.reviewed)) return null;
  return (
    <span className={`cm-marks${corner ? " cm-marks-corner" : ""}`}>
      {mark.reviewed ? (
        <span className="cm-mark cm-mark-reviewed" title="Reviewed">
          <Check />
        </span>
      ) : null}
      {mark.comments ? (
        <span
          className="cm-mark cm-mark-comment"
          title={`${mark.comments} ${mark.comments === 1 ? "comment" : "comments"}`}
        >
          <MessageCircle />
          {mark.comments}
        </span>
      ) : null}
    </span>
  );
}

const PartNode = memo(function PartNode({ data }: NodeProps<PartNodeType>) {
  const { selection, select, images } = useContext(SharedContext);
  const { part, style, lines } = data;
  const Icon = kindIcon[part.kind ?? "module"];
  const status = nodeStatus(part);
  const selected = !!selection && "node" in selection && selection.node === part.id;
  const shot = part.screens?.find((s) => s.after || s.before);
  const shotName = shot ? (shot.after ?? shot.before)!.$attachment : null;
  const files = part.changes?.length ?? 0;
  return (
    <button
      type="button"
      className={`cm-part cm-part-${style} cm-${status}${selected ? " cm-selected" : ""}`}
      style={{ width: widthOf(part, style), height: heightOf(part, style) }}
      onClick={() => select({ node: part.id })}
      aria-label={`${part.title}, ${kindLabel[part.kind ?? "module"]}, ${statusLabel[status]}`}
      aria-pressed={selected}
      data-node={part.id}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <Marked id={part.id} corner />
      {style === "detailed" ? (
        <>
          <span className="cm-part-band">
            <Icon />
            {kindLabel[part.kind ?? "module"]}
            <span className="cm-part-state">{statusLabel[status]}</span>
          </span>
          <span className="cm-part-body">
            <span className="cm-part-title">{part.title}</span>
            {lines && lines.added + lines.removed ? (
              <span className="cm-part-bar" aria-hidden="true">
                <span className="cm-bar-added" style={{ flexGrow: lines.added }} />
                <span className="cm-bar-removed" style={{ flexGrow: lines.removed }} />
              </span>
            ) : (
              <span className="cm-part-bar cm-part-bar-none" aria-hidden="true" />
            )}
            <span className="cm-part-foot">
              {lines ? (
                <span className="cm-part-lines">
                  <span className="cm-lines-added">+{lines.added}</span>
                  <span className="cm-lines-removed">−{lines.removed}</span>
                </span>
              ) : null}
              {files ? (
                <span className="cm-part-files">
                  {files} {files === 1 ? "file" : "files"}
                </span>
              ) : (
                <span className="cm-part-files">context</span>
              )}
            </span>
          </span>
        </>
      ) : (
        <>
          <span className="cm-part-head">
            <span className="cm-part-icon">
              <Icon />
            </span>
            <span className="cm-part-title">{part.title}</span>
          </span>
          <span className="cm-part-meta">
            <span className={`cm-status cm-status-${status}`}>{statusLabel[status]}</span>
            {files ? (
              <span className="cm-part-files">
                <FileCode />
                {files}
              </span>
            ) : null}
          </span>
        </>
      )}
      {shotName ? (
        <span className="cm-part-shot">{images.get(shotName) ? <img src={images.get(shotName)} alt="" /> : null}</span>
      ) : null}
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </button>
  );
});

const LaneNode = memo(function LaneNode({ data }: NodeProps<LaneNodeType>) {
  return (
    <div className="cm-lane">
      <span className="cm-lane-title">{data.title}</span>
    </div>
  );
});

const LinkEdge = memo(function LinkEdge(props: EdgeProps<LinkEdgeType>) {
  const { selection, select } = useContext(SharedContext);
  const { link, route, files } = props.data!;
  const [path, labelX, labelY] = route ? [routePath(route.points), route.label.x, route.label.y] : getBezierPath(props);
  const status = edgeStatus(link);
  const selected = !!selection && "edge" in selection && selection.edge === link.id;
  const kind = link.kind ?? "call";
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        className={`cm-link cm-link-${status} cm-link-${kind}${selected ? " cm-selected" : ""}`}
        interactionWidth={18}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className={`cm-link-label cm-link-label-${status}${selected ? " cm-selected" : ""}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          onClick={() => select({ edge: link.id })}
          aria-pressed={selected}
          aria-label={`${link.label ?? "Interaction"}, ${statusLabel[status]}${filesSaid(files)}`}
          title={link.label ?? kind}
          data-edge={link.id}
        >
          <span className="cm-link-text">{link.label ?? kind}</span>
          <FilesMark count={files} />
          <Marked id={link.id} />
        </button>
      </EdgeLabelRenderer>
    </>
  );
});

const nodeTypes = { part: PartNode, lane: LaneNode };
const edgeTypes = { link: LinkEdge };

/** Fitting the diagram to the part of the frame the drawer leaves in
 *  view: `inset` is the share of the frame's height the drawer covers. */
export const fitOptions = (inset: number) => ({
  padding: {
    top: "6%" as const,
    left: "6%" as const,
    right: "6%" as const,
    bottom: `${Math.round(inset * 100) + 6}%` as const,
  },
  maxZoom: 1.15,
});

/** Fits the diagram to the part of the frame in view when asked, when the
 *  frame changes size, and when the drawer opens, closes or is resized.
 *  With a selection, the drawer's changes leave the view to the Follower,
 *  which keeps the selection in sight. */
export function Fitter({
  fit,
  frame,
  inset,
  hold,
}: {
  fit: number;
  frame: React.RefObject<HTMLDivElement | null>;
  inset: number;
  hold: boolean;
}) {
  const flow = useReactFlow();
  const now = useRef({ inset, hold });
  now.current = { inset, hold };
  useEffect(() => {
    if (fit) flow.fitView({ ...fitOptions(now.current.inset), duration: 250 });
  }, [fit, flow]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!now.current.hold) flow.fitView(fitOptions(inset));
  }, [inset, flow]);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let first = true;
    const observer = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      flow.fitView(fitOptions(now.current.inset));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [flow, frame]);
  return null;
}

/** Centres the view on the nodes `ids` names, at `zoom`, in the part of
 *  the frame the diff drawer leaves in view: the middle of a part, or of the
 *  two ends of an interaction. */
function centreOn(
  flow: ReturnType<typeof useReactFlow>,
  frame: HTMLDivElement,
  ids: string[],
  inset: number,
  zoom: number,
  duration: number,
) {
  const centres = ids.flatMap((id) => {
    const n = flow.getInternalNode(id);
    if (!n) return [];
    const { x, y } = n.internals.positionAbsolute;
    return [{ x: x + (n.measured.width ?? 0) / 2, y: y + (n.measured.height ?? 0) / 2 }];
  });
  if (!centres.length) return;
  const at = {
    x: centres.reduce((t, c) => t + c.x, 0) / centres.length,
    y: centres.reduce((t, c) => t + c.y, 0) / centres.length,
  };
  // the drawer's height is a share of the canvas, which holds the diagram's
  // tabs as well as the diagram
  const hidden = (frame.parentElement ?? frame).clientHeight * inset;
  flow.setCenter(at.x, at.y + hidden / 2 / zoom, { zoom, duration });
}

/** While the diff drawer covers the bottom of the diagram, keeps the
 *  selection centred in the part still in view above it, at the zoom a zoom
 *  in on a part is on its way to, or else at the zoom there is. */
export function Follower({
  ids,
  inset,
  frame,
  aim,
}: {
  ids: string[];
  inset: number;
  frame: React.RefObject<HTMLDivElement | null>;
  /** the zoom a zoom in on a part is on its way to, while it lasts */
  aim?: React.RefObject<number | null>;
}) {
  const flow = useReactFlow();
  const key = ids.join("\u0000");
  useEffect(() => {
    if (!inset || !key || !frame.current) return;
    centreOn(flow, frame.current, key.split("\u0000"), inset, aim?.current ?? flow.getZoom(), 250);
  }, [key, inset, flow, frame, aim]);
  return null;
}

/** Zooms in on a part when asked, as close as a fit of the whole diagram
 *  goes, centred in the part of the frame the drawer leaves in view. While
 *  the zoom lasts, `aim` holds where it is going, so that the Follower
 *  centres the part at that zoom when the selection opens the drawer. */
export function Zoomer({
  zoom,
  inset,
  frame,
  aim,
}: {
  zoom: { node: string; n: number } | null;
  inset: number;
  frame: React.RefObject<HTMLDivElement | null>;
  aim: React.RefObject<number | null>;
}) {
  const flow = useReactFlow();
  const now = useRef(inset);
  now.current = inset;
  useEffect(() => {
    if (!zoom || !frame.current) return;
    aim.current = fitOptions(0).maxZoom;
    centreOn(flow, frame.current, [zoom.node], now.current, aim.current, 300);
    const done = setTimeout(() => (aim.current = null), 400);
    return () => clearTimeout(done);
  }, [zoom, flow, frame, aim]);
  return null;
}

/** The zoom buttons, in the diagram's top-left corner, which the diff drawer
 *  never covers. */
export function Zoom({
  onFit,
  children,
}: {
  onFit: () => void;
  /** the diagram's own buttons, before the zoom, such as one that switches its layout */
  children?: ReactNode;
}) {
  const flow = useReactFlow();
  return (
    <div className="cm-zoom">
      {children ? <span className="cm-zoom-own">{children}</span> : null}
      <button
        type="button"
        className="pinrail-btn pinrail-btn-ghost"
        onClick={() => flow.zoomIn()}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Plus />
      </button>
      <button
        type="button"
        className="pinrail-btn pinrail-btn-ghost"
        onClick={() => flow.zoomOut()}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Minus />
      </button>
      <button
        type="button"
        className="pinrail-btn pinrail-btn-ghost"
        onClick={onFit}
        title="Fit to the frame (F)"
        aria-label="Fit to the frame"
      >
        <Maximize />
      </button>
    </div>
  );
}

export function Diagram({
  payload,
  selection,
  marks,
  images,
  fit,
  onFit,
  select,
  inset,
  zoom = null,
  cards = "compact",
  setCards,
}: Shared & {
  payload: Payload;
  fit: number;
  onFit: () => void;
  /** the share of the map's height the diff drawer covers */
  inset: number;
  /** a part to zoom in on */
  zoom?: { node: string; n: number } | null;
  /** how the parts are drawn, and how to change it from the map */
  cards?: CardStyle;
  setCards?: (style: CardStyle) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const aim = useRef<number | null>(null);
  const placed = useMemo(() => layout(payload, cards), [payload, cards]);
  const nodes = useMemo<(PartNodeType | LaneNodeType)[]>(() => {
    const lanes: LaneNodeType[] = (payload.lanes ?? [])
      .filter((l) => placed.lanes.has(l.id))
      .map((l) => {
        const box = placed.lanes.get(l.id)!;
        return {
          id: `lane:${l.id}`,
          type: "lane",
          position: { x: box.x, y: box.y },
          data: { title: l.title },
          style: { width: box.width, height: box.height },
          selectable: false,
          draggable: false,
          focusable: false,
          zIndex: -1,
        };
      });
    const parts: PartNodeType[] = payload.nodes.map((p) => {
      const box = placed.nodes.get(p.id)!;
      return {
        id: p.id,
        type: "part",
        position: { x: box.x, y: box.y },
        data: { part: p, style: cards, lines: cards === "detailed" ? lineCount(payload, p) : null },
        draggable: false,
        selectable: false,
      };
    });
    return [...lanes, ...parts];
  }, [payload, placed, cards]);
  const edges = useMemo<LinkEdgeType[]>(() => {
    const ids = new Set(payload.nodes.map((n) => n.id));
    const shown = (payload.edges ?? []).filter((e) => ids.has(e.from) && ids.has(e.to));
    return shown.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: "link",
      data: { link: e, route: placed.edges.get(e.id), files: changesOf(payload, { edge: e.id }).length },
      markerEnd: { type: "arrowclosed" as const, width: 16, height: 16 },
      selectable: false,
    }));
  }, [payload, placed]);
  const followed = useMemo(() => {
    if (!selection) return [];
    if ("node" in selection) return [selection.node];
    if ("edge" in selection) {
      const e = payload.edges?.find((x) => x.id === selection.edge);
      return e ? [e.from, e.to] : [];
    }
    return [];
  }, [selection, payload]);
  const shared = useMemo(() => ({ selection, marks, images, select }), [selection, marks, images, select]);

  return (
    <div className="cm-diagram" ref={frame}>
      <SharedContext.Provider value={shared}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesConnectable={false}
            nodesDraggable={false}
            elementsSelectable={false}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            fitView
            fitViewOptions={fitOptions(inset)}
            onPaneClick={() => select(null)}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            <Fitter fit={fit} frame={frame} inset={inset} hold={followed.length > 0} />
            <Follower ids={followed} inset={inset} frame={frame} aim={aim} />
            <Zoomer zoom={zoom} inset={inset} frame={frame} aim={aim} />
            <Zoom onFit={onFit}>
              {/* an action, not a state: it shows the style a click switches to */}
              {!setCards ? null : cards === "detailed" ? (
                <button
                  type="button"
                  className="pinrail-btn pinrail-btn-ghost"
                  onClick={() => setCards("compact")}
                  title="Show compact cards"
                  aria-label="Show compact cards"
                >
                  <RectangleHorizontal />
                </button>
              ) : (
                <button
                  type="button"
                  className="pinrail-btn pinrail-btn-ghost"
                  onClick={() => setCards("detailed")}
                  title="Show detailed cards"
                  aria-label="Show detailed cards"
                >
                  <PanelTop />
                </button>
              )}
            </Zoom>
          </ReactFlow>
        </ReactFlowProvider>
      </SharedContext.Provider>
    </div>
  );
}
