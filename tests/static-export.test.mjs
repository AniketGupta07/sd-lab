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
  // Two digits: a [1-8] class silently drops weeks 9-12 instead of failing.
  const topicWeeks = Array.from(content.matchAll(/^\s+week:\s*(\d{1,2}),\s*$/gm), (match) => Number(match[1]));
  const expectedWeekCounts = [4, 4, 5, 4, 4, 4, 5, 4, 5, 4, 5, 5];
  const promptCategories = Array.from(
    content.matchAll(/^\s+category:\s*"(classic|ml|llm)",?\s*$/gm),
    (match) => match[1],
  );

  assert.equal(topicWeeks.length, 53, "expected exactly 53 curriculum modules");
  assert.deepEqual(
    expectedWeekCounts.map((_, index) => topicWeeks.filter((week) => week === index + 1).length),
    expectedWeekCounts,
    "all twelve weeks must ship their complete module set",
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

  // Gaps closed deliberately; each was absent from the original syllabus and is
  // asked about often enough that silent removal should fail the build.
  assert.match(content, /OAuth 2\.0/, "authentication must be covered");
  assert.match(content, /OpenID Connect/);
  assert.match(content, /two-phase commit/i, "atomic commitment must be covered");
  assert.match(content, /\bsaga\b/i);
  assert.match(content, /version vector/i, "causality tracking must be covered");
  assert.match(content, /\bCRDT/, "convergent replicated types must be covered");
  assert.match(content, /gossip/i, "membership dissemination must be covered");
  assert.match(content, /service discovery|service registry/i);
  assert.match(content, /\bPaxos\b/, "the consensus family must be named");
  assert.match(content, /Kafka/, "log brokers must be nameable, not only described");
  assert.match(content, /GDPR|right to erasure/i, "regulatory deletion must be covered");
  assert.match(content, /fencing|fenced/i);
});

test("ships a reference architecture diagram for every design room", async () => {
  const files = await Promise.all(contentPaths.map((name) => readFile(new URL(`../app/content/${name}`, import.meta.url), "utf8")));
  const content = files.join("\n");
  const promptCount = content.match(/^\s+category: "(?:classic|ml|llm)",$/gm)?.length ?? 0;
  const diagrams = Array.from(content.matchAll(
    /diagram: \{\s*caption: "((?:[^"\\]|\\.)*)",\s*nodes: \[(.*?)\],\s*edges: \[(.*?)\],\s*\},/gs,
  ));

  assert.equal(diagrams.length, promptCount, "every design room needs a diagram");

  for (const [, caption, nodesBlock, edgesBlock] of diagrams) {
    const nodes = Array.from(nodesBlock.matchAll(
      /\{ id: "([^"]+)", label: "([^"]+)", kind: "([^"]+)", col: (\d+), row: (\d+) \}/g,
    ));
    const edges = Array.from(edgesBlock.matchAll(/\{ from: "([^"]+)", to: "([^"]+)"([^}]*)\}/g));
    const ids = new Set(nodes.map(([, id]) => id));
    const label = caption.slice(0, 40);

    assert.ok(nodes.length >= 6, `${label}: needs a real component set`);
    assert.ok(edges.length >= 6, `${label}: needs the flow between components`);
    assert.equal(ids.size, nodes.length, `${label}: node ids must be unique`);

    // Overlapping cells would render two boxes on top of each other.
    const cells = nodes.map(([, , , , col, row]) => `${col}:${row}`);
    assert.equal(new Set(cells).size, cells.length, `${label}: overlapping nodes`);

    for (const [, from, to] of edges) {
      assert.ok(ids.has(from) && ids.has(to), `${label}: edge references a missing node`);
    }
    const connected = new Set(edges.flatMap(([, from, to]) => [from, to]));
    for (const [, id] of nodes) {
      assert.ok(connected.has(id), `${label}: node "${id}" is unconnected`);
    }

    // Edge labels sit in the 92px gap between columns; longer ones overlap a box.
    for (const [, , extras] of edges) {
      const edgeLabel = extras.match(/label: "([^"]+)"/)?.[1];
      if (edgeLabel) assert.ok(edgeLabel.length <= 14, `${label}: edge label "${edgeLabel}" will overflow the column gap`);
    }
    // Node labels wrap to at most three lines of ~20 characters.
    for (const [, , nodeLabel] of nodes) {
      assert.ok(nodeLabel.length <= 60, `${label}: node label "${nodeLabel}" will not fit its box`);
    }
  }
});

