// A sequence diagram: the participants from left to right, with a lifeline
// under each, and the messages between them from top to bottom, with
// frames around runs of messages. It is drawn on the same canvas as the map,
// so it pans, zooms and fits the same way. A click selects a participant or
// a message; one that names a part or an interaction of the map selects that.
import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider, type Node, type NodeProps } from "@xyflow/react";
import { memo, useContext, useMemo, useRef } from "react";
import {
  fitOptions,
  Fitter,
  FilesMark,
  filesSaid,
  litOf,
  Follower,
  Marked,
  SharedContext,
  Zoom,
  kindIcon,
  statusLabel,
  type Shared,
} from "./Diagram";
import { sequenceLayout } from "./layout";
import {
  changesOf,
  edgeStatus,
  markOf,
  nodeStatus,
  sameSelection,
  selectionOf,
  type ExtraDiagram,
  type Group,
  type Message,
  type Participant,
  type Payload,
} from "./types";

type HeadData = { diagram: string; participant: Participant; payload: Payload };
type LifeData = Record<string, never>;
type MessageData = { diagram: string; message: Message; payload: Payload; self: boolean; leftward: boolean };
type FrameData = { group: Group };
type SequenceNode =
  Node<HeadData, "head"> | Node<LifeData, "life"> | Node<MessageData, "message"> | Node<FrameData, "frame">;

/** A participant's status: its own, or that of the map part it names. */
function headStatus(payload: Payload, p: Participant): string {
  if (p.status) return p.status === "unchanged" ? "context" : p.status;
  const part = p.node ? payload.nodes.find((n) => n.id === p.node) : undefined;
  return part ? nodeStatus(part) : "changed";
}

/** A message's status: its own, or that of the map interaction it names. */
function messageStatus(payload: Payload, m: Message): string {
  if (m.status) return m.status === "context" ? "unchanged" : m.status;
  const link = m.edge ? payload.edges?.find((e) => e.id === m.edge) : undefined;
  return link ? edgeStatus(link) : "changed";
}

const Head = memo(function Head({ data, width, height }: NodeProps<Node<HeadData, "head">>) {
  const { selection, select } = useContext(SharedContext);
  const { participant, diagram, payload } = data;
  const { lit } = useContext(SharedContext);
  const mine = selectionOf(payload, diagram, participant);
  const selected = sameSelection(mine, selection);
  const status = headStatus(payload, participant);
  const kind = participant.kind ?? payload.nodes.find((n) => n.id === participant.node)?.kind ?? "module";
  const Icon = kindIcon[kind];
  return (
    <button
      type="button"
      className={`cm-part cm-seq-head cm-${status}${selected ? " cm-selected" : ""}${litOf(lit, mine)}`}
      style={{ width, height }}
      onClick={() => select(mine)}
      aria-label={`${participant.title}, ${statusLabel[status]}`}
      title={participant.title}
      aria-pressed={selected}
      data-item={participant.id}
    >
      <Marked id={markOf(mine!)} corner />
      <span className="cm-part-head">
        <span className="cm-part-icon">
          <Icon />
        </span>
        <span className="cm-part-title">{participant.title}</span>
      </span>
    </button>
  );
});

const Life = memo(function Life() {
  return <div className="cm-seq-life" />;
});

const Frame = memo(function Frame({ data }: NodeProps<Node<FrameData, "frame">>) {
  const { group } = data;
  return (
    <div className="cm-seq-frame">
      <span className="cm-seq-frame-tab">
        <b>{group.kind}</b>
        {group.label ? <span>{group.label}</span> : null}
      </span>
    </div>
  );
});

/** The arrow's head at the end of a message: filled for a call, open otherwise. */
function Tip({ x, y, toLeft, open }: { x: number; y: number; toLeft: boolean; open: boolean }) {
  const d = toLeft ? 9 : -9;
  const points = `${x + d},${y - 5} ${x},${y} ${x + d},${y + 5}`;
  return open ? (
    <polyline points={points} className="cm-seq-tip-open" />
  ) : (
    <polygon points={points} className="cm-seq-tip" />
  );
}

