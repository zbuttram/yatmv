import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.locator("main > button").first().click();
});

test("should load", async ({ page }) => {
  await expect(page.locator("#root")).not.toBeEmpty();
});

test("should be able to collapse and expand sidebar", async ({ page }) => {
  await page.getByTitle("Collapse").click();
  await page.getByTitle("Expand").click();
  await expect(page.getByTitle("Collapse")).toBeVisible();
});

test("should be able to redirect to twitch auth", async ({ page }) => {
  await page.getByTitle("Connect to Twitch").click();
  await page.waitForURL(/https:\/\/(www|id)\.twitch\.tv\/.*/);
});
