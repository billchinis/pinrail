// The field to write a comment in: one box with the text, the microphone
// and the button that adds the comment. It starts as a single line with the
// buttons at its end; once the text has a new line, or wraps because it
// reaches the buttons, the text takes the whole width and the buttons a row
// of their own under it. It grows with the text up to MAX_HEIGHT, and only
// then scrolls. Enter adds the comment, Shift+Enter starts a new line, and
// Esc cancels when the field can be cancelled. Focused when it opens, the
// cursor is at the end of the text.
import { ArrowUp, X } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, type Ref } from "react";

/** The tallest the text grows before it scrolls: about eight lines. */
const MAX_HEIGHT = 150;

export function Compose({
  id,
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  autoFocus,
  inputRef,
  onLeave,
}: {
  id: string;
  value: string;
  onChange(value: string): void;
  onSubmit(): void;
  /** shows a cancel button beside the add button */
  onCancel?: () => void;
  placeholder: string;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
  /** focus left the field and its buttons */
  onLeave?: () => void;
}) {
  const field = useRef<HTMLTextAreaElement | null>(null);
  const setField = useCallback(
    (el: HTMLTextAreaElement | null) => {
      field.current = el;
      if (typeof inputRef === "function") inputRef(el);
      else if (inputRef) inputRef.current = el;
    },
    [inputRef],
  );
  // a click on the buttons leaves the focus in the text, so that it does not
  // count as leaving the field: WebKit focuses nothing on a button's click
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  const [wide, setWide] = useState(false);
  // focused when it opens, with the cursor after the text
  useLayoutEffect(() => {
    const el = field.current;
    if (!autoFocus || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    // when the field opens: autoFocus does not change while it is open
  }, [autoFocus]);
  // the height the text needs, measured with the height unset
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    if (!value) setWide(false);
    el.style.height = "auto";
    const needed = el.scrollHeight;
    const style = getComputedStyle(el);
    // one line of text and its padding; more than that means it wrapped
    const oneLine =
      (parseFloat(style.lineHeight) || 18) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    if (!wide && value && (value.includes("\n") || needed > oneLine * 1.4)) {
      // the next pass measures again at the full width
      setWide(true);
      return;
    }
    el.style.height = `${Math.min(needed, MAX_HEIGHT)}px`;
    el.style.overflowY = needed > MAX_HEIGHT ? "auto" : "hidden";
  }, [value, wide]);
  return (
    <div
      className={`cm-compose${wide ? " cm-compose-wide" : ""}`}
      onBlur={(e) => {
        if (onLeave && !e.currentTarget.contains(e.relatedTarget as Node | null)) onLeave();
      }}
    >
      <textarea
        id={id}
        ref={setField}
        className="cm-compose-input"
        rows={1}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        data-pinrail-dictate
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onSubmit();
          } else if (e.key === "Escape" && onCancel && !e.defaultPrevented) {
            // the field's own Esc: a drawer around it stays open
            e.preventDefault();
            onCancel();
          }
        }}
      />
      {wide ? <span className="cm-compose-keys">Enter to add · Shift+Enter for a new line</span> : null}
      <div className="cm-compose-tools">
        <span data-pinrail-dictate-for={id} />
        {onCancel ? (
          <button
            type="button"
            className="cm-compose-icon"
            onMouseDown={keepFocus}
            onClick={onCancel}
            aria-label="Cancel"
            title="Cancel (Esc)"
          >
            <X />
          </button>
        ) : null}
        <button
          type="button"
          className="cm-compose-icon cm-compose-send"
          onMouseDown={keepFocus}
          onClick={onSubmit}
          disabled={!value.trim()}
          aria-label="Add comment"
          title="Add comment (Enter). Shift+Enter starts a new line."
        >
          <ArrowUp />
        </button>
      </div>
    </div>
  );
}
