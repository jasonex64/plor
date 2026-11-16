// Playwright's global setup, run after its web server step: a dev server it reused must be this slot's own, never
// another folder's (twice, on 2026-11-07 and 2026-11-08, a run tested RIFF-m16's server; docs/milestones/PROCESS-parallel-sessions.md).
import { currentSlot, heldBySlot, portHolder } from "../scripts/slot.ts";

export default function ownServer(): void {
  const slot = currentSlot();
  const holder = portHolder(slot.devPort);
  if (!holder) throw new Error(`nothing listens on slot ${slot.number}'s port ${slot.devPort}`);
  if (!heldBySlot(holder, slot)) {
    throw new Error(`port ${slot.devPort} is held by process ${holder.pid}, not by slot ${slot.number} (${slot.dir}): ${holder.command}`);
  }
}
