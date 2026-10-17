import { expect, test, type Page } from "@playwright/test";
import { clearInbox, createReview, openReviewsIn, settingsDialog } from "./helpers";

const panel = (page: Page) => page.getByTestId("review-panel");
const row = (page: Page, title: string) => page.getByTestId("review-row").filter({ hasText: title });

test.afterEach(({ request }) => openReviewsIn(request, "panel"));

test("a review opens beside the inbox, and closes with its button or Escape", async ({ page }) => {
  await clearInbox(page.request);
  const review = await createReview(page.request, { title: "Panel: open and close" });

  await page.goto("/#/");
  await row(page, "Panel: open and close").click();
  await expect(page).toHaveURL(new RegExp(`#/\\?open=${review.id}$`));
  await expect(panel(page).getByTestId("review-title")).toHaveText("Panel: open and close");
  await expect(page.frameLocator("#plugin-frame").locator("body")).toContainText("One proposal.");
  // the list stays, with the open review's row marked
  await expect(row(page, "Panel: open and close")).toHaveAttribute("aria-current", "true");

  await panel(page).getByRole("button", { name: "Close the panel" }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#\/$/);

  await row(page, "Panel: open and close").click();
  await expect(panel(page)).toBeVisible();
  await page.locator("body").press("Escape");
  await expect(panel(page)).toHaveCount(0);
});

test("a decision in the panel moves on to the next review, and the last one closes it", async ({ page }) => {
  await clearInbox(page.request);
  // newest first: Second, then First
  await createReview(page.request, { title: "Panel: first" });
  await createReview(page.request, { title: "Panel: second" });
  const frame = page.frameLocator("#plugin-frame");

  await page.goto("/#/");
  await row(page, "Panel: second").click();
  await expect(frame.locator("body")).toContainText("One proposal.");
  await frame.locator('button[data-act="accept"]').first().click();
  await page.getByTestId("handover").click();

  await expect(page.getByText("Decision recorded")).toBeVisible();
  await expect(panel(page).getByTestId("review-title")).toHaveText("Panel: first");
  await expect(page.getByTestId("review-row")).toHaveCount(1);

  await expect(frame.locator("body")).toContainText("One proposal.");
  await frame.locator('button[data-act="accept"]').first().click();
  await page.getByTestId("handover").click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#\/$/);
});

test("⌥↓ and ⌥↑ walk the list from the panel, in the order it shows", async ({ page }) => {
  await clearInbox(page.request);
  await createReview(page.request, { title: "Panel walk: oldest" });
  await createReview(page.request, { title: "Panel walk: newest" });

  await page.goto("/#/");
  await row(page, "Panel walk: newest").click();
  await expect(panel(page).getByTestId("review-title")).toHaveText("Panel walk: newest");
  await page.locator("body").press("Alt+ArrowDown");
  await expect(panel(page).getByTestId("review-title")).toHaveText("Panel walk: oldest");
  await page.locator("body").press("Alt+ArrowUp");
  await expect(panel(page).getByTestId("review-title")).toHaveText("Panel walk: newest");
});

test("J and K move to the next and previous review, from the list and from the view", async ({ page }) => {
  await clearInbox(page.request);
  await createReview(page.request, { title: "Panel keys: oldest" });
  await createReview(page.request, { title: "Panel keys: newest" });
  const title = panel(page).getByTestId("review-title");
  const frame = page.frameLocator("#plugin-frame");

  await page.goto("/#/");
  await row(page, "Panel keys: newest").click();
  await expect(title).toHaveText("Panel keys: newest");
  await page.locator("body").press("j");
  await expect(title).toHaveText("Panel keys: oldest");
  // at the end of the list it goes round to the first, and back
  await page.locator("body").press("j");
  await expect(title).toHaveText("Panel keys: newest");
  await page.locator("body").press("k");
  await expect(title).toHaveText("Panel keys: oldest");

  // with the view in focus, the view passes them up
  await expect(frame.locator("body")).toContainText("One proposal.");
  await frame.locator("body").click();
  await page.keyboard.press("k");
  await expect(title).toHaveText("Panel keys: newest");
});

test("the panel is one step back however many reviews it went through", async ({ page }) => {
  await clearInbox(page.request);
  await createReview(page.request, { title: "Panel back: oldest" });
  await createReview(page.request, { title: "Panel back: middle" });
  await createReview(page.request, { title: "Panel back: newest" });

  await page.goto("/#/");
  await row(page, "Panel back: newest").click();
  await row(page, "Panel back: middle").click();
  await expect(panel(page).getByTestId("review-title")).toHaveText("Panel back: middle");
  await page.locator("body").press("Alt+ArrowDown");
  await expect(panel(page).getByTestId("review-title")).toHaveText("Panel back: oldest");
  // Back, as ⌘[ or the web view's ⌘← does it
  await page.locator("body").press("ControlOrMeta+BracketLeft");
  await expect(page).toHaveURL(/#\/$/);
  await expect(panel(page)).toHaveCount(0);
});

test("walking from the panel moves the highlight off the row under the pointer", async ({ page }) => {
  await clearInbox(page.request);
  await createReview(page.request, { title: "Panel highlight: oldest" });
  await createReview(page.request, { title: "Panel highlight: newest" });

  await page.goto("/#/");
  // the pointer stays on the row it clicked
  await row(page, "Panel highlight: newest").click();
  await expect(row(page, "Panel highlight: newest")).toHaveClass(/is-focused/);
  await page.locator("body").press("Alt+ArrowDown");
  await expect(panel(page).getByTestId("review-title")).toHaveText("Panel highlight: oldest");
  await expect(row(page, "Panel highlight: oldest")).toHaveClass(/is-focused/);
  await expect(row(page, "Panel highlight: newest")).not.toHaveClass(/is-focused/);
});

test("the panel opens a review as a page, and the page goes back to the panel", async ({ page }) => {
  await clearInbox(page.request);
  const review = await createReview(page.request, { title: "Panel: as a page" });

  await page.goto("/#/");
  await row(page, "Panel: as a page").click();
  await panel(page).getByRole("button", { name: "Open as a page" }).click();
  await expect(page).toHaveURL(new RegExp(`/reviews/${review.id}$`));
  await expect(panel(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Show in the inbox's panel" }).click();
  await expect(page).toHaveURL(new RegExp(`#/\\?open=${review.id}$`));
  await expect(panel(page)).toBeVisible();
});

test("with reviews opening as pages, set in Settings, a row opens the page", async ({ page }) => {
  await clearInbox(page.request);
  const review = await createReview(page.request, { title: "Panel: turned off" });

  await page.goto("/#/");
  await page.keyboard.press("ControlOrMeta+,");
  await settingsDialog(page).getByRole("radio", { name: "As a page" }).click();
  await page.keyboard.press("Escape");
  await expect(settingsDialog(page)).toHaveCount(0);

  await row(page, "Panel: turned off").click();
  await expect(page).toHaveURL(new RegExp(`/reviews/${review.id}$`));
  await expect(page.getByRole("button", { name: "Show in the inbox's panel" })).toHaveCount(0);
});
