# Changelog

This plugin is released with the Pinrail app, which carries it among its
official plugins. Each version names the release of the app that first
carries it.

## [1.2.0] - Unreleased

### Added

- A proposal's note and a comment of your own can be dictated in the
  macOS app, from a microphone beside the note's Save and the comment's
  Cancel buttons.
- Arrows in the toolbar move to the previous and next undecided
  proposal, as P and N do, between a count of where the focus is among
  the proposals.

### Changed

- The next and previous undecided proposal are N and P, and every
  proposal is Shift+N and Shift+P. J and K now move through the inbox.
- The view fits a narrow frame, such as the inbox's side panel. Below
  860 pixels the file tree opens as a drawer over the diff. Below 640
  pixels the title keeps a line of its own, the toolbar's buttons show
  only their icons, and the agent's summary puts its buttons under its
  text. A card narrower than 480 pixels puts its buttons under its title.

## [1.1.0] - Pinrail 0.2.0

### Added

- Syntax highlighting of the diff, of suggested changes and of code blocks
  that name their language, in the language of each file. A file of more
  than 5,000 diff lines, and every file in an app older than this
  release, is shown without it.

## [1.0.0] - Pinrail 0.1.0

The first version. It shows a change's diff with the comments a
reviewing agent proposes to post, each accepted or rejected with an
optional note, reply threads, suggested changes and the reviewer's own
line comments.
