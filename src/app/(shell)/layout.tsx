import { Shell } from "../shell-page";

// Every player page sits in the shell (src/app/shell-page.tsx).
export default function ShellLayout({ children }: LayoutProps<"/">) {
  return <Shell>{children}</Shell>;
}
