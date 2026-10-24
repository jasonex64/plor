// Thing IDs (docs/milestones/M13-13a-the-base.md): an imported thing's permanent ID is computed from its source entry,
// so the same import gives the same IDs on every database (human, 2026-10-24: "Same everywhere (Recommended)"; M13 D3).
import { createHash } from "node:crypto";

// A name-based UUID (version 5: SHA-1 of a namespace and a name, RFC 4122 §4.3).
export function uuidV5(namespace: string, name: string): string {
  const hash = createHash("sha1").update(Buffer.from(namespace.replaceAll("-", ""), "hex")).update(name, "utf8").digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// RFC 4122's URL namespace, with each thing named by a URL of its source entry under plor.app.
const URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
export const thingId = (source: string, id: string) => uuidV5(URL_NAMESPACE, `https://plor.app/thing/${source}/${encodeURIComponent(id)}`);
