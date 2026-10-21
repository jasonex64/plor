import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { checkStatus } from "./status.ts";

// A real HTTP server per case: the status script's whole job is talking HTTP, so nothing is mocked.
let server: Server | undefined;

async function serve(status: number, body: string): Promise<string> {
  server = createServer((_req, res) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(body);
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  if (server) await new Promise((resolve) => server!.close(resolve));
  server = undefined;
});

describe("checkStatus", () => {
  it("reports up when health returns ok with a protocol version", async () => {
    const url = await serve(200, JSON.stringify({ ok: true, protocol: 1 }));
    expect(await checkStatus(url)).toEqual({ ok: true, protocol: 1 });
  });

  it("reports down on a non-200 response", async () => {
    const url = await serve(500, "{}");
    expect(await checkStatus(url)).toMatchObject({ ok: false, reason: expect.stringContaining("HTTP 500") });
  });

  it("reports down when health says not ok", async () => {
    const url = await serve(200, JSON.stringify({ ok: false, protocol: 1 }));
    expect(await checkStatus(url)).toMatchObject({ ok: false, reason: expect.stringContaining("not ok") });
  });

  it("reports down when the body is not JSON", async () => {
    const url = await serve(200, "<html>maintenance</html>");
    expect(await checkStatus(url)).toMatchObject({ ok: false, reason: expect.stringContaining("not JSON") });
  });

  it("reports down when the server is unreachable", async () => {
    const url = await serve(200, "{}");
    await new Promise((resolve) => server!.close(resolve));
    server = undefined;
    expect(await checkStatus(url)).toMatchObject({ ok: false, reason: expect.stringContaining("unreachable") });
  });
});
