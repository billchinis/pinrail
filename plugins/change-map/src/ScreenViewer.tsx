// A part's screenshots in the drawer over the map, as the image plugin
// shows an image: each on a stage of its own, moved and scaled within it.
// The wheel zooms on the pointer; a drag marks an area to comment on, or
// pans with the hand tool, Space held or the middle button. The before and
// the after share one view, so a detail stays lined up across both. Comments
// on areas show as numbered boxes, and the side panel lists them. The slider
// lays the after over the before with a handle to wipe between them, and
// After only shows the latest image alone. The
// header steps through the part's screens. Esc cancels the comment being
// written, then closes the drawer.
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  Hand,
  Image as ImageIcon,
  Minus,
  Plus,
  SquareSplitHorizontal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Compose } from "./Compose";
import { resizeDrawer } from "./DiffViewer";
import { isScreen, type Comment, type Part, type Region, type ScreenTarget, type Target } from "./types";

type Mode = "side" | "wipe" | "after";

export type ScreenMode = Mode;

/** The width of the dialog to comment on an area, room for its field's
 *  keys and buttons on one row. */
const POP_WIDTH = 380;
type Image = "before" | "after";
/** How image units map to stage pixels: a scale and an offset. `fit` is
 *  the view that shows each image whole, worked out by each stage. */
type View = { s: number; x: number; y: number; fit: boolean };
const FIT: View = { s: 1, x: 0, y: 0, fit: true };

/** A fraction as a whole percentage. */
const pct = (v: number) => `${Math.round(v * 100)}%`;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** The comments on a part's screens[index], numbered in the order they were made. */
export function screenComments(comments: Comment[], node: string, index: number) {
  return comments.filter(
    (c): c is Comment & { target: ScreenTarget } =>
      isScreen(c.target) && c.target.screen.node === node && c.target.screen.index === index,
  );
}

/** The scale that shows an image whole on a stage, with a margin. */
const fitScale = (W: number, H: number, w: number, h: number) => Math.min((W - 24) / w, (H - 24) / h);

/** A stage's view as it stands: the shared one, or its own fit. */
function effective(view: View, W: number, H: number, w: number, h: number): View {
  if (!view.fit) return view;
  const s = fitScale(W, H, w, h);
  return { s, x: (W - w * s) / 2, y: (H - h * s) / 2, fit: true };
}

