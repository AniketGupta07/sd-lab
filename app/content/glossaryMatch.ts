import type { GlossaryEntry } from "./types";

/**
 * Finds glossary terms inside module prose so the definition can be offered at
 * the point of confusion rather than only in a list.
 *
 * Two rules do most of the work here, and both exist because of how this page
 * is built rather than for their own sake.
 *
 * First, marking is scoped to a *section*, not to the module. Six of the eight
 * topic sections are collapsed by default, so a strict once-per-module rule
 * would spend a term's only mark inside a panel the reader never opened and
 * leave every visible occurrence bare. One mark per term per section means
 * whatever you open is annotated.
 *
 * Second, longer terms win. "KV cache" and "cache" can both be glossary terms;
 * matching longest-first and refusing overlaps stops the general term from
 * eating the specific one.
 */

export type ProseNode =
  | { kind: "text"; text: string }
  | { kind: "term"; text: string; entry: GlossaryEntry };

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const escapeRegExp = (value: string) => value.replace(REGEX_SPECIAL, "\\$&");

/**
 * Acronyms match case-sensitively; ordinary words do not. Without the split,
 * "ID" would mark the "id" in an identifier and "US" would mark prose.
 */
function isAcronym(term: string): boolean {
  return /^[A-Z0-9][A-Z0-9/-]*$/.test(term) && /[A-Z]/.test(term);
}

/**
 * The forms a term can legitimately appear as. Deliberately conservative: a
 * regular plural and whatever the author listed in `aliases`. Anything cleverer
 * starts marking words that only look like the term.
 */
export function surfaceForms(entry: GlossaryEntry): string[] {
  const forms = new Set<string>();
  for (const base of [entry.term, ...(entry.aliases ?? [])]) {
    const trimmed = base.trim();
    if (!trimmed) continue;
    forms.add(trimmed);
    if (isAcronym(trimmed) || /s$/i.test(trimmed)) continue;
    if (/[^aeiou]y$/i.test(trimmed)) forms.add(`${trimmed.slice(0, -1)}ies`);
    else if (/(x|z|ch|sh)$/i.test(trimmed)) forms.add(`${trimmed}es`);
    else forms.add(`${trimmed}s`);
  }
  return [...forms];
}

/**
 * How short a form may be before it matches more noise than signal. Acronyms
 * get a lower floor because they match case-sensitively, so a two-letter one
 * like KS or RL can only hit the real thing — whereas a two-letter lowercase
 * form would light up half the page.
 */
function minLength(form: string): number {
  return isAcronym(form) ? 2 : 3;
}

/**
 * Splits `text` into plain and term-bearing nodes, recording what it marked in
 * `seen` so the caller can carry one scope across several strings in a section.
 * Mutating a caller-owned set is what makes "first occurrence" mean anything
 * across the many separate strings a section renders.
 */
export function markProse(text: string, glossary: GlossaryEntry[], seen: Set<string>): ProseNode[] {
  const candidates = glossary
    .filter((entry) => !seen.has(entry.term))
    .flatMap((entry) => surfaceForms(entry).map((form) => ({ entry, form })))
    .filter(({ form }) => form.length >= minLength(form))
    .sort((a, b) => b.form.length - a.form.length);

  const ranges: Array<{ start: number; end: number; entry: GlossaryEntry }> = [];
  for (const { entry, form } of candidates) {
    if (seen.has(entry.term)) continue;
    // Word boundaries that also treat hyphens as part of a word, so "cache"
    // does not match inside "write-cache-through".
    const pattern = new RegExp(`(?<![\\w-])${escapeRegExp(form)}(?![\\w-])`, isAcronym(form) ? "" : "i");
    const found = pattern.exec(text);
    if (!found) continue;
    const start = found.index;
    const end = start + found[0].length;
    if (ranges.some((range) => start < range.end && end > range.start)) continue;
    ranges.push({ start, end, entry });
    seen.add(entry.term);
  }

  if (ranges.length === 0) return [{ kind: "text", text }];

  ranges.sort((a, b) => a.start - b.start);
  const nodes: ProseNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) nodes.push({ kind: "text", text: text.slice(cursor, range.start) });
    nodes.push({ kind: "term", text: text.slice(range.start, range.end), entry: range.entry });
    cursor = range.end;
  }
  if (cursor < text.length) nodes.push({ kind: "text", text: text.slice(cursor) });
  return nodes;
}

/** One marking scope. Create a fresh one per section. */
export function createSectionMarker(glossary: GlossaryEntry[]) {
  const seen = new Set<string>();
  return (text: string) => markProse(text, glossary, seen);
}
