import { computeDiagramLayout, LABEL_DESCENT } from "./diagramLayout";
import type { DesignPrompt, StudyTopic } from "./types";
import type { WeekPlan } from "../studyData";

/**
 * The authoring control for the study corpus.
 *
 * This used to run at module scope inside `studyData`, which is imported by a
 * `"use client"` page — so every assertion and its message string shipped to
 * the browser and re-ran on each page load, proving nothing the build had not
 * already proved. It now lives here and is invoked by `npm run validate:content`,
 * which `build` and `test` both depend on.
 *
 * The checks fall into two families. The first measures whether a field is
 * substantial enough to teach anything. The second — added after a review found
 * 23 dangling prerequisites and 40 stale week labels rendering to learners —
 * checks that fields which reference other content actually resolve, because
 * every one of those defects lived in a field nothing inspected.
 */
function assertStudyContent(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Study content invariant failed: ${message}`);
}

/**
 * Acronyms a reader of this material is assumed to already own, so requiring a
 * glossary entry for them would be noise. Everything outside this set has to be
 * defined by the module that uses it.
 */
const ASSUMED_VOCABULARY = new Set([
  "API", "APIS", "HTTP", "HTTPS", "JSON", "XML", "YAML", "CSV", "SQL", "NOSQL", "REST", "RPC", "JWT",
  "TCP", "UDP", "IP", "DNS", "TLS", "SSL", "CDN", "URL", "URLS", "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD",
  "ID", "IDS", "UUID", "UUIDS",
  "CPU", "GPU", "GPUS", "RAM", "SSD", "HDD", "NVME", "VM", "VMS", "OS", "IO", "KV",
  "FIFO", "LIFO", "LRU", "LFU", "ACID", "CRUD", "SDK", "CI", "CD", "UI", "UX",
  "QPS", "RPS", "TTL", "SLA", "SLAS", "SLO", "SLOS", "SLI", "SLIS",
  "GB", "TB", "MB", "KB", "PB", "AWS", "GCP", "US", "EU", "UTC", "SAAS", "AI", "ML", "LLM", "LLMS", "OK", "NA",
]);

export function validateStudyContent(topics: StudyTopic[], prompts: DesignPrompt[], weeks: WeekPlan[]) {
  assertStudyContent(topics.length === 53, "the complete syllabus must contain 53 modules");
  assertStudyContent(prompts.length === 25, "the design library must contain 25 prompts");
  assertStudyContent(new Set(topics.map((topic) => topic.id)).size === topics.length, "topic IDs must be unique");
  assertStudyContent(new Set(prompts.map((prompt) => prompt.id)).size === prompts.length, "prompt IDs must be unique");

  const expectedWeekCounts = [4, 4, 5, 4, 4, 4, 5, 4, 5, 4, 5, 5];
  for (let week = 1; week <= 12; week += 1) {
    assertStudyContent(topics.filter((topic) => topic.week === week).length === expectedWeekCounts[week - 1], `week ${week} module count is incomplete`);
  }

  assertStudyContent(prompts.filter((prompt) => prompt.category === "classic").length === 11, "classic prompt library is incomplete");
  assertStudyContent(prompts.filter((prompt) => prompt.category === "ml").length === 8, "ML prompt library is incomplete");
  assertStudyContent(prompts.filter((prompt) => prompt.category === "llm").length === 6, "LLM prompt library is incomplete");

  for (const topic of topics) {
    assertStudyContent(topic.summary.length >= 80, `${topic.id} needs a substantive summary`);
    assertStudyContent(topic.whyItMatters.length >= 80, `${topic.id} needs senior-level context`);
    assertStudyContent(topic.deepDive.length >= 3, `${topic.id} needs three deep dives`);
    assertStudyContent(topic.deepDive.every((section) => section.points.length >= 2), `${topic.id} deep dives need mechanics`);
    assertStudyContent(topic.tradeoffs.length >= 3, `${topic.id} needs three explicit trade-offs`);
    assertStudyContent(topic.failureModes.length >= 3, `${topic.id} needs three diagnosed failure modes`);
    assertStudyContent(topic.decisionChecklist.length >= 4, `${topic.id} needs a decision checklist`);
    assertStudyContent(topic.quiz.length >= 4, `${topic.id} needs four recall checks`);
    assertStudyContent(topic.recallCards.length >= 2, `${topic.id} needs two free-recall cards`);
    for (const card of topic.recallCards) {
      assertStudyContent(card.prompt.length >= 40, `${topic.id} recall prompt is too thin`);
      assertStudyContent(card.answer.length >= 200, `${topic.id} recall answer must be a full model answer`);
    }
    for (const question of topic.quiz) {
      assertStudyContent(question.options.length === 4, `${topic.id} quiz question "${question.prompt}" needs exactly four options`);
      assertStudyContent(question.answerIndex >= 0 && question.answerIndex < question.options.length, `${topic.id} quiz answer is invalid`);
      assertStudyContent(question.explanation.length >= 40, `${topic.id} quiz needs an explanation`);
      // The corpus once keyed the longest option correct in 91% of items, so a
      // learner who read nothing scored ~90% by measuring strings. Length parity
      // is what removes that tell, and it only holds if it is enforced.
      const lengths = question.options.map((option) => option.length);
      assertStudyContent(
        Math.max(...lengths) - Math.min(...lengths) <= 18,
        `${topic.id} quiz question "${question.prompt}" gives away its answer by option length`,
      );
    }

    // The beginner layer. These thresholds exist because the failure mode they
    // guard against is a primer that technically exists and explains nothing.
    const { primer, glossary } = topic;
    assertStudyContent(primer.plainSummary.length >= 200, `${topic.id} needs a plain-language summary that actually explains the module`);
    assertStudyContent(primer.analogy.length >= 200, `${topic.id} needs a concrete analogy, not a one-line comparison`);
    assertStudyContent(primer.sections.length >= 3, `${topic.id} primer needs at least three build-up sections`);
    for (const section of primer.sections) {
      assertStudyContent(section.heading.length >= 10, `${topic.id} primer section needs a real heading`);
      assertStudyContent(section.body.length >= 2, `${topic.id} primer section needs connected paragraphs, not a single line`);
      // Substance is measured over the section, not per paragraph: a one-line
      // lede or an enumerated item is good prose, and a per-paragraph floor
      // would only force it to be padded.
      const prose = section.body.join(" ");
      assertStudyContent(prose.length >= 700, `${topic.id} primer section "${section.heading}" is too thin to teach anything`);
      for (const paragraph of section.body) {
        assertStudyContent(paragraph.length >= 60, `${topic.id} primer has an empty or stub paragraph`);
      }
    }
    assertStudyContent(primer.workedExample.setup.length >= 100, `${topic.id} worked example needs a concrete setup`);
    assertStudyContent(primer.workedExample.steps.length >= 5, `${topic.id} worked example needs at least five steps`);
    for (const step of primer.workedExample.steps) {
      assertStudyContent(step.length >= 80, `${topic.id} worked example step is too thin`);
    }
    assertStudyContent(primer.workedExample.takeaway.length >= 150, `${topic.id} worked example needs a takeaway that generalises`);

    assertStudyContent(glossary.length >= 8, `${topic.id} needs a glossary covering the terms it uses`);
    assertStudyContent(new Set(glossary.map((entry) => entry.term)).size === glossary.length, `${topic.id} glossary has duplicate terms`);
    for (const entry of glossary) {
      assertStudyContent(entry.definition.length >= 60, `${topic.id} glossary entry "${entry.term}" needs a real definition`);
      // An acronym without its expansion is exactly what this module set out to fix.
      const looksLikeAcronym = /^[A-Z0-9]{2,6}(\/[A-Z0-9]{2,6})*$/.test(entry.term);
      assertStudyContent(!looksLikeAcronym || Boolean(entry.expansion), `${topic.id} glossary acronym "${entry.term}" must be expanded`);
    }
  }

  // "Nothing is used before it is defined" is stated as the point of the
  // glossary layer in types.ts, but the only check was the converse — that a
  // glossary term which looks like an acronym carries an expansion — so the
  // rule was decorative and 25 modules quietly broke it. This is the forward
  // direction: an acronym a module uses must be defined where the module is.
  // Scoped to acronyms rather than all jargon on purpose; a looser matcher
  // flags phrasing variants and would only push authors to rename concepts to
  // satisfy a string compare.
  for (const topic of topics) {
    const prose = [
      ...topic.deepDive.flatMap((section) => [section.title, section.summary, ...section.points]),
      ...topic.tradeoffs.flatMap((item) => [item.decision, item.preferA, item.preferB, item.watch]),
      ...topic.failureModes.flatMap((item) => [item.mode, item.symptom, item.mitigation]),
      ...topic.decisionChecklist,
      ...topic.interviewQuestions,
      ...topic.concepts,
      topic.exercise,
    ].join(" ");
    const defined = [
      ...topic.glossary.map((entry) => `${entry.term} ${entry.expansion ?? ""} ${entry.definition}`),
      topic.primer.plainSummary,
      topic.primer.analogy,
      ...topic.primer.sections.flatMap((section) => section.body),
      ...topic.primer.workedExample.steps,
    ].join(" ");
    const used = new Set(
      (prose.match(/\b[A-Z][A-Z0-9]{1,5}(?:\/[A-Z0-9]{2,6})*\b/g) ?? [])
        .flatMap((token) => token.split("/"))
        .filter((token) => token.length >= 2 && !ASSUMED_VOCABULARY.has(token.toUpperCase())),
    );
    const undefinedHere = [...used].filter((acronym) => !defined.includes(acronym));
    assertStudyContent(
      undefinedHere.length === 0,
      `${topic.id} uses ${undefinedHere.join(", ")} without defining it in its own glossary or primer`,
    );
  }

  // Uniformity is the failure this inverts. Every floor above is a minimum, and
  // for a long time all 53 modules sat exactly on all of them — 3 deep dives,
  // 3 trade-offs, 3 failure modes, 6 worked steps against a floor of 5 — which
  // told the reader that estimation and multi-region failover deserve identical
  // treatment. A count, not a subject, was choosing the shape. So: passing the
  // minimums is necessary, and looking identical while doing it now fails.
  const shapes = topics.map((topic) => [
    topic.deepDive.length,
    topic.tradeoffs.length,
    topic.failureModes.length,
    topic.primer.sections.length,
    topic.primer.workedExample.steps.length,
  ].join("/"));
  const commonest = Math.max(...[...new Set(shapes)].map((shape) => shapes.filter((other) => other === shape).length));
  assertStudyContent(
    commonest <= Math.ceil(topics.length * 0.6),
    `${commonest} of ${topics.length} modules share one structural shape; vary the ones whose subject warrants it`,
  );

  for (const prompt of prompts) {
    const referenceGroups = [
      prompt.reference.scope,
      prompt.reference.apis,
      prompt.reference.dataModel,
      prompt.reference.architecture,
      prompt.reference.invariants,
      prompt.reference.deepDives,
      prompt.reference.scaling,
      prompt.reference.observability,
    ];
    assertStudyContent(referenceGroups.every((group) => group.length >= 2), `${prompt.id} reference is incomplete`);

    const { diagram } = prompt.reference;
    const nodeIds = new Set(diagram.nodes.map((node) => node.id));
    assertStudyContent(diagram.nodes.length >= 6, `${prompt.id} diagram needs a real component set`);
    assertStudyContent(diagram.edges.length >= 6, `${prompt.id} diagram needs the flow between components`);
    assertStudyContent(nodeIds.size === diagram.nodes.length, `${prompt.id} diagram node ids must be unique`);
    assertStudyContent(diagram.caption.length >= 60, `${prompt.id} diagram needs an explanatory caption`);
    for (const edge of diagram.edges) {
      assertStudyContent(nodeIds.has(edge.from) && nodeIds.has(edge.to), `${prompt.id} diagram edge references a missing node`);
    }
    // Two nodes sharing a cell would render on top of each other.
    const cells = diagram.nodes.map((node) => `${node.col}:${node.row}`);
    assertStudyContent(new Set(cells).size === cells.length, `${prompt.id} diagram has overlapping nodes`);
    // A node nothing connects to is almost always an authoring slip.
    const connected = new Set(diagram.edges.flatMap((edge) => [edge.from, edge.to]));
    assertStudyContent(diagram.nodes.every((node) => connected.has(node.id)), `${prompt.id} diagram has an unconnected node`);

    // Check pixels, not strings. Both older guards counted nodes and measured
    // label text, and neither could see that a backward edge from the last row
    // hangs its label below the canvas, where the SVG root clips it away.
    const layout = computeDiagramLayout(diagram);
    for (const path of layout.paths) {
      if (!path.edge.label) continue;
      const where = `${prompt.id} diagram label "${path.edge.label}"`;
      assertStudyContent(path.mid.y >= 0 && path.mid.y + LABEL_DESCENT <= layout.height, `${where} falls outside the ${layout.height}px canvas`);
      assertStudyContent(path.mid.x >= 0 && path.mid.x <= layout.width, `${where} falls outside the ${layout.width}px canvas`);
    }

    // Authored and then never rendered is the failure mode this catches: the
    // mock room went a long time displaying `expectedTopics` inside a div named
    // `mock-followups` while 108 follow-up questions sat unreachable.
    assertStudyContent(prompt.followUpQuestions.length >= 2, `${prompt.id} needs interviewer follow-up questions`);
    assertStudyContent(prompt.requirementsToExplore.length >= 2, `${prompt.id} needs requirements to explore`);
    assertStudyContent(prompt.expectedTopics.length >= 2, `${prompt.id} needs expected deep-dive topics`);
    assertStudyContent(prompt.commonFailureModes.length >= 2, `${prompt.id} needs common failure modes`);
  }

  // --- Referential integrity -------------------------------------------------
  // Everything below guards a field that nothing used to inspect. `page.tsx`
  // resolves these labels with a `?? value` fallback, so a broken reference does
  // not throw — it renders the raw slug to the learner and looks deliberate.

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const promptIds = new Set(prompts.map((prompt) => prompt.id));
  const promptTitles = new Set(prompts.map((prompt) => prompt.title));
  // Kebab-case entries name a module; prose entries ("Basic arithmetic") name
  // outside knowledge and are legitimately unresolvable.
  const looksLikeId = (value: string) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(value);
  const order = (topic: StudyTopic) => topic.week * 100 + topic.day;

  for (const topic of topics) {
    // The week and day now render from the fields themselves, so an eyebrow that
    // also names one can only ever contradict them — as 40 of them did after the
    // syllabus was re-paced from eight weeks to twelve.
    assertStudyContent(
      !/\b(week|day)\s*\d/i.test(topic.eyebrow),
      `${topic.id} eyebrow "${topic.eyebrow}" must not encode a week or day; those are derived from the module's own fields`,
    );

    for (const prerequisite of topic.prerequisites) {
      if (!looksLikeId(prerequisite)) continue;
      const target = topicById.get(prerequisite);
      assertStudyContent(target, `${topic.id} lists prerequisite "${prerequisite}", which is not a module id`);
      assertStudyContent(
        order(target) < order(topic),
        `${topic.id} (week ${topic.week} day ${topic.day}) requires ${target.id} (week ${target.week} day ${target.day}), which is taught later`,
      );
    }

    for (const design of topic.relatedDesigns) {
      assertStudyContent(promptIds.has(design), `${topic.id} lists related design "${design}", which is not a prompt id`);
    }
  }

  const scheduled = new Set<string>();
  for (const week of weeks) {
    for (const title of [...week.designs, ...week.extraDesigns]) {
      assertStudyContent(promptTitles.has(title), `week ${week.week} schedules "${title}", which matches no design prompt title`);
      scheduled.add(title);
    }
  }
  const orphaned = prompts.filter((prompt) => !scheduled.has(prompt.title));
  assertStudyContent(
    orphaned.length === 0,
    `these prompts are never reachable from the curriculum: ${orphaned.map((prompt) => prompt.id).join(", ")}`,
  );
}