test("defines vocabulary in place, with the list kept for review", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  // The reader used to meet a 28-entry definition list wedged between the
  // primer and the actual content. Definitions now arrive inline at the term,
  // so the list moves below the mechanics and starts closed — but it stays,
  // because it is the only surface you can scan and self-test against.
  const sectionOrder = [...page.matchAll(/^\s{2}(\w+): \{ eyebrow:/gm)].map((match) => match[1]);
  assert.ok(
    sectionOrder.indexOf("glossary") > sectionOrder.indexOf("mechanics"),
    "the glossary belongs after the mechanics, not between the primer and them",
  );
  assert.match(page, /glossary: \{ eyebrow: "Vocabulary"[^}]*defaultOpen: false/, "the glossary list must start collapsed");

  // Marking is scoped per section on purpose; a single module-wide scope would
  // spend a term's only mark inside a panel that defaults to collapsed.
  const markers = [...page.matchAll(/const mark\w+ = createSectionMarker\(activeTopic\.glossary\)/g)];
  assert.ok(markers.length >= 5, `expected a marking scope per section, found ${markers.length}`);
  assert.match(page, /import \{ createSectionMarker \} from "\.\/content\/glossaryMatch"/);
  assert.match(page, /<Prose nodes=\{markPrimer\(paragraph\)\} \/>/, "primer prose must be marked");
  assert.match(page, /<Prose nodes=\{markMechanics\(point\)\} \/>/, "deep-dive points must be marked");

  // A hover-only affordance would be unusable on touch and unreachable by
  // keyboard, so the trigger has to be a real button with focus and click.
  const term = await readFile(new URL("../app/GlossaryTerm.tsx", import.meta.url), "utf8");
  assert.match(term, /<button/, "the term trigger must be a button, not a styled span");
  assert.match(term, /onFocus=\{show\}/, "definitions must open on keyboard focus");
  assert.match(term, /onClick=\{\(\) => \(open \? hide\(\) : show\(\)\)\}/, "definitions must toggle on tap");
  assert.match(term, /event\.key === "Escape"/, "definitions must be dismissible without moving the pointer");
  assert.match(term, /role="tooltip"/);
  assert.match(term, /aria-describedby=\{open \? panelId : undefined\}/);
});

test("derives diagram geometry from one shared module", async () => {
  // The diagrams only exist after a client render, so scraping the export
  // cannot see them. `npm run validate:content` checks the actual pixel
  // geometry instead; this pins the renderer to the same module, so the two
  // cannot drift back apart into a renderer that clips labels and a guard that
  // counts strings and never notices.
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const validator = await readFile(new URL("../app/content/validate.ts", import.meta.url), "utf8");

  assert.match(page, /import \{ computeDiagramLayout[^}]*\} from "\.\/content\/diagramLayout"/, "the renderer must use the shared layout");
  assert.match(page, /const \{ width, height, paths \} = computeDiagramLayout\(diagram\)/, "the renderer must not recompute geometry inline");
  assert.doesNotMatch(page, /const height = DIAGRAM_PAD \* 2 \+ rows \* NODE_H/, "viewBox height must come from drawn geometry, not the node grid");
  assert.match(validator, /computeDiagramLayout\(diagram\)/, "the validator must check the geometry the renderer draws");
  assert.match(validator, /falls outside the \$\{layout\.height\}px canvas/, "the validator must assert labels stay on the canvas");
});

