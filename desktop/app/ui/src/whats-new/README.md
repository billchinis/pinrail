# What's new

The notes the app shows once when a release first starts. A release that
has notes has a file here named after its version, such as `0.3.0.json`,
and its pictures in a folder of the same name. A release without a file
shows nothing, so a patch release normally adds none.

Pick three to five changes a person would want to see, not the whole
changelog. Each card has:

| Field | What it holds |
|---|---|
| `title` | A short statement of what the person gets. |
| `text` | One or two sentences. |
| `image` | Optional. The name of a screenshot scene in `e2e/screenshots/scenes.mjs`. |
| `alt` | What the picture shows, for a screen reader. Required with `image`. |
| `action` | Optional. A button that opens the change: `{"label": "Open the inbox", "to": "/"}` for a screen, or `{"label": "Open Plugins", "settings": "plugins"}` for a section of Settings. |

The screenshot run makes the pictures: a scene whose name a card gives as
its `image` is saved here as `<version>/<image>-light.webp` and
`<image>-dark.webp`. A scene shows the whole window at 1180 by 576, the
shape of the dialog's picture, with the change on screen; it does not
crop, so nothing is cut off at the edges:

```sh
mise run screenshots -- --only inbox-panel
```

`src/lib/whatsNew.test.ts` fails when a card names a picture that is not
here in both themes, and when a file here is not a picture a card shows.

The app carries the notes of the last three releases only. When a release
is made, `scripts/set-version.mjs` removes the notes and pictures of older
releases, and the release commit records the removal. Notes for the next
release can be written beforehand: they are kept until their release.
