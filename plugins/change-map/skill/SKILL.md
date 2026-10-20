---
name: change-map
description: Build a change map of a code change for review with the change-map plugin, the parts it touches, how they interact, and the files and lines that implement each.
---

# Change map

A change map shows a code change as the parts it touches and the
interactions between them, each linked to the lines that implement it. The
person reviews the architecture first, then the code. Build the map from
the change, not from the file list.

## 1. The files

Run, in the change's repository:

```sh
node scripts/files.mjs [base]    # base: origin/main, else main
```

It prints the payload's `files`: each file the change touches, committed or
not, with its status and diff. The script is beside this file; without it,
`pinrail plugins skill change-map scripts/files.mjs` prints it.

## 2. The parts

`nodes` are the parts a reviewer reasons about: a component, a module, an
endpoint, a job, a table, a configuration. Not one per file. A part can
span several files, and a file several parts.

- Aim for 5 to 20 parts. Merge small helpers into the part that uses them.
- `kind`: `ui`, `module`, `service`, `endpoint`, `store`, `job`,
  `external`, `config` or `test`.
- `status`: `added`, `changed`, `removed`, or `context` for a part the
  change does not touch but that explains it. Keep context parts few.
- `summary`: what changed in the part and why, in Markdown, two or three
  sentences.
- `changes`: the files and the line ranges, on the new side, that
  implement this part, such as `{"file": "lib/tickets.ex", "lines": [[90, 93]]}`.
  Take the ranges from the hunks, and narrow them to the part's own lines.
  Leave `lines` out when the whole file is the part.
- `lane`: group the parts by layer, such as `web`, `api`, `jobs` and
  `database`, declared in `lanes`.

A changed file that belongs to no part is listed in the review as one of
the other files. That is right for a changelog or a lock file, and wrong
for code.

## 3. The interactions

`edges` are the calls, requests, events, reads and writes between parts
that the change adds, changes or removes. Add an unchanged one only when
it explains a changed one.

- `label`: what passes, such as `POST /tickets` or `create(params, key)`.
- `kind`: `call`, `data`, `event`, `import` or `render`.
- `status`: `added`, `changed`, `removed`, or `unchanged`.
- `changes`: as for parts, the lines that make the call.

A form that now sends a key with each save, to an endpoint that checks it:

```json
{
  "lanes": [{ "id": "web", "title": "Web app" }, { "id": "api", "title": "API" }],
  "nodes": [
    { "id": "ticket-form", "title": "Ticket form", "kind": "ui", "lane": "web", "status": "changed",
      "summary": "Disables **Save** while a save is out, and sends the form's dedup key.",
      "changes": [{ "file": "web/src/TicketForm.tsx", "lines": [[40, 68]] }] },
    { "id": "tickets-endpoint", "title": "POST /tickets", "kind": "endpoint", "lane": "api", "status": "changed",
      "summary": "Answers 409 with the existing ticket for a key it has seen.",
      "changes": [{ "file": "lib/helpdesk_web/controllers/ticket_controller.ex" }] }
  ],
  "edges": [
    { "id": "post", "from": "ticket-form", "to": "tickets-endpoint", "label": "POST /tickets",
      "kind": "call", "status": "changed",
      "changes": [{ "file": "web/src/api.ts", "lines": [[15, 24]] }] }
  ]
}
```

## 4. When the map is not enough

Read these only when the change needs them:

- [Screenshots](references/screenshots.md), when the change alters what a
  person sees on a screen.
- [Sequence and state diagrams](references/diagrams.md), when the order of
  calls or the states of something matter more than which parts talk.

## 5. Submit

```sh
pinrail submit change-map --title "<the change, as its title>" \
  --data map.json --attach <each screenshot> --wait
```

Give `change` (its `title`, `source` and `target` branches, and `url` if
there is one) and a `summary` of the whole change. Before you submit, check
that each changed code file is in some part's `changes`.

## 6. The decision

- `approve`: go on. Read any comments as notes.
- `request_changes`: apply each comment, then submit the next version with
  `--revises <id>`.

Each comment's `target` says what it is about: a part (`node`), an
interaction (`edge`), lines of a file (`file`, `line`, `start_line`,
`side`), an area of a screenshot (`screen`, `region`) or an entity of a
diagram (`diagram`, `item`). `reviewed` lists what the person read.
