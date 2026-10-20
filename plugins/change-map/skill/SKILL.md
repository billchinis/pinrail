---
name: change-map
description: Build a change map of a code change for review with the change-map plugin, the parts it touches, how they interact, their files and lines, screenshots of interface changes, and sequence or state diagrams when the change needs them.
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

## 4. Screenshots of interface changes

For each part of the interface the change alters, capture the screen
before the change and after it, at the same size, and give them as a
screen with a `before` and an `after`. Several states of one part, such as
empty and filled, or light and dark, are several screens.

```json
"screens": [{ "title": "Save while saving",
              "before": { "$attachment": "form-before.png" },
              "after": { "$attachment": "form-after.png" } }]
```

Send each file with `--attach`.

## 5. Sequence and state diagrams

Add one only when the map does not show what the change does:

- a **sequence** when the order of the calls matters, such as a retry, a
  handshake, a background job or a race;
- a **state** diagram when the change adds or changes the states of
  something, such as a status, a button or a connection.

A participant that is a part of the map names it with `node`, and a message
that is an interaction names it with `edge`, so they share their files and
comments. Give the others their own `changes`. Keep a diagram to what the
change touches.

## 6. Submit

```sh
pinrail submit change-map --title "<the change, as its title>" \
  --data map.json --attach <each screenshot> --wait
```

Give `change` (its `title`, `source` and `target` branches, and `url` if
there is one) and a `summary` of the whole change. Before you submit, check
that each changed code file is in some part's `changes`.

## 7. The decision

- `approve`: go on. Read any comments as notes.
- `request_changes`: apply each comment, then submit the next version with
  `--revises <id>`.

Each comment's `target` says what it is about: a part (`node`), an
interaction (`edge`), lines of a file (`file`, `line`, `start_line`,
`side`), an area of a screenshot (`screen`, `region`) or an entity of a
diagram (`diagram`, `item`). `reviewed` lists what the person read.