const MessageRow = memo(function MessageRow({ data, width, height }: NodeProps<Node<MessageData, "message">>) {
  const { selection, select, lit } = useContext(SharedContext);
  const { message, diagram, payload, self, leftward } = data;
  const mine = selectionOf(payload, diagram, message);
  const selected = sameSelection(mine, selection);
  const status = messageStatus(payload, message);
  // its own files, or those of the interaction it stands for
  const files = changesOf(payload, mine).length;
  const kind = message.kind ?? "call";
  const w = width ?? 0;
  const h = height ?? 0;
  const open = kind !== "call" && kind !== "self";
  const cls = `cm-seq-line${kind === "reply" ? " cm-seq-reply" : ""}`;
  return (
    <button
      type="button"
      className={`cm-seq-message${self ? " cm-seq-self" : ""}${selected ? " cm-selected" : ""}${litOf(lit, mine)}`}
      style={{ width: w, height: h }}
      onClick={() => select(mine)}
      aria-pressed={selected}
      aria-label={`${message.label ?? "Message"}, ${statusLabel[status]}${filesSaid(files)}`}
      title={message.label ?? "Message"}
      data-item={message.id}
    >
      <svg className={`cm-seq-svg cm-seq-${status}`} width={w} height={h} aria-hidden="true">
        {self ? (
          <>
            <path className={cls} d={`M 0,${h - 40} H 30 V ${h - 14} H 2`} />
            <Tip x={1} y={h - 14} toLeft open={open} />
          </>
        ) : (
          <>
            <line className={cls} x1={0} y1={h - 12} x2={w} y2={h - 12} />
            <Tip x={leftward ? 1 : w - 1} y={h - 12} toLeft={leftward} open={open} />
          </>
        )}
      </svg>
      <span className={`cm-seq-label cm-link-label-${status}`}>
        <span className="cm-link-text">{message.label ?? kind}</span>
        <FilesMark count={files} />
        <Marked id={markOf(mine!)} />
      </span>
    </button>
  );
});

const nodeTypes = { head: Head, life: Life, message: MessageRow, frame: Frame };

export function SequenceDiagram({
  payload,
  diagram,
  selection,
  marks,
  images,
  fit,
  onFit,
  select,
  inset,
  lit = null,
}: Shared & { payload: Payload; diagram: ExtraDiagram; fit: number; onFit: () => void; inset: number }) {
  const frame = useRef<HTMLDivElement>(null);
  const placed = useMemo(() => sequenceLayout(diagram), [diagram]);
  const nodes = useMemo<SequenceNode[]>(() => {
    const fixed = { draggable: false, selectable: false } as const;
    const out: SequenceNode[] = [];
    for (const g of diagram.groups ?? []) {
      const box = placed.frames.get(g.id);
      if (!box) continue;
      out.push({
        id: `g:${g.id}`,
        type: "frame",
        position: box,
        data: { group: g },
        width: box.width,
        height: box.height,
        zIndex: -1,
        focusable: false,
        ...fixed,
      });
    }
    for (const p of diagram.participants ?? []) {
      const head = placed.heads.get(p.id)!;
      const x = placed.lines.get(p.id)!;
      out.push({
        id: `l:${p.id}`,
        type: "life",
        position: { x: x - 1, y: head.y + head.height },
        data: {},
        width: 2,
        height: placed.bottom - head.y - head.height,
        zIndex: -2,
        focusable: false,
        ...fixed,
      });
      out.push({
        id: `h:${p.id}`,
        type: "head",
        position: head,
        data: { diagram: diagram.id, participant: p, payload },
        width: head.width,
        height: head.height,
        ...fixed,
      });
    }
    for (const m of diagram.messages ?? []) {
      const row = placed.rows.get(m.id);
      if (!row) continue;
      out.push({
        id: `m:${m.id}`,
        type: "message",
        position: row,
        data: { diagram: diagram.id, message: m, payload, self: row.self, leftward: row.leftward },
        width: row.width,
        height: row.height,
        ...fixed,
      });
    }
    return out;
  }, [diagram, placed, payload]);
  const followed = useMemo(() => {
    if (!selection) return [];
    for (const m of diagram.messages ?? [])
      if (sameSelection(selectionOf(payload, diagram.id, m), selection)) return [`m:${m.id}`];
    for (const p of diagram.participants ?? [])
      if (sameSelection(selectionOf(payload, diagram.id, p), selection)) return [`h:${p.id}`];
    return [];
  }, [selection, diagram, payload]);
  const shared = useMemo(() => ({ selection, marks, images, select, lit }), [selection, marks, images, select, lit]);
  return (
    <div className="cm-diagram" ref={frame} data-diagram={diagram.id}>
      <SharedContext.Provider value={shared}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={nodeTypes}
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
            <Zoom onFit={onFit} />
          </ReactFlow>
        </ReactFlowProvider>
      </SharedContext.Provider>
    </div>
  );
}
