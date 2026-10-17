import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const root = fileURLToPath(new URL("../", import.meta.url));
const workspace = await mkdtemp(join(tmpdir(), "recruitdesk-hmr-"));
let child;
let browser;
let serverLog = "";
try {
  // All writes under test belong to this disposable copy, never the working source.
  for (const path of [
    "src",
    "public",
    "index.html",
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "tailwind.config.js",
    "postcss.config.js",
  ])
    await cp(join(root, path), join(workspace, path), { recursive: true });
  await mkdir(join(workspace, "node_modules"));
  for (const entry of await readdir(join(root, "node_modules"), {
    withFileTypes: true,
  })) {
    if (entry.name.startsWith(".vite")) continue;
    // Font URLs are browser-served assets: keep them inside Vite's filesystem boundary.
    if (entry.name === "@fontsource-variable") {
      await cp(
        join(root, "node_modules", entry.name),
        join(workspace, "node_modules", entry.name),
        { recursive: true },
      );
      continue;
    }
    await symlink(
      join(root, "node_modules", entry.name),
      join(workspace, "node_modules", entry.name),
      entry.isDirectory() ? "dir" : "file",
    );
  }
  // Vite and its dependency cache stay isolated; reuse only installed packages.
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const npm = process.env.npm_execpath;
  assert(npm, "Run this check with npm run test:hmr");
  child = spawn(
    process.execPath,
    [npm, "run", "dev", "--", "--port", String(port)],
    {
      cwd: workspace,
      env: { ...process.env, BROWSER: "none" },
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (data) => {
    serverLog += data;
  });
  child.stderr.on("data", (data) => {
    serverLog += data;
  });
  const deadline = Date.now() + 30_000;
  let html;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited:\n${serverLog}`);
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        html = await response.text();
        break;
      }
    } catch {
      /* Wait for this check's server to start. */
    }
    await delay(100);
  }
  assert(html?.includes("/@vite/client"), `Vite did not start:\n${serverLog}`);
  const csp = html.match(
    /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
  )?.[1];
  assert(csp?.includes("script-src 'self' 'unsafe-inline'"));
  assert(
    csp.includes(
      `connect-src 'self' ws://127.0.0.1:${port} ws://localhost:${port};`,
    ),
  );
  assert(csp.includes("worker-src 'none'"));
  assert(!csp.includes("unsafe-eval"));

  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  browser = await chromium.launch(
    existsSync(chrome) ? { executablePath: chrome } : {},
  );
  const page = await browser.newPage();
  const errors = [];
  const sockets = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error")
      errors.push(`${message.text()} (${message.location().url})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  page.on("websocket", (socket) => sockets.push(socket.url()));
  await page.goto(base);
  await page
    .getByRole("button", { name: "Explore sample workspace", exact: true })
    .click();
  const search = page.getByRole("textbox", { name: /^Search profiles/ });
  await search.fill("Alex");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  const sentinel = await page.evaluate(() => {
    window.__hmrCheck = crypto.randomUUID();
    return window.__hmrCheck;
  });
  const cssPath = join(workspace, "src/styles.css");
  const css = await readFile(cssPath, "utf8");
  const heading = page.locator(".page-heading h1");
  const originalSpacing = await heading.evaluate(
    (el) => getComputedStyle(el).letterSpacing,
  );
  await writeFile(
    cssPath,
    `${css}\n/* Isolated HMR probe */\n.page-heading h1 { letter-spacing: 1.234px; }\n`,
  );
  await expect(heading).toHaveCSS("letter-spacing", "1.234px");
  await writeFile(cssPath, css);
  await expect(heading).toHaveCSS("letter-spacing", originalSpacing);

  const componentPath = join(workspace, "src/pages/candidates.tsx");
  const component = await readFile(componentPath, "utf8");
  const original = "Your talent network, thoughtfully organized.";
  const updated = "Your talent network, updated through HMR.";
  assert(
    component.includes(original),
    "Update the HMR probe for the current candidate description",
  );
  await writeFile(componentPath, component.replace(original, updated));
  await expect(page.getByText(updated, { exact: true })).toBeVisible();
  await expect(search).toHaveValue("Alex");
  await writeFile(componentPath, component);
  await expect(page.getByText(original, { exact: true })).toBeVisible();
  await expect(search).toHaveValue("Alex");
  assert.equal(
    await page.evaluate(() => window.__hmrCheck),
    sentinel,
    "HMR must not reload the document",
  );
  assert(
    sockets.some((url) => new URL(url).origin === `ws://127.0.0.1:${port}`),
    "Expected a local HMR socket",
  );
  assert.equal(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
    0,
  );
  assert.deepEqual(errors, [], "Unexpected browser/CSP errors");
  console.log(
    "PASS: npm run dev serves Vite; CSS and React saves update without reloading or losing search state; local HMR CSP works; no service worker or browser errors.",
  );
} finally {
  await browser?.close();
  if (child && child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
    await exited;
  }
  await rm(workspace, { recursive: true, force: true });
}
