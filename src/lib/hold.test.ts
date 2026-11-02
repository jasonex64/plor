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

  // docs/milestones/M14-14b-20-comments-and-undo.md: one row's sends run one after another, so the server ends on the
  // last state picked; and sign-out sends what's held first, keeping it held if that fails.
  it("starts a row's second send only once its first has answered", async () => {
    const { holder, end } = setup();
    const started: string[] = [];
    let answerFirst!: () => void;
    const slow: Held = { key: "row 1", text: "😂 done", failed: "😂 failed", send: () => (started.push("😂"), new Promise<void>((r) => (answerFirst = r))) };
    const fast: Held = { key: "row 1", text: "❤️ done", failed: "❤️ failed", send: async () => void started.push("❤️") };
    const first = holder.hold(slow);
    end();
    const second = holder.hold(fast);
    end();
    await Promise.resolve();
    expect(started).toEqual(["😂"]);
    answerFirst();
    expect([await first, await second]).toEqual([true, true]);
    expect(started).toEqual(["😂", "❤️"]);
  });

  it("sends what's held at once for sign-out, and says whether it went", async () => {
    const { holder, action, sent, last } = setup();
    expect(await holder.sendNow()).toBe(true);
    const result = holder.hold(action("post"));
    expect(await holder.sendNow()).toBe(true);
    expect(await result).toBe(true);
    expect(sent).toEqual([{ name: "post", keepalive: false }]);
    expect(last()).toEqual({ held: null, error: null });
  });

  it("keeps a held action held when sign-out's send fails, for Try again or Undo", async () => {
    const { holder, action, last } = setup();
    const result = holder.hold(action("post", undefined, true));
    expect(await holder.sendNow()).toBe(false);
    expect(last()).toEqual({ held: "post done", error: "post failed: Error: offline" });
    holder.undo();
    expect(await result).toBe(false);
    expect(last()).toEqual({ held: null, error: "post failed: Error: offline" });
  });

  // The 14b-20 review's sign-out races: nothing is ever sent after sign-out, or lost while the player chooses.
  it("waits for a send already under way before answering", async () => {
    const { holder, end } = setup();
    let answer!: () => void;
    holder.hold({ text: "post done", failed: "post failed", send: () => new Promise<void>((r) => (answer = r)) });
    end();
    let done = false;
    const result = holder.sendNow().then((ok) => ((done = true), ok));
    await Promise.resolve();
    expect(done).toBe(false);
    answer();
    expect(await result).toBe(true);
  });

  it("says a send under way failed, and sends it again on the next call", async () => {
    const { holder } = setup();
    let online = false;
    let tries = 0;
    holder.hold({
      text: "post done",
      failed: "post failed",
      send: async () => {
        tries++;
        if (!online) throw new Error("offline");
      },
    });
    // The post is sent, and fails, when another action takes the toast; sendNow waits for it and tries it again.
    holder.hold({ text: "other done", failed: "other failed", send: async () => {} });
    expect(await holder.sendNow()).toBe(false);
    expect(tries).toBe(2);
    online = true;
    expect(await holder.sendNow()).toBe(true);
    expect(tries).toBe(3);
  });

  it("keeps a held action held with no window while the player chooses, and Try again sends it", async () => {
    const { holder, end, last } = setup();
    let online = false;
    const result = holder.hold({
      text: "post done",
      failed: "post failed",
      send: async () => {
        if (!online) throw new Error("offline");
      },
    });
    expect(await holder.sendNow()).toBe(false);
    end();
    expect(last()).toEqual({ held: "post done", error: "post failed: Error: offline" });
    online = true;
    expect(await holder.sendNow()).toBe(true);
    expect(await result).toBe(true);
  });

  it("answers a second call made while the first runs with the first's answer, sending once", async () => {
    const { holder, sent, action } = setup();
    holder.hold(action("post"));
    const [first, second] = [holder.sendNow(), holder.sendNow()];
    expect([await first, await second]).toEqual([true, true]);
    expect(sent).toEqual([{ name: "post", keepalive: false }]);
  });

  it("sends at once when the page is left, even behind the row's send still under way", async () => {
    const { holder, end } = setup();
    const started: string[] = [];
    holder.hold({ key: "row 1", text: "😂 done", failed: "😂 failed", send: () => (started.push("😂"), new Promise<void>(() => {})) });
    end();
    holder.hold({ key: "row 1", text: "❤️ done", failed: "❤️ failed", send: async () => void started.push("❤️") });
    holder.flush(true);
    await Promise.resolve();
    // ❤️ started though 😂 never answered.
    expect(started.toSorted()).toEqual(["❤️", "😂"].toSorted());
  });

  it("discards what's held and what failed, for Sign out without it", async () => {
    const { holder, action, last } = setup();
    const result = holder.hold(action("post", undefined, true));
    expect(await holder.sendNow()).toBe(false);
    holder.discard();
    expect(await result).toBe(false);
    expect(last()?.held).toBeNull();
    expect(await holder.sendNow()).toBe(true);
  });
});
