// The icon of the coding agent a review is requested by, for the agents the
// app knows; a bot for any other requester. The CLI names the agent it
// runs under (claude-code, codex, …); a person may give the short name too.
// The marks are inline so the ones drawn in currentColor follow the theme.

import { Bot } from "lucide-react";
import amp from "../assets/agents/amp.svg?raw";
import antigravity from "../assets/agents/antigravity.svg?raw";
import augment from "../assets/agents/augment.svg?raw";
import claude from "../assets/agents/claude.svg?raw";
import cline from "../assets/agents/cline.svg?raw";
import codex from "../assets/agents/codex.svg?raw";
import copilot from "../assets/agents/copilot.svg?raw";
import cursor from "../assets/agents/cursor.svg?raw";
import goose from "../assets/agents/goose.svg?raw";
import grok from "../assets/agents/grok.svg?raw";
import hermes from "../assets/agents/hermes.svg?raw";
import kimi from "../assets/agents/kimi.svg?raw";
import kiro from "../assets/agents/kiro.svg?raw";
import opencode from "../assets/agents/opencode.svg?raw";
import pi from "../assets/agents/pi.svg?raw";

const AGENTS: Record<string, { label: string; svg: string }> = {
  "claude-code": { label: "Claude Code", svg: claude },
  claude: { label: "Claude Code", svg: claude },
  codex: { label: "Codex", svg: codex },
  cursor: { label: "Cursor", svg: cursor },
  antigravity: { label: "Antigravity CLI", svg: antigravity },
  agy: { label: "Antigravity CLI", svg: antigravity },
  opencode: { label: "OpenCode", svg: opencode },
  kimi: { label: "Kimi", svg: kimi },
  grok: { label: "Grok CLI", svg: grok },
  pi: { label: "Pi", svg: pi },
  goose: { label: "Goose", svg: goose },
  amp: { label: "Amp", svg: amp },
  copilot: { label: "Copilot CLI", svg: copilot },
  kiro: { label: "Kiro CLI", svg: kiro },
  augment: { label: "Augment CLI", svg: augment },
  auggie: { label: "Augment CLI", svg: augment },
  cline: { label: "Cline", svg: cline },
  "hermes-agent": { label: "Hermes Agent", svg: hermes },
  hermes: { label: "Hermes Agent", svg: hermes },
};

/** The agent a requester names, when the app knows it. */
export function agentOf(requestedBy?: string | null) {
  return requestedBy ? (AGENTS[requestedBy.trim().toLowerCase()] ?? null) : null;
}

export function AgentIcon({ requestedBy, size = 13 }: { requestedBy?: string | null; size?: number }) {
  if (!requestedBy) return null;
  const agent = agentOf(requestedBy);
  if (!agent) return <Bot className="agent-icon" size={size} aria-hidden="true" />;
  return (
    <span
      className="agent-icon"
      role="img"
      aria-label={agent.label}
      title={agent.label}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: agent.svg }}
    />
  );
}
