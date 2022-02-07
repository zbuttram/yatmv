describe("app", () => {
  beforeEach(async () => {
    await page.goto("http://localhost:3000", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await expect(page).toClick("main > button");
  });

  it("should load", async () => {
    await expect(page).toMatchElement("#root");
  });

  it("should be able to expand sidebar", async () => {
    await expect(page).toClick('button[title="Expand"]');
  });

  it("should be able to redirect to twitch auth", async () => {
    await expect(page).toClick('button[title="Connect to Twitch"]');
    await page.waitForNavigation();
    expect(page.url()).toMatch(/https:\/\/www.twitch.tv\/.*/);
  });
});
