import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PAGE_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'; worker-src 'self'; manifest-src 'self'";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
export function createStaticServer(directory) {
  const root = resolve(directory);
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", PAGE_CSP);
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    res.setHeader("Cache-Control", "no-cache");
    const fail = (status) => {
      res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(String(status));
    };
    if (!["GET", "HEAD"].includes(req.method)) return fail(405);
    // Reject non-local Host values, including DNS rebinding requests.
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || ""))
      return fail(403);
    try {
      const rawPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (
        !rawPath.startsWith("/") ||
        rawPath.includes("\\") ||
        rawPath.includes("\0") ||
        rawPath.split("/").some((part) => part === ".." || part.startsWith("."))
      )
        return fail(403);
      let path = resolve(root, "." + rawPath);
      if (path !== root && !path.startsWith(root + sep)) return fail(403);
      try {
        if ((await stat(path)).isDirectory())
          path = resolve(path, "index.html");
      } catch {
        if (
          !extname(rawPath) &&
          (req.headers.accept || "").includes("text/html")
        )
          path = resolve(root, "index.html");
        else return fail(404);
      }
      const canonical = await realpath(path);
      const canonicalRoot = await realpath(root);
      if (!canonical.startsWith(canonicalRoot + sep)) return fail(403);
      const data = await readFile(canonical);
      if (path === resolve(root, "sw.js")) {
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'none'; script-src 'self'; connect-src 'self'",
        );
        res.setHeader("Service-Worker-Allowed", "/");
      }
      res.setHeader(
        "Content-Type",
        MIME[extname(path)] || "application/octet-stream",
      );
      res.setHeader("Content-Length", data.length);
      res.writeHead(200);
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (error) {
      fail(error instanceof URIError ? 400 : 404);
    }
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL("../dist/", import.meta.url));
  try {
    await stat(resolve(root, "index.html"));
  } catch {
    console.error("Build the app first: npm run build");
    process.exit(1);
  }
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be an integer between 1 and 65535");
  const server = createStaticServer(root);
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(
      `Recruitdesk: http://127.0.0.1:${port} — keep this origin for your saved data`,
    ),
  );
}