export function ScreenViewer({
  part,
  index,
  images,
  step,
  height,
  setHeight,
  readonly,
  comments,
  addComment,
  onClose,
  mode,
  setMode,
}: {
  part: Part;
  index: number;
  images: Map<string, string>;
  step(index: number): void;
  height: number;
  setHeight(height: number): void;
  readonly: boolean;
  comments: Comment[];
  addComment(target: Target, body: string): void;
  onClose(): void;
  /** the comparison the person chose last, which the screen_mode setting keeps */
  mode: Mode;
  setMode(mode: Mode): void;
}) {
  const screens = part.screens ?? [];
  const screen = screens[index];
  const root = useRef<HTMLDivElement>(null);
  const both = !!screen?.before && !!screen?.after;

  // without both images there is nothing to compare: the one there is shows
  const compare: Mode = both ? mode : "side";
  const url = (image: Image) => {
    const a = screen?.[image];
    return a ? images.get(a.$attachment) : undefined;
  };
  const mine = screenComments(comments, part.id, index);
  // the area being commented on, until the comment is added or cancelled;
  // `frame` is where the image was on the page when it was marked
  const [draft, setDraft] = useState<{ image: Image; region: Region; frame: DOMRect } | null>(null);
  const [text, setText] = useState("");
  const [lit, setLit] = useState<number | null>(null);
  // the view the stages share, the hand tool, and Space held to pan
  const [view, setView] = useState<View>(FIT);
  const [hand, setHand] = useState(false);
  const [space, setSpace] = useState(false);
  // each stage's size and its image's, for the buttons' zoom on the middle
  const sizes = useRef(new Map<Image, { W: number; H: number; w: number; h: number }>());
  // the stages' layers, which a pan moves directly while the drag lasts;
  // the view takes the new place once, at the end, and the layers' own
  // offset goes in the same frame
  const layers = useRef(new Set<HTMLElement>());
  useLayoutEffect(() => {
    for (const layer of layers.current) layer.style.transform = "";
  }, [view]);
  const [, setMeasured] = useState(0);
  const shown: Image = screen?.after ? "after" : "before";

  const zoomAt = useCallback(
    (k: number, image: Image = shown, cx?: number, cy?: number) => {
      const size = sizes.current.get(image);
      if (!size) return;
      setView((v) => {
        const now = effective(v, size.W, size.H, size.w, size.h);
        const f = fitScale(size.W, size.H, size.w, size.h);
        const s = clamp(now.s * k, Math.min(f, 1) / 4, Math.max(f, 1) * 16);
        const x = cx ?? size.W / 2;
        const y = cy ?? size.H / 2;
        return { s, x: x - (x - now.x) * (s / now.s), y: y - (y - now.y) * (s / now.s), fit: false };
      });
    },
    [shown],
  );
  const actual = () => {
    const size = sizes.current.get(shown);
    if (!size) return;
    const now = effective(view, size.W, size.H, size.w, size.h);
    zoomAt(1 / now.s / (window.devicePixelRatio || 1));
  };
  const level = (() => {
    const size = sizes.current.get(shown);
    return size ? Math.round(effective(view, size.W, size.H, size.w, size.h).s * 100) : null;
  })();
  const onSize = useCallback((image: Image, size: { W: number; H: number; w: number; h: number }) => {
    sizes.current.set(image, size);
    setMeasured((n) => n + 1);
  }, []);

  // Space held pans, as in the image plugin. A held key repeats, and some
  // systems send each repeat as a release and a press: a release counts only
  // when no press follows it within a moment, so the hand does not flicker.
  useEffect(() => {
    let release = 0;
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== " " || (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT"))) return;
      e.preventDefault();
      window.clearTimeout(release);
      if (!e.repeat) setSpace(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      window.clearTimeout(release);
      release = window.setTimeout(() => setSpace(false), 80);
    };
    // a held Space ends with the window's focus
    const blur = () => {
      window.clearTimeout(release);
      setSpace(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.clearTimeout(release);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // Esc cancels the comment being written, then closes the drawer; it is
  // the drawer's while the drawer is open (see DiffViewer)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (draft) {
        e.preventDefault();
        setDraft(null);
        return;
      }
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [draft, onClose]);

  // the dialog: beside the area, on its right, or on its left where the
  // right has no room, and inside the body
  const body = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = body.current;
    if (!draft || !el) {
      setPlace(null);
      return;
    }
    const b = el.getBoundingClientRect();
    const { frame: f, region: r } = draft;
    // narrower in a narrow viewer
    const width = Math.min(POP_WIDTH, el.clientWidth - 16);
    const right = f.left + (r.x + r.width) * f.width - b.left;
    const left = f.left + r.x * f.width - b.left;
    const top = f.top + r.y * f.height - b.top;
    let x = right + 14;
    if (x + width > el.clientWidth - 8) x = left - width - 14;
    x = clamp(x, 8, el.clientWidth - width - 8);
    const h = dialog.current?.offsetHeight ?? 150;
    setPlace({ left: x, top: clamp(top - 10, 8, Math.max(8, el.clientHeight - h - 8)), width });
  }, [draft]);

  const save = () => {
    if (!draft || !text.trim()) return;
    // the area in the image's own pixels too, for an agent that crops or
    // marks up the file it sent
    const size = sizes.current.get(draft.image);
    const r = draft.region;
    addComment(
      {
        screen: { node: part.id, index, image: draft.image },
        region: r,
        ...(size?.w && size.h
          ? {
              pixels: {
                x: Math.round(r.x * size.w),
                y: Math.round(r.y * size.h),
                width: Math.round(r.width * size.w),
                height: Math.round(r.height * size.h),
              },
              image_size: { width: size.w, height: size.h },
            }
          : {}),
      },
      text.trim(),
    );
    setDraft(null);
    setText("");
  };
  // another screen starts from its own fit
  useEffect(() => setView(FIT), [index]);

  const stage = (image: Image) => (
    <figure>
      <figcaption className="pinrail-eyebrow">{image === "before" ? "Before" : "After"}</figcaption>
      <Stage
        src={url(image)}
        alt={`${screen?.title ?? part.title}, ${image}`}
        view={view}
        setView={setView}
        panning={readonly || hand || space}
        onSize={(size) => onSize(image, size)}
        layers={layers.current}
        zoomAt={(k, cx, cy) => zoomAt(k, image, cx, cy)}
        boxes={mine
          .map((c, n) => ({ n: n + 1, image: c.target.screen.image, region: c.target.region }))
          .filter((b) => b.image === image)}
        draft={draft?.image === image ? draft.region : null}
        lit={lit}
        onMark={(region, frame) => {
          setDraft({ image, region, frame });
          setText("");
        }}
        onLight={setLit}
      />
    </figure>
  );

  return (
    <div
      className="cm-diff cm-shots"
      role="region"
      aria-label={`Screens of ${part.title}`}
      ref={root}
      data-testid="screen-viewer"
      style={{ height: `${height * 100}%` }}
    >
      <div
        className="cm-diff-resize"
        onPointerDown={(e) => resizeDrawer(e, root.current, setHeight)}
        aria-hidden="true"
      />
      <div className="cm-diff-head">
        {screens.length > 1 ? (
          <span className="cm-stepper">
            <button
              type="button"
              className="pinrail-btn pinrail-btn-ghost"
              aria-label="Previous screen"
              title="Previous screen"
              disabled={index === 0}
              onClick={() => step(index - 1)}
            >
              <ChevronLeft />
            </button>
            <span className="pinrail-faint" data-testid="screen-position">
              {index + 1} of {screens.length}
            </span>
            <button
              type="button"
              className="pinrail-btn pinrail-btn-ghost"
              aria-label="Next screen"
              title="Next screen"
              disabled={index === screens.length - 1}
              onClick={() => step(index + 1)}
            >
              <ChevronRight />
            </button>
          </span>
        ) : null}
        <span className="cm-diff-path cm-shots-name" title={screen?.title ?? part.title}>
          {screen?.title ?? part.title}
        </span>
        {compare !== "wipe" ? (
          <span className="cm-zoom-bar" role="group" aria-label="Zoom">
            <button
              type="button"
              className="pinrail-btn pinrail-btn-ghost"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => zoomAt(1 / 1.4)}
            >
              <Minus />
            </button>
            <span className="cm-zoom-level" data-testid="zoom-level">
              {view.fit ? "Fit" : level !== null ? `${level}%` : ""}
            </span>
            <button
              type="button"
              className="pinrail-btn pinrail-btn-ghost"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => zoomAt(1.4)}
            >
              <Plus />
            </button>
            <button
              type="button"
              className="pinrail-btn pinrail-btn-ghost"
              title="Fit"
              aria-pressed={view.fit}
              onClick={() => setView(FIT)}
            >
              Fit
            </button>
            <button type="button" className="pinrail-btn pinrail-btn-ghost" title="Actual pixels" onClick={actual}>
              1:1
            </button>
            {readonly ? null : (
              <button
                type="button"
                className="pinrail-btn pinrail-btn-ghost"
                aria-pressed={hand}
                title="Drag to pan rather than to mark"
                aria-label="Pan"
                onClick={() => setHand((v) => !v)}
              >
                <Hand />
              </button>
            )}
          </span>
        ) : null}
        {both ? (
          <span className="cm-modes" role="radiogroup" aria-label="Comparison">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "side"}
              className="pinrail-btn pinrail-btn-ghost"
              title="Side by side"
              aria-label="Side by side"
              onClick={() => setMode("side")}
            >
              <Columns2 />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "wipe"}
              className="pinrail-btn pinrail-btn-ghost"
              title="Slider"
              aria-label="Slider"
              onClick={() => setMode("wipe")}
            >
              <SquareSplitHorizontal />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "after"}
              className="pinrail-btn pinrail-btn-ghost"
              title="After only"
              aria-label="After only"
              onClick={() => setMode("after")}
            >
              <ImageIcon />
            </button>
          </span>
        ) : null}
        <button
          type="button"
          className="pinrail-btn pinrail-btn-ghost"
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close the screens"
        >
          <X />
        </button>
      </div>
      <div className="cm-shots-body" ref={body}>
        {compare === "wipe" ? (
          <div className="cm-wipe-wrap">
            <Wipe before={url("before")} after={url("after")} title={screen?.title ?? part.title} />
          </div>
        ) : (
          <div className={`cm-stages${both && compare === "side" ? "" : " cm-single"}`}>
            {screen?.before && compare === "side" ? stage("before") : null}
            {screen?.after ? stage("after") : null}
          </div>
        )}
        {draft ? (
          <div
            className="cm-pop"
            ref={dialog}
            role="dialog"
            aria-label={`Comment on an area of the ${draft.image} image`}
            style={place ? { left: place.left, top: place.top, width: place.width } : { visibility: "hidden" }}
          >
            <div className="cm-pop-head">
              <b>Area</b>
              <span>{draft.image === "before" ? "Before" : "After"}</span>
              <span className="cm-pop-where">
                {pct(draft.region.x)}, {pct(draft.region.y)} · {pct(draft.region.width)} × {pct(draft.region.height)}
              </span>
            </div>
            <Compose
              id="area-comment"
              // once the dialog is placed: hidden while it measures, the
              // field cannot take the focus, and typing would go nowhere
              autoFocus={!!place}
              placeholder="What should change here?"
              value={text}
              onChange={setText}
              onSubmit={save}
              onCancel={() => setDraft(null)}
            />
          </div>
        ) : null}
      </div>
      {compare !== "wipe" ? (
        <div className="pinrail-faint cm-shots-hint">
          {readonly || hand
            ? "Drag to pan · scroll to zoom"
            : "Drag a box or click a spot to comment · scroll to zoom · Space and drag to pan"}
        </div>
      ) : null}
    </div>
  );
}

