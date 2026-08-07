import assert from "node:assert/strict";
import test from "node:test";
import { createSectionMarker, markProse, surfaceForms } from "../app/content/glossaryMatch";
import type { GlossaryEntry } from "../app/content/types";

const entry = (term: string, extra: Partial<GlossaryEntry> = {}): GlossaryEntry => ({
  term,
  definition: `A definition of ${term} long enough to clear the authoring floor.`,
  ...extra,
});

const marked = (nodes: ReturnType<typeof markProse>) =>
  nodes.filter((node) => node.kind === "term").map((node) => node.text);

test("prefers the longest term so a general one cannot eat a specific one", () => {
  const glossary = [entry("cache"), entry("KV cache")];
  const nodes = markProse("The KV cache is the budget.", glossary, new Set());
  assert.deepEqual(marked(nodes), ["KV cache"]);
});

test("marks a term once per scope, across separate strings", () => {
  const mark = createSectionMarker([entry("quorum")]);
  assert.deepEqual(marked(mark("A quorum must intersect.")), ["quorum"]);
  assert.deepEqual(marked(mark("The quorum is not linearizability.")), []);
});

test("gives each scope its own budget", () => {
  const glossary = [entry("quorum")];
  const first = createSectionMarker(glossary);
  const second = createSectionMarker(glossary);
  assert.deepEqual(marked(first("A quorum intersects.")), ["quorum"]);
  // A fresh section starts over, which is the whole point: most sections are
  // collapsed, so a once-per-module rule would leave opened ones unannotated.
  assert.deepEqual(marked(second("A quorum intersects.")), ["quorum"]);
});

test("respects word boundaries, including hyphens", () => {
  const glossary = [entry("cache")];
  assert.deepEqual(marked(markProse("Use a write-cache-through path.", glossary, new Set())), []);
  assert.deepEqual(marked(markProse("Caches are not caching.", glossary, new Set())), ["Caches"]);
});

test("matches acronyms case-sensitively and words case-insensitively", () => {
  assert.deepEqual(marked(markProse("the id column", [entry("ID")], new Set())), []);
  assert.deepEqual(marked(markProse("the ID column", [entry("ID")], new Set())), ["ID"]);
  assert.deepEqual(marked(markProse("Backpressure applies.", [entry("backpressure")], new Set())), ["Backpressure"]);
});

test("handles regular plurals but not invented ones", () => {
  assert.deepEqual(surfaceForms(entry("token")).sort(), ["token", "tokens"]);
  assert.deepEqual(surfaceForms(entry("index")).sort(), ["index", "indexes"]);
  assert.deepEqual(surfaceForms(entry("policy")).sort(), ["policies", "policy"]);
  // Acronyms get no plural: "KVS" is not a word.
  assert.deepEqual(surfaceForms(entry("KV")), ["KV"]);
});

test("accepts author-supplied aliases for irregular forms", () => {
  const glossary = [entry("fencing token", { aliases: ["fencing epoch"] })];
  assert.deepEqual(marked(markProse("Acquire a fencing epoch first.", glossary, new Set())), ["fencing epoch"]);
});

test("returns the original text unchanged when nothing matches", () => {
  const nodes = markProse("Nothing here is a term.", [entry("quorum")], new Set());
  assert.deepEqual(nodes, [{ kind: "text", text: "Nothing here is a term." }]);
});

test("preserves the full text when it does mark", () => {
  const source = "A quorum must intersect the write set.";
  const nodes = markProse(source, [entry("quorum")], new Set());
  assert.equal(nodes.map((node) => node.text).join(""), source);
});
