// The kit's sample page (docs/milestones/M20-design-rules-and-clean-up.md, 20a): an admin finds every piece docs/DESIGN.md's
// Rules name, and the moments in the four looks (answer 24); a player who isn't an admin gets the admin pages' refusal.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });

// The pieces named in the Rules table's first column, without the class names after them: "Main button (`.primary`)".
function rulePieces(): string[] {
  const rules = readFileSync("docs/DESIGN.md", "utf8").split("\n## Rules\n")[1].split("\n## ")[0];
  return rules
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Piece") && !line.startsWith("|---"))
    .map((line) => line.split("|")[1].replace(/\(.*\)/, "").trim());
}

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("an admin finds every piece of the Rules and the four looks on /admin/kit", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "kt");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-kt@example.test`]);
  await page.goto("/admin/kit");
  await expect(page.getByRole("heading", { name: "Kit", level: 2 })).toBeVisible();
  const pieces = rulePieces();
  expect(pieces.length).toBeGreaterThan(10);
  for (const piece of pieces) await expect(page.getByRole("region", { name: piece, exact: true })).toBeVisible();
  for (const look of ["As built", "Restrained", "Balanced", "Bold"]) {
    await expect(page.getByRole("region", { name: look, exact: true })).toBeVisible();
  }

  // The chip's two versions in the five themes (20n-8, answers 75 and 104 to 107): as built its outline is the
  // theme's ink; soft-filled it has no outline and a fill of its own, with the same text colour. Each strip draws in
  // its own theme, so the five inks differ.
  const versions = page.getByRole("region", { name: "Chip versions", exact: true });
  const inks = new Set<string>();
  for (const theme of ["Paper", "Night", "Sky", "Moonlit", "Ink"]) {
    const drawn = (version: string) =>
      versions
        .getByRole("group", { name: theme, exact: true })
        .getByRole("group", { name: version })
        .getByText("7 rounds", { exact: true })
        .evaluate((el) => {
          const s = getComputedStyle(el);
          return { edge: s.borderTopColor, fill: s.backgroundColor, ink: s.color };
        });
    const outlined = await drawn("Outlined");
    const soft = await drawn("Soft-filled");
    expect(outlined.edge, theme).toBe(outlined.ink);
    expect(soft.edge, theme).toBe("rgba(0, 0, 0, 0)");
    expect(soft.fill, theme).not.toBe(outlined.fill);
    expect(soft.ink, theme).toBe(outlined.ink);
    inks.add(outlined.ink);
  }
  expect(inks.size).toBe(5);

  // A danger button keeps its danger text under the pointer: the hover rule changes the fill, not the warning (20a's
  // review).
  const danger = page.getByRole("region", { name: "Danger", exact: true });
  const warning = await danger.getByText("Not drafted").evaluate((el) => getComputedStyle(el).color);
  const remove = danger.getByRole("button", { name: "Delete" });
  await remove.hover();
  await expect.poll(() => remove.evaluate((el) => getComputedStyle(el).color)).toBe(warning);
});

test("a player who isn't an admin gets the refusal on /admin/kit", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "kn");
  await page.goto("/admin/kit");
  await expect(page.getByText("This page is for admins only.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Main button" })).toHaveCount(0);
});
