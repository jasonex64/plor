// Only the newest load's answer reaches the page (docs/milestones/M11-home-screen.md, H6). Each load is a promise the
// test settles by hand, in the order a slow network could.
import { describe, expect, it } from "vitest";
import { latestOnly } from "./latest";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const settled = () => new Promise((r) => setTimeout(r, 0));

describe("latestOnly", () => {
  it("drops an older load's answer that arrives after a newer one's", async () => {
    const run = latestOnly();
    const shown: string[] = [];
    const older = deferred<string>();
    const newer = deferred<string>();
    run(
      older.promise,
      (v) => shown.push(v),
      () => shown.push("error"),
    );
    run(
      newer.promise,
      (v) => shown.push(v),
      () => shown.push("error"),
    );
    newer.resolve("new");
    await settled();
    older.resolve("old");
    await settled();
    expect(shown).toEqual(["new"]);
  });

  it("drops an older load's answer that arrives first, once a newer load has started", async () => {
    const run = latestOnly();
    const shown: string[] = [];
    const older = deferred<string>();
    const newer = deferred<string>();
    run(
      older.promise,
      (v) => shown.push(v),
      () => shown.push("error"),
    );
    run(
      newer.promise,
      (v) => shown.push(v),
      () => shown.push("error"),
    );
    older.resolve("old");
    await settled();
    newer.resolve("new");
    await settled();
    expect(shown).toEqual(["new"]);
  });

  it("drops an older load's error, so it can't stay up after a newer success", async () => {
    const run = latestOnly();
    const shown: string[] = [];
    const older = deferred<string>();
    const newer = deferred<string>();
    run(
      older.promise,
      (v) => shown.push(v),
      () => shown.push("error"),
    );
    run(
      newer.promise,
      (v) => shown.push(v),
      () => shown.push("error"),
    );
    newer.resolve("new");
    older.reject(new Error("timeout"));
    await settled();
    expect(shown).toEqual(["new"]);
  });

  // A sent comment's shown copy goes when its reload's promise settles; if a newer load replaced that reload, the copy
  // must wait for the newer answer, or it vanishes until it lands (docs/milestones/M14-14b-20-comments-and-undo.md).
  it("settles an older load's promise only once the newer load's answer is handled", async () => {
    const run = latestOnly();
    const shown: string[] = [];
    const older = deferred<string>();
    const newer = deferred<string>();
    let olderDone = false;
    void run(
      older.promise,
      (v) => shown.push(v),
      () => shown.push("error"),
    ).then(() => (olderDone = true));
    void run(
      newer.promise,
      (v) => shown.push(v),
      () => shown.push("error"),
    );
    older.resolve("old");
    await settled();
    expect(olderDone).toBe(false);
    newer.resolve("new");
    await settled();
    expect([olderDone, shown]).toEqual([true, ["new"]]);
  });

  it("passes on the newest load's error", async () => {
    const run = latestOnly();
    const shown: string[] = [];
    const only = deferred<string>();
    run(
      only.promise,
      (v) => shown.push(v),
      () => shown.push("error"),
    );
    only.reject(new Error("down"));
    await settled();
    expect(shown).toEqual(["error"]);
  });
});
