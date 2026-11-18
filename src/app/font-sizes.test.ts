// Every screen's text takes its size from the kit's scale (docs/milestones/M20-design-rules-and-clean-up.md, 20f; answers
// 60 to 64): a module names one of the kit's sizes, never a size of its own. The game screens keep their own big type
// (the countdown, Fragments' letters, the game screen's stats), and the kit is where the scale is defined.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
// The kit, and the game screens' own modules (answer 63's exception), and /admin/kit's looks, which draw the four
// looks as they were proposed.
const OWN_SIZES = ["kit.module.css", "game.module.css", "offbeat.module.css", "substrings.module.css", "countdown-bar.module.css", "admin/kit/looks.module.css"];
const SCALE = ["--text-display", "--text-heading", "--text-subheading", "--text-body", "--text-note", "--text-caption", "--text-label"];

function modules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? modules(join(dir, entry.name)) : entry.name.endsWith(".module.css") ? [join(dir, entry.name)] : [],
  );
}

describe("font sizes", () => {
  it("are the kit's scale in every module but the kit's and the game screens'", () => {
    const strays = modules(APP)
      .map((file) => relative(APP, file).replaceAll("\\", "/"))
      .filter((file) => !OWN_SIZES.includes(file))
      .flatMap((file) =>
        [...readFileSync(join(APP, file), "utf8").matchAll(/font-size:\s*([^;]+);/g)]
          .map((m) => m[1].trim())
          .filter((value) => !SCALE.some((name) => value === `var(${name})` || value.startsWith(`min(var(${name}),`)))
          .map((value) => `${file}: ${value}`),
      );
    expect(strays).toEqual([]);
  });

  it("the kit defines the scale: 30, 24, 18, 16, 14, 13 and 12px", () => {
    const kit = readFileSync(join(APP, "kit.module.css"), "utf8");
    const sizes = Object.fromEntries([...kit.matchAll(/(--text-[a-z]+):\s*([0-9.]+rem);/g)].map((m) => [m[1], parseFloat(m[2]) * 16]));
    expect(sizes).toEqual({
      "--text-display": 30,
      "--text-heading": 24,
      "--text-subheading": 18,
      "--text-body": 16,
      "--text-note": 14,
      "--text-caption": 13,
      "--text-label": 12,
    });
  });
});
