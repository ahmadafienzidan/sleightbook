import { expect, type Page, test } from "@playwright/test";

const openTrick = async (page: Page) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Ambitious Card" })).toBeVisible();
};

const phaseButton = (page: Page, name: string) =>
  page.getByRole("list", { name: "Phases" }).getByRole("button", { name: new RegExp(name) });

const liftedCards = (page: Page) => page.locator('[data-zone="lifted"][data-kind="card"]');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("sleightbook.language", "en");
  });
});

test("opens the first trick from the home page", async ({ page }) => {
  await openTrick(page);
  await expect(page).toHaveURL(/\/tricks\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Step 1 / 5")).toBeVisible();
});

test("next and previous move between phases", async ({ page }) => {
  await openTrick(page);
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.getByText("Step 2 / 5")).toBeVisible();
  await page.getByRole("button", { name: "Previous phase" }).click();
  await expect(page.getByText("Step 1 / 5")).toBeVisible();
});

test("play runs the routine to the end", async ({ page }) => {
  await openTrick(page);
  await page.getByRole("slider", { name: "Speed" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("Step 5 / 5")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible({
    timeout: 15_000,
  });
});

test("clicking a phase highlights it in the breakdown", async ({ page }) => {
  await openTrick(page);
  await phaseButton(page, "Insert").click();
  await expect(page.getByText("Step 3 / 5")).toBeVisible();
  const breakdownItems = page
    .getByRole("list", { name: "Step-by-step breakdown" })
    .locator(":scope > li");
  await expect(breakdownItems.nth(2)).toHaveAttribute("aria-current", "step");
});

test("secret view reveals the double lift, spectator view hides it", async ({ page }) => {
  await openTrick(page);
  await phaseButton(page, "Double Lift").click();
  await expect(liftedCards(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Spectator", exact: true }).click();
  await expect(liftedCards(page)).toHaveCount(1);
});

test("favorite persists after reload", async ({ page }) => {
  await openTrick(page);
  await page.getByRole("button", { name: "Add to favorites" }).click();
  await expect(page.getByRole("button", { name: "Remove from favorites" })).toBeVisible();
  await page.reload();
  const unfavorite = page.getByRole("button", { name: "Remove from favorites" });
  await expect(unfavorite).toBeVisible();
  await unfavorite.click();
  await expect(page.getByRole("button", { name: "Add to favorites" })).toBeVisible();
});

test("phase notes can be added, edited and deleted", async ({ page }) => {
  const body = `E2E note ${Date.now()}`;
  await openTrick(page);
  await phaseButton(page, "Insert").click();

  const notes = page.getByRole("region", { name: "Notes for Insert" });
  await notes.getByRole("textbox", { name: "Write a note" }).fill(body);
  await notes.getByRole("button", { name: "Add note" }).click();
  await expect(notes.getByText(body)).toBeVisible();

  await page.reload();
  await phaseButton(page, "Insert").click();
  const reloaded = page.getByRole("region", { name: "Notes for Insert" });
  await reloaded
    .getByRole("listitem")
    .filter({ hasText: body })
    .getByRole("button", { name: "Edit" })
    .click();
  await reloaded.getByRole("textbox", { name: "Edit note" }).fill(`${body} (edited)`);
  await reloaded.getByRole("button", { name: "Save" }).click();
  await expect(reloaded.getByText(`${body} (edited)`)).toBeVisible();

  await reloaded
    .getByRole("listitem")
    .filter({ hasText: `${body} (edited)` })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(reloaded.getByText(body)).toHaveCount(0);
});

test("interface language can be switched to Indonesian", async ({ page }) => {
  await openTrick(page);
  await page.getByLabel("Language").selectOption("id");
  await expect(page.getByRole("heading", { name: "Visualisasi Interaktif" })).toBeVisible();
});
