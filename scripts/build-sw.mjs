import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export async function buildServiceWorker(directory) {
  const root = resolve(directory);
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const paths = [];
    for (const entry of entries) {
      const path = resolve(dir, entry.name);
      if (entry.isSymbolicLink())
        throw new Error("Symlinks are not allowed in the static bundle");
      if (entry.isDirectory()) paths.push(...(await walk(path)));
      else if (entry.isFile() && relative(root, path) !== "sw.js")
        paths.push(path);
    }
    return paths;
  }
  const files = (await walk(root)).sort();
  if (!files.includes(resolve(root, "index.html")))
    throw new Error("Build index.html before generating the service worker");
  const hash = createHash("sha256");
  for (const path of files)
    hash
      .update(relative(root, path))
      .update("\0")
      .update(await readFile(path))
      .update("\0");
  const version = hash.digest("hex").slice(0, 24);
  const assets = files.map(
    (path) =>
      "/" + relative(root, path).split(sep).map(encodeURIComponent).join("/"),
  );
  const source = `/* Generated from the complete local static bundle. */
const CACHE = 'recruitdesk-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  // No skipWaiting: existing tabs keep the version they opened.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new Request(path, { cache: 'reload', credentials: 'same-origin' })))));
});
self.addEventListener('activate', event => {
  // Keep old caches: another tab may still require its previous bundle.
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') {
    event.respondWith(Promise.resolve(Response.error()));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const asset = await cache.match(url.pathname);
    if (asset) return asset;
    if (request.mode === 'navigate' && !url.pathname.split('/').pop().includes('.')) {
      return (await cache.match('/index.html')) || Response.error();
    }
    return new Response('Not available offline', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
`;
  await writeFile(resolve(root, "sw.js"), source);
  return { version, assets, source };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await buildServiceWorker(
    resolve(fileURLToPath(new URL("../dist/", import.meta.url))),
  );
  console.log(
    `Offline bundle: ${result.assets.length} local assets, version ${result.version}`,
  );
}
