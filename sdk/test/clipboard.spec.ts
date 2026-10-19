import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { reviewFrom, mountPlugin } from "pinrail-sdk/testing";
import { withDevShell } from "./dev-shell";
import { scratch } from "./scratch.cjs";

// Copying through the app, in the two stand-ins for it: the harness, where a
// test reads what the view copied, and the dev shell, which copies to the
// browser's clipboard. Each offers the clipboard to a plugin whose manifest
// declares it, and to no other, as the app does.

/** A one-pixel PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/** A view that copies a line of text and its image when its buttons are clicked. */
function copier(capabilities?: string[]): string {
  const dir = scratch("pinrail-copier-");
  fs.mkdirSync(path.join(dir, "view"), { recursive: true });
  fs.mkdirSync(path.join(dir, "schemas"), { recursive: true });
  fs.mkdirSync(path.join(dir, "samples"), { recursive: true });
  fs.writeFileSync(path.join(dir, "schemas", "payload.schema.json"), "{}");
  fs.writeFileSync(path.join(dir, "schemas", "decision.schema.json"), "{}");
  fs.writeFileSync(path.join(dir, "samples", "card.png"), PNG);
  fs.writeFileSync(
    path.join(dir, "samples", "copier.json"),
    JSON.stringify({
      title: "Copy me",
      payload: { card: { $attachment: "card.png" } },
      attachments: { "card.png": "card.png" },
    }),
  );
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify({
      name: "copier",
      version: "1.0.0",
      attachments: { accept: [".png"] },
      ...(capabilities ? { capabilities } : {}),
    }),
  );
  fs.writeFileSync(
    path.join(dir, "view", "index.html"),
    `<!doctype html><meta charset="utf-8"><script src="/sdk/v1/pinrail-plugin.js"></script>
<p id="can"></p><button id="text">Copy the text</button><button id="image">Copy the image</button><pre id="out"></pre>
<script>
  const plugin = Pinrail.connect({ onInit() { document.getElementById("can").textContent = plugin.canCopy ? "can copy" : "cannot copy"; } });
  const report = (p) => p.then(() => "copied", (e) => "refused: " + e.message).then((t) => (document.getElementById("out").textContent = t));
  document.getElementById("text").onclick = () => report(plugin.copy({ text: "a line to post" }));
  document.getElementById("image").onclick = () => report(plugin.copy({ attachment: "card.png" }));
</script>`,
  );
  return dir;
}

test("the harness records what a view that declares the clipboard copied", async ({ page }) => {
  const dir = copier(["clipboard"]);
  const plugin = await mountPlugin(page, dir, {
    review: reviewFrom({ payload: {} }),
    attachments: { "card.png": { path: "samples/card.png", media_type: "image/png" } },
  });
  await expect(plugin.frame.locator("#can")).toHaveText("can copy");
  await plugin.frame.getByRole("button", { name: "Copy the text" }).click();
  await expect(plugin.frame.locator("#out")).toHaveText("copied");
  await plugin.frame.getByRole("button", { name: "Copy the image" }).click();
  await expect
    .poll(() => plugin.copied())
    .toEqual([{ text: "a line to post" }, { image: "card.png", media_type: "image/png", size: PNG.length }]);
});

test("the harness does not let a view that does not declare the clipboard copy", async ({ page }) => {
  const plugin = await mountPlugin(page, copier(), { review: reviewFrom({ payload: {} }) });
  await expect(plugin.frame.locator("#can")).toHaveText("cannot copy");
  await plugin.frame.getByRole("button", { name: "Copy the text" }).click();
  await expect(plugin.frame.locator("#out")).toHaveText(/^refused: the app does not let this plugin copy/);
  expect(await plugin.copied()).toEqual([]);
});

test("the dev shell copies to the browser's clipboard for a view that declares it", async ({ page, context }) => {
  await withDevShell(copier(["clipboard"]), async (url) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(url).origin });
    await page.goto(url);
    const view = page.frameLocator("#frame");
    await view.getByRole("button", { name: "Copy the text" }).click();
    await expect(view.locator("#out")).toHaveText("copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("a line to post");
    await view.locator("#out").evaluate((el) => (el.textContent = ""));
    await view.getByRole("button", { name: "Copy the image" }).click();
    await expect(view.locator("#out")).toHaveText("copied");
    const types = await page.evaluate(async () => (await navigator.clipboard.read()).flatMap((item) => item.types));
    expect(types).toContain("image/png");
  });
});
