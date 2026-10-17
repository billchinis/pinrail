import { describe, expect, test } from "vitest";
import { FILES, RELEASES, compareVersions, latestNotes, pictureOf, releasesToShow, type Release } from "./whatsNew";

const release = (version: string): Release => ({ version, cards: [{ title: version, text: "" }] });
const shown = (releases: Release[]) => releases.map((r) => r.version);

describe("the releases to show", () => {
  const all = [release("0.3.0"), release("0.5.0"), release("0.4.0"), release("0.6.0")];

  test("are none on a fresh install", () => {
    expect(releasesToShow(all, "0.5.0", null, true)).toEqual([]);
  });

  test("are only the running one's before any was shown", () => {
    expect(shown(releasesToShow(all, "0.5.0", null, false))).toEqual(["0.5.0"]);
    expect(shown(releasesToShow(all, "0.5.1", null, false))).toEqual([]);
  });

  test("are every one newer than the one shown, up to the running one, newest first", () => {
    expect(shown(releasesToShow(all, "0.5.0", "0.3.0", false))).toEqual(["0.5.0", "0.4.0"]);
    expect(shown(releasesToShow(all, "0.5.0", "0.5.0", false))).toEqual([]);
  });

  test("compare their versions by number, not as text", () => {
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });
});

describe("the notes opened when asked for", () => {
  const all = [release("0.3.0"), release("0.5.0"), release("0.4.0")];

  test("are the newest release's up to the running one", () => {
    expect(shown(latestNotes(all, "0.4.2", false))).toEqual(["0.4.0"]);
    expect(shown(latestNotes(all, "0.2.0", false))).toEqual([]);
  });

  test("are the newest of all in a development build", () => {
    expect(shown(latestNotes(all, "0.2.0", true))).toEqual(["0.5.0"]);
  });
});

describe("each release's notes", () => {
  test("are named after their version, and every card's picture is there in both themes", () => {
    expect(RELEASES.length).toBeGreaterThan(0);
    for (const r of RELEASES) {
      expect(FILES.notes).toContain(`../whats-new/${r.version}.json`);
      expect(r.cards.length, r.version).toBeGreaterThan(0);
      for (const card of r.cards) {
        expect(card.title, r.version).toBeTruthy();
        expect(card.text, card.title).toBeTruthy();
        if (!card.image) continue;
        expect(card.alt, card.title).toBeTruthy();
        for (const theme of ["light", "dark"] as const) {
          expect(pictureOf(r.version, card.image, theme), `${r.version}/${card.image}-${theme}.webp`).not.toBeNull();
        }
      }
    }
  });
});

describe("the pictures the app carries", () => {
  test("are each one a card shows, in a release that has notes", () => {
    const named = new Set(
      RELEASES.flatMap((r) =>
        r.cards
          .filter((c) => c.image)
          .flatMap((c) => ["light", "dark"].map((t) => `../whats-new/${r.version}/${c.image}-${t}.webp`)),
      ),
    );
    expect(FILES.pictures.filter((file) => !named.has(file))).toEqual([]);
    // and nothing else sits in a release's folder, such as a PNG left behind
    const folders = import.meta.glob("../whats-new/*/*", { query: "?url", import: "default" });
    expect(Object.keys(folders).filter((file) => !file.endsWith(".webp"))).toEqual([]);
  });

  test("are those of the last few releases only", () => {
    // three releases, and the notes of the next one while they are written;
    // scripts/set-version.mjs removes the oldest when a release is made
    expect(RELEASES.length).toBeLessThanOrEqual(4);
  });
});
