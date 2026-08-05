import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const contentPaths = ["foundations.ts", "classic.ts", "ml.ts", "llm.ts"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderedHtml(html) {
  return html.replaceAll("<!-- -->", "");
}

async function readTextTree(directoryUrl, extensions) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (entry.isDirectory()) return readTextTree(entryUrl, extensions);
    if (!extensions.some((extension) => entry.name.endsWith(extension))) return [];
    return [await readFile(entryUrl, "utf8")];
  }));
  return files.flat();
}

test("exports the complete interview study workspace", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  const visibleHtml = renderedHtml(html);

  assert.match(visibleHtml, /<title>System Design Interview Lab<\/title>/i);
  assert.match(visibleHtml, /Turn technical depth into interview signal\./);
  assert.match(visibleHtml, /Week\s*01\s*·\s*Tier\s*0/);
  assert.match(visibleHtml, /URL shortener/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);

  await access(new URL("../out/og.png", import.meta.url));
  await access(new URL("../out/favicon.svg", import.meta.url));
});

test("uses the exact build base path for exported Next assets", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").at(-1);
  const isPagesBuild = process.env.GITHUB_ACTIONS === "true" && Boolean(repositoryName);
  const expectedBasePath = isPagesBuild ? `/${repositoryName}` : "";
  const expectedAssetPrefix = `${expectedBasePath}/_next/static/`;
  const assetUrls = Array.from(
    html.matchAll(/\b(?:href|src)="([^"]*\/_next\/static\/[^"]+)"/g),
    (match) => match[1],
  );

  assert.ok(assetUrls.length >= 2, "expected exported stylesheet and script asset URLs");
  assert.deepEqual(
    assetUrls.filter((url) => !url.startsWith(expectedAssetPrefix)),
    [],
    `every Next asset must start with ${expectedAssetPrefix}`,
  );

  if (isPagesBuild) {
    const pagesPrefix = new RegExp(`^(?:${escapeRegExp(`/${repositoryName}`)})/_next/static/`);
    assert.ok(assetUrls.every((url) => pagesPrefix.test(url)), "GitHub Pages assets must include the repository base path exactly once");
    assert.doesNotMatch(html, /\b(?:href|src)="\/_next\/static\//, "Pages output must not contain root-relative Next assets");
  }

  // Next does not apply basePath to metadata icons, so an icon href that skips the
  // prefix silently 404s on Pages while still looking correct in a local build.
  const iconHrefs = Array.from(html.matchAll(/<link rel="(?:shortcut )?icon"[^>]*href="([^"]+)"/g), (match) => match[1]);
  assert.ok(iconHrefs.length >= 1, "expected an exported favicon link");
  assert.deepEqual(
    iconHrefs.filter((href) => href !== `${expectedBasePath}/favicon.svg`),
    [],
    `every favicon link must resolve to ${expectedBasePath}/favicon.svg`,
  );
  // canonical/og URLs legitimately fall back to localhost in a local build, but
  // anything the browser actually fetches must resolve against the deployed site.
  const fetchedRefs = [
    ...Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g), (match) => match[1]),
    ...Array.from(html.matchAll(/<link\b(?![^>]*\brel="canonical")[^>]*\bhref="([^"]+)"/g), (match) => match[1]),
  ];
  assert.ok(fetchedRefs.length >= 3, "expected exported script and link assets");
  assert.deepEqual(
    fetchedRefs.filter((ref) => /^https?:\/\/localhost/i.test(ref)),
    [],
    "no fetched asset may point at a localhost origin",
  );
});

