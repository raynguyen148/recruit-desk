import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { get } from "node:http";
// Build and serving scripts are deliberately dependency-free JavaScript.
// @ts-expect-error JavaScript script has no declaration file
import { buildServiceWorker } from "../scripts/build-sw.mjs";
// @ts-expect-error JavaScript script has no declaration file
import { createStaticServer } from "../scripts/serve.mjs";
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "recruitdesk-offline-"));
  directories.push(dir);
  await writeFile(join(dir, "index.html"), "<html>offline app</html>");
  await mkdir(join(dir, "assets"));
  await writeFile(join(dir, "assets", "app.js"), "const app = true;");
  return dir;
}
describe("offline bundle", () => {
  it("versions all local bytes deterministically and excludes its generated worker", async () => {
    const dir = await fixture();
    const first = await buildServiceWorker(dir);
    expect((await buildServiceWorker(dir)).version).toBe(first.version);
    expect(first.assets).toEqual(["/assets/app.js", "/index.html"]);
    await writeFile(join(dir, "assets", "app.js"), "const app = false;");
    expect((await buildServiceWorker(dir)).version).not.toBe(first.version);
  });
  it("blocks external URLs and mutations; serves cached navigation without any runtime network", async () => {
    const { source } = await buildServiceWorker(await fixture());
    const handlers: Record<string, (event: any) => void> = {};
    const cached = new Map([
      ["/index.html", new Response("offline app")],
      ["/assets/app.js", new Response("app")],
    ]);
    runInNewContext(source, {
      self: {
        location: { origin: "http://127.0.0.1:4173" },
        clients: { claim: async () => {} },
        addEventListener: (name: string, fn: any) => {
          handlers[name] = fn;
        },
      },
      caches: {
        open: async () => ({ match: async (key: string) => cached.get(key) }),
      },
      URL,
      Response,
      fetch: () => {
        throw new Error("Runtime network must never run");
      },
    });
    async function dispatch(url: string, method = "GET", mode = "navigate") {
      let pending!: Promise<Response>;
      handlers.fetch({
        request: { url, method, mode },
        respondWith: (p: Promise<Response>) => {
          pending = p;
        },
      });
      return pending;
    }
    expect((await dispatch("https://example.com/")).type).toBe("error");
    expect((await dispatch("http://127.0.0.1:4173/", "POST")).type).toBe(
      "error",
    );
    expect(
      await (await dispatch("http://127.0.0.1:4173/candidates")).text(),
    ).toBe("offline app");
    expect((await dispatch("http://127.0.0.1:4173/missing.js")).status).toBe(
      404,
    );
    expect(source).not.toContain("self.skipWaiting(");
    expect(source).not.toContain("caches.delete(");
  });
  it("serves only local static files with page network disabled and safe route fallback", async () => {
    const dir = await fixture();
    await buildServiceWorker(dir);
    await symlink("/etc/hosts", join(dir, "escape.txt"));
    const server = createStaticServer(dir);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      const page = await fetch(base, { headers: { accept: "text/html" } });
      expect(page.status).toBe(200);
      expect(page.headers.get("content-security-policy")).toContain(
        "connect-src 'none'",
      );
      const sw = await fetch(base + "/sw.js");
      expect(sw.headers.get("content-security-policy")).toContain(
        "connect-src 'self'",
      );
      expect(
        (await fetch(base + "/jobs/123", { headers: { accept: "text/html" } }))
          .status,
      ).toBe(200);
      expect(
        (
          await fetch(base + "/missing.js", {
            headers: { accept: "text/html" },
          })
        ).status,
      ).toBe(404);
      expect((await fetch(base + "/escape.txt")).status).toBe(403);
      expect((await fetch(base + "/.env")).status).toBe(403);
      expect((await fetch(base + "/%2e%2e%2fetc/passwd")).status).toBe(403);
      expect((await fetch(base + "/%ZZ")).status).toBe(400);
      expect((await fetch(base, { method: "POST" })).status).toBe(405);
      const foreignHostStatus = await new Promise<number | undefined>(
        (resolve, reject) => {
          get(base, { headers: { host: "external.example" } }, (response) => {
            response.resume();
            resolve(response.statusCode);
          }).on("error", reject);
        },
      );
      expect(foreignHostStatus).toBe(403);
    } finally {
      await new Promise<void>((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      });
    }
  });
});
