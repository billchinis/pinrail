// What's new: a few cards about a release, shown once when the release
// first starts. Each release that has notes has a file of its own,
// whats-new/<version>.json, and its pictures beside it in
// whats-new/<version>/, as <image>-light.webp and <image>-dark.webp, which
// the screenshot run makes (e2e/screenshots). A release with no file shows
// nothing.

/** What a card's button opens: a screen of the app, or a section of Settings. */
export type CardAction = { label: string; to?: string; settings?: string };

export type Card = {
  title: string;
  text: string;
  /** the picture's name, without the theme and the extension */
  image?: string;
  /** what the picture shows, for a screen reader */
  alt?: string;
  action?: CardAction;
};

export type Release = { version: string; cards: Card[] };

/** Compares two versions such as 0.3.0, part by part. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/**
 * The releases to show, newest first. A fresh install shows none. Before
 * any release was shown, only the running one's notes are; after, every
 * release newer than the one shown, up to the running one.
 */
export function releasesToShow(releases: Release[], running: string, seen: string | null, fresh: boolean): Release[] {
  if (fresh) return [];
  return releases
    .filter((r) => compareVersions(r.version, running) <= 0)
    .filter((r) => (seen ? compareVersions(r.version, seen) > 0 : r.version === running))
    .sort((a, b) => compareVersions(b.version, a.version));
}

/**
 * The notes What's new opens when asked for: the newest release's, up to
 * the running one. A development build previews the newest notes of all,
 * so they can be checked before their release.
 */
export function latestNotes(releases: Release[], running: string, preview: boolean): Release[] {
  return releases
    .filter((r) => preview || compareVersions(r.version, running) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version))
    .slice(0, 1);
}

const files = import.meta.glob<Release>("../whats-new/*.json", { eager: true, import: "default" });
const pictures = import.meta.glob<string>("../whats-new/*/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

/** Every release that has notes. */
export const RELEASES: Release[] = Object.values(files);

/** The address of a card's picture in a theme, or null when there is none. */
export function pictureOf(version: string, image: string, theme: "light" | "dark"): string | null {
  return pictures[`../whats-new/${version}/${image}-${theme}.webp`] ?? null;
}

/** The file names the notes are kept under, for the check that each is complete. */
export const FILES = { notes: Object.keys(files), pictures: Object.keys(pictures) };
