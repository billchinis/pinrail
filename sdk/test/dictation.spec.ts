import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { reviewFrom, mountPlugin } from "pinrail-sdk/testing";
import { scratch } from "./scratch.cjs";

// Dictation into a view's field, with the harness as the app's recogniser:
// the SDK's microphone after a field marked data-pinrail-dictate, the text
// at the cursor, and the view's own input handler keeping its draft.

/** A view with one note field the SDK can dictate into, which drafts as it is typed. */
function notePlugin(): string {
  const dir = scratch("pinrail-dictation-");
  fs.mkdirSync(path.join(dir, "view"), { recursive: true });
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ name: "notes", version: "1.0.0" }));
  fs.writeFileSync(
    path.join(dir, "view", "index.html"),
    `<!doctype html>
<meta charset="utf-8">
<link rel="stylesheet" href="/sdk/v1/pinrail-plugin.css">
<script src="/sdk/v1/pinrail-plugin.js"></script>
<div style="display:flex"><textarea id="note" aria-label="note" data-pinrail-dictate></textarea></div>
<script>
const plugin = Pinrail.connect({});
document.getElementById("note").addEventListener("input", (e) => plugin.draft({ note: e.target.value }));
</script>`,
  );
  return dir;
}

test("a field marked for dictation gets a microphone, and what is said goes in at the cursor", async ({ page }) => {
  const plugin = await mountPlugin(page, notePlugin(), { review: reviewFrom({ payload: {} }), dictation: true });
  const f = plugin.frame;
  const note = f.getByRole("textbox", { name: "note" });
  const mic = f.getByRole("button", { name: "Dictate" });
  await note.fill("Keep it");
  await mic.click();
  await expect.poll(() => plugin.dictating()).toBe(true);
  await expect(f.getByRole("button", { name: "Stop dictating" })).toHaveAttribute("aria-pressed", "true");

  await plugin.say("the staging");
  await plugin.say("the staging bucket");
  await expect(note).toHaveValue("Keep it the staging bucket");
  // the view's own input handler heard it, and kept the draft
  await expect.poll(() => plugin.lastDraft()).toEqual({ note: "Keep it the staging bucket" });

  // a second click stops it
  await f.getByRole("button", { name: "Stop dictating" }).click();
  await expect.poll(() => plugin.dictating()).toBe(false);
  await expect(mic).toHaveAttribute("aria-pressed", "false");
});

test("without the app's dictation, or in a read-only review, there is no microphone", async ({ page }) => {
  const plugin = await mountPlugin(page, notePlugin(), { review: reviewFrom({ payload: {} }) });
  await expect(plugin.frame.getByRole("textbox", { name: "note" })).toBeVisible();
  await expect(plugin.frame.getByRole("button", { name: "Dictate" })).toHaveCount(0);

  await plugin.reinit({ dictation: true });
  await expect(plugin.frame.getByRole("button", { name: "Dictate" })).toBeVisible();
  await plugin.reinit({ dictation: true, readonly: true });
  await expect(plugin.frame.getByRole("button", { name: "Dictate" })).toHaveCount(0);
});

test("a field the view draws again keeps its microphone", async ({ page }) => {
  const plugin = await mountPlugin(page, notePlugin(), { review: reviewFrom({ payload: {} }), dictation: true });
  const f = plugin.frame;
  await expect(f.getByRole("button", { name: "Dictate" })).toHaveCount(1);
  await f.locator("body").evaluate((body) => {
    const row = body.querySelector("div")!;
    row.innerHTML = '<textarea id="again" aria-label="again" data-pinrail-dictate></textarea>';
  });
  await expect(f.getByRole("button", { name: "Dictate" })).toHaveCount(1);
  await f.getByRole("button", { name: "Dictate" }).click();
  await plugin.say("hello");
  await expect(f.getByRole("textbox", { name: "again" })).toHaveValue("hello");
});

test("a placeholder that names the field holds its microphone, wherever the view puts it", async ({ page }) => {
  const plugin = await mountPlugin(page, notePlugin(), { review: reviewFrom({ payload: {} }), dictation: true });
  const f = plugin.frame;
  // the view draws a toolbar above its field, with a place for the microphone
  await f.locator("body").evaluate((body) => {
    body.querySelector("div")!.innerHTML =
      '<div class="tools"><span id="slot" data-pinrail-dictate-for="comment"></span></div>' +
      '<textarea id="comment" aria-label="comment" data-pinrail-dictate></textarea>';
  });
  const mic = f.locator("#slot").getByRole("button", { name: "Dictate" });
  await expect(mic).toBeVisible();
  // not after the field as well
  await expect(f.getByRole("button", { name: "Dictate" })).toHaveCount(1);
  await mic.click();
  await plugin.say("a placeholder");
  await expect(f.getByRole("textbox", { name: "comment" })).toHaveValue("a placeholder");
  await expect(f.locator("#slot").getByRole("button", { name: "Stop dictating" })).toBeVisible();

  // drawn again, it is filled again
  await plugin.endDictation();
  await f.locator("body").evaluate((body) => {
    body.querySelector("div")!.innerHTML =
      '<div class="tools"><span id="slot" data-pinrail-dictate-for="comment"></span></div>' +
      '<textarea id="comment" aria-label="comment" data-pinrail-dictate></textarea>';
  });
  await expect(f.locator("#slot").getByRole("button", { name: "Dictate" })).toBeVisible();
  await expect(f.getByRole("button", { name: "Dictate" })).toHaveCount(1);
});
