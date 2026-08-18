import { expect, test } from "@playwright/test";

const mobileWidths = [320, 375, 390, 414, 430];

for (const width of mobileWidths) {
  test(`keeps navbar actions usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: 896, width });
    await page.goto("/");

    const header = page.locator("header");
    const logo = header.getByRole("link", { name: "PipeFlow home" });
    const signIn = header.getByRole("link", { name: "Sign In" });
    const startTrial = header.getByRole("link", { name: "Start Free Trial" });

    await expect(logo).toBeVisible();
    await expect(signIn).toBeVisible();
    await expect(startTrial).toBeVisible();

    const layout = await page.evaluate(() => {
      const headerElement = document.querySelector("header");
      const logoElement = headerElement?.querySelector(
        'a[aria-label="PipeFlow home"]',
      );
      const links = Array.from(headerElement?.querySelectorAll("a") ?? []);
      const signInElement = links.find(
        (link) => link.textContent?.trim() === "Sign In",
      );
      const startTrialElement = links.find(
        (link) => link.textContent?.trim() === "Start Free Trial",
      );

      if (!logoElement || !signInElement || !startTrialElement) {
        return null;
      }

      const logoRect = logoElement.getBoundingClientRect();
      const signInRect = signInElement.getBoundingClientRect();
      const startTrialRect = startTrialElement.getBoundingClientRect();

      return {
        bodyScrollWidth: document.documentElement.scrollWidth,
        logoRight: logoRect.right,
        signInHeight: signInRect.height,
        signInLeft: signInRect.left,
        signInWhiteSpace: getComputedStyle(signInElement).whiteSpace,
        signInY: signInRect.y,
        startTrialHeight: startTrialRect.height,
        startTrialRight: startTrialRect.right,
        startTrialWhiteSpace: getComputedStyle(startTrialElement).whiteSpace,
        startTrialY: startTrialRect.y,
        viewportWidth: window.innerWidth,
      };
    });

    expect(layout).not.toBeNull();
    expect(layout?.signInWhiteSpace).toBe("nowrap");
    expect(layout?.startTrialWhiteSpace).toBe("nowrap");
    expect(layout?.signInHeight).toBeGreaterThanOrEqual(44);
    expect(layout?.startTrialHeight).toBeGreaterThanOrEqual(44);
    expect(Math.abs((layout?.signInY ?? 0) - (layout?.startTrialY ?? 0))).toBeLessThan(
      1,
    );
    expect(layout?.logoRight).toBeLessThanOrEqual(layout?.signInLeft ?? 0);
    expect(layout?.startTrialRight).toBeLessThanOrEqual(layout?.viewportWidth ?? 0);
    expect(layout?.bodyScrollWidth).toBeLessThanOrEqual(layout?.viewportWidth ?? 0);

    await page.keyboard.press("Tab");
    await expect(logo).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(signIn).toBeFocused();
    expect(
      await signIn.evaluate((element) => {
        const styles = getComputedStyle(element);
        return styles.boxShadow !== "none" || styles.outlineStyle !== "none";
      }),
    ).toBe(true);
    await page.keyboard.press("Tab");
    await expect(startTrial).toBeFocused();
    expect(
      await startTrial.evaluate((element) => {
        const styles = getComputedStyle(element);
        return styles.boxShadow !== "none" || styles.outlineStyle !== "none";
      }),
    ).toBe(true);
  });
}

for (const width of [768, 1440]) {
  test(`preserves the navbar layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/");

    const header = page.locator("header");
    const logoImage = header.getByAltText("PipeFlow").first();
    const signIn = header.getByRole("link", { name: "Sign In" });
    const startTrial = header.getByRole("link", { name: "Start Free Trial" });

    await expect(header.getByRole("link", { name: "Features" })).toBeVisible();
    await expect(logoImage).toHaveCSS("height", "48px");
    await expect(signIn).toHaveCSS("height", "40px");
    await expect(startTrial).toHaveCSS("height", "40px");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}
