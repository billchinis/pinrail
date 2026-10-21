---
title: Change map
description: "A code change, such as a pull request, reviewed as a diagram of the parts it touches and how they interact, with each part's diff, screenshots before and after, and sequence and state diagrams when the change needs them."
sidebar:
  badge:
    text: Optional
    variant: default
---

<div class="pr-badges"><span class="pr-badge optional">Optional</span><span class="pr-badge plain">plugin: change-map</span></div>

The change map plugin turns the review of a code change into a review of its architecture. A pull request, or a branch an agent finished, is shown as a diagram of the parts it touches and the interactions between them, rather than as a list of files. You see what the change does to the system first, and then open the code of any part, its lines highlighted in the diff.

When a diagram of parts is not enough, the agent adds **sequence diagrams** for the order of the calls and **state diagrams** for a lifecycle, so you review how the change behaves as well as what it touches. Parts of the interface carry **screenshots before and after**, so you see what the person using the software will see. Each comment goes back on a part, an interaction, lines of a file, an area of a screenshot or an entity of a diagram, so the agent knows exactly what it is about.

![The change map plugin: the diagram of a change, with the ticket form selected, its file open in the diff drawer under the diagram with a comment on three lines, and a comment on the part being written in the side panel.](screenshot:change-map "The ticket form selected, its file in the drawer, and a comment on three of its lines.")

## When to use it

- **A pull or merge request** that touches several parts of a system, read as a whole before you read it file by file.
- **A change an agent made on its own**, reviewed before it opens a pull request or merges.
- **A change to an interface**, with screenshots of each screen before and after.
- **A change to a flow or a lifecycle**, such as a retry, a handshake or a new status, explained with sequence and state diagrams for a detailed architectural review.

To review the comments an agent wants to post on a pull request, use [Code review](/docs/plugins/code-review/) instead.

## Install

The plugin comes with the app. Install it in *Settings › Plugins*, or from the command line:

```sh
pinrail plugins install change-map
```

## What you see

### The map

- **A card for each part** of the change, such as a component, a module, an endpoint or a table, grouped into lanes such as *Web app*, *API* and *Database*, and **a line for each interaction** between two parts, labelled with what it does. A part's border and an interaction's line show whether it is new, changed, removed or unchanged. An interaction's label shows how many files implement it, so an interaction without code has no count. A card shows the part's kind and status in a header, and the lines its part of the change adds and removes. The button beside the zoom buttons switches to smaller cards with the title and the status only, and back, and the choice is kept as a setting.
- **The side panel** with the change's summary, or the selected part or interaction with its summary, its files, its screenshots, the diagrams it appears in and its comments. You can drag the panel's left edge to make it wider. Under the change's summary, a drawer at the bottom of the panel opens the change's files, with their line counts and how many of their lines are off the map. You can filter them, and choosing one opens it in the drawer and highlights the parts, interactions and diagram entities that touch it, while the rest dims, on the map and in the diagrams.
- **The diff drawer** under the map, with the selected part's files and the lines that implement it highlighted. A changed line that no part, interaction or diagram covers has an amber edge, and the overview says how many of the change's lines are on the map, not counting changelogs and lock files. Selecting another part of the same file scrolls to its lines. The button in the header shows or hides the drawer, and the choice is kept as a setting.

### Sequence and state diagrams

A change about the order of things or about a lifecycle is hard to read from a map of parts alone. For such a change, the agent adds diagrams of their own, each in a tab above the map. They are optional, and an agent adds one only when the change needs it.

- **A sequence diagram** shows the participants from left to right, with a lifeline under each, and the messages between them from top to bottom: calls, asynchronous messages, replies and messages to the sender itself. Frames mark the alternatives, the optional runs, the loops and the parallel runs.

![A sequence diagram in the change map: a second save with the same dedup key, with a retry frame and the conflict reply selected.](screenshot:change-map-sequence "A retried request answered with the ticket the first one created.")

- **A state diagram** shows the states, with a dot for the start and a ringed dot for the end, and the transitions between them, labelled with their event, guard and action. It runs from left to right, and the button beside its zoom buttons lays it out from top to bottom instead, which is kept as a setting.

![A state diagram in the change map: the Save button's states Ready and Saving, with a failed save's transition selected.](screenshot:change-map-state "The Save button's states, with the transition back from a failed save selected.")

Every participant, message, state and transition has a status, a summary and the files and lines that implement it, which open in the drawer, as a part of the map does. A participant or a message that stands for a part or an interaction of the map is the same thing as that part or interaction, so its files, comments and reviewed mark are shared and nothing is reviewed twice. The tabs show how many comments each diagram has.

### Screenshots of interface changes

A part of the interface, such as a form or a page, can carry screenshots, each with a before and an after. The part's card on the map shows the after as a thumbnail, and the side panel shows each screen in turn. A screenshot opens larger in the drawer:

- **Side by side**, the before and the after at the same zoom and position, so a detail lines up across both.
- **With a slider** over the two, which you drag to wipe from the before to the after.
- **The after alone**, at the drawer's full width.

You zoom with the scroll wheel or to the actual pixels, pan with the hand tool or by holding Space, and drag a box over any area to comment on it. The comment goes back with the area's position on the image, and the choice of comparison is kept as a setting.

![The change map's screenshot viewer: the ticket form before and after side by side, with a comment on the area of the Save button in the after.](screenshot:change-map-screens "The ticket form before and after, with a comment on the spinner in the Save button.")

### Comments and reviewed marks

- **Comments** go on a part, on an interaction, on a line or a range of lines in the drawer, on an area of a screenshot, and on an entity of a diagram. The field stays at the bottom of the side panel. Badges on the map, the tabs and the files count the comments.
- **Reviewed marks** are set on each part, interaction or entity you have read, and go back to the agent. The header counts the parts and interactions the change adds, changes or removes that you have reviewed, and clicking the count goes to the next one left.

You choose **Approve** or **Request changes** in the header. Until you choose, comments ask for changes, and a review with none approves. With comments and **Approve**, the hand-over says *Approve with comments*.

The keys are N and P to move between parts, Enter to open the selection's first file, C to comment on it, R to mark it reviewed, U to go to the next part or interaction left to review and F to fit the diagram to the view. Esc closes the drawer.

To see it before any agent asks with it, send its sample: `pinrail submit change-map --sample`, or **Send a sample** in its details in *Settings › Plugins*.

## Asking from your agent

The plugin ships a skill that tells an agent how to build a map from a change: how to work out the parts and their interactions, choose the line ranges, add screenshots and decide when a diagram helps, with a script that lists the change's files from git and one that notes what a map leaves out before it is submitted. An agent you connected in *Settings › Agents* has it in its `pinrail` skill, and any other agent can read it with `pinrail plugins skill change-map`. Your instructions only need to say when to use it:

```md title="AGENTS.md"
When a change is complex, submit it for review with the `change-map` Pinrail plugin.
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
- `files` holds the unified diff of each changed file. A code file that no part or interaction names is marked as not on the map in the panel's list of files.
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
| `comments[].target` | What the comment is about: a part (`node`), an interaction (`edge`), lines of a file (`file`, `line`, `start_line` and `side`), an area of a screenshot (`screen` and `region`, in fractions of the image, with `pixels` and `image_size` giving the same area in the image's own pixels), or an entity of a diagram (`diagram` and `item`). |
| `reviewed` | The parts, interactions and diagram entities the person marked as reviewed. |

## Reference

The plugin's manifest, and the schemas a payload and a decision are checked against, read from the plugin's own files.

![The change map plugin's contract](contract:change-map)
