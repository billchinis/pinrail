# Changelog

All notable changes to the Pinrail app are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Changes are grouped by kind. An *Unreleased* section is added while changes
wait for a release, and takes the version's name when it is tagged.

The `pinrail` command ships inside the app and carries the app's version.

## [Unreleased]

### Added

- Support for the Pi coding agent. Settings › Agents installs the
  `pinrail` skill to `~/.pi/agent/skills`, and reviews submitted from Pi
  show its name and icon.
- Support for Goose. Settings › Agents installs the `pinrail` skill to
  `~/.config/goose/skills`, and reviews submitted from Goose show its
  name and icon.
- Support for Amp. Settings › Agents installs the `pinrail` skill to
  `~/.config/amp/skills`, and reviews submitted from Amp show its name
  and icon.

- What's new: the first time a new release starts, Pinrail shows a few
  cards about what changed, one at a time, each with a screenshot and a
  button that opens the change. A release without notes shows nothing,
  and a fresh install starts counting from the release it installed. The
  newest notes open again from Settings › About, Help › What's New in
  Pinrail and ⌘K.

- Pinrail records whether a decision or a discard was made in the app,
  with `pinrail decide` or `pinrail discard`, or by another program
  through the API, and in which agent session. The review page, the
  history, `pinrail show` and the decision an agent receives say so when
  it was not made in the app. The review page warns when the agent
  session that submitted a review also decided it.
- The history shows who withdrew or discarded a review and how, with the
  reason they gave in a tooltip. Pinrail records the agent that withdrew
  a review, as it does for a discard.
- In the macOS app, the note to the agent can be dictated: the
  microphone in the note box turns speech into text as you speak, in
  your system's language. macOS asks once for access to the microphone
  and to speech recognition.

### Changed

- Pinrail installs its skill to OpenCode's skill folder,
  `~/.config/opencode/skills`, even when Claude Code already has it.
- An app update now updates the installed official plugins to the
  versions it carries, when Pinrail starts. Until now, Settings › Plugins
  offered each update and waited for you to apply it. Reviews keep the
  version they were submitted to.
- A plugin can no longer declare J or K as shortcuts. They are the
  app's keys for moving through the inbox, and `pinrail plugins check`
  refuses a manifest that declares them. The official plugins move
  between items with N and P instead.
- The inbox opens a review in a panel beside the list. The panel opens
  the review as a page when the view needs more room, closes with its
  button or Esc, and moves on to the next review after a decision. J
  and K step through the list from it, while the view has the keyboard
  too. *Settings › General › Opening a review* switches back to opening
  reviews as a page.
- Esc closes the inbox's panel from inside the review's view too. When
  the view has something of its own open, such as a comment, the first
  Esc closes that and the next closes the panel. A plugin that uses Esc
  no longer stops it from closing the panel.
- J and K go round at the ends of the inbox: J on the last review goes
  to the first, and K on the first to the last, in the list and in the
  panel.
- The official plugins fit a narrow frame, such as the inbox's side
  panel. Their sidebars, such as the code review's file tree and the
  Markdown review's outline and comments, open as drawers over the
  review, and their headers and controls rearrange to leave the content
  the width. The image review's notes fold away, and the code review has
  arrows for the next and previous proposal.
- Only a decision or a discard made in the app is recorded as yours. One
  made with `pinrail decide` or `pinrail discard` is recorded as made by
  the agent the command runs under, if any, and one made through the API
  by the name the program gives, if any.

### Fixed

- On Linux, an update of the AppImage reliably updates the copy of the
  `pinrail` command it installed. The check that the copy is the
  `pinrail` command could fail when the file had just been written.

## [0.2.0]

### Added

- ⌘F (Ctrl+F on Linux) opens a find bar on a review that searches the
  text of the plugin's view and highlights every match. Enter and
  Shift+Enter move between the matches, and Esc closes the bar. It works
  in every view that uses the plugin SDK, with no change to the plugin.
- The code review view highlights the syntax of the diff, of suggested
  changes and of code blocks, in the language of each file. If you
  installed code review, update it to 1.1.0 in *Settings › Plugins*.

### Changed

- ⌘D (Ctrl+D on Linux) discards a review, from its row in the inbox or
  from the review itself, including while the plugin's view has the
  keyboard. It replaces D, which worked only in the inbox. A plugin that
  declares ⌘D as one of its shortcuts no longer receives it.

### Fixed

- A review created while the app was loading the inbox no longer
  disappears from the inbox until the app is reloaded.

## [0.1.3]

### Fixed

- A review's notification closes when you open the review in the window
  or it stops waiting. On Linux, notifications stayed in GNOME's list, and
  Ubuntu Dock kept counting them on the app's icon.
- On Linux, the menu bar icon is white, so it can be seen on GNOME's dark
  top bar.

## [0.1.2]

### Changed

- `pinrail plugins new --playwright` takes the plugin SDK from npm, as
  `pinrail-sdk`, rather than from the tarball on the SDK's GitHub release.

### Fixed

- On macOS 26, the button that shows and hides the sidebar no longer
  touches the window's close, minimize and zoom buttons.
- The button that shows and hides the sidebar stays at the top when the
  sidebar scrolls.

## [0.1.1]

### Changed

- A review's *Discard*, *Copy decision as markdown* and *Maximize* buttons
  are at the right of the review's header, beside its status, rather than
  in the window's top bar.

### Fixed

- In a window too narrow for the sidebar, the page now takes the whole
  width, and the window's buttons no longer cover the top bar on macOS.

## [0.1.0]

Initial version of Pinrail.

[0.2.0]: https://github.com/forgeplane/pinrail/releases/tag/v0.2.0
[0.1.3]: https://github.com/forgeplane/pinrail/releases/tag/v0.1.3
[0.1.2]: https://github.com/forgeplane/pinrail/releases/tag/v0.1.2
[0.1.1]: https://github.com/forgeplane/pinrail/releases/tag/v0.1.1
[0.1.0]: https://github.com/forgeplane/pinrail/releases/tag/v0.1.0
