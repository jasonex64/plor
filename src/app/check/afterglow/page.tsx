import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Scripted } from "./scripted";

export const metadata: Metadata = { title: "Afterglow check" };

// The page Afterglow's check plays (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-2, answers 44 and 49): the
// real scene, fed by scripted replies, with no database. Only `next dev` serves it: Next sets NODE_ENV to "development"
// there and to "production" for every other command (Next.js, environment variables guide), so the live site answers
// 404 and no player reaches it.
export default function AfterglowCheck() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Scripted />;
}
