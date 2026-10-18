// Runs once when a server instance starts, before it serves requests
// (node_modules/next/dist/docs/01-app/02-guides/instrumentation.md). A bad env fails the boot loudly.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { readServerEnv } = await import("@/config/env");
    readServerEnv();
  }
}
