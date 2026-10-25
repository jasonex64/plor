"use client";

// The link to the answer audit on the admin pages, with how many texts wait for a decision (human, 2026-10-24: "Count
// on admin page (Recommended)"; docs/milestones/M13-13b-learning-from-misses.md).
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { errorText } from "../messages";

export function AuditLink() {
  const [count, setCount] = useState<string>("");
  useEffect(() => {
    api<{ open: number }>("/api/admin/audit?count", { method: "GET" }).then(
      (r) => setCount(r.open ? ` (${r.open} to review)` : ""),
      (err) => setCount(` (count failed: ${errorText(err)})`),
    );
  }, []);
  return <Link href="/admin/audit">Answer audit{count}</Link>;
}
