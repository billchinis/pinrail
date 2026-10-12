# Changelog

The package's version is the SDK's, and its major is the protocol's:
`1.x` speaks protocol 1, served by the app at `/sdk/v1`. A breaking
change to the protocol is a new major and a new path.

## [Unreleased]

### Added

- The app's find bar searches a view's text. The app sends a `find`
  message, and the SDK answers it with `found`: it searches the text the
  view shows, highlights the matches with the CSS Custom Highlight API,
  and scrolls to the current one. ⌘F (Ctrl+F on Linux) pressed in a view
  goes up to the app as a `key` message, and the test harness's `sendKey`
  refuses it. The host module gains `find()` and an `onFound` callback.
- `/sdk/v1/highlight.js`, a third optional script, highlights code with
  highlight.js 11 and its common languages, plus Elixir, Erlang, Scala,
  Haskell and a few more. It adds `Pinrail.highlight(code, language)`,
  `Pinrail.highlightLines(code, language)`, which gives one string per
  line, and `Pinrail.languageOf(path)`. The stylesheet colours the tokens
  in both themes with new `--pinrail-code-*` tokens.

### Changed

- ⌘D (Ctrl+D on Linux) is one of the keys the app keeps for itself, as
  the app now discards a review with it. Pressed anywhere in a view, a
  text field included, it goes up to the app as a `key` message, as ⌘↵
  does, unless the view called `preventDefault()` on it. In the test
  harness, `sendKey` refuses it, as it refuses the app's other keys.

## [1.0.0]

The first release of the plugin SDK, `pinrail-sdk`. It
provides:

- The script and stylesheet that plugin views load from the app at
  `/sdk/v1`: the messages with the app, drafts, the hand-over, Markdown
  rendering, icons, links, attached files and forwarded shortcuts.
- `pinrail-sdk dev`, which runs a view in a browser without the app.
- `pinrail-sdk/testing`, the test harness: `mountPlugin`,
  `fixture` and `reviewFrom`.
- `pinrail-sdk/types`, the manifest, the review, the
  messages and `window.Pinrail` as TypeScript types.

[1.0.0]: https://github.com/forgeplane/pinrail/releases/tag/sdk-v1.0.0
