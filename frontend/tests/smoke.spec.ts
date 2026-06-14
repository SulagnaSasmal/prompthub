import { expect, test } from "@playwright/test";

test("author can register, sign in, and create a prompt", async ({ page }) => {
  const suffix = Date.now();
  const username = `author${suffix}`;
  const promptName = `Smoke Prompt ${suffix}`;

  await page.goto("http://127.0.0.1:3000/login");
  await page.getByRole("button", { name: "Create an author account" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(`${username}@example.com`);
  await page.getByLabel("Full name").fill("Smoke Test Author");
  await page.getByLabel("Password").fill("testpass123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Prompt Library" })).toBeVisible();
  await page.getByRole("link", { name: "+ New Prompt" }).click();
  await page.getByLabel("Name").fill(promptName);
  await page.getByLabel("Description").fill("Created by the browser smoke test.");
  await page.getByLabel("Subcategory").fill("Smoke Tests");
  await page.getByLabel("Target model").fill("GPT-5");
  await page.getByLabel("Tags").fill("smoke, e2e");
  await page.getByRole("button", { name: "Create prompt" }).click();

  await expect(page.getByRole("heading", { name: promptName })).toBeVisible();
  await expect(page.getByText("Created by the browser smoke test.")).toBeVisible();
});
