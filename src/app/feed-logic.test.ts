import { describe, expect, it } from "vitest";
import type { FeedItem } from "@/comments/feed-page";
import { dateLine, mergeFirstPage, neighbourComment, postableGames } from "./feed-logic";

// An item at an instant: only what the merge reads.
const at = (n: number) => `2026-11-14T10:${String(n).padStart(2, "0")}:00.000000Z`;
const comment = (id: string, n: number, body = id): FeedItem => ({
  kind: "comment",
  game: "offbeat",
  date: "2026-11-14",
  at: at(n),
  username: "u",
  name: "u",
  mine: false,
  id,
  body,
  group: null,
  reactions: { counts: [], mine: null },
});
const ids = (items: FeedItem[]) => items.map((i) => (i.kind === "comment" ? i.id : "result"));

describe("the date line (answer 49)", () => {
  it("is none for today, Yesterday for the day before, then the app's date style", () => {
    expect(dateLine("2026-11-14", "2026-11-14")).toBeNull();
    expect(dateLine("2026-11-13", "2026-11-14")).toBe("Yesterday");
    expect(dateLine("2026-11-12", "2026-11-14")).toBe("Thu 12 Nov");
    // Across a month's edge.
    expect(dateLine("2026-10-31", "2026-11-01")).toBe("Yesterday");
  });
});

describe("the games the comment box offers (answer 23)", () => {
  it("are the games finished today, Offbeat first, by their shown names", () => {
    expect(postableGames([])).toEqual([]);
    expect(postableGames(["substrings"]).map((g) => g.name)).toEqual(["Fragments"]);
    expect(postableGames(["substrings", "offbeat"]).map((g) => g.name)).toEqual(["Offbeat", "Fragments"]);
  });
});

describe("a nudge's first page merged into what is loaded", () => {
  const loaded = { items: [comment("a", 9), comment("b", 8), comment("c", 7), comment("d", 6)], next: "after-d" };

  it("puts new items at the top and keeps the rest and the cursor", () => {
    const fresh = { items: [comment("n", 10), comment("a", 9), comment("b", 8)], next: "after-b" };
    const merged = mergeFirstPage(loaded, fresh);
    expect(ids(merged.items)).toEqual(["n", "a", "b", "c", "d"]);
    expect(merged.next).toBe("after-d");
  });

  it("updates a changed item and drops one that is gone from the newest span", () => {
    const fresh = { items: [comment("a", 9, "edited"), comment("c", 7)], next: "after-c" };
    const merged = mergeFirstPage(loaded, fresh);
    expect(ids(merged.items)).toEqual(["a", "c", "d"]);
    expect(merged.items[0]).toMatchObject({ body: "edited" });
  });

  it("leaves items older than the span alone, however the span changed", () => {
    const fresh = { items: [comment("a", 9), comment("b", 8)], next: "after-b" };
    expect(ids(mergeFirstPage(loaded, fresh).items)).toEqual(["a", "b", "c", "d"]);
  });

  it("takes the new page whole, and its cursor, when it ends the feed or reaches nothing loaded", () => {
    const whole = { items: [comment("a", 9)], next: null };
    expect(mergeFirstPage(loaded, whole)).toEqual(whole);
    // More new items than a page: the newest page ends after the loaded ones begin, so the gap can't be filled in place.
    const gap = { items: [comment("x", 15), comment("y", 14)], next: "after-y" };
    expect(mergeFirstPage(loaded, gap)).toEqual(gap);
  });

  it("takes the page's cursor when every loaded item was inside the span", () => {
    const only = { items: [comment("a", 9), comment("b", 8)], next: "after-b" };
    const fresh = { items: [comment("n", 10), comment("a", 9), comment("b", 8)], next: "after-b-new" };
    expect(mergeFirstPage(only, fresh).next).toBe("after-b-new");
  });

  it("starts from nothing", () => {
    const fresh = { items: [comment("a", 9)], next: "c" };
    expect(mergeFirstPage({ items: [], next: null }, fresh)).toEqual(fresh);
  });
});

describe("where focus goes when a comment leaves", () => {
  const result = (n: number): FeedItem => ({ kind: "result", game: "offbeat", date: "2026-11-14", at: at(n), username: "u", name: "u", mine: true, userId: "x", blurred: true });
  const items = [comment("a", 9), result(8), comment("b", 7), comment("c", 6), result(5)];

  it("is the next comment down, passing over results", () => {
    expect(neighbourComment(items, 0)).toBe("c:b");
    expect(neighbourComment(items, 2)).toBe("c:c");
  });

  it("is the comment above when it was the last, and none when it was the only one", () => {
    expect(neighbourComment(items, 3)).toBe("c:b");
    expect(neighbourComment([comment("a", 9), result(8)], 0)).toBeNull();
  });
});
