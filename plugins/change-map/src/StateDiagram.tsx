// A state diagram: a card per state, a dot for the start and a ringed dot
// for the end, and a line per transition. A click selects a state or a
// transition, and the panel, the diff drawer and the comments follow it as
// they do on the map.
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
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { FileCode, GitCommitHorizontal, GitCommitVertical } from "lucide-react";
import { memo, useContext, useMemo, useRef } from "react";
import {
  FilesMark,
  filesSaid,
  fitOptions,
  Fitter,
  Follower,
  Marked,
  SharedContext,
  Zoom,
  statusLabel,
  type Shared,
} from "./Diagram";
import { routePath, stateLayout, type Direction, type Loop, type Route } from "./layout";
import {
  changesOf,
  markOf,
  sameSelection,
  selectionOf,
  type ExtraDiagram,
  type Payload,
  type State,
  type Transition,
} from "./types";

/** `across`: the diagram runs left to right, so transitions leave a state
 *  on its right and arrive on its left, rather than below and above */
type StateData = { diagram: string; state: State; payload: Payload; across: boolean };
type StateNodeType = Node<StateData, "state">;
/** `loop`: a transition back to its own state, drawn where the layout put it */
type TransitionData = { diagram: string; transition: Transition; payload: Payload; route?: Route; loop?: Loop };
type TransitionEdgeType = Edge<TransitionData, "transition">;

/** A state's status as the map's cards name them. */
const cardStatus = (s?: string) => (s === "unchanged" ? "context" : (s ?? "changed"));
/** A transition's status as the map's lines name them. */
const lineStatus = (s?: string) => (s === "context" ? "unchanged" : (s ?? "changed"));

const StateNode = memo(function StateNode({ data }: NodeProps<StateNodeType>) {
  const { selection, select } = useContext(SharedContext);
  const { state, diagram, payload, across } = data;
  const mine = selectionOf(payload, diagram, state);
  const selected = sameSelection(mine, selection);
  const status = cardStatus(state.status);
  const files = state.changes?.length ?? 0;
  const dot = state.kind === "initial" || state.kind === "final";
  const name = state.title || (state.kind === "initial" ? "Start" : state.kind === "final" ? "End" : state.id);
  return (
    <button
      type="button"
      className={
        dot
          ? `cm-state-dot cm-state-${state.kind}${selected ? " cm-selected" : ""}`
          : `cm-part cm-state cm-${status}${selected ? " cm-selected" : ""}`
      }
      onClick={() => select(mine)}
      aria-label={`${name}, ${statusLabel[status]}`}
      aria-pressed={selected}
      title={dot ? name : undefined}
      data-item={state.id}
    >
      <Handle type="target" position={across ? Position.Left : Position.Top} isConnectable={false} />
      {dot ? (
        <Marked id={markOf(mine!)} corner />
      ) : (
        <>
          <Marked id={markOf(mine!)} corner />
          <span className="cm-part-title">{name}</span>
          {files ? (
            <span className="cm-part-files">
              <FileCode />
              {files}
            </span>
          ) : null}
        </>
      )}
      <Handle type="source" position={across ? Position.Right : Position.Bottom} isConnectable={false} />
    </button>
  );
});

