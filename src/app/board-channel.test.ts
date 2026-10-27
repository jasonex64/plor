// Which nudges reload which list (docs/milestones/M10-groups.md, 10d, G5; docs/milestones/M11-home-screen.md, 11b): a
// group's page reloads for its own group only, and the friends feed for the friends thread and every group.
import { describe, expect, it } from "vitest";
import { changesThread, type ChangedMessage } from "./board-channel";

const GROUP = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const nudge = (extra: Partial<ChangedMessage> = {}): ChangedMessage => ({
  v: 1,
  type: "comments_changed",
  puzzleDate: "2026-10-22",
  ...extra,
});

describe("changesThread", () => {
  it("reloads the feed for the friends thread's nudges and every group's", () => {
    expect(changesThread(nudge(), "feed")).toBe(true);
    expect(changesThread(nudge({ groupId: GROUP }), "feed")).toBe(true);
    expect(changesThread(nudge({ groupId: OTHER }), "feed")).toBe(true);
  });

  it("reloads a group's thread for its own nudges only, not the friends thread's or another group's", () => {
    expect(changesThread(nudge({ groupId: GROUP }), { group: GROUP })).toBe(true);
    expect(changesThread(nudge(), { group: GROUP })).toBe(false);
    expect(changesThread(nudge({ groupId: OTHER }), { group: GROUP })).toBe(false);
  });

  it("leaves both alone for reactions on runs", () => {
    expect(changesThread(nudge({ type: "run_reactions_changed" }), "feed")).toBe(false);
    expect(changesThread(nudge({ type: "run_reactions_changed" }), { group: GROUP })).toBe(false);
  });

  it("reloads both for a payload version it doesn't know", () => {
    expect(changesThread(nudge({ v: 2, type: "run_reactions_changed" }), "feed")).toBe(true);
    expect(changesThread(nudge({ v: 2 }), { group: GROUP })).toBe(true);
  });
});
