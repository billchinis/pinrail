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
| `focus` | Optional. Which part of the picture to keep when it is cropped, as CSS `object-position`. |
| `action` | Optional. A button that opens the change: `{"label": "Open the inbox", "to": "/"}` for a screen, or `{"label": "Open Plugins", "settings": "plugins"}` for a section of Settings. |

The screenshot run makes the pictures: a scene whose name a card gives as
its `image` is saved here as `<version>/<image>-light.png` and
`<image>-dark.png`. Crop a scene to the part that changed, about twice as
wide as it is high, so its text stays readable in the dialog:

```sh
mise run screenshots -- --only inbox-panel
```

`src/lib/whatsNew.test.ts` fails when a card names a picture that is not
here in both themes.
