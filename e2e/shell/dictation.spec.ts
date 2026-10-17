import { expect, test, type Page } from "@playwright/test";
import { clearInbox, createReview } from "./helpers";

// Dictation, with the browser's speech recognition replaced by one the test
// speaks into: the note box's microphone, and a view's field, where the app
// listens for the view and says so in the composer.

/** Replaces speech recognition with a fake; `window.__speak(text)` and `window.__silence()` drive it. */
async function fakeRecognition(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    class FakeRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        w.__recognition = this;
      }
      stop() {
        if (w.__recognition === this) w.__recognition = null;
        this.onend?.();
      }
      abort() {
        this.stop();
      }
    }
    w.webkitSpeechRecognition = FakeRecognition;
    w.SpeechRecognition = undefined;
    w.__speak = (text: string) =>
      w.__recognition?.onresult?.({ results: [{ 0: { transcript: text }, isFinal: true }] });
    w.__listening = () => !!w.__recognition;
  });
}

const speak = (page: Page, text: string) => page.evaluate((t) => (window as any).__speak(t), text);
const listening = (page: Page) => page.evaluate(() => (window as any).__listening());

test("a field of the view is dictated into, and the composer says the app is listening for it", async ({ page }) => {
  await fakeRecognition(page);
  await clearInbox(page.request);
  const review = await createReview(page.request, { title: "Dictation: a note in the view" });
  await page.goto(`/#/reviews/${review.id}`);
  const frame = page.frameLocator("#plugin-frame");
  const note = frame.getByLabel("note for item 1");
  await expect(note).toBeVisible();

  await frame.getByRole("button", { name: "Dictate" }).click();
  await expect.poll(() => listening(page)).toBe(true);
  const status = page.getByRole("status").filter({ hasText: "Listening for the view" });
  await expect(status).toBeVisible();
  // the note box's own microphone is not the one listening
  await expect(page.getByRole("button", { name: "Dictate the note" })).toHaveAttribute("aria-pressed", "false");

  await speak(page, "fix the typo in the moduledoc");
  await expect(note).toHaveValue("fix the typo in the moduledoc");

  await status.getByRole("button", { name: "Stop" }).click();
  await expect.poll(() => listening(page)).toBe(false);
  await expect(status).toHaveCount(0);
  await expect(page.getByText("The note travels with your decision")).toBeVisible();
});

test("the note box is dictated into from its own microphone, which stops the view's first", async ({ page }) => {
  await fakeRecognition(page);
  await clearInbox(page.request);
  const review = await createReview(page.request, { title: "Dictation: the note box" });
  await page.goto(`/#/reviews/${review.id}`);
  const frame = page.frameLocator("#plugin-frame");
  await frame.getByRole("button", { name: "Dictate" }).click();
  await expect(page.getByText("Listening for the view")).toBeVisible();

  await page.getByRole("button", { name: "Dictate the note" }).click();
  await expect(page.getByText("Listening for the view")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop dictating" })).toHaveAttribute("aria-pressed", "true");
  await speak(page, "looks good");
  await expect(page.getByRole("textbox", { name: "Note to the agent" })).toHaveValue("looks good");
  await page.getByRole("button", { name: "Stop dictating" }).click();
  await expect.poll(() => listening(page)).toBe(false);
});
