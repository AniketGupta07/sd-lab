import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("exports the complete interview study workspace", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>System Design Interview Lab<\/title>/i);
  assert.match(html, /Turn technical depth into interview signal\./);
  assert.match(html, /Week 01 · Foundations/);
  assert.match(html, /URL shortener/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);

  await access(new URL("../out/og.png", import.meta.url));
  await access(new URL("../out/favicon.svg", import.meta.url));
});

test("keeps personal study data local and versioned", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.match(page, /ai-system-design-study:v1/);
  assert.match(page, /window\.localStorage\.setItem/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /prefers-color-scheme: dark/);
  assert.match(layout, /NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(layout, /next\/headers|codex-preview|Starter Project/);
});
