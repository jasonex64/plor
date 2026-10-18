import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RIFF",
  description: "A daily social word game.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
