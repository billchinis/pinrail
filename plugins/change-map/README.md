# Change map

A code change, such as a pull request, shown as a diagram of the parts it
touches and the interactions between them, rather than as a list of
files. Each part and interaction carries its status, a summary and the
files and line ranges that implement it, which open in a diff drawer over
the diagram. An interface part can carry screenshots, before and after,
compared side by side, with a slider or the after alone. Optional
sequence and state diagrams show a change about order or lifecycle. The
person comments on parts, interactions, lines, areas of a screenshot and
the entities of a diagram, marks what they reviewed, and approves the
change or asks for changes.

```sh
pinrail plugins install ./change-map --link
pinrail submit change-map --sample
pinrail submit change-map --title "Dedup tickets on save" --data payload.json \
  --attach form-before.png --attach form-after.png --wait
```

The payload names the change, its `nodes` (the parts) and `edges` (the
interactions), the `files` with their unified diffs, and optionally
`lanes`, `diagrams` and screenshots, each sent as a file
with `--attach` and named as `{"$attachment": "form-after.png"}`.
`schemas/payload.schema.json` describes it, and `samples/` holds a whole
example.

The plugin ships a skill for agents, in `skill/`: how to work out the parts
and interactions from a change, choose line ranges, add screenshots and
decide when a sequence or state diagram helps. Pinrail adds it to each
connected agent's `pinrail` skill. `skill/scripts/files.mjs` prints the
payload's `files` from git.

## Building

The view's source is in `src/`, in TypeScript with React, and Vite builds
it into `view/`, which Git does not track. React Flow draws the diagrams
and dagre lays them out. Both come from npm and are bundled with the view,
since a view loads nothing from outside its folder.

```sh
npm ci
npm run build
```

From the repository root, `mise run plugins:build` builds every plugin that
has a build of its own. The app's build needs it first.
