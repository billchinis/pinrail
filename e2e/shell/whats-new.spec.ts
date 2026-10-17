import { expect, test, type Page } from "@playwright/test";
import { core, settingsDialog } from "./helpers";

/** The app as the given release, by what the core says it runs. */
async function runAs(page: Page, version: string) {
  await page.route(`${core}/api/v1/info`, async (route) => {
    const info = await (await route.fetch()).json();
    await route.fulfill({ json: { ...info, version } });
  });
}

async function setSeen(page: Page, seen: string | null) {
  const response = await page.request.patch(`${core}/api/v1/settings`, { data: { whats_new: { seen } } });
  expect(response.status(), await response.text()).toBe(200);
}

const seenNow = async (page: Page) =>
  ((await (await page.request.get(`${core}/api/v1/settings`)).json()) as { whats_new: { seen: string | null } })
    .whats_new.seen;

// every other spec starts with What's new seen for any release
test.afterEach(({ page }) => setSeen(page, "999.0.0"));

test("a new release shows its cards once, one at a time, and a card opens what it is about", async ({ page }) => {
  await setSeen(page, "0.2.0");
  await runAs(page, "0.3.0");
  await page.goto("/#/");

  const dialog = page.getByTestId("whats-new");
  const card = dialog.getByTestId("whats-new-card");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("New in 0.3.0");
  await expect(card).toHaveText("Reviews open beside the inbox");
  // the picture is the theme's
  await expect(dialog.locator("img")).toHaveAttribute("src", /inbox-panel-(light|dark)\.webp/);

  await dialog.getByTestId("whats-new-next").click();
  await expect(card).toHaveText("See where a decision came from");
  await page.keyboard.press("ArrowRight");
  await expect(card).toHaveText("Official plugins update with the app");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");

  // a card's button closes the dialog and opens what the card is about
  await dialog.getByRole("button", { name: "Open Plugins" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(settingsDialog(page).getByRole("heading", { name: "Plugins" })).toBeVisible();
  await expect.poll(() => seenNow(page)).toBe("0.3.0");

  // once seen, it does not come back
  await page.reload();
  await expect(page.getByTestId("inbox-total")).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test("Esc closes the dialog and records the release as seen", async ({ page }) => {
  await setSeen(page, "0.2.0");
  await runAs(page, "0.3.0");
  await page.goto("/#/");
  const dialog = page.getByTestId("whats-new");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => seenNow(page)).toBe("0.3.0");
});

test("a release with no notes shows nothing, and counts as seen", async ({ page }) => {
  await setSeen(page, "0.3.0");
  await runAs(page, "0.3.1");
  await page.goto("/#/");
  await expect(page.getByTestId("inbox-total")).toBeVisible();
  await expect.poll(() => seenNow(page)).toBe("0.3.1");
  await expect(page.getByTestId("whats-new")).toHaveCount(0);
});

test("the newest notes open again from ⌘K and from Settings › About, without changing what was seen", async ({
  page,
}) => {
  // a development build previews them, though the app runs an older release
  await page.goto("/#/");
  await expect(page.getByTestId("inbox-total")).toBeVisible();
  const dialog = page.getByTestId("whats-new");
  await expect(dialog).toHaveCount(0);

  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "Search" });
  await palette.getByRole("textbox").fill("What's new");
  await palette.getByRole("option", { name: /What's new in Pinrail/ }).click();
  await expect(dialog).toContainText("New in 0.3.0");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.keyboard.press("ControlOrMeta+,");
  await settingsDialog(page)
    .getByRole("navigation", { name: "Settings sections" })
    .getByRole("button", { name: "About" })
    .click();
  await settingsDialog(page).getByRole("button", { name: "What's new" }).click();
  await expect(settingsDialog(page)).toHaveCount(0);
  await expect(dialog.getByTestId("whats-new-card")).toHaveText("Reviews open beside the inbox");
  await dialog.getByRole("button", { name: "Close" }).click();

  expect(await seenNow(page)).toBe("999.0.0");
});
