import { test, expect } from "@playwright/test";

const devicesUrl = "https://www.crunchyroll.com/devices";

async function expectUsableDestination(destination) {
  await destination.waitForLoadState("domcontentloaded", { timeout: 10000 });

  const destinationUrl = new URL(destination.url());
  expect(["http:", "https:"]).toContain(destinationUrl.protocol);

  await expect
    .poll(
      async () => {
        const [title, bodyText] = await Promise.all([
          destination.title(),
          destination
            .locator("body")
            .innerText()
            .catch(() => ""),
        ]);
        return `${title}\n${bodyText}`.trim();
      },
      { timeout: 15000 },
    )
    .toMatch(/\S/);

  const pageText = await destination
    .locator("body")
    .innerText()
    .catch(() => "");
  expect(pageText).not.toMatch(
    /this site can’t be reached|this site can't be reached|404 not found|page not found/i,
  );
}

async function openDevicesPage(page) {
  await page.goto(devicesUrl, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "CRUNCHYROLL IS ON YOUR FAVORITE DEVICES",
    }),
  ).toBeVisible();
}

test.describe("Crunchyroll devices page", () => {
  test("displays the page heading and device categories", async ({ page }) => {
    await page.goto(devicesUrl);

    await expect(
      page.getByRole("heading", {
        name: "CRUNCHYROLL IS ON YOUR FAVORITE DEVICES",
      }),
    ).toBeVisible();

    for (const category of [
      "Mobile Devices",
      "Gaming Consoles",
      "Media Players",
      "Smart TVs and Headsets",
      "Service Providers",
    ]) {
      await expect(
        page.getByRole("heading", { name: category, exact: true }),
      ).toBeVisible();
    }
  });

  test("all visible enabled hyperlinks open usable destinations", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await openDevicesPage(page);

    const consentButton = page.locator("#onetrust-accept-btn-handler");
    if (await consentButton.isVisible().catch(() => false)) {
      await consentButton.click();
      await expect(page.locator("#onetrust-consent-sdk")).toBeHidden();
    }

    const links = await page.locator("a[href]").evaluateAll((anchors) => {
      const isVisibleLink = (anchor) => {
        const style = getComputedStyle(anchor);
        return (
          anchor.getClientRects().length > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          anchor.getAttribute("aria-disabled") !== "true"
        );
      };
      const visibleLinks = anchors
        .filter(
          (anchor) =>
            isVisibleLink(anchor) && !anchor.closest("#onetrust-consent-sdk"),
        )
        .map((anchor) => ({
          name:
            anchor.innerText.trim() ||
            anchor.getAttribute("aria-label") ||
            anchor.title,
          href: anchor.href,
          target: anchor.target,
        }));
      const occurrences = new Map();

      return visibleLinks.map((link) => {
        const key = `${link.href}\n${link.target}`;
        const occurrence = occurrences.get(key) || 0;
        occurrences.set(key, occurrence + 1);
        return { ...link, occurrence };
      });
    });

    expect(links.length).toBeGreaterThan(0);

    const failures = [];

    for (const linkInfo of links) {
      try {
        const anchorIndex = await page
          .locator("a[href]")
          .evaluateAll((anchors, target) => {
            const isVisibleLink = (anchor) => {
              const style = getComputedStyle(anchor);
              return (
                anchor.getClientRects().length > 0 &&
                style.visibility !== "hidden" &&
                style.display !== "none" &&
                anchor.getAttribute("aria-disabled") !== "true"
              );
            };
            const matchingLinks = anchors.filter(
              (anchor) =>
                isVisibleLink(anchor) &&
                !anchor.closest("#onetrust-consent-sdk") &&
                anchor.href === target.href &&
                anchor.target === target.target,
            );
            return anchors.indexOf(matchingLinks[target.occurrence]);
          }, linkInfo);

        expect(
          anchorIndex,
          `Could not find ${linkInfo.name || linkInfo.href}`,
        ).toBeGreaterThanOrEqual(0);
        const anchor = page.locator("a[href]").nth(anchorIndex);
        await expect(anchor).toBeVisible();

        const targetUrl = new URL(linkInfo.href);
        const sourceUrl = new URL(devicesUrl);
        const isSamePage =
          targetUrl.origin === sourceUrl.origin &&
          targetUrl.pathname.replace(/\/$/, "") ===
            sourceUrl.pathname.replace(/\/$/, "");

        if (isSamePage) {
          await anchor.click();
          if (targetUrl.hash && targetUrl.hash !== "#") {
            await expect(page).toHaveURL((url) => url.hash === targetUrl.hash);
            await expect(page.locator(targetUrl.hash)).toBeVisible();
          }
          continue;
        }

        if (linkInfo.target.toLowerCase() === "_blank") {
          const [popup] = await Promise.all([
            page.context().waitForEvent("page", { timeout: 10000 }),
            anchor.click(),
          ]);
          await expectUsableDestination(popup);
          await popup.close();
        } else {
          await Promise.all([
            page.waitForURL((url) => url.href !== devicesUrl, {
              waitUntil: "domcontentloaded",
              timeout: 15000,
            }),
            anchor.click(),
          ]);
          await expectUsableDestination(page);
          await openDevicesPage(page);
        }
      } catch (error) {
        failures.push(
          `${linkInfo.name || "(unnamed link)"} (${linkInfo.href}): ${error.message}`,
        );
        if (page.url() !== devicesUrl) {
          await openDevicesPage(page).catch(() => {});
        }
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
