// The held action behind Undo (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b; criterion 3's unit test): sent
// when the window ends, never when undone, replaced by the same row's next reaction (P2), sent at once when another
// action takes the toast (answer 17) or the page is left (P1), and a failed send reported.
import { describe, expect, it } from "vitest";
import { createHolder, type Held, type Toast } from "./hold";

function setup() {
  let due: (() => void) | null = null;
  const toasts: Toast[] = [];
  const sent: { name: string; keepalive: boolean }[] = [];
  const holder = createHolder(5000, (t) => toasts.push(t), (err) => String(err), {
    set: (run) => (due = run),
    clear: () => (due = null),
  });
  const action = (name: string, key?: string, fail = false): Held => ({
    key,
    text: `${name} done`,
    failed: `${name} failed`,
    send: async (keepalive) => {
      sent.push({ name, keepalive });
      if (fail) throw new Error("offline");
    },
  });
  return { holder, action, sent, toasts, end: () => due?.(), last: () => toasts.at(-1) };
}

describe("createHolder", () => {
  it("shows the action, and sends it once when the window ends", async () => {
    const { holder, action, sent, end, last } = setup();
    const result = holder.hold(action("post"));
    expect(last()).toEqual({ held: "post done", error: null });
    expect(sent).toEqual([]);
    end();
    expect(await result).toBe(true);
    expect(sent).toEqual([{ name: "post", keepalive: false }]);
    expect(last()).toEqual({ held: null, error: null });
  });

  it("sends nothing when undone", async () => {
    const { holder, action, sent, end, last } = setup();
    const result = holder.hold(action("post"));
    holder.undo();
    end();
    expect(await result).toBe(false);
    expect(sent).toEqual([]);
    expect(last()).toEqual({ held: null, error: null });
  });

  it("replaces the same row's reaction, sending only the last", async () => {
    const { holder, action, sent, end, last } = setup();
    const first = holder.hold(action("😂", "row 1"));
    const second = holder.hold(action("❤️", "row 1"));
    expect(await first).toBe(false);
    expect(last()).toEqual({ held: "❤️ done", error: null });
    end();
    expect(await second).toBe(true);
    expect(sent).toEqual([{ name: "❤️", keepalive: false }]);
  });

  it("sends the held action at once when another takes the toast", async () => {
    const { holder, action, sent, last } = setup();
    const first = holder.hold(action("😂", "row 1"));
    holder.hold(action("post"));
    expect(await first).toBe(true);
    expect(sent).toEqual([{ name: "😂", keepalive: false }]);
    expect(last()).toEqual({ held: "post done", error: null });
  });

  it("sends at once with keepalive when the page is left", async () => {
    const { holder, action, sent, end } = setup();
    const result = holder.hold(action("delete"));
    holder.flush(true);
    end();
    expect(await result).toBe(true);
    expect(sent).toEqual([{ name: "delete", keepalive: true }]);
  });

  it("reports a failed send until dismissed or the next action", async () => {
    const { holder, action, end, last } = setup();
    const result = holder.hold(action("post", undefined, true));
    end();
    expect(await result).toBe(false);
    expect(last()).toEqual({ held: null, error: "post failed: Error: offline" });
    holder.dismiss();
    expect(last()).toEqual({ held: null, error: null });
    holder.hold(action("post", undefined, true));
    end();
    await Promise.resolve();
    holder.hold(action("again"));
    expect(last()).toEqual({ held: "again done", error: null });
  });
});
