import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSiteBase, heroFile, sourceFile } from "./publish-lab.mjs";

const output = fileURLToPath(new URL("../.vitepress/dist/", import.meta.url));
const base = getSiteBase(process.env.PAGES_BASE_PATH);
const [home, workshop, notFound] = await Promise.all(
  ["index.html", "workshop.html", "404.html"].map((file) => readFile(path.join(output, file), "utf8")),
);
const files = await readdir(output, { recursive: true });
assert.deepEqual(
  files.filter((file) => file.endsWith(".html")).sort(),
  ["404.html", "index.html", "workshop.html"],
  "Only the landing page, Lab01 workshop, and standard 404 page may be published.",
);
for (const html of [home, workshop, notFound]) {
  assert.doesNotMatch(html, /Lab00\.md|@lab\.|\+\+\+|Win11-Pro-Base|WWLM365E7/);
  assert.match(html.match(/<script\b[^>]*>/)?.[0] ?? "", /id="workshop-theme"/);
}
assert.match(home, /Start the workshop/);
assert.ok(home.includes(`href="${base}workshop"`), "The workshop link must use the deployment base path.");
assert.ok(home.includes(`src="${base}copilot.png"`), "The hero image must use the deployment base path.");
assert.doesNotMatch(home, /id="step-1-/);
assert.deepEqual(await readFile(path.join(output, "copilot.png")), await readFile(heroFile));

const source = await readFile(sourceFile, "utf8");
for (const heading of source.matchAll(/^## (Step \d+): (.+)$/gm)) {
  const anchor = `${heading[1]} ${heading[2]}`
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
  assert.ok(workshop.includes(`id="${anchor}"`), `Missing workshop section: ${heading[0]}`);
}

const screenshots = [...workshop.matchAll(/<img\b[^>]*src="([^"]+)"/g)];
assert.ok(screenshots.length > 0, "The guide must include its screenshots.");
const images = [...home.matchAll(/<img\b[^>]*src="([^"]+)"/g), ...screenshots];
const assets = [home, workshop, notFound].flatMap((html) =>
  [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)],
);
for (const [, source] of [...images, ...assets]) {
  assert.ok(source.startsWith(base), `Asset URL must use the deployment base path: ${source}`);
  await access(path.join(output, ...decodeURIComponent(source.slice(base.length)).split("/")));
}
console.log(`Verified the landing page, Lab01 workshop, Copilot hero, theme bootstrap, ${images.length} image references, and script/style asset paths.`);
