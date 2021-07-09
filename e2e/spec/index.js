describe("app", () => {
  beforeEach(async () => {
    await page.goto(URL, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
  });

  it("should load", () => {
    expect(page.$("#root")).toBeTruthy();
  });
});
