// One comment: its text, which a click turns into a field to edit, and a
// button to delete it. Enter saves, Esc cancels, and saving it empty
// deletes it. A decided review shows the text alone.
import { Trash2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Compose } from "./Compose";
import { markdown } from "./markdown";
import type { Comment } from "./types";

export function CommentItem({
  comment,
  readonly,
  language,
  head,
  className,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  readonly: boolean;
  /** the language of code blocks that name none */
  language?: string | null;
  /** what goes above the text, such as the line a comment is on */
  head?: ReactNode;
  className?: string;
  onEdit(body: string): void;
  onDelete(): void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.body);
  const editId = useId();
  const cancel = () => {
    setText(comment.body);
    setEditing(false);
  };
  const save = () => {
    const body = text.trim();
    if (!body) onDelete();
    else if (body !== comment.body) onEdit(body);
    setEditing(false);
  };
  if (editing)
    return (
      <div className={`cm-comment cm-comment-editing ${className ?? ""}`}>
        {head}
        <Compose
          id={`edit-${editId}`}
          autoFocus
          placeholder="Edit the comment"
          value={text}
          onChange={setText}
          onSubmit={save}
          onCancel={cancel}
          onLeave={save}
        />
      </div>
    );
  return (
    <div
      className={`cm-comment ${readonly ? "" : "cm-comment-editable"} ${className ?? ""}`}
      onClick={readonly ? undefined : () => setEditing(true)}
      title={readonly ? undefined : "Click to edit"}
    >
      <div className="cm-comment-main">
        {head}
        <div className="cm-md" dangerouslySetInnerHTML={{ __html: markdown(comment.body, language) }} />
      </div>
      {readonly ? null : (
        <button
          type="button"
          className="pinrail-btn pinrail-btn-ghost cm-comment-delete"
          aria-label="Delete the comment"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 />
        </button>
      )}
    </div>
  );
}