test("schedules free-recall cards for every module", async () => {
  const files = await Promise.all(contentPaths.map((name) => readFile(new URL(`../app/content/${name}`, import.meta.url), "utf8")));
  const content = files.join("\n");
  const moduleCount = content.match(/^\s+estimatedMinutes:/gm)?.length ?? 0;
  const cardBlocks = content.match(/^\s+recallCards: \[/gm)?.length ?? 0;
  // Tolerate a line break between fields: cards are authored both inline and wrapped.
  const cards = Array.from(content.matchAll(
    /\{\s*id: "[a-z0-9-]+",\s*prompt: "((?:[^"\\]|\\.)*)",\s*answer: "((?:[^"\\]|\\.)*)"\s*\}/g,
  ));

  assert.equal(cardBlocks, moduleCount, "every module needs a recallCards block");
  assert.ok(cards.length >= moduleCount * 2, `expected at least ${moduleCount * 2} recall cards, found ${cards.length}`);

  // A recall card is only useful if the answer is a full model answer rather
  // than a stub — that is what the learner grades themselves against.
  const thin = cards.filter(([, prompt, answer]) => prompt.length < 40 || answer.length < 200);
  assert.deepEqual(thin.map(([, prompt]) => prompt), [], "recall cards must carry a substantive model answer");
});

test("renders selectors for every week and every prompt category", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const studyData = await readFile(new URL("../app/studyData.ts", import.meta.url), "utf8");
  // The literal is the seed list; `curriculumWeeks` is derived from it so the
  // stated weekly hours cannot drift from the module times rendered beneath.
  const weekPlanBlock = studyData.match(/const weekPlanSeeds: WeekPlanSeed\[\] = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  const weekSelectors = Array.from(weekPlanBlock.matchAll(/^\s+week:\s*(\d{1,2}),\s*$/gm), (match) => Number(match[1]));

  assert.deepEqual(weekSelectors, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.match(studyData, /export const curriculumWeeks: WeekPlan\[\] = weekPlanSeeds\.map/, "weekly hours must be derived, not hand-written");
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

  // Review schedules and sketches are restored through the same validating path.
  assert.match(page, /srs:\s*normalizeSrs\(saved\.srs\)/);
  assert.match(page, /if \(!cardsByKey\.has\(key\) \|\| !isRecord\(raw\)\) continue/, "schedules for deleted cards must be dropped");
  assert.match(page, /sketch:\s*normalizeSketch\(raw\.sketch\)/);
  assert.match(page, /stroke\.length % 2 === 0/, "malformed sketch strokes must be rejected");
  assert.match(layout, /NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(layout, /next\/headers|codex-preview|Starter Project/);
});

test("keeps retrieval practice and the whiteboard honest", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  // Free recall must not reveal the answer before the learner commits, and the
  // grade must drive the next interval — otherwise it is not spaced repetition.
  assert.match(page, /function scheduleCard\(card: SrsCard, grade: RecallGrade\): SrsCard/);
  assert.match(page, /grade === "again"/, "a lapse must reset the interval");
  assert.match(page, /Math\.max\(1\.3, card\.ease/, "ease must have a floor");
  assert.match(page, /recallRevealed \? \(/, "the answer must stay hidden until revealed");
  assert.match(page, /allTopics\.flatMap\(\(topic\) => \[/, "both recall cards and quiz items must be scheduled");
  assert.match(page, /study\.topics\[card\.topicId\]\?\.status !== "not-started"/, "unstarted modules must not flood the queue");

  // The sketch is the point of the whiteboard: it must persist with the attempt.
  assert.match(page, /function SketchPad\(/);
  assert.match(page, /touch-action|setPointerCapture/, "drawing must work with pointer input");
  assert.match(page, /draft: \{ \.\.\.current\.draft, sketch \}/, "sketches must persist with the draft");

  // Retrieval practice must be drivable from the keyboard: reaching for the
  // mouse on every card is friction on the most repeated action in the app.
  assert.match(page, /if \(view !== "recall" \|\| !activeCard\) return;/);
  assert.match(page, /event\.key === " " \|\| event\.key === "Enter"/, "space must reveal");
  assert.match(page, /\["1", "2", "3", "4"\]\.indexOf\(event\.key\)/, "1-4 must grade");
  assert.match(page, /\["INPUT", "TEXTAREA", "SELECT"\]\.includes\(target\.tagName\)/, "shortcuts must not fire while typing");
});

test("folds long pages into sections and phases", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  // The topic page was one undifferentiated wall; sections give it a reading
  // order and remember what the learner has folded away.
  assert.match(page, /const topicSections = \{/);
  assert.match(page, /defaultOpen: true/);
  assert.match(page, /defaultOpen: false/);
  assert.match(page, /collapsed: Record<string, boolean>/);
  assert.match(page, /key in topicSections && typeof value === "boolean"/, "restored section state must be validated");
  assert.match(page, /aria-expanded=\{open\}/, "disclosure state must be exposed to assistive tech");

  // The design room is worked one phase at a time so a timed attempt is not a
  // scroll hunt, and the clock stays pinned while it runs.
  assert.match(page, /const practiceSteps: Array<\{/);
  assert.match(page, /activeStep\.kind === "sketch"/);
  assert.match(page, /activeStep\.kind === "reference"/);
  assert.match(page, /activeStep\.kind === "score"/);
  assert.match(page, /className="practice-sticky"/);

  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.practice-sticky \{[^}]*position: sticky/s, "the work bar must stay on screen");
  assert.match(css, /\.arch-edge-label \{[^}]*paint-order: stroke fill/s, "diagram labels need a halo to stay legible");
});

test("explains every module from zero and defines its vocabulary", async () => {
  const primerPaths = ["foundations.ts", "classic.ts", "ml.ts", "llm.ts"];
  const primerSources = await Promise.all(primerPaths.map((name) =>
    readFile(new URL(`../app/content/primers/${name}`, import.meta.url), "utf8")));
  const primers = primerSources.join("\n");

  // One primer per module, and the merge refuses to ship a module without one
  // rather than rendering a topic whose "start here" section is missing.
  const topicIds = (await Promise.all(contentPaths.map((name) =>
    readFile(new URL(`../app/content/${name}`, import.meta.url), "utf8"))))
    .flatMap((source) => {
      const topicsOnly = source.split(/export const \w+Prompts/)[0];
      return [...topicsOnly.matchAll(/^ {4}id: "([\w-]+)",$/gm)].map((match) => match[1]);
    });
  assert.equal(topicIds.length, 53, "every module must be discovered before checking its primer");
  for (const id of topicIds) {
    assert.match(primers, new RegExp(`^ {2}"?${escapeRegExp(id)}"?: \\{$`, "m"), `${id} has no from-zero primer`);
  }

  const studyData = await readFile(new URL("../app/studyData.ts", import.meta.url), "utf8");
  assert.match(studyData, /these modules have no primer/, "a missing primer must fail the build, not render empty");
  assert.match(studyData, /primers reference unknown modules/, "an orphaned primer must fail the build too");

  // Every primer carries the four things a reader with no background needs:
  // plain language, an analogy, build-up sections, and one worked example.
  for (const field of ["plainSummary:", "analogy:", "sections: [", "workedExample: {", "glossary: ["]) {
    const occurrences = primers.split(field).length - 1;
    assert.equal(occurrences, 53, `every module needs ${field.replace(/[:[{ ]/g, "")}`);
  }

  // The rule this whole layer exists to enforce: an acronym is never used
  // without being expanded. `validate:content` asserts it; this pins the
  // assertion. The harness lives in its own module rather than at studyData
  // scope so it does not ship to the browser.
  const validator = await readFile(new URL("../app/content/validate.ts", import.meta.url), "utf8");
  assert.match(validator, /glossary acronym .+ must be expanded/, "acronyms must be expanded, not merely listed");
  const bareAcronyms = [...primers.matchAll(/\{ term: "([A-Z0-9]{2,6}(?:\/[A-Z0-9]{2,6})*)"(?!, expansion)/g)]
    .map((match) => match[1]);
  assert.deepEqual(bareAcronyms, [], "these acronym-shaped terms carry no expansion");

  // Substance is checked over a whole section, so a one-line lede stays legal
  // while an empty section does not.
  assert.match(validator, /primer section "\$\{section\.heading\}" is too thin/, "section substance must be enforced");

  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /primer: \{ eyebrow: "Start here"[^}]*defaultOpen: true/, "the primer must open first on the page");
  // The glossary itself is now collapsed by default. That is not the layer
  // getting weaker: definitions reach the reader inline at each term's first
  // use, which is checked in "defines vocabulary in place". What must not
  // regress is that the vocabulary is reachable without a click *somewhere* —
  // so if the list is closed, the inline marking has to be wired up.
  assert.match(page, /glossary: \{ eyebrow: "Vocabulary"[^}]*defaultOpen: (true|false)/, "the glossary section must exist");
  assert.ok(
    /defaultOpen: true/.test(page.match(/glossary: \{ eyebrow: "Vocabulary"[^}]*\}/)?.[0] ?? "")
      || /createSectionMarker\(activeTopic\.glossary\)/.test(page),
    "a collapsed glossary is only acceptable when terms are defined inline",
  );
  assert.match(page, /activeTopic\.primer\.workedExample\.steps\.map/, "the worked example must render its steps");
  assert.match(page, /entry\.expansion \? <span className="glossary-expansion">/, "expansions must be shown, not just stored");

  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.primer-plain \{[^}]*max-width: 68ch/s, "long-form primer prose needs a readable measure");
});

test("keeps personal information out of publishable source", async () => {
  const appSource = await readTextTree(new URL("../app/", import.meta.url), [".ts", ".tsx", ".css"]);
  const publicText = await readTextTree(new URL("../public/", import.meta.url), [".svg", ".txt", ".json"]);
  const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  const publishableSource = [...appSource, ...publicText, nextConfig].join("\n");

  assert.doesNotMatch(publishableSource, /\b(?:stanford|aniketg?|gupta)\b|gmail\.com/i);
  assert.doesNotMatch(publishableSource, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "publishable source must not contain an email address");
});
