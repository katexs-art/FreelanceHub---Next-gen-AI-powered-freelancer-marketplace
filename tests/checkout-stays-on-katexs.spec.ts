import { test, expect } from "@playwright/test";

const GIG_ID = "73dd1eba-162d-4458-8f33-ac2c7fe15d4c";
const BUYER_EMAIL = "buyer1@test.katexs.com";
const BUYER_PASSWORD = "TestBuyer123!";

test("checkout flow stays on Katexs origin after clicking Continue", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;

  // Track every top-level navigation; none may leave the Katexs origin.
  const offSiteNavigations: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      if (url !== "about:blank" && new URL(url).origin !== origin) {
        offSiteNavigations.push(url);
      }
    }
  });
  // A real Stripe-hosted redirect would also surface as a popup.
  page.on("popup", (p) => offSiteNavigations.push(`popup:${p.url()}`));

  // Sign in as the test buyer.
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(BUYER_EMAIL);
  await page.locator('input[type="password"]').fill(BUYER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });

  // Open the gig and click Continue.
  await page.goto(`/gig/${GIG_ID}`);
  const continueBtn = page.getByRole("button", { name: /^continue/i });
  await expect(continueBtn).toBeVisible();
  await continueBtn.click();

  // Must land on the in-app checkout, not Stripe.
  await page.waitForURL(/\/checkout\/[0-9a-f-]+/, { timeout: 15000 });
  expect(new URL(page.url()).origin).toBe(origin);
  expect(page.url()).not.toMatch(/stripe\.com|checkout\.stripe/);

  // No navigation during the flow may have left Katexs.
  expect(offSiteNavigations, `Unexpected off-site navigations: ${offSiteNavigations.join(", ")}`).toEqual([]);
});
