// How a decision or a discard was made when it was not made in the app: a
// CLI or API badge, with the details in its tooltip. A decision made from
// the agent session that submitted the review gets a warning, since that is
// an agent approving its own request. Nothing is shown for one made in the
// app, or recorded before the app kept where it came from.

import { TriangleAlert } from "lucide-react";
import type { Review, Via } from "../api/types";
import { Tooltip } from "./Tooltip";

type Made = { via?: Via | null; session?: string | null };

/** The decision's or the discard's source, and whether it came from the
 *  session that asked; null for one made in the app. */
export function madeWith(review: Review, made: Made, command: "decide" | "discard") {
  if (made.via !== "cli" && made.via !== "api") return null;
  const own = !!made.session && made.session === review.session;
  const action = command === "decide" ? "Decided" : "Discarded";
  const how = made.via === "cli" ? `${action} with pinrail ${command}` : `${action} by a program through the API`;
  const from = own
    ? ", from the agent session that submitted the review"
    : made.session
      ? `, from agent session ${made.session}`
      : "";
  return { badge: made.via === "cli" ? "CLI" : "API", own, label: `${how}${from}` };
}

/** The source as a badge after "Decided by …" or "… discarded". */
export function SourceBadge({ review, made, command }: { review: Review; made: Made; command: "decide" | "discard" }) {
  const source = madeWith(review, made, command);
  if (!source) return null;
  return (
    <Tooltip label={source.label}>
      <span
        className={`source-badge ${source.own ? "is-own" : ""}`}
        data-testid="source-badge"
        tabIndex={0}
        aria-label={source.label}
      >
        {source.own ? <TriangleAlert size={10} aria-hidden="true" /> : null}
        {source.badge}
      </span>
    </Tooltip>
  );
}