/** One image on a stage: moved and scaled by the shared view, with the
 *  areas drawn over it in stage pixels, so their lines stay sharp. */
function Stage({
  src,
  alt,
  view,
  setView,
  panning,
  onSize,
  layers,
  zoomAt,
  boxes,
  draft,
  lit,
  onMark,
  onLight,
}: {
  src?: string;
  alt: string;
  view: View;
  setView(view: View): void;
  /** a drag pans rather than marks */
  panning: boolean;
  onSize(size: { W: number; H: number; w: number; h: number }): void;
  /** every stage's layer, moved together while a pan lasts */
  layers: Set<HTMLElement>;
  zoomAt(k: number, cx: number, cy: number): void;
  boxes: { n: number; region: Region }[];
  draft: Region | null;
  lit: number | null;
  /** an area was marked, with where the image was on the page */
  onMark(region: Region, frame: DOMRect): void;
  onLight(n: number | null): void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ W: 0, H: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [drawing, setDrawing] = useState<Region | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setStageSize({ W: el.clientWidth, H: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const sized = useRef(onSize);
  sized.current = onSize;
  useEffect(() => {
    if (natural && stageSize.W) sized.current({ ...stageSize, ...natural });
  }, [natural, stageSize]);
  const V = natural && stageSize.W ? effective(view, stageSize.W, stageSize.H, natural.w, natural.h) : null;

  // the wheel zooms on the pointer
  const zoomRef = useRef(zoomAt);
  zoomRef.current = zoomAt;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomRef.current(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const toImage = (v: View, cx: number, cy: number) => {
    const r = box.current!.getBoundingClientRect();
    return { x: (cx - r.left - v.x) / v.s, y: (cy - r.top - v.y) / v.s };
  };
  const between = (a: { x: number; y: number }, b: { x: number; y: number }): Region => {
    const { w, h } = natural!;
    const x0 = clamp(Math.min(a.x, b.x), 0, w);
    const x1 = clamp(Math.max(a.x, b.x), 0, w);
    const y0 = clamp(Math.min(a.y, b.y), 0, h);
    const y1 = clamp(Math.max(a.y, b.y), 0, h);
    return { x: x0 / w, y: y0 / h, width: (x1 - x0) / w, height: (y1 - y0) / h };
  };
  const round = (r: Region): Region => {
    const k = (v: number) => Math.round(v * 1000) / 1000;
    return { x: k(r.x), y: k(r.y), width: k(r.width), height: k(r.height) };
  };
  const frame = (v: View): DOMRect => {
    const r = box.current!.getBoundingClientRect();
    return new DOMRect(r.left + v.x, r.top + v.y, natural!.w * v.s, natural!.h * v.s);
  };

  const start = (e: React.PointerEvent) => {
    if (!V || !natural || (e.button !== 0 && e.button !== 1)) return;
    if ((e.target as HTMLElement).closest(".cm-area")) return;
    e.preventDefault();
    const pan = panning || e.button === 1;
    const from = { x: e.clientX, y: e.clientY };
    const v0 = V;
    const at = toImage(v0, e.clientX, e.clientY);
    let moved = false;
    // a pan moves the layers once a frame, with no render until it ends
    let dx = 0;
    let dy = 0;
    let frameId = 0;
    const shift = () => {
      frameId = 0;
      for (const l of layers) l.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const onMove = (m: PointerEvent) => {
      if (Math.hypot(m.clientX - from.x, m.clientY - from.y) > 4) moved = true;
      if (!moved) return;
      if (pan) {
        dx = m.clientX - from.x;
        dy = m.clientY - from.y;
        if (!frameId) frameId = requestAnimationFrame(shift);
      } else setDrawing(between(at, toImage(v0, m.clientX, m.clientY)));
    };
    const onUp = (u: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.classList.remove("cm-panning");
      setDrawing(null);
      if (pan) {
        if (frameId) cancelAnimationFrame(frameId);
        if (moved) setView({ s: v0.s, x: v0.x + dx, y: v0.y + dy, fit: false });
        return;
      }
      if (moved) {
        const r = between(at, toImage(v0, u.clientX, u.clientY));
        if (r.width * natural.w * v0.s >= 6 && r.height * natural.h * v0.s >= 6) onMark(round(r), frame(v0));
        return;
      }
      // a click marks a small area around the spot
      if (at.x < 0 || at.y < 0 || at.x > natural.w || at.y > natural.h) return;
      const px = at.x / natural.w;
      const py = at.y / natural.h;
      onMark(round({ x: Math.max(0, px - 0.03), y: Math.max(0, py - 0.03), width: 0.06, height: 0.06 }), frame(v0));
    };
    if (pan) document.body.classList.add("cm-panning");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const place = (r: Region): React.CSSProperties =>
    V && natural
      ? {
          left: V.x + r.x * natural.w * V.s,
          top: V.y + r.y * natural.h * V.s,
          width: r.width * natural.w * V.s,
          height: r.height * natural.h * V.s,
        }
      : { display: "none" };

  return (
    <div className={`cm-stage${panning ? " cm-stage-pan" : ""}`} ref={box} onPointerDown={start} data-testid="stage">
      <div
        className="cm-stage-layer"
        ref={(el) => {
          if (el) layers.add(el);
          return () => {
            layers.delete(el!);
          };
        }}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="cm-stage-img"
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={
              V
                ? { transform: `translate(${V.x}px, ${V.y}px) scale(${V.s})`, visibility: "visible" }
                : { visibility: "hidden" }
            }
          />
        ) : null}
        {boxes.map((b) => (
          <span
            key={b.n}
            className={`cm-area${lit === b.n ? " cm-area-lit" : ""}`}
            style={place(b.region)}
            onMouseEnter={() => onLight(b.n)}
            onMouseLeave={() => onLight(null)}
            data-testid="area"
          >
            <span className="cm-area-n">{b.n}</span>
          </span>
        ))}
        {drawing || draft ? <span className="cm-area cm-area-new" style={place((drawing ?? draft)!)} /> : null}
      </div>
    </div>
  );
}

/** The after over the before, cut at a handle the person drags. */
function Wipe({ before, after, title }: { before?: string; after?: string; title: string }) {
  const [at, setAt] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const move = (x: number) => {
    const r = frame.current?.getBoundingClientRect();
    if (r) setAt(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  };
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    move(e.clientX);
    const onMove = (m: PointerEvent) => move(m.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  return (
    <div className="cm-wipe" ref={frame} onPointerDown={start} data-testid="wipe">
      {after ? <img src={after} alt={`${title}, after`} draggable={false} /> : null}
      {before ? (
        <img
          src={before}
          alt={`${title}, before`}
          className="cm-wipe-before"
          style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }}
          draggable={false}
        />
      ) : null}
      <span className="cm-wipe-label cm-wipe-label-before">Before</span>
      <span className="cm-wipe-label cm-wipe-label-after">After</span>
      <div
        className="cm-wipe-handle"
        style={{ left: `${at}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(at)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setAt((v) => Math.max(0, v - 5));
          else if (e.key === "ArrowRight") setAt((v) => Math.min(100, v + 5));
          else return;
          e.preventDefault();
        }}
      />
    </div>
  );
}
