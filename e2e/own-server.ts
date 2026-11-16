// Playwright's global setup, run after its web server step: a dev server it reused must be this slot's own, never
// another folder's (twice, on 2026-11-07 and 2026-11-08, a run tested RIFF-m16's server; docs/milestones/PROCESS-parallel-sessions.md).
import { currentSlot, heldBySlot, portHolder } from "../scripts/slot.ts";

export default function ownServer(): void {
  // CI never reuses a server (playwright.config.ts: reuseExistingServer is off there), so Playwright refuses a held port
  // itself and the server is always its own. The check also failed on CI's first run, finding no listener on the
  // port (PR #227); on Linux and the Mac it is unverified (ROADMAP, Next revision).
  if (process.env.CI) return;
  const slot = currentSlot();
  const holder = portHolder(slot.devPort);
  if (!holder) throw new Error(`nothing listens on slot ${slot.number}'s port ${slot.devPort}`);
  if (!heldBySlot(holder, slot)) {
    throw new Error(`port ${slot.devPort} is held by process ${holder.pid}, not by slot ${slot.number} (${slot.dir}): ${holder.command}`);
  }
}
