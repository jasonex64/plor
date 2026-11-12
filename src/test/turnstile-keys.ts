// Cloudflare's published always-pass Turnstile test keys (developers.cloudflare.com/turnstile/troubleshooting/testing/): public
// values, which readServerEnv needs to boot (M18 18c). vitest.config.ts gives them to every unit test, and local-stack.ts
// re-exports them for the database tests.
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_PASS_SECRET = "1x0000000000000000000000000000000AA";
// "A successful validation with a test secret key always returns example.com as the hostname" (same page).
export const TURNSTILE_TEST_HOSTNAME = "example.com";
