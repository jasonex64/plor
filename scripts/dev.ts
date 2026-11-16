// `npm run dev`: next dev on this slot's port (docs/milestones/PROCESS-parallel-sessions.md). It refuses outside a slot,
// and when the port is taken, naming the process that holds it, so no session waits on another's server.
import { spawn } from "node:child_process";
import { currentSlot, heldBySlot, portFree, portHolder } from "./slot.ts";

const slot = currentSlot();
if (!(await portFree(slot.devPort))) {
  const holder = portHolder(slot.devPort);
  const whose = holder && heldBySlot(holder, slot) ? "this slot's own server, already running" : "not this slot";
  console.error(`REFUSED: slot ${slot.number}'s port ${slot.devPort} is held by ${holder ? `process ${holder.pid}: ${holder.command}` : "a process the system didn't name"} (${whose}).`);
  process.exit(1);
}
console.log(`slot ${slot.number}: next dev on port ${slot.devPort}`);
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(slot.devPort)], { stdio: "inherit" });
next.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
