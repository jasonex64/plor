// Which nudges reload which thread (docs/milestones/M10-groups.md, 10d; G5): the home page's friends thread and a
// group's page share changesThread, so a group's nudge must reach only that group's page.
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
  it("reloads the friends thread for a friends nudge only, not a group's", () => {
    expect(changesThread(nudge())).toBe(true);
    expect(changesThread(nudge({ groupId: GROUP }))).toBe(false);
  });

  it("reloads a group's thread for its own nudges only, not the friends thread's or another group's", () => {
    expect(changesThread(nudge({ groupId: GROUP }), GROUP)).toBe(true);
    expect(changesThread(nudge(), GROUP)).toBe(false);
    expect(changesThread(nudge({ groupId: OTHER }), GROUP)).toBe(false);
  });

  it("leaves both threads alone for reactions on runs", () => {
    expect(changesThread(nudge({ type: "run_reactions_changed" }))).toBe(false);
    expect(changesThread(nudge({ type: "run_reactions_changed" }), GROUP)).toBe(false);
  });

  it("reloads every thread for a payload version it doesn't know", () => {
    expect(changesThread(nudge({ v: 2, groupId: GROUP }))).toBe(true);
    expect(changesThread(nudge({ v: 2 }), GROUP)).toBe(true);
  });
});
