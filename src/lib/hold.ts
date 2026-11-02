// One action held before it's sent, so the player can undo it (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b:
// design 3, P1, P2 and answers 16–19). Holding a second action sends the first at once, unless both are the same
// row's reactions, where the newer replaces the older and only the last state is sent (P2). A row's sends run one
// after another, so the server ends on the last state picked; sendNow sends everything for sign-out and says whether
// it all went (docs/milestones/M14-14b-20-comments-and-undo.md). What the toast shows is reported through show: the held action's text
// and the last failure, each null when there's none.
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
  // For sign-out (answers 7 and 10): waits for sends under way, sends what's held and what failed at the last call,
  // and says whether everything went. A held action that fails stays held, with no window, until sendNow again,
  // discard or leaving the page; a call made while one runs gets its answer.
  sendNow: () => Promise<boolean>;
  // Sign out without it: what's held is undone and what failed is dropped.
  discard: () => void;
  // A failure from outside the holder, said in the toast's alert with Close: a settings form's refusal that lands after
  // the sheet closed (docs/milestones/M14-14b-22-settings-and-invites.md, answer 3).
  fail: (message: string) => void;
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
  // Each row's last send, so its next one starts once it has answered.
  const rows = new Map<string, Promise<unknown>>();
  // Sends under way, each answering with its action if it failed, so sendNow can wait for them.
  const sending = new Set<Promise<Held | null>>();
  // Actions sendNow couldn't send, for its next call.
  let unsent: Held[] = [];
  let signingOut: Promise<boolean> | null = null;
  const report = () => show({ held: current?.action.text ?? null, error });

  function take() {
    const taken = current;
    if (taken) timers.clear(taken.timer);
    current = null;
    return taken;
  }

  function deliver(action: Held, keepalive: boolean): Promise<unknown> {
    // Leaving the page sends at once: a send waiting behind the row's earlier one never starts once the page is gone.
    if (action.key === undefined || keepalive) return action.send(keepalive);
    const sent = (rows.get(action.key) ?? Promise.resolve()).then(() => action.send(keepalive));
    // The row's next send waits for this one whatever its answer; a failure reaches the caller through sent, which
    // shows it.
    rows.set(
      action.key,
      sent.catch(() => {}),
    );
    return sent;
  }

  async function send(taken: NonNullable<typeof current>, keepalive: boolean) {
    const attempt = deliver(taken.action, keepalive).then(
      () => null,
      (err: unknown) => {
        error = `${taken.action.failed}: ${describe(err)}`;
        return taken.action;
      },
    );
    sending.add(attempt);
    const failed = await attempt;
    sending.delete(attempt);
    taken.settle(failed === null);
    if (failed) report();
  }

  function flush(keepalive: boolean) {
    const taken = take();
    if (!taken) return;
    report();
    void send(taken, keepalive);
  }

  // sendNow's one run: sends under way first, then what failed before and what's held.
  async function sendAll(): Promise<boolean> {
    const taken = take();
    if (taken) report();
    const failedOnTheWay = (await Promise.all([...sending])).filter((action): action is Held => action !== null);
    const retries = [...unsent, ...failedOnTheWay];
    unsent = [];
    for (const action of retries) {
      try {
        await deliver(action, false);
      } catch (err) {
        error = `${action.failed}: ${describe(err)}`;
        unsent.push(action);
      }
    }
    let ok = unsent.length === 0;
    if (taken) {
      try {
        await deliver(taken.action, false);
        taken.settle(true);
      } catch (err) {
        error = `${taken.action.failed}: ${describe(err)}`;
        current = { ...taken, timer: null };
        ok = false;
      }
    }
    report();
    return ok;
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
    sendNow() {
      signingOut ??= sendAll().finally(() => (signingOut = null));
      return signingOut;
    },
    discard() {
      take()?.settle(false);
      unsent = [];
      report();
    },
    fail(message) {
      error = message;
      report();
    },
    dismiss() {
      error = null;
      report();
    },
  };
}
