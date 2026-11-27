// Plor's logo (docs/milestones/M20-design-rules-and-clean-up.md, 20g, answers 128 to 132): the word with the peeking o
// as its o, in the phone's top bar and the desktop's sidebar; the tab icon, the home-screen icon and the manifest's icons,
// made by the app from the same drawing.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("the shell's word is drawn with the peeking o, his ring Plor's blue in a light theme and the lighter blue in a dark one", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "lw");
  // One of the two is on show: the top bar's on a phone, the sidebar's from 768px.
  const word = page.locator("header svg[data-logo], nav[aria-label='Main'] svg[data-logo]").filter({ visible: true });
  await expect(word).toHaveCount(1);
  await expect(word).toHaveAttribute("aria-hidden", "true");
  // The P, the l, him, the r, left to right, and no plain text beside them.
  const parts = await word.evaluate((svg) => [...svg.querySelectorAll("[data-part]")].map((p) => [p.getAttribute("data-part"), Math.round(p.getBoundingClientRect().left)] as const));
  expect(parts.map(([name]) => name)).toEqual(["P", "l", "o", "r"]);
  expect(parts.map(([, left]) => left)).toEqual([...parts.map(([, left]) => left)].sort((a, b) => a - b));
  expect((await word.locator("..").innerText()).trim()).toBe("");
  const ring = word.locator("[data-ring]");
  const fill = () => ring.evaluate((el) => getComputedStyle(el).fill);
  await page.evaluate(() => { document.documentElement.dataset.theme = "paper"; });
  expect(await fill()).toBe("rgb(36, 87, 214)");
  await page.evaluate(() => { document.documentElement.dataset.theme = "night"; });
  expect(await fill()).toBe("rgb(126, 166, 255)");
  // The letters are the theme's text colour.
  const [ink, text] = await word.evaluate((svg) => [getComputedStyle(svg.querySelector("[data-part='P']")!).stroke, getComputedStyle(document.body).color]);
  expect(ink).toBe(text);
});

test("the page links a tab icon, a home-screen icon and a manifest, and every icon answers as a PNG", async ({ page, request }) => {
  await page.goto("/");
  const href = (rel: string) => page.locator(`head link[rel='${rel}']`).evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
  const [icons, apple, manifests] = [await href("icon"), await href("apple-touch-icon"), await href("manifest")];
  expect(icons.length).toBeGreaterThan(0);
  expect(apple).toHaveLength(1);
  expect(manifests).toHaveLength(1);
  // The framework's default icon is gone.
  expect(icons.filter((url) => url.includes("favicon.ico"))).toEqual([]);
  const manifest = await (await request.get(manifests[0])).json();
  expect(manifest.name).toBe("Plor");
  const named: { src: string; purpose?: string; sizes: string }[] = manifest.icons;
  expect(named.map((icon) => icon.sizes).sort()).toEqual(["192x192", "192x192", "512x512", "512x512"]);
  expect(named.filter((icon) => icon.purpose === "maskable")).toHaveLength(2);
  for (const url of [...icons, ...apple, ...named.map((icon) => new URL(icon.src, page.url()).href)]) {
    const answer = await request.get(url);
    expect([url, answer.status(), answer.headers()["content-type"]]).toEqual([url, 200, "image/png"]);
    // A PNG's first bytes.
    expect((await answer.body()).subarray(1, 4).toString()).toBe("PNG");
  }
});
