# Screenshots of interface changes

Add screenshots when the change alters what a person sees: a form, a page,
a dialog, a message. The person compares the before and the after side by
side, with a slider, or the after alone, and comments on an area of either.

## Capturing them

- Capture the screen before the change, from the base branch, and after
  it, from the change, in the same state, at the same window size.
- Show the state the change is about, such as the form while it saves, not
  only the empty screen.
- One screen per state. Empty and filled, or light and dark, are two
  screens with a before and an after each.
- A new screen has an `after` only, and a removed one a `before` only.
- PNG, JPEG, WebP or GIF, up to 10 MB each and 32 files in all.

## In the payload

Screens go on the part they show, in its `screens`. Each image is a file
sent beside the payload, named in the payload as `{"$attachment": "<name>"}`:

```json
{ "id": "ticket-form", "title": "Ticket form", "kind": "ui", "lane": "web", "status": "changed",
  "summary": "Disables **Save** while a save is out.",
  "changes": [{ "file": "web/src/TicketForm.tsx", "lines": [[40, 68]] }],
  "screens": [
    { "title": "Save while saving",
      "before": { "$attachment": "form-before.png" },
      "after": { "$attachment": "form-after.png" } },
    { "title": "Save while saving, dark",
      "before": { "$attachment": "form-before-dark.png" },
      "after": { "$attachment": "form-after-dark.png" } }
  ] }
```

Send each file with `--attach`, under the name the payload gives it:

```sh
pinrail submit change-map --title "Dedup tickets on save" --data map.json \
  --attach shots/form-before.png --attach shots/form-after.png \
  --attach shots/form-before-dark.png --attach shots/form-after-dark.png --wait
```

## In the decision

A comment on an area of a screenshot has the target
`{"screen": {"node": "ticket-form", "index": 0, "image": "after"}, "region": {"x": 0.6, "y": 0.72, "width": 0.3, "height": 0.16}}`.
`index` is the screen's place in `screens`, and the region is in fractions
of the image's width and height, from its top-left corner.
