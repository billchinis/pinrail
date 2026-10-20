---
title: Change map
description: "A code change, such as a pull request, shown as a diagram of the parts it touches and how they interact, with each part's diff and screenshots, commented on before the agent goes on."
sidebar:
  badge:
    text: Optional
    variant: default
---

<div class="pr-badges"><span class="pr-badge optional">Optional</span><span class="pr-badge plain">plugin: change-map</span></div>

The change map plugin shows a code change, such as a pull request or a branch an agent finished, as a diagram of the parts it touches and the interactions between them, rather than as a list of files. You see what the change does to the system first, then open the code of any part. Each comment goes back on a part, an interaction, lines of a file, an area of a screenshot or an entity of a diagram, so the agent knows exactly what it is about.

![The change map plugin: the diagram of a change, with the ticket form selected, its file open in the diff drawer under the diagram with a comment on three lines, and a comment on the part being written in the side panel.](screenshot:change-map "The ticket form selected, its file in the drawer, and a comment on three of its lines.")

## When to use it

- **A pull or merge request** that touches several parts of a system, read as a whole before you read it file by file.
- **A change an agent made on its own**, reviewed before it opens a pull request or merges.
- **A change to an interface**, with screenshots of the screens before and after.
- **A change to a flow or a lifecycle**, such as a retry or a new status, explained with a sequence or a state diagram.

To review the comments an agent wants to post on a pull request, use [Code review](/docs/plugins/code-review/) instead.

## Install

The plugin comes with the app. Install it in *Settings › Plugins*, or from the command line:

```sh
pinrail plugins install change-map
```

## What you see

- **The map** of the change: a card for each part, such as a component, a module, an endpoint or a table, grouped into lanes, and a line for each interaction between two parts. A part's border and an interaction's line show whether it is new, changed, removed or unchanged.
- **The side panel** with the change's summary, or the selected part or interaction with its summary, its files, its screenshots and its comments. You can drag the panel's left edge to make it wider.
- **The diff drawer** under the map, with the selected part's files and the lines that implement it highlighted. The button in the header shows or hides it, and the choice is kept as a setting.
- **Screenshots** of an interface part, before and after. They open in the drawer side by side, with a slider between them, or the after alone, and you can zoom and pan them.
- **Sequence and state diagrams**, when the agent sends some, in tabs above the map. A participant or a message that stands for a part or an interaction of the map is the same thing as that part or interaction, so it shares its files and comments.
- **Comments** on a part, on an interaction, on a line or a range of lines in the drawer, on an area of a screenshot, and on an entity of a diagram. Badges on the map and the tabs count them.
- **Reviewed marks**, which you set on each part, interaction or entity you have read.

You choose **Approve** or **Request changes** in the header. Until you choose, comments ask for changes, and a review with none approves. With comments and **Approve**, the hand-over says *Approve with comments*.

The keys are N and P to move between parts, Enter to open the selection's first file, C to comment on it, R to mark it reviewed and F to fit the diagram to the view. Esc closes the drawer.

To see it before any agent asks with it, send its sample: `pinrail submit change-map --sample`, or **Send a sample** in its details in *Settings › Plugins*.

## Asking from your agent

```md title="AGENTS.md"
## Before opening a pull request

When you finish a change, submit a map of it to Pinrail with the
`change-map` plugin and wait for my decision:

1. Describe the parts the change touches as `nodes`, the interactions
   between them as `edges`, and each part's files and line ranges in its
   `changes`. Put the diff of each changed file in `files`. Add a
   sequence or state diagram in `diagrams` only when the order of calls
   or a lifecycle matters.
2. Run: `pinrail submit change-map --title "<the change>" --data map.json --wait`,
   with `--attach` for each screenshot the payload names.
3. If the verdict is `approve`, open the pull request.
4. If it is `request_changes`, apply each comment, and submit the next
   version with `--revises <id>`.
5. If the command exits 5, stop.
```

## What the agent sends

```json title="map.json"
{
  "change": { "title": "Dedup tickets on save", "source": "fix/ticket-dedup", "target": "main" },
  "summary": "A second press of **Save** no longer creates a second ticket.",
  "lanes": [{ "id": "web", "title": "Web app" }, { "id": "api", "title": "API" }],
  "nodes": [
    { "id": "ticket-form", "title": "Ticket form", "kind": "ui", "lane": "web", "status": "changed",
      "changes": [{ "file": "web/src/TicketForm.tsx", "lines": [[40, 68]] }],
      "screens": [{ "title": "Save while saving",
                    "before": { "$attachment": "form-before.png" },
                    "after": { "$attachment": "form-after.png" } }] },
    { "id": "tickets-endpoint", "title": "POST /tickets", "kind": "endpoint", "lane": "api",
      "changes": [{ "file": "lib/helpdesk_web/controllers/ticket_controller.ex" }] }
  ],
  "edges": [{ "id": "post", "from": "ticket-form", "to": "tickets-endpoint", "label": "POST /tickets" }],
  "files": [{ "path": "web/src/TicketForm.tsx", "status": "modified", "diff": "@@ -38,20 +38,31 @@ …" }]
}
```

- `nodes` are the parts of the change. A part's `kind` sets its icon, its `status` its colour, and its `changes` the files and line ranges that implement it.
- `edges` are the interactions between parts, such as calls, events or imports.
- `files` holds the unified diff of each changed file. A file no part names is listed in the panel as one of the other files.
- `screens` hold screenshots of an interface part, each sent with `--attach` and named as `{"$attachment": "<name>"}`.
- `diagrams` are optional sequence and state diagrams, whose participants and messages can name a part with `node` and an interaction with `edge`.

## What comes back

```json
{
  "verdict": "request_changes",
  "comments": [
    { "target": { "node": "tickets-endpoint" }, "body": "Return the id of the existing ticket with the 409." },
    { "target": { "file": "web/src/TicketForm.tsx", "start_line": 47, "line": 49, "side": "new" },
      "body": "Keep the key after a failed save." },
    { "target": { "diagram": "save-button", "item": "t4" }, "body": "Show why the save failed." }
  ],
  "reviewed": ["ticket-form", "post"]
}
```

| Field | What the agent does with it |
|---|---|
| `verdict` | `approve`: goes on, and reads any comments as notes. `request_changes`: applies the comments in a new version. |
| `comments[].target` | What the comment is about: a part (`node`), an interaction (`edge`), lines of a file (`file`, `line`, `start_line` and `side`), an area of a screenshot (`screen` and `region`), or an entity of a diagram (`diagram` and `item`). |
| `reviewed` | The parts, interactions and diagram entities the person marked as reviewed. |

## Reference

The plugin's manifest, and the schemas a payload and a decision are checked against, read from the plugin's own files.

![The change map plugin's contract](contract:change-map)
