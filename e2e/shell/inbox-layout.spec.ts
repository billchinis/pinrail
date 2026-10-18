import { expect, test } from "@playwright/test";
import { clearInbox, createReview, settingsDialog } from "./helpers";

test("the inbox is grouped by project or one list, newest first, and remembers which", async ({ page }) => {
  await clearInbox(page.request);
  // oldest first: zeta gets the oldest and the newest, acme the one between
  await createReview(page.request, { title: "Layout one", origin: { repo: "zeta/app", workflow: "layout" } });
  await createReview(page.request, { title: "Layout two", origin: { repo: "acme/api", workflow: "layout" } });
  await createReview(page.request, { title: "Layout three", origin: { repo: "zeta/app", workflow: "layout" } });

  await page.goto("/#/");
  const rows = page.getByTestId("review-row");
  // grouped: the project with the newest review first, then newest within it
  await expect(page.getByTestId("inbox-group-name")).toHaveText(["zeta/app", "acme/api"]);
  await expect(rows).toHaveText([/Layout three/, /Layout one/, /Layout two/]);

  await page.getByRole("radio", { name: "One list" }).click();
  await expect(page.getByTestId("inbox-group")).toHaveCount(0);
  await expect(rows).toHaveText([/Layout three/, /Layout two/, /Layout one/]);
  // with no project headings, each row says its project
  await expect(rows.nth(1).getByTestId("review-row-project")).toHaveText("acme/api");

  // J moves through the rows in the order shown, and wraps around at the ends
  await page.keyboard.press("j");
  await expect(rows.nth(1)).toHaveClass(/is-focused/);
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await expect(rows.nth(0)).toHaveClass(/is-focused/);
  await page.keyboard.press("k");
  await expect(rows.nth(2)).toHaveClass(/is-focused/);

  // the choice outlasts a reload
  await page.reload();
  await expect(page.getByRole("radio", { name: "One list" })).toHaveAttribute("aria-checked", "true");
  await expect(rows).toHaveText([/Layout three/, /Layout two/, /Layout one/]);

  await page.getByRole("radio", { name: "Grouped by project" }).click();
  await expect(page.getByTestId("inbox-group")).toHaveCount(2);
});

test("⌘D discards the focused review, but not from behind a dialog, and D alone does not", async ({ page }) => {
  await clearInbox(page.request);
  await createReview(page.request, { title: "Quiet keys" });
  const discard = page.getByRole("dialog", { name: "Discard this review?" });

  await page.goto("/#/");
  await expect(page.getByTestId("review-row")).toHaveCount(1);
  await page.keyboard.press("ControlOrMeta+,");
  await expect(settingsDialog(page)).toBeVisible();
  await page.keyboard.press("ControlOrMeta+d");
  await expect(discard, "⌘D reached the inbox behind Settings").toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(settingsDialog(page)).toHaveCount(0);

  await page.keyboard.press("d");
  await expect(discard, "D alone opened the discard dialog").toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+d");
  await expect(discard).toBeVisible();
  await expect(discard).toContainText("Quiet keys");
});
