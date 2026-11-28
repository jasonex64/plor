import type { ReactNode } from "react";
import admin from "./admin.module.css";

// An admin page's table: its columns head it, and label the cells on phones (docs/milestones/M14-14b-2c-review-items.md, answer 17).
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className={admin.table} role="table">
      <thead role="rowgroup" className="sr-only-on-phones">
        <tr role="row">
          {head.map((h) => (
            <th role="columnheader" key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">{children}</tbody>
    </table>
  );
}