test("ships technically deep content for every week and interview track", async () => {
  const files = await Promise.all(contentPaths.map((name) => readFile(new URL(`../app/content/${name}`, import.meta.url), "utf8")));
  const content = files.join("\n");
  const topicWeeks = Array.from(content.matchAll(/^\s+week:\s*([1-8]),\s*$/gm), (match) => Number(match[1]));
  const expectedWeekCounts = [7, 5, 6, 6, 7, 5, 7, 6];
  const promptCategories = Array.from(
    content.matchAll(/^\s+category:\s*"(classic|ml|llm)",?\s*$/gm),
    (match) => match[1],
  );

  assert.equal(topicWeeks.length, 49, "expected exactly 49 curriculum modules");
  assert.deepEqual(
    expectedWeekCounts.map((_, index) => topicWeeks.filter((week) => week === index + 1).length),
    expectedWeekCounts,
    "all eight weeks must ship their complete module set",
  );
  assert.equal(promptCategories.length, 25, "expected exactly 25 design prompts");
  assert.deepEqual(
    Object.fromEntries(["classic", "ml", "llm"].map((category) => [category, promptCategories.filter((value) => value === category).length])),
    { classic: 11, ml: 8, llm: 6 },
  );

  assert.match(content, /double-entry|double entry/i);
  assert.match(content, /point-in-time/i);
  assert.match(content, /HNSW/);
  assert.match(content, /calibration/i);
  assert.match(content, /prefill/i);
  assert.match(content, /KV cache/i);
  assert.match(content, /all-reduce/i);
  assert.match(content, /prompt injection/i);
  assert.match(content, /reference:\s*\{/);
});

test("renders selectors for every week and every prompt category", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const studyData = await readFile(new URL("../app/studyData.ts", import.meta.url), "utf8");
  const weekPlanBlock = studyData.match(/export const curriculumWeeks:[\s\S]*?= \[([\s\S]*?)\n\];/)?.[1] ?? "";
  const weekSelectors = Array.from(weekPlanBlock.matchAll(/^\s+week:\s*([1-8]),\s*$/gm), (match) => Number(match[1]));

  assert.deepEqual(weekSelectors, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.match(page, /className="topic-week-tabs"[\s\S]*?curriculumWeeks\.map\(\(week\)/);
  assert.match(page, /const visiblePrompts = designPrompts\.filter\(\(prompt\) => prompt\.category === practiceCategory\)/);
  assert.match(page, /\(\["classic",\s*"ml",\s*"llm"\] as DesignCategory\[\]\)\.map/);
  assert.match(page, /className="prompt-switcher"[\s\S]*?visiblePrompts\.map\(\(prompt\)/);
});

test("keeps personal study data local, versioned, and migration-preserving", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.match(page, /ai-system-design-study:v1/);
  assert.match(page, /window\.localStorage\.setItem/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /prefers-color-scheme: dark/);
  assert.match(page, /function mergeStoredState\(raw: string\): StudyState/);
  assert.match(page, /saved\.version !== 1\) return fallback/, "a stored payload from another schema version must fall back");
  assert.match(page, /\} catch \{\s*return fallback;/s, "unparseable stored payloads must fall back rather than throw");

  // Every restored value is rebuilt against the current topic list and type-checked,
  // so an older or hand-edited payload can never inject an unknown shape into state.
  assert.match(page, /topics:\s*Object\.fromEntries\(\s*allTopics\.map/s);
  assert.match(page, /Math\.max\(1, Math\.min\(5, Math\.round\(rawTopic\.confidence\)\)\)/, "restored confidence must stay clamped to 1-5");
  assert.match(page, /notes:\s*typeof rawTopic\.notes === "string"/, "per-topic notes must survive a reload");
  assert.match(page, /typeof rawTopic\.lastReviewedAt === "string" \? \{ lastReviewedAt: rawTopic\.lastReviewedAt \} : \{\}/, "review dates must survive a reload");
  assert.match(page, /mistakes:\s*Array\.isArray\(saved\.mistakes\)/);
  assert.match(page, /mistakeCategories\.includes\(item\.category as MistakeCategory\)/, "restored mistakes must carry a known category");
  assert.match(page, /attempts:\s*Array\.isArray\(saved\.attempts\)\s*\?\s*saved\.attempts\.map\(normalizeAttempt\)/s);
  assert.match(page, /activityDates:\s*Array\.isArray\(saved\.activityDates\)/);
  assert.match(page, /draft:\s*normalizeDraft\(saved\.draft\)/);
  assert.match(page, /designPrompts\.some\(\(prompt\) => prompt\.id === value\.promptId\)/, "attempts for prompts that no longer exist must be dropped");
  assert.match(layout, /NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(layout, /next\/headers|codex-preview|Starter Project/);
});

test("keeps personal information out of publishable source", async () => {
  const appSource = await readTextTree(new URL("../app/", import.meta.url), [".ts", ".tsx", ".css"]);
  const publicText = await readTextTree(new URL("../public/", import.meta.url), [".svg", ".txt", ".json"]);
  const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  const publishableSource = [...appSource, ...publicText, nextConfig].join("\n");

  assert.doesNotMatch(publishableSource, /\b(?:stanford|aniketg?|gupta)\b|gmail\.com/i);
  assert.doesNotMatch(publishableSource, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "publishable source must not contain an email address");
});
