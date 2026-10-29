// One action held before it's sent, so the player can undo it (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b:
// design 3, P1, P2 and answers 16–19). Holding a second action sends the first at once, unless both are the same
// row's reactions, where the newer replaces the older and only the last state is sent (P2). What the toast shows is
// reported through show: the held action's text and the last failure, each null when there's none.
export type Held = {
  // Actions with the same key replace each other (one reaction row); without one, an action never replaces another.
  key?: string;
  text: string;
  // What the toast says if the send fails, before the error itself.
  failed: string;
  send: (keepalive: boolean) => Promise<unknown>;
};

export type Toast = { held: string | null; error: string | null };

export type Holder = {
  // Settles true once the action is sent, false when it's undone, replaced or failed.
  hold: (action: Held) => Promise<boolean>;
  undo: () => void;
  // Sends the held action now: another action took the toast, or the player is leaving the page (P1).
  flush: (keepalive: boolean) => void;
  dismiss: () => void;
};

type Timers = { set: (run: () => void, ms: number) => unknown; clear: (timer: unknown) => void };

export function createHolder(
  ms: number,
  show: (toast: Toast) => void,
  describe: (err: unknown) => string,
  timers: Timers = { set: (run, ms) => setTimeout(run, ms), clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>) },
): Holder {
  let current: { action: Held; settle: (sent: boolean) => void; timer: unknown } | null = null;
  let error: string | null = null;
  const report = () => show({ held: current?.action.text ?? null, error });

  function take() {
    const taken = current;
    if (taken) timers.clear(taken.timer);
    current = null;
    return taken;
  }

  async function send(taken: NonNullable<typeof current>, keepalive: boolean) {
    try {
      await taken.action.send(keepalive);
      taken.settle(true);
    } catch (err) {
      error = `${taken.action.failed}: ${describe(err)}`;
      taken.settle(false);
      report();
    }
  }

  function flush(keepalive: boolean) {
    const taken = take();
    if (!taken) return;
    report();
    void send(taken, keepalive);
  }

  return {
    hold(action) {
      const before = take();
      if (before && before.action.key !== undefined && before.action.key === action.key) before.settle(false);
      else if (before) void send(before, false);
      error = null;
      return new Promise<boolean>((settle) => {
        current = { action, settle, timer: timers.set(() => flush(false), ms) };
        report();
      });
    },
    undo() {
      take()?.settle(false);
      report();
    },
    flush,
    dismiss() {
      error = null;
      report();
    },
  };
}