const TransitionEdge = memo(function TransitionEdge(props: EdgeProps<TransitionEdgeType>) {
  const { selection, select } = useContext(SharedContext);
  const { transition, diagram, payload, route, loop } = props.data!;
  const mine = selectionOf(payload, diagram, transition);
  const selected = sameSelection(mine, selection);
  const files = changesOf(payload, mine).length;
  const status = lineStatus(transition.status);
  const [path, labelX, labelY] = loop
    ? [loop.path, loop.label.x, loop.label.y]
    : route
      ? [routePath(route.points), route.label.x, route.label.y]
      : getBezierPath(props);
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        className={`cm-link cm-link-${status}${selected ? " cm-selected" : ""}`}
        interactionWidth={18}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className={`cm-link-label cm-link-label-${status}${transition.label ? "" : " cm-link-label-bare"}${selected ? " cm-selected" : ""}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          onClick={() => select(mine)}
          aria-pressed={selected}
          aria-label={`${transition.label ?? "Transition"}, ${statusLabel[status]}${filesSaid(files)}`}
          title={transition.label ?? "Transition"}
          data-item={transition.id}
        >
          {transition.label ? <span className="cm-link-text">{transition.label}</span> : null}
          <FilesMark count={files} />
          <Marked id={markOf(mine!)} />
        </button>
      </EdgeLabelRenderer>
    </>
  );
});

const nodeTypes = { state: StateNode };
const edgeTypes = { transition: TransitionEdge };

export function StateDiagram({
  payload,
  diagram,
  selection,
  marks,
  images,
  fit,
  onFit,
  select,
  inset,
  direction = "LR",
  setDirection,
}: Shared & {
  payload: Payload;
  diagram: ExtraDiagram;
  fit: number;
  onFit: () => void;
  inset: number;
  /** which way the diagram runs, and how to change it from the diagram */
  direction?: Direction;
  setDirection?: (direction: Direction) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const placed = useMemo(() => stateLayout(diagram, direction), [diagram, direction]);
  const nodes = useMemo<StateNodeType[]>(
    () =>
      (diagram.states ?? []).map((s) => {
        const box = placed.nodes.get(s.id)!;
        return {
          id: s.id,
          type: "state",
          position: { x: box.x, y: box.y },
          data: { diagram: diagram.id, state: s, payload, across: direction === "LR" },
          style: { width: box.width, height: box.height },
          draggable: false,
          selectable: false,
        };
      }),
    [diagram, placed, payload, direction],
  );
  const edges = useMemo<TransitionEdgeType[]>(() => {
    const ids = new Set((diagram.states ?? []).map((s) => s.id));
    return (diagram.transitions ?? [])
      .filter((t) => ids.has(t.from) && ids.has(t.to))
      .map((t) => ({
        id: t.id,
        source: t.from,
        target: t.to,
        type: "transition",
        data: {
          diagram: diagram.id,
          transition: t,
          payload,
          route: placed.edges.get(t.id),
          loop: placed.loops.get(t.id),
        },
        markerEnd: { type: "arrowclosed" as const, width: 16, height: 16 },
        selectable: false,
      }));
  }, [diagram, placed, payload]);
  const followed = useMemo(() => {
    if (!selection) return [];
    for (const s of diagram.states ?? [])
      if (sameSelection(selectionOf(payload, diagram.id, s), selection)) return [s.id];
    for (const t of diagram.transitions ?? [])
      if (sameSelection(selectionOf(payload, diagram.id, t), selection)) return [t.from, t.to];
    return [];
  }, [selection, diagram, payload]);
  const shared = useMemo(() => ({ selection, marks, images, select }), [selection, marks, images, select]);
  return (
    <div className="cm-diagram" ref={frame} data-diagram={diagram.id}>
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
            <Follower ids={followed} inset={inset} frame={frame} />
            <Zoom onFit={onFit}>
              {/* an action, not a state: it shows the direction a click switches to */}
              {!setDirection ? null : direction === "LR" ? (
                <button
                  type="button"
                  className="pinrail-btn pinrail-btn-ghost"
                  onClick={() => setDirection("TB")}
                  title="Lay out top to bottom"
                  aria-label="Lay out top to bottom"
                >
                  <GitCommitVertical />
                </button>
              ) : (
                <button
                  type="button"
                  className="pinrail-btn pinrail-btn-ghost"
                  onClick={() => setDirection("LR")}
                  title="Lay out left to right"
                  aria-label="Lay out left to right"
                >
                  <GitCommitHorizontal />
                </button>
              )}
            </Zoom>
          </ReactFlow>
        </ReactFlowProvider>
      </SharedContext.Provider>
    </div>
  );
}
