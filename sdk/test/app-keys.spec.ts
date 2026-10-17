import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { mountPlugin } from "../testing/index.cjs";
import { scratch } from "./scratch.cjs";

// A view with a text field, and a key of its own it keeps from the app.
function view(): string {
  const dir = scratch("pinrail-app-keys-");
  fs.mkdirSync(path.join(dir, "view"), { recursive: true });
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ name: "keys", version: "1.0.0", title: "Keys" }));
  fs.writeFileSync(
    path.join(dir, "view", "index.html"),
    `<!doctype html>
<meta charset="utf-8">
<script src="/sdk/v1/pinrail-plugin.js"></script>
<p id="ready">waiting</p>
<textarea id="field"></textarea>
<script>
  Pinrail.connect({ onInit() { document.getElementById("ready").textContent = "ready"; } });
  // this view answers ] itself, so the app does not
  document.addEventListener("keydown", (e) => { if (e.key === "]") e.preventDefault(); });
</script>`,
  );
  return dir;
}

test("the app's keys go up from a view, unless typed in a field or kept by the view", async ({ page }) => {
  const plugin = await mountPlugin(page, view(), { review: { payload: {} } });
  const f = plugin.frame;
  await expect(f.locator("#ready")).toHaveText("ready");
  const keys = async () => (await plugin.messages()).filter((m: any) => m.type === "key").map((m: any) => m.key);

  await f.locator("#ready").click();
  await page.keyboard.press("?");
  await page.keyboard.press("[");
  await page.keyboard.press("]"); // the view keeps this one
  await page.keyboard.press("j"); // the inbox's next and previous
  await page.keyboard.press("k");
  await page.keyboard.press("n"); // not the app's
  await expect.poll(keys).toEqual(["?", "[", "j", "k"]);

  await f.locator("#field").click();
  await page.keyboard.press("?"); // typed into the field
  await page.keyboard.press("j");
  await page.waitForTimeout(100);
  expect(await keys()).toEqual(["?", "[", "j", "k"]);
});

test("⌘D or Ctrl+D goes up from anywhere in a view, a text field too", async ({ page }) => {
  const plugin = await mountPlugin(page, view(), { review: { payload: {} } });
  const f = plugin.frame;
  await expect(f.locator("#ready")).toHaveText("ready");
  const discards = async () =>
    (await plugin.messages()).filter((m: any) => m.type === "key" && m.key === "d" && (m.metaKey || m.ctrlKey)).length;

  await f.locator("#ready").click();
  await page.keyboard.press("ControlOrMeta+d");
  await f.locator("#field").click();
  await page.keyboard.press("ControlOrMeta+d");
  await expect.poll(discards).toBe(2);
  // with another modifier it is not the app's
  await page.keyboard.press("ControlOrMeta+Shift+d");
  await page.waitForTimeout(100);
  expect(await discards()).toBe(2);
});

test("Esc goes up from a view that leaves it alone, so the app can close its panel", async ({ page }) => {
  const dir = view();
  // this view closes a dialog of its own with Esc while one is open
  const file = path.join(dir, "view", "index.html");
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(
      "// this view answers ] itself",
      `window.dialogOpen = true;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && window.dialogOpen) { e.preventDefault(); window.dialogOpen = false; } });
  // this view answers ] itself`,
    ),
  );
  const plugin = await mountPlugin(page, dir, { review: { payload: {} } });
  const f = plugin.frame;
  await expect(f.locator("#ready")).toHaveText("ready");
  const escapes = async () =>
    (await plugin.messages()).filter((m: any) => m.type === "key" && m.key === "Escape").length;

  await f.locator("#ready").click();
  await page.keyboard.press("Escape"); // closes the view's dialog
  await page.waitForTimeout(100);
  expect(await escapes()).toBe(0);
  await page.keyboard.press("Escape"); // nothing left to close: the app's
  await expect.poll(escapes).toBe(1);

  await f.locator("#field").click();
  await page.keyboard.press("Escape"); // in a field, the field's
  await page.waitForTimeout(100);
  expect(await escapes()).toBe(1);
});
