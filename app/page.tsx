"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  allTopics,
  BASELINE_INTERVIEW_MINUTES,
  curriculumWeeks,
  designPrompts,
  estimationDrills,
  interviewPhases,
  mistakeCategories,
  phaseMinutes,
  standardQuestions,
  type ArchitectureDiagram,
  type DesignCategory,
  type DesignPrompt,
  type MistakeCategory,
} from "./studyData";
import { computeDiagramLayout, NODE_H, NODE_W, nodeX, nodeY } from "./content/diagramLayout";
import { createSectionMarker } from "./content/glossaryMatch";
import { Prose } from "./GlossaryTerm";

type View =
  | "dashboard"
  | "curriculum"
  | "topic"
  | "recall"
  | "drills"
  | "practice"
  | "mock"
  | "review";

type TopicStatus = "not-started" | "in-progress" | "completed";

type TopicProgress = {
  status: TopicStatus;
  /**
   * `null` until the learner actually picks a number. A numeric default made
   * the app assert a self-rating nobody gave, and made "weak topics" unable to
   * fire until someone actively downrated.
   */
  confidence: number | null;
  lastReviewedAt?: string;
  notes: string;
};

type PracticeField =
  | "requirements"
  | "assumptions"
  | "estimation"
  | "apis"
  | "dataModel"
  | "architecture"
  | "failureModes"
  | "tradeoffs"
  | "finalSummary";

type ScoreField =
  | "requirements"
  | "estimation"
  | "architecture"
  | "storageAndData"
  | "reliability"
  | "tradeoffs"
  | "communication"
  | "timeManagement";

/**
 * One pen stroke, stored as a flat [x0,y0,x1,y1,…] list of coordinates
 * normalized to 0–1. Normalizing keeps a sketch valid at any canvas size, and
 * the flat form keeps the JSON small enough to sit in localStorage.
 */
type Stroke = number[];

type PracticeDraft = {
  id: string;
  promptId: string;
  startedAt: string;
  deadline: number | null;
  secondsRemaining: number;
  fields: Record<PracticeField, string>;
  scores: Record<ScoreField, number>;
  /**
   * Reliability checklist, keyed by question id. It lives on the draft rather
   * than in component state so it survives a reload and travels with the saved
   * attempt — the ticks are part of the record of what you actually reviewed.
   */
  checklist: Record<string, boolean>;
  sketch: Stroke[];
};

const SKETCH_WIDTH = 1600;
const SKETCH_HEIGHT = 900;

/** Greedy wrap so labels stay inside the box without measuring text. */
function wrapLabel(label: string, max = 20): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of label.split(" ")) {
    if (!line.length) line = word;
    else if (`${line} ${word}`.length <= max) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/**
 * Renders a reference architecture as inline SVG. Edges leave the right face
 * and enter the left face when moving forward; same-column edges run
 * vertically; backward edges bow underneath so they never trace over a box.
 */
function ArchitectureFigure({ diagram, id }: { diagram: ArchitectureDiagram; id: string }) {
  const { width, height, paths } = computeDiagramLayout(diagram);
  const marker = `arrow-${id}`;
  const markerAsync = `arrow-async-${id}`;

  return (
    <figure className="arch-figure">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={diagram.caption} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="arch-arrowhead" />
          </marker>
          <marker id={markerAsync} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="arch-arrowhead async" />
          </marker>
        </defs>

        {paths.map(({ edge, d, mid }) => (
          <g key={`${edge.from}-${edge.to}-${edge.label ?? ""}`}>
            <path
              d={d}
              className={`arch-edge${edge.async ? " async" : ""}`}
              markerEnd={`url(#${edge.async ? markerAsync : marker})`}
            />
            {edge.label ? (
              <text x={mid.x} y={mid.y} className="arch-edge-label" textAnchor="middle">{edge.label}</text>
            ) : null}
          </g>
        ))}

        {diagram.nodes.map((node) => {
          const x = nodeX(node.col);
          const y = nodeY(node.row);
          const lines = wrapLabel(node.label);
          return (
            <g key={node.id} className={`arch-node kind-${node.kind}`}>
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={node.kind === "store" || node.kind === "cache" ? 14 : 8} />
              <text x={x + NODE_W / 2} y={y + NODE_H / 2 - (lines.length - 1) * 7} textAnchor="middle">
                {lines.map((line, index) => (
                  <tspan key={line} x={x + NODE_W / 2} dy={index === 0 ? 0 : 14}>{line}</tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>{diagram.caption}</figcaption>
    </figure>
  );
}

function normalizeSketch(value: unknown): Stroke[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((stroke): stroke is number[] =>
      Array.isArray(stroke)
        && stroke.length >= 4
        && stroke.length % 2 === 0
        && stroke.every((n) => typeof n === "number" && Number.isFinite(n)))
    .slice(0, 4000)
    .map((stroke) => stroke.map((n) => Math.min(1, Math.max(0, n))));
}

/**
 * Freehand canvas for drawing the architecture before revealing the reference.
 * A system design interview is a drawing exercise; typing prose into a textarea
 * does not rehearse it.
 */
function SketchPad({
  strokes,
  onChange,
  theme,
}: {
  strokes: Stroke[];
  onChange: (next: Stroke[]) => void;
  theme: "light" | "dark";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<Stroke | null>(null);
  const ink = theme === "dark" ? "#dce6f5" : "#10233f";

  const paint = useCallback((all: Stroke[], live: Stroke | null) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, SKETCH_WIDTH, SKETCH_HEIGHT);
    context.strokeStyle = ink;
    // The canvas is a fixed 1600x900 bitmap scaled to fit its box, so a literal
    // lineWidth of 3 rendered at 3 x (312/1600) = 0.58 CSS pixels on a phone:
    // a hairline you cannot see, let alone draw a diagram with. The pen is
    // specified in *rendered* pixels and converted back into bitmap units.
    const rendered = canvas.getBoundingClientRect().width || SKETCH_WIDTH;
    context.lineWidth = Math.max(3, 3 * (SKETCH_WIDTH / rendered));
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const stroke of live ? [...all, live] : all) {
      context.beginPath();
      for (let i = 0; i < stroke.length; i += 2) {
        const x = stroke[i] * SKETCH_WIDTH;
        const y = stroke[i + 1] * SKETCH_HEIGHT;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
  }, [ink]);

  useEffect(() => { paint(strokes, drawingRef.current); }, [strokes, paint]);

  // The pen width is derived from the rendered box, so a resize that changes
  // that box has to redraw or the strokes keep the old device's weight.
  useEffect(() => {
    const repaint = () => paint(strokes, drawingRef.current);
    window.addEventListener("resize", repaint);
    return () => window.removeEventListener("resize", repaint);
  }, [strokes, paint]);

  function pointFrom(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    ];
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = pointFrom(event);
    paint(strokes, drawingRef.current);
  }

  function extend(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current.push(...pointFrom(event));
    paint(strokes, drawingRef.current);
  }

  function finish() {
    const stroke = drawingRef.current;
    drawingRef.current = null;
    if (!stroke || stroke.length < 4) {
      paint(strokes, null);
      return;
    }
    onChange([...strokes, stroke.map((n) => Math.round(n * 10_000) / 10_000)]);
  }

  return (
    <div className="sketchpad">
      <canvas
        ref={canvasRef}
        width={SKETCH_WIDTH}
        height={SKETCH_HEIGHT}
        onPointerDown={start}
        onPointerMove={extend}
        onPointerUp={finish}
        onPointerCancel={finish}
        aria-label="Architecture sketch canvas. Draw your design before revealing the reference."
        role="img"
      />
      <div className="sketchpad-tools">
        <p>{strokes.length === 0 ? "Draw the components and the request path." : `${strokes.length} stroke${strokes.length === 1 ? "" : "s"}`}</p>
        <div>
          <button className="button quiet" onClick={() => onChange(strokes.slice(0, -1))} disabled={strokes.length === 0}>Undo</button>
          <button className="button quiet" onClick={() => onChange([])} disabled={strokes.length === 0}>Clear</button>
        </div>
      </div>
    </div>
  );
}

type SavedAttempt = PracticeDraft & {
  savedAt: string;
  durationMinutes: number;
};

type Mistake = {
  id: string;
  date: string;
  designProblemId: string;
  category: MistakeCategory;
  mistake: string;
  correctApproach: string;
  reviewDate: string;
  resolved: boolean;
};

/**
 * Scheduling state for one card. `interval` is in days and `ease` is the SM-2
 * multiplier; both are recomputed on every grade. `due` is a local date key so
 * the queue is stable within a calendar day regardless of study time.
 */
type SrsCard = {
  due: string;
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
};

type RecallGrade = "again" | "hard" | "good" | "easy";

type StudyState = {
  version: 1;
  topics: Record<string, TopicProgress>;
  generalNotes: string;
  mistakes: Mistake[];
  attempts: SavedAttempt[];
  activityDates: string[];
  theme: "light" | "dark";
  draft: PracticeDraft;
  /** Estimation drill id -> the calculation the learner typed. */
  drills: Record<string, string>;
  /** The drawn mock, which stages have been ticked off, and every mock run. */
  mock: { promptId: string; checks: Record<string, boolean>; log: Array<{ promptId: string; date: string }> };
  srs: Record<string, SrsCard>;
  /** Section id -> collapsed. Absent means "use the section's default". */
  collapsed: Record<string, boolean>;
};

/**
 * Topic sections that can be folded away. Defaults give the page a reading
 * order: mechanics first, the rest opened deliberately.
 */
const topicSections = {
  primer: { eyebrow: "Start here", short: "Primer", title: "Explained from zero", defaultOpen: true },
  mechanics: { eyebrow: "Mechanics", short: "Mechanics", title: "What happens under the hood", defaultOpen: true },
  // Closed, and below the mechanics rather than above them. Definitions now
  // reach the reader inline at the point of confusion, so the list no longer
  // has to be a wall of 28 entries between the primer and the actual content.
  // It stays because it is the one surface you can scan and self-test against.
  glossary: { eyebrow: "Vocabulary", short: "Vocabulary", title: "Review every term in one place", defaultOpen: false },
  // Closed by default now that the primer sits above it: the top of the page
  // should be the explanation, not four open panels of compressed prose.
  tradeoffs: { eyebrow: "Trade-offs", short: "Trade-offs", title: "Say these aloud", defaultOpen: false },
  failures: { eyebrow: "Failure diagnosis", short: "Failures", title: "How this breaks in production", defaultOpen: false },
  questions: { eyebrow: "Pressure questions", short: "Questions", title: "What an interviewer will push on", defaultOpen: false },
  checklist: { eyebrow: "Decision discipline", short: "Checklist", title: "Before leaving this topic", defaultOpen: false },
  quiz: { eyebrow: "Knowledge check", short: "Quiz", title: "Commit before revealing the reasoning", defaultOpen: false },
} as const;

type TopicSectionId = keyof typeof topicSections;

/**
 * Declaration order is render order on the module page, so the sub-rail can be
 * driven straight off it and cannot drift out of sync with the sections.
 */
const topicSectionOrder = Object.keys(topicSections) as TopicSectionId[];

/**
 * The primer is the one section whose fold is remembered per module.
 *
 * `collapsed` is keyed by section id, which is right for the other seven: if
 * you never want to see the quiz you never want to see any quiz. The primer is
 * the opposite. The syllabus runs familiar → unfamiliar on purpose, so folding
 * away the beginner explanation of week 1 estimation must not also fold away
 * the one for week 11 LLM inference, which is the module you most need it on.
 */
function sectionStorageKey(id: TopicSectionId, topicId: string) {
  return id === "primer" ? `primer:${topicId}` : id;
}

/** Whether a stored `collapsed` key is one this build still understands. */
function isKnownSectionKey(key: string) {
  return key in topicSections || (key.startsWith("primer:") && allTopics.some((topic) => topic.id === key.slice(7)));
}

const STORAGE_KEY = "ai-system-design-study:v1";
/**
 * Where "Reset everything" puts what it destroys. Written immediately before
 * the removal, never read automatically — recovering is a deliberate act, so
 * a reset still behaves like a reset on the next load.
 */
const BACKUP_KEY = `${STORAGE_KEY}:backup`;

/**
 * One module status, one spelling. The same value used to render as
 * "Not started" on Today and "Not Started · 75 Min" on Curriculum, because two
 * call sites hand-cased it and a third leaned on `text-transform: capitalize`,
 * which also capitalised the unit beside it.
 */
function statusLabel(status: TopicProgress["status"]) {
  return status === "completed" ? "Completed" : status === "in-progress" ? "In progress" : "Not started";
}

/**
 * Horizontal strips that hide content off their right edge.
 *
 * On macOS the overlay scrollbar measures 0px, so a row hiding 59% of its items
 * renders identically to one that fits: the last visible tile ends flush at the
 * container edge and the row reads as complete. The prompt switcher hid six of
 * eleven design rooms that way. This reports which edges have content beyond
 * them so the CSS can fade exactly those, and nothing when everything fits.
 *
 * Deliberately re-subscribed on every render: these strips change their child
 * count when the prompt category or the module changes, and a stale observer
 * would report the previous row's geometry. Identical state is a no-op in
 * React, so the measurement cannot loop.
 */
type FadeEdges = "none" | "start" | "end" | "both";

function useOverflowFade<T extends HTMLElement>(): [React.RefObject<T | null>, FadeEdges] {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState<FadeEdges>("none");
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const overflow = element.scrollWidth - element.clientWidth;
      // Sub-pixel layout rounding routinely leaves 1px of phantom overflow.
      if (overflow <= 2) return setEdges("none");
      const atStart = element.scrollLeft <= 2;
      const atEnd = element.scrollLeft >= overflow - 2;
      setEdges(atStart ? "end" : atEnd ? "start" : "both");
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    for (const child of Array.from(element.children)) observer?.observe(child);
    return () => {
      element.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  });
  return [ref, edges];
}

/** Keeps the selected tile of a scrolling strip on screen. */
function scrollActiveIntoView(container: HTMLElement | null) {
  const active = container?.querySelector<HTMLElement>("button.active, button[aria-current]");
  if (!container || !active) return;
  const left = active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2;
  container.scrollTo({ left: Math.max(0, left), behavior: "instant" as ScrollBehavior });
}

const gradeButtons: Array<{ id: RecallGrade; label: string; hint: string }> = [
  { id: "again", label: "Again", hint: "Could not recall" },
  { id: "hard", label: "Hard", hint: "Recalled with effort" },
  { id: "good", label: "Good", hint: "Recalled correctly" },
  { id: "easy", label: "Easy", hint: "Instant and complete" },
];

/**
 * Every schedulable card in the syllabus: one per free-recall card, plus one
 * per multiple-choice question so the existing quiz bank also gets spaced.
 */
type ScheduledCard = {
  key: string;
  topicId: string;
  topicTitle: string;
  week: number;
  kind: "recall" | "quiz";
  prompt: string;
  answer: string;
  options?: string[];
  answerIndex?: number;
};

const allCards: ScheduledCard[] = allTopics.flatMap((topic) => [
  ...topic.recallCards.map((card) => ({
    key: `${topic.id}::r::${card.id}`,
    topicId: topic.id,
    topicTitle: topic.title,
    week: topic.week,
    kind: "recall" as const,
    prompt: card.prompt,
    answer: card.answer,
  })),
  ...topic.quiz.map((question, index) => ({
    key: `${topic.id}::q::${index}`,
    topicId: topic.id,
    topicTitle: topic.title,
    week: topic.week,
    kind: "quiz" as const,
    prompt: question.prompt,
    answer: question.explanation,
    options: question.options,
    answerIndex: question.answerIndex,
  })),
]);

const cardsByKey = new Map(allCards.map((card) => [card.key, card]));

function newSrsCard(due: string): SrsCard {
  return { due, interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

/**
 * SM-2 with a simplified learning phase. "Again" resets the interval and drops
 * ease, so a lapsed card returns tomorrow rather than being lost in the backlog.
 */
function scheduleCard(card: SrsCard, grade: RecallGrade): SrsCard {
  const ease = Math.max(1.3, card.ease + { again: -0.2, hard: -0.15, good: 0, easy: 0.15 }[grade]);
  if (grade === "again") {
    return { due: tomorrowPlus(1), interval: 1, ease, reps: 0, lapses: card.lapses + 1 };
  }
  const interval = card.reps === 0
    ? { hard: 1, good: 1, easy: 3 }[grade]
    : card.reps === 1
      ? { hard: 3, good: 6, easy: 10 }[grade]
      : Math.round(card.interval * ease * (grade === "hard" ? 0.6 : grade === "easy" ? 1.3 : 1));
  const capped = Math.min(365, Math.max(1, interval));
  return { due: tomorrowPlus(capped), interval: capped, ease, reps: card.reps + 1, lapses: card.lapses };
}

const practiceFields: Array<{
  id: PracticeField;
  label: string;
  prompt: string;
  wide?: boolean;
}> = [
  { id: "requirements", label: "Requirements", prompt: "Users, core operations, scale, SLAs, guarantees, scope…" },
  { id: "assumptions", label: "Assumptions", prompt: "State each assumption before relying on it…" },
  { id: "estimation", label: "Estimation", prompt: "QPS, storage, bandwidth, concurrency, cache or GPU capacity…" },
  { id: "apis", label: "APIs", prompt: "Endpoints, request/response shapes, errors, idempotency keys…" },
  { id: "dataModel", label: "Data model", prompt: "Entities, primary keys, indexes, events, retention…" },
  { id: "architecture", label: "Architecture & data flow", prompt: "Walk the request from client to source of truth…", wide: true },
  { id: "failureModes", label: "Failure modes", prompt: "Slow dependencies, retries, duplicates, backpressure, zone/region loss…" },
  { id: "tradeoffs", label: "Trade-offs", prompt: "Alternatives considered, decision, cost, and graceful degradation…" },
  { id: "finalSummary", label: "Two-minute close", prompt: "Restate the design, biggest trade-off, first bottleneck, next evolution…", wide: true },
];

/**
 * The design room is worked one interview phase at a time rather than as one
 * long scroll, so a timed attempt matches the clock the phases describe.
 * Sketch, reference, and scoring are their own steps at the end.
 *
 * The per-step budget is a *reference to* an interview phase, never a literal
 * minute range: the steps sit directly beside a live countdown, and design
 * prompts run 40 to 60 minutes, so a hardcoded "15–20" was silently wrong by up
 * to 26 minutes on a long prompt. `phase` names the entry in `interviewPhases`
 * whose share this step spends; `stepMinutes` turns that into a range against
 * the prompt actually being attempted. The last two steps happen after the
 * clock stops and therefore carry no phase.
 */
const interviewPhaseShare = new Map(interviewPhases.map((phase) => [phase.id, phase.share]));

const practiceSteps: Array<{
  id: string;
  label: string;
  phase?: string;
  fields: PracticeField[];
  kind?: "sketch" | "reference" | "score";
}> = [
  { id: "clarify", label: "Clarify", phase: "clarify", fields: ["requirements", "assumptions"] },
  { id: "estimate", label: "Estimate", phase: "estimate", fields: ["estimation"] },
  { id: "contract", label: "APIs + data", phase: "contract", fields: ["apis", "dataModel"] },
  { id: "architecture", label: "Architecture", phase: "architecture", fields: ["architecture"], kind: "sketch" },
  { id: "deep-dive", label: "Deep dive", phase: "deep-dive", fields: ["failureModes", "tradeoffs"] },
  // The design room closes on a spoken summary; the phase it spends is the
  // interview's reliability-and-evolution block.
  { id: "close", label: "Close", phase: "reliability", fields: ["finalSummary"] },
  { id: "compare", label: "Compare", fields: [], kind: "reference" },
  { id: "score", label: "Score", fields: [], kind: "score" },
];

/** "3–5" / "17–23" against this prompt's clock, or "after" once it has stopped. */
function stepMinutes(step: { phase?: string }, totalMinutes: number) {
  const share = step.phase ? interviewPhaseShare.get(step.phase) : undefined;
  return share === undefined ? "after" : `${phaseMinutes(share, totalMinutes)}m`;
}

const scoreFields: Array<{ id: ScoreField; label: string }> = [
  { id: "requirements", label: "Requirements" },
  { id: "estimation", label: "Estimation" },
  { id: "architecture", label: "Architecture" },
  { id: "storageAndData", label: "Storage & data" },
  { id: "reliability", label: "Reliability" },
  { id: "tradeoffs", label: "Trade-offs" },
  { id: "communication", label: "Communication" },
  { id: "timeManagement", label: "Time management" },
];

const navItems: Array<{ id: View; index: string; label: string }> = [
  { id: "dashboard", index: "01", label: "Today" },
  { id: "curriculum", index: "02", label: "Curriculum" },
  { id: "topic", index: "03", label: "Topic lab" },
  { id: "recall", index: "04", label: "Recall" },
  { id: "drills", index: "05", label: "Estimation" },
  { id: "practice", index: "06", label: "Design practice" },
  { id: "mock", index: "07", label: "Mock interview" },
  { id: "review", index: "08", label: "Notes & review" },
];

/**
 * Addressability.
 *
 * `view` used to be component state that never reached the URL, so the browser
 * Back button left the site entirely, a reload dumped a mid-session learner
 * back on Today, and a module could be neither bookmarked nor opened in a
 * second tab. The fragment is the only address available here: the app is
 * exported with `output: export` and served from a GitHub Pages basePath, where
 * pushing a *path* would 404 on the next hard reload. Everything below is hash
 * only, and every pushState call site passes a fragment-only relative URL so
 * the path and basePath are left exactly as the server delivered them.
 */
function routeToHash(view: View, topicId: string, drillIndex: number) {
  if (view === "topic") return `#/topic/${topicId}`;
  if (view === "drills") return `#/drills/${estimationDrills[drillIndex]?.id ?? ""}`;
  return `#/${view}`;
}

/** `#/topic/consistency-idempotency` -> `{ view: "topic", param: "consistency…" }`. */
function parseRouteHash(hash: string): { view: View; param?: string } | null {
  const [viewId, param] = hash.replace(/^#\/?/, "").split("/");
  const match = navItems.find((item) => item.id === viewId);
  return match ? { view: match.id, param: param || undefined } : null;
}

function emptyFields(): Record<PracticeField, string> {
  return {
    requirements: "",
    assumptions: "",
    estimation: "",
    apis: "",
    dataModel: "",
    architecture: "",
    failureModes: "",
    tradeoffs: "",
    finalSummary: "",
  };
}

function defaultScores(): Record<ScoreField, number> {
  return {
    requirements: 3,
    estimation: 3,
    architecture: 3,
    storageAndData: 3,
    reliability: 3,
    tradeoffs: 3,
    communication: 3,
    timeManagement: 3,
  };
}

function makeDraft(prompt: DesignPrompt, id = `draft-${prompt.id}`): PracticeDraft {
  return {
    id,
    promptId: prompt.id,
    startedAt: new Date().toISOString(),
    deadline: null,
    secondsRemaining: prompt.durationMinutes * 60,
    fields: emptyFields(),
    scores: defaultScores(),
    checklist: {},
    sketch: [],
  };
}

function defaultState(): StudyState {
  return {
    version: 1,
    topics: Object.fromEntries(
      allTopics.map((topic) => [
        topic.id,
        { status: "not-started", confidence: null, notes: "" },
      ]),
    ),
    generalNotes: "",
    mistakes: [],
    attempts: [],
    activityDates: [],
    theme: "light",
    draft: makeDraft(designPrompts[0]),
    drills: {},
    mock: { promptId: designPrompts[0].id, checks: {}, log: [] },
    srs: {},
    collapsed: {},
  };
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addActivity(dates: string[]) {
  return Array.from(new Set([...dates, localDateKey()])).sort();
}

function calculateStreak(dates: string[]) {
  if (!dates.length) return 0;
  const unique = Array.from(new Set(dates)).sort().reverse();
  const latest = new Date(`${unique[0]}T12:00:00`);
  const today = new Date(`${localDateKey()}T12:00:00`);
  const daysFromToday = Math.round((today.getTime() - latest.getTime()) / 86_400_000);
  if (daysFromToday > 1) return 0;

  let streak = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const previous = new Date(`${unique[index - 1]}T12:00:00`);
    const current = new Date(`${unique[index]}T12:00:00`);
    if (Math.round((previous.getTime() - current.getTime()) / 86_400_000) === 1) streak += 1;
    else break;
  }
  return streak;
}

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function averageScore(scores: Record<ScoreField, number>) {
  const values = Object.values(scores);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resolveContentLabel(value: string) {
  return allTopics.find((topic) => topic.id === value)?.title
    ?? designPrompts.find((prompt) => prompt.id === value)?.title
    ?? value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFields(value: unknown): Record<PracticeField, string> {
  const fields = emptyFields();
  if (!isRecord(value)) return fields;
  for (const field of practiceFields) {
    const savedField = value[field.id];
    if (typeof savedField === "string") fields[field.id] = savedField;
  }
  return fields;
}

function normalizeScores(value: unknown): Record<ScoreField, number> {
  const scores = defaultScores();
  if (!isRecord(value)) return scores;
  for (const field of scoreFields) {
    const score = value[field.id];
    if (typeof score === "number" && Number.isFinite(score)) {
      scores[field.id] = Math.max(1, Math.min(5, Math.round(score)));
    }
  }
  return scores;
}

/** Keeps only ticks for questions that still exist in the checklist. */
function normalizeChecklist(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const result: Record<string, boolean> = {};
  for (const question of standardQuestions) {
    const key = String(question.id);
    if (value[key] === true) result[key] = true;
  }
  return result;
}

function normalizeDraft(value: unknown): PracticeDraft {
  const raw = isRecord(value) ? value : {};
  const prompt = designPrompts.find((item) => item.id === raw.promptId) ?? designPrompts[0];
  const fallback = makeDraft(prompt);
  const seconds = typeof raw.secondsRemaining === "number" && Number.isFinite(raw.secondsRemaining)
    ? Math.max(0, Math.round(raw.secondsRemaining))
    : fallback.secondsRemaining;
  return {
    ...fallback,
    id: typeof raw.id === "string" ? raw.id : fallback.id,
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : fallback.startedAt,
    deadline: typeof raw.deadline === "number" && Number.isFinite(raw.deadline) ? raw.deadline : null,
    secondsRemaining: seconds,
    fields: normalizeFields(raw.fields),
    scores: normalizeScores(raw.scores),
    checklist: normalizeChecklist(raw.checklist),
    sketch: normalizeSketch(raw.sketch),
  };
}

/** Drops answers for drills that no longer exist and caps runaway payloads. */
function normalizeDrills(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const result: Record<string, string> = {};
  for (const drill of estimationDrills) {
    const answer = value[drill.id];
    if (typeof answer === "string" && answer.length) result[drill.id] = answer.slice(0, 20_000);
  }
  return result;
}

function normalizeMock(value: unknown): StudyState["mock"] {
  const raw = isRecord(value) ? value : {};
  const prompt = designPrompts.find((item) => item.id === raw.promptId) ?? designPrompts[0];
  const savedChecks = isRecord(raw.checks) ? raw.checks : {};
  const checks: Record<string, boolean> = {};
  for (const phase of interviewPhases) {
    if (savedChecks[phase.id] === true) checks[phase.id] = true;
  }
  // Spoken mocks left no trace anywhere: nothing recorded that one had
  // happened, so the surface the syllabus schedules three times could be run
  // ten times and still read as untouched. Entries for prompts this build no
  // longer ships are dropped like every other restored reference.
  const log = Array.isArray(raw.log)
    ? raw.log
        .filter((entry): entry is { promptId: string; date: string } =>
          isRecord(entry)
          && typeof entry.promptId === "string"
          && designPrompts.some((item) => item.id === entry.promptId)
          && typeof entry.date === "string"
          && /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
        .map((entry) => ({ promptId: entry.promptId, date: entry.date }))
        .slice(0, 200)
    : [];
  return { promptId: prompt.id, checks, log };
}

/**
 * Drops schedules for cards that no longer exist and clamps every numeric
 * field, so an edited or stale payload cannot poison the review queue.
 */
function normalizeSrs(value: unknown): Record<string, SrsCard> {
  if (!isRecord(value)) return {};
  const result: Record<string, SrsCard> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!cardsByKey.has(key) || !isRecord(raw)) continue;
    if (typeof raw.due !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.due)) continue;
    const num = (input: unknown, fallback: number, min: number, max: number) =>
      typeof input === "number" && Number.isFinite(input) ? Math.min(max, Math.max(min, input)) : fallback;
    result[key] = {
      due: raw.due,
      interval: Math.round(num(raw.interval, 0, 0, 365)),
      ease: num(raw.ease, 2.5, 1.3, 3.5),
      reps: Math.round(num(raw.reps, 0, 0, 10_000)),
      lapses: Math.round(num(raw.lapses, 0, 0, 10_000)),
    };
  }
  return result;
}

function normalizeAttempt(value: unknown): SavedAttempt | null {
  if (!isRecord(value) || !designPrompts.some((prompt) => prompt.id === value.promptId)) return null;
  const draft = normalizeDraft(value);
  return {
    ...draft,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : draft.startedAt,
    durationMinutes: typeof value.durationMinutes === "number" && Number.isFinite(value.durationMinutes)
      ? Math.max(1, Math.round(value.durationMinutes))
      : 1,
  };
}

function mergeStoredState(raw: string): StudyState {
  const fallback = defaultState();
  try {
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved) || saved.version !== 1) return fallback;
    const savedTopics = isRecord(saved.topics) ? saved.topics : {};
    return {
      version: 1,
      topics: Object.fromEntries(
        allTopics.map((topic) => {
          const savedTopic = savedTopics[topic.id];
          const rawTopic: Record<string, unknown> = isRecord(savedTopic) ? savedTopic : {};
          const status = rawTopic.status === "in-progress" || rawTopic.status === "completed"
            ? rawTopic.status
            : "not-started";
          // Absent stays absent: an unrated module must not come back rated.
          const confidence = typeof rawTopic.confidence === "number" && Number.isFinite(rawTopic.confidence)
            ? Math.max(1, Math.min(5, Math.round(rawTopic.confidence)))
            : null;
          return [topic.id, {
            status,
            confidence,
            notes: typeof rawTopic.notes === "string" ? rawTopic.notes : "",
            ...(typeof rawTopic.lastReviewedAt === "string" ? { lastReviewedAt: rawTopic.lastReviewedAt } : {}),
          }];
        }),
      ),
      generalNotes: typeof saved.generalNotes === "string" ? saved.generalNotes : "",
      mistakes: Array.isArray(saved.mistakes) ? saved.mistakes.filter((item): item is Mistake => {
        if (!isRecord(item)) return false;
        return typeof item.id === "string"
          && typeof item.date === "string"
          && typeof item.designProblemId === "string"
          && mistakeCategories.includes(item.category as MistakeCategory)
          && typeof item.mistake === "string"
          && typeof item.correctApproach === "string"
          && typeof item.reviewDate === "string"
          && typeof item.resolved === "boolean";
      }) : [],
      attempts: Array.isArray(saved.attempts)
        ? saved.attempts.map(normalizeAttempt).filter((item): item is SavedAttempt => item !== null)
        : [],
      activityDates: Array.isArray(saved.activityDates)
        ? saved.activityDates.filter((item): item is string => typeof item === "string")
        : [],
      theme: saved.theme === "dark" ? "dark" : "light",
      draft: normalizeDraft(saved.draft),
      drills: normalizeDrills(saved.drills),
      mock: normalizeMock(saved.mock),
      srs: normalizeSrs(saved.srs),
      collapsed: isRecord(saved.collapsed)
        ? Object.fromEntries(
            Object.entries(saved.collapsed).filter(
              ([key, value]) => isKnownSectionKey(key) && typeof value === "boolean",
            ),
          ) as Record<string, boolean>
        : {},
    };
  } catch {
    return fallback;
  }
}

/** Human-readable preview of where each grade would send the card. */
function describeNextInterval(card: SrsCard, grade: RecallGrade) {
  const days = scheduleCard(card, grade).interval;
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return "1 yr";
}

function tomorrowPlus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

/**
 * Feedback slots. The notice used to be a single string rendered in exactly one
 * place, so seven of its nine call sites produced no visible acknowledgement at
 * all. Naming the slot lets one piece of state stay one piece of state while
 * still surfacing next to whichever control raised it.
 */
type NoticeSlot = "global" | "practice" | "mistake" | "danger" | "mock";
type Notice = { slot: NoticeSlot; tone: "info" | "success" | "warn"; text: string };

/** Human phrasing for the header's save badge. */
function describeSavedAt(savedAt: number, now: number) {
  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [study, setStudy] = useState<StudyState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState(allTopics[0].id);
  const [topicWeek, setTopicWeek] = useState(1);
  const [activeDrillIndex, setActiveDrillIndex] = useState(0);
  const [drillRevealed, setDrillRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(designPrompts[0].durationMinutes * 60);
  // One notice, but addressed: it names the slot it belongs to so it renders
  // beside the control that produced it instead of in one unrelated savebar.
  const [notice, setNotice] = useState<Notice | null>(null);
  const [followUpsShown, setFollowUpsShown] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [practiceCategory, setPracticeCategory] = useState<DesignCategory>("classic");
  const [referenceRevealed, setReferenceRevealed] = useState(false);
  const [practiceStep, setPracticeStep] = useState(practiceSteps[0].id);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<number, number>>>({});
  const [recallRevealed, setRecallRevealed] = useState(false);
  const [recallScope, setRecallScope] = useState<"due" | "topic">("due");
  // Keys graded in this sitting. Needed because a topic drill ignores due dates,
  // so without it the queue would re-serve the card that was just answered.
  const [sessionSeen, setSessionSeen] = useState<string[]>([]);
  const [mistakeForm, setMistakeForm] = useState({
    category: mistakeCategories[0] as MistakeCategory,
    mistake: "",
    correctApproach: "",
    reviewDate: tomorrowPlus(7),
  });
  // The header badge used to read "Saved locally" whether or not anything had
  // been saved. These drive it from the write that actually happens: the badge
  // is "saving" exactly while the current `study` object is not the one on disk.
  const [persistedSnapshot, setPersistedSnapshot] = useState<StudyState | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [savedAgo, setSavedAgo] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  // Leaving a 7,551px module page to check one recall card used to cost you
  // your place permanently, because every view switch scrolled to the top and
  // threw the old offset away. One number per view, restored on the way back.
  const scrollByView = useRef<Partial<Record<View, number>>>({});
  const pendingScroll = useRef<number | null>(null);
  // False until the address bar has been written once. The first write replaces
  // rather than pushes, so the entry the user arrived on is not duplicated and
  // one Back press still leaves the app rather than doing nothing.
  const routeWritten = useRef(false);
  // Switching views used to be silent and invisible to assistive tech: the DOM
  // swapped under a focus that never moved and nothing was announced.
  const [viewAnnouncement, setViewAnnouncement] = useState("");
  // The countdown was an `aria-label` on a roleless <span>, which assistive tech
  // discards outright. The digits now carry `role="timer"` and the spoken form
  // goes through this, updated only at boundaries worth interrupting for.
  const [timerAnnouncement, setTimerAnnouncement] = useState("");
  // The JSON that "Reset everything" just threw away, held for the rest of the
  // session so Undo is one click rather than a localStorage archaeology dig.
  const [resetBackup, setResetBackup] = useState<string | null>(null);
  // The three strips that still scroll after the module picker and drill tabs
  // were made to wrap. Each reports its own hidden edges; the two that fit at
  // a given width simply report "none" and render no fade.
  const [promptStripRef, promptStripFade] = useOverflowFade<HTMLDivElement>();
  const [stepStripRef, stepStripFade] = useOverflowFade<HTMLElement>();
  const [subrailRef, subrailFade] = useOverflowFade<HTMLElement>();
  // Wraps above 760px and scrolls below it, so it needs the fade only sometimes
  // — which is exactly what the hook reports.
  const [drillStripRef, drillStripFade] = useOverflowFade<HTMLDivElement>();

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const next = stored ? mergeStoredState(stored) : defaultState();
      const restoredPrompt = designPrompts.find((prompt) => prompt.id === next.draft.promptId);
      const nextTopic = allTopics.find((topic) => next.topics[topic.id]?.status !== "completed") ?? allTopics[allTopics.length - 1];
      if (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches) next.theme = "dark";
      setStudy(next);
      if (restoredPrompt) setPracticeCategory(restoredPrompt.category);
      // A bookmarked or reloaded address outranks "wherever you left off": the
      // learner asked for that module by name.
      const route = parseRouteHash(window.location.hash);
      const routedTopic = route?.view === "topic" && route.param
        ? allTopics.find((topic) => topic.id === route.param)
        : undefined;
      const landingTopic = routedTopic ?? nextTopic;
      if (landingTopic) {
        setActiveTopicId(landingTopic.id);
        setTopicWeek(landingTopic.week);
      }
      if (route?.view === "drills" && route.param) {
        const index = estimationDrills.findIndex((drill) => drill.id === route.param);
        if (index !== -1) setActiveDrillIndex(index);
      }
      if (route) setView(route.view);
      // We restore scroll per view ourselves; letting the browser also restore
      // an offset from before the client render means two answers and a jump.
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
      setSecondsLeft(
        next.draft.deadline
          ? Math.max(0, Math.ceil((next.draft.deadline - Date.now()) / 1000))
          : next.draft.secondsRemaining,
      );
      setHydrated(true);
    }, 0);

    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue ? mergeStoredState(event.newValue) : defaultState();
      const prompt = designPrompts.find((item) => item.id === next.draft.promptId) ?? designPrompts[0];
      setStudy(next);
      setPracticeCategory(prompt.category);
      setReferenceRevealed(false);
      setSecondsLeft(
        next.draft.deadline
          ? Math.max(0, Math.ceil((next.draft.deadline - Date.now()) / 1000))
          : next.draft.secondsRemaining,
      );
    };
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(hydrationTimer);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = study.theme;
  }, [study.theme]);


  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(study));
        // Recording *which* object landed is what lets the badge tell "saving"
        // from "saved" without a second source of truth to drift out of sync.
        setPersistedSnapshot(study);
        setLastSavedAt(Date.now());
        setSaveFailed(false);
      } catch {
        setSaveFailed(true);
        setNotice({
          slot: "global",
          tone: "warn",
          text: "This browser could not save your changes. Copy important notes before leaving.",
        });
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [hydrated, study]);

  // "Saved · 2m ago" has to keep being true, so the phrasing re-derives on a
  // slow tick rather than freezing at whatever it said when the write landed.
  useEffect(() => {
    if (lastSavedAt === null) return;
    const update = () => setSavedAgo(describeSavedAt(lastSavedAt, Date.now()));
    update();
    const interval = window.setInterval(update, 20_000);
    return () => window.clearInterval(interval);
  }, [lastSavedAt]);

  useEffect(() => {
    if (!study.draft.deadline) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((study.draft.deadline! - Date.now()) / 1000));
      setSecondsLeft(remaining);
      // A digit that changes every second is noise to a screen reader if it is
      // announced, and invisible if it is not. Announce the boundaries a person
      // actually paces against: every five minutes, then every fifteen seconds
      // through the last minute, then zero.
      if (remaining === 0) setTimerAnnouncement("Time is up. The design clock has reached zero.");
      else if (remaining <= 60 && remaining % 15 === 0) setTimerAnnouncement(`${remaining} seconds remaining.`);
      else if (remaining % 300 === 0) setTimerAnnouncement(`${remaining / 60} minutes remaining.`);
      if (remaining === 0) {
        setStudy((current) => ({
          ...current,
          draft: { ...current.draft, deadline: null, secondsRemaining: 0 },
        }));
        setNotice({
          slot: "practice",
          tone: "warn",
          text: "Time. Take two minutes to summarize your design and record the three biggest mistakes.",
        });
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [study.draft.deadline]);

  const totalCompletedTopics = useMemo(
    () => allTopics.filter((topic) => study.topics[topic.id]?.status === "completed").length,
    [study.topics],
  );
  const overallProgressPercent = Math.round((totalCompletedTopics / allTopics.length) * 100);
  const currentWeek = curriculumWeeks.find((week) =>
    allTopics.some((topic) => topic.week === week.week && study.topics[topic.id]?.status !== "completed"),
  ) ?? curriculumWeeks[curriculumWeeks.length - 1];
  const currentWeekTopics = allTopics.filter((topic) => topic.week === currentWeek.week);
  const completedWeekTopics = currentWeekTopics.filter((topic) => study.topics[topic.id]?.status === "completed").length;
  const weekProgressPercent = Math.round((completedWeekTopics / currentWeekTopics.length) * 100);
  const streak = useMemo(() => calculateStreak(study.activityDates), [study.activityDates]);
  const activeTopic = allTopics.find((topic) => topic.id === activeTopicId) ?? allTopics[0];
  const visibleTopicWeek = allTopics.filter((topic) => topic.week === topicWeek);
  const activeDrill = estimationDrills[activeDrillIndex];
  // Both read straight out of the persisted object: the drill answer and the
  // mock's stage ticks used to be component state that a reload discarded.
  const drillAnswer = study.drills[activeDrill.id] ?? "";
  const mockPrompt = designPrompts.find((prompt) => prompt.id === study.mock.promptId) ?? designPrompts[0];
  const mockChecked = interviewPhases.filter((phase) => study.mock.checks[phase.id]).length;
  const mockLogTitle = study.mock.log.length
    ? designPrompts.find((prompt) => prompt.id === study.mock.log[0].promptId)?.title ?? "a drawn prompt"
    : "";
  const activePrompt = designPrompts.find((prompt) => prompt.id === study.draft.promptId) ?? designPrompts[0];
  const visiblePrompts = designPrompts.filter((prompt) => prompt.category === practiceCategory);
  const activeStep = practiceSteps.find((step) => step.id === practiceStep) ?? practiceSteps[0];
  /**
   * Whether the header carries the attempt clock. "expired" survives a reload
   * (`deadline` is cleared at zero but `startedAt` is not), which is exactly the
   * case that used to be silent: a finished 40-minute attempt with no trace of
   * itself anywhere outside the design room.
   */
  const timerChipState: "off" | "running" | "expired" =
    view === "practice"
      ? "off"
      : study.draft.deadline
        ? "running"
        : secondsLeft === 0 && study.draft.startedAt ? "expired" : "off";
  const saveState: "idle" | "saving" | "saved" | "failed" = saveFailed
    ? "failed"
    : !hydrated
      ? "idle"
      : persistedSnapshot === study ? "saved" : "saving";
  // In seeded week 3 the module Today sends you to was off the right edge of a
  // strip with no scrollbar. Whatever is selected has to be visible, on arrival
  // and after every switch.
  useEffect(() => {
    if (view !== "practice") return;
    scrollActiveIntoView(promptStripRef.current);
  }, [view, practiceCategory, study.draft.promptId, promptStripRef]);

  useEffect(() => {
    if (view !== "practice") return;
    scrollActiveIntoView(stepStripRef.current);
  }, [view, practiceStep, stepStripRef]);

  useEffect(() => {
    if (view !== "drills") return;
    scrollActiveIntoView(drillStripRef.current);
  }, [view, activeDrillIndex, drillStripRef]);

  const unresolvedMistakes = study.mistakes.filter((mistake) => !mistake.resolved);
  const checklistTicked =standardQuestions.filter((question) => study.draft.checklist[String(question.id)]).length;

  /**
   * Cards are due when scheduled on or before today. Unseen cards only enter the
   * queue once their module is started, so the backlog tracks study rather than
   * dumping all 318 cards on day one. Overdue cards come first, then new ones.
   */
  const dueCards = useMemo(() => {
    const today = localDateKey();
    return allCards
      .filter((card) => {
        const scheduled = study.srs[card.key];
        if (scheduled) return scheduled.due <= today;
        return study.topics[card.topicId]?.status !== "not-started";
      })
      .sort((a, b) => {
        const dueA = study.srs[a.key]?.due ?? "9999-12-31";
        const dueB = study.srs[b.key]?.due ?? "9999-12-31";
        return dueA.localeCompare(dueB) || a.week - b.week || a.key.localeCompare(b.key);
      });
  }, [study.srs, study.topics]);

  const topicCards = useMemo(
    () => allCards.filter((card) => card.topicId === activeTopicId),
    [activeTopicId],
  );

  const recallQueue = (recallScope === "topic" ? topicCards : dueCards)
    .filter((card) => !sessionSeen.includes(card.key));
  const activeCard = recallQueue[0];

  /**
   * Reveal used to be `setRecallRevealed(true)` and nothing else, which put the
   * model answer at y=871 and the grade buttons at y=1046 on a 900px screen:
   * pressing space produced an answer you could not see. The answer now comes
   * to the reader. `scroll-margin-bottom` on `.recall-answer` keeps it clear of
   * the pinned grade row, and `instant` because the global smooth scroll would
   * otherwise animate it.
   */
  function revealAnswer() {
    setRecallRevealed(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.querySelector(".recall-answer")?.scrollIntoView({ behavior: "instant", block: "nearest" });
      });
    });
  }

  // Spaced repetition is a keyboard workflow: space reveals, 1-4 grade. Bound
  // only while the recall view is showing a card, and never while typing.
  useEffect(() => {
    if (view !== "recall" || !activeCard) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Never while typing. `closest` rather than tagName: the event target of a
      // keypress inside a control can be a descendant of it.
      if (target?.isContentEditable || target?.closest("input, textarea, select")) return;
      // Space and Enter already belong to whatever control has focus, and
      // preventDefault() on keydown cancels the browser's synthesized click. A
      // guard that missed BUTTON therefore turned every focused control on the
      // page into a dead key — the sidebar included, which is a keyboard trap.
      // 1-4 are not activation keys, so they stay live everywhere but text fields.
      const onControl = Boolean(target?.closest('button, a, summary, [role="button"]'));

      if (!recallRevealed && !onControl && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        revealAnswer();
        return;
      }
      if (recallRevealed) {
        const index = ["1", "2", "3", "4"].indexOf(event.key);
        if (index !== -1) {
          event.preventDefault();
          gradeRecall(activeCard.key, gradeButtons[index].id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, activeCard, recallRevealed]);
  // Only a rating the learner actually gave can flag a topic as weak.
  const weakTopics = allTopics.filter((topic) => {
    const progress = study.topics[topic.id];
    if (!progress || progress.confidence === null) return false;
    return progress.confidence <= 2 && progress.status !== "completed";
  });
  const ratedTopicCount = allTopics.filter((topic) => study.topics[topic.id]?.confidence !== null).length;

  function selectView(next: View) {
    if (next === view) {
      // Re-pressing the tab you are already on means "take me back to the top",
      // which is the one case where the old unconditional scroll was right.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      scrollByView.current[view] = window.scrollY;
      pendingScroll.current = scrollByView.current[next] ?? 0;
      setView(next);
    }
    // The mistake form is rendered on two views, so a notice left behind on one
    // would greet you on the other. Callers that want a notice on arrival set
    // it after this returns.
    setNotice(null);
    // Name the destination for a screen reader, then put the reading cursor at
    // the top of it so reaching content does not mean tabbing the whole nav.
    setViewAnnouncement(`${navItems.find((item) => item.id === next)?.label ?? "View"} — loaded`);
    mainRef.current?.focus({ preventScroll: true });
  }

  // Put the view back where the learner left it. Runs after the new view has
  // committed, so the document is already tall enough to hold the old offset.
  useEffect(() => {
    const target = pendingScroll.current;
    pendingScroll.current = null;
    if (target === null) return;
    // "instant", not "auto": `auto` defers to `html { scroll-behavior: smooth }`
    // at globals.css:89, which animated a 4,000px restore and landed the learner
    // somewhere mid-flight (measured 3,629px of an intended 4,000px). Returning
    // to a page should be instantaneous, the way a real back navigation is.
    window.scrollTo({ top: target, behavior: "instant" });
  }, [view]);

  const routeHash = routeToHash(view, activeTopicId, activeDrillIndex);

  /** Back, Forward, a pasted link, or a hand-edited fragment all land here. */
  function applyRoute(hash: string) {
    const route = parseRouteHash(hash);
    if (!route) return;
    if (route.view === "topic" && route.param) {
      const topic = allTopics.find((item) => item.id === route.param);
      if (topic && topic.id !== activeTopicId) {
        setTopicWeek(topic.week);
        setActiveTopicId(topic.id);
        delete scrollByView.current.topic;
      }
    }
    if (route.view === "drills" && route.param) {
      const index = estimationDrills.findIndex((drill) => drill.id === route.param);
      if (index !== -1 && index !== activeDrillIndex) {
        setActiveDrillIndex(index);
        setDrillRevealed(false);
      }
    }
    selectView(route.view);
  }

  // Deliberately no dependency array: `applyRoute` closes over the current
  // view, topic and drill, and a stale closure here would send Back to the
  // wrong place. Re-binding one listener per render is cheaper than the bug.
  useEffect(() => {
    if (!hydrated) return;
    const onHashChange = () => applyRoute(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  });

  // Write side. `pushState` never fires `hashchange`, so this cannot loop with
  // the listener above; and when a Back press moved us, the hash already
  // matches and nothing is pushed.
  useEffect(() => {
    if (!hydrated) return;
    const shouldReplace = !routeWritten.current;
    routeWritten.current = true;
    if (window.location.hash === routeHash) return;
    if (shouldReplace) window.history.replaceState(null, "", routeHash);
    else window.history.pushState(null, "", routeHash);
  }, [hydrated, routeHash]);

  // The active pill can start off the right edge of the horizontally scrolling
  // mobile nav, so the user lands on a new view with no tab highlighted.
  useEffect(() => {
    const active = mobileNavRef.current?.querySelector("button.active");
    if (!active || !mobileNavRef.current?.offsetParent) return;
    active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [view]);

  function updateTopic(topicId: string, patch: Partial<TopicProgress>) {
    setStudy((current) => {
      const previous = current.topics[topicId];
      const completedNow = patch.status === "completed" && previous.status !== "completed";
      return {
        ...current,
        topics: {
          ...current.topics,
          [topicId]: {
            ...previous,
            ...patch,
            lastReviewedAt: new Date().toISOString(),
          },
        },
        activityDates: completedNow ? addActivity(current.activityDates) : current.activityDates,
      };
    });
  }

  function openTopic(topicId: string) {
    const topic = allTopics.find((item) => item.id === topicId);
    if (topic) setTopicWeek(topic.week);
    // A different module is a different page: restoring the offset you had in
    // the last one would drop you into the middle of this one's primer.
    if (topicId !== activeTopicId) {
      delete scrollByView.current.topic;
      // Taking "next module" from the terminal block at y≈8,565 is a page
      // change, not a jump within one, so it lands at the top immediately
      // instead of animating 8,500px through the module you just finished.
      if (view === "topic") window.scrollTo({ top: 0, behavior: "instant" });
    }
    setActiveTopicId(topicId);
    selectView("topic");
  }

  // Switching tabs must not erase a calculation. Each drill keeps its own
  // answer in the persisted object, so the tab strip restores rather than wipes.
  function chooseDrill(index: number) {
    setActiveDrillIndex(index);
    setDrillRevealed(false);
  }

  function updateDrillAnswer(drillId: string, value: string) {
    setStudy((current) => ({ ...current, drills: { ...current.drills, [drillId]: value } }));
  }

  function choosePractice(prompt: DesignPrompt, fresh = true) {
    setPracticeCategory(prompt.category);
    setReferenceRevealed(false);
    setStudy((current) => ({
      ...current,
      draft: fresh ? makeDraft(prompt, newId("attempt")) : current.draft,
    }));
    setSecondsLeft(prompt.durationMinutes * 60);
    selectView("practice");
  }

  function chooseTopicWeek(week: number) {
    const firstTopic = allTopics.find((topic) => topic.week === week);
    if (!firstTopic) return;
    setTopicWeek(week);
    setActiveTopicId(firstTopic.id);
  }

  function answerQuiz(topicId: string, questionIndex: number, optionIndex: number) {
    setQuizAnswers((current) => ({
      ...current,
      [topicId]: { ...(current[topicId] ?? {}), [questionIndex]: optionIndex },
    }));
  }

  function gradeRecall(cardKey: string, grade: RecallGrade) {
    setStudy((current) => ({
      ...current,
      activityDates: addActivity(current.activityDates),
      srs: {
        ...current.srs,
        [cardKey]: scheduleCard(current.srs[cardKey] ?? newSrsCard(localDateKey()), grade),
      },
    }));
    setRecallRevealed(false);
    setSessionSeen((current) => (current.includes(cardKey) ? current : [...current, cardKey]));
  }

  function isSectionOpen(id: TopicSectionId) {
    const stored = study.collapsed[sectionStorageKey(id, activeTopicId)];
    if (stored !== undefined) return !stored;
    // The primer is half of every module page and it opened expanded on all 53,
    // including the ones the learner has already worked through. Open it while
    // the module is untouched — which is exactly when "explained from zero" is
    // what you came for — and fold it once the module is under way.
    if (id === "primer") return (study.topics[activeTopicId]?.status ?? "not-started") === "not-started";
    return topicSections[id].defaultOpen;
  }

  function toggleSection(id: TopicSectionId) {
    const open = isSectionOpen(id);
    setStudy((current) => ({
      ...current,
      collapsed: { ...current.collapsed, [sectionStorageKey(id, activeTopicId)]: open },
    }));
  }

  /**
   * Sub-rail target: open the section if it is folded, then put its heading
   * under the sticky chrome. Two frames because the scroll has to happen after
   * React has committed the newly expanded body, and `instant` because
   * `html { scroll-behavior: smooth }` would otherwise animate the jump.
   */
  function jumpToSection(id: TopicSectionId) {
    if (!isSectionOpen(id)) toggleSection(id);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(`topic-section-${id}`)?.scrollIntoView({ behavior: "instant", block: "start" });
      });
    });
  }

  /** Disclosure wrapper: header always visible, body folded away when closed. */
  function Section({
    id,
    count,
    note,
    className = "",
    children,
  }: {
    id: TopicSectionId;
    count?: number;
    note?: string;
    className?: string;
    children: React.ReactNode;
  }) {
    const open = isSectionOpen(id);
    const meta = topicSections[id];
    return (
      <article id={`topic-section-${id}`} className={`paper-panel topic-wide topic-section ${className}`.trim()} data-open={open}>
        <button
          className="section-toggle"
          onClick={() => toggleSection(id)}
          aria-expanded={open}
          aria-controls={`section-${id}`}
        >
          <span className="section-toggle-copy">
            <span className="eyebrow">{meta.eyebrow}</span>
            <strong>{meta.title}</strong>
          </span>
          <span className="section-toggle-meta">
            {typeof count === "number" ? <span className="section-count">{count}</span> : null}
            {note ? <small>{note}</small> : null}
            <span className="section-chevron" aria-hidden="true">{open ? "−" : "+"}</span>
          </span>
        </button>
        {open ? <div className="section-body" id={`section-${id}`}>{children}</div> : null}
      </article>
    );
  }

  function startRecall(scope: "due" | "topic") {
    setRecallScope(scope);
    setRecallRevealed(false);
    setSessionSeen([]);
    selectView("recall");
  }

  function openTopicExercise() {
    if (activeTopic.id === "estimation") {
      selectView("drills");
      return;
    }
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const related = activeTopic.relatedDesigns.map(normalize);
    const matched = designPrompts.find((prompt) => {
      const title = normalize(prompt.title);
      const id = normalize(prompt.id);
      return related.some((candidate) => candidate.includes(title) || title.includes(candidate) || candidate.includes(id) || id.includes(candidate));
    });
    const fallbackCategory: DesignCategory = activeTopic.tier <= 1 ? "classic" : activeTopic.tier === 2 ? "ml" : "llm";
    choosePractice(matched ?? designPrompts.find((prompt) => prompt.category === fallbackCategory) ?? designPrompts[0]);
  }

  function toggleTimer() {
    // At zero this used to compute `deadline = now + 0`, which re-fired the
    // expiry handler on the same tick: the button said "Resume" and did
    // nothing, forever. Zero is a distinct state — the only thing left to do
    // with the clock is start a new attempt's worth of it.
    const startFrom = secondsLeft > 0 ? secondsLeft : activePrompt.durationMinutes * 60;
    setStudy((current) => {
      if (current.draft.deadline) {
        return {
          ...current,
          draft: { ...current.draft, deadline: null, secondsRemaining: secondsLeft },
        };
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          deadline: Date.now() + startFrom * 1000,
          secondsRemaining: startFrom,
          startedAt: current.draft.startedAt || new Date().toISOString(),
        },
        activityDates: addActivity(current.activityDates),
      };
    });
    if (!study.draft.deadline) {
      setSecondsLeft(startFrom);
      // The expiry warning describes a clock that is no longer at zero.
      setNotice((current) => (current?.slot === "practice" && current.tone === "warn" ? null : current));
    }
  }

  function resetTimer() {
    // Reset sits one button away from Pause and used to throw a running attempt
    // away in silence. Only a *running* clock is worth a confirm; resetting an
    // idle or finished one costs nothing.
    if (study.draft.deadline && !window.confirm("Discard the running clock and reset it to the full attempt length?")) return;
    const seconds = activePrompt.durationMinutes * 60;
    setSecondsLeft(seconds);
    setStudy((current) => ({
      ...current,
      draft: { ...current.draft, deadline: null, secondsRemaining: seconds },
    }));
    setTimerAnnouncement("");
    // "Time. Take two minutes to summarize…" must not outlive the clock it
    // describes: after a reset there is a full attempt on the board again.
    setNotice((current) => (current?.slot === "practice" ? null : current));
  }

  function updateDraftField(field: PracticeField, value: string) {
    setStudy((current) => ({
      ...current,
      draft: { ...current.draft, fields: { ...current.draft.fields, [field]: value } },
    }));
  }

  function updateScore(field: ScoreField, value: number) {
    setStudy((current) => ({
      ...current,
      draft: { ...current.draft, scores: { ...current.draft.scores, [field]: value } },
    }));
  }

  function saveAttempt() {
    const now = new Date().toISOString();
    const attempt: SavedAttempt = {
      ...study.draft,
      deadline: null,
      secondsRemaining: secondsLeft,
      savedAt: now,
      durationMinutes: Math.max(1, Math.round(activePrompt.durationMinutes - secondsLeft / 60)),
    };
    const kept = study.attempts.filter((item) => item.id !== attempt.id);
    setStudy((current) => ({
      ...current,
      attempts: [attempt, ...current.attempts.filter((item) => item.id !== attempt.id)],
      activityDates: addActivity(current.activityDates),
      draft: { ...current.draft, deadline: null, secondsRemaining: secondsLeft },
    }));
    setNotice({
      slot: "practice",
      tone: "success",
      text: `Attempt saved — ${kept.length + 1} on record. Your dashboard and review history are up to date.`,
    });
  }

  function reopenAttempt(attempt: SavedAttempt) {
    const prompt = designPrompts.find((item) => item.id === attempt.promptId) ?? designPrompts[0];
    setStudy((current) => ({ ...current, draft: { ...attempt, deadline: null } }));
    setSecondsLeft(attempt.secondsRemaining);
    setPracticeCategory(prompt.category);
    setReferenceRevealed(false);
    selectView("practice");
    setNotice({
      slot: "practice",
      tone: "info",
      text: "Saved attempt reopened. Editing it will not replace the saved copy until you save again.",
    });
  }

  function addMistake() {
    if (!mistakeForm.mistake.trim() || !mistakeForm.correctApproach.trim()) {
      setNotice({ slot: "mistake", tone: "warn", text: "Add both the mistake and the corrected approach." });
      return;
    }
    const linkedCount = study.mistakes.filter(
      (item) => item.designProblemId === activePrompt.id && item.date === localDateKey(),
    ).length;
    if (view === "practice" && linkedCount >= 3) {
      setNotice({
        slot: "mistake",
        tone: "warn",
        text: "Keep the log focused: choose only the three highest-leverage mistakes from this attempt.",
      });
      return;
    }
    const mistake: Mistake = {
      id: newId("mistake"),
      date: localDateKey(),
      designProblemId: view === "practice" ? activePrompt.id : "general-review",
      category: mistakeForm.category,
      mistake: mistakeForm.mistake.trim(),
      correctApproach: mistakeForm.correctApproach.trim(),
      reviewDate: mistakeForm.reviewDate || tomorrowPlus(7),
      resolved: false,
    };
    setStudy((current) => ({
      ...current,
      mistakes: [mistake, ...current.mistakes],
      activityDates: addActivity(current.activityDates),
    }));
    setMistakeForm({
      category: mistakeCategories[0],
      mistake: "",
      correctApproach: "",
      reviewDate: tomorrowPlus(7),
    });
    // The queue table sits below the fold, so the count comes to the button
    // rather than the user having to scroll to find out anything happened.
    setNotice({
      slot: "mistake",
      tone: "success",
      text: `Added — ${unresolvedMistakes.length + 1} unresolved in the review queue.`,
    });
  }

  function toggleMistake(id: string) {
    setStudy((current) => ({
      ...current,
      mistakes: current.mistakes.map((item) =>
        item.id === id ? { ...item, resolved: !item.resolved } : item,
      ),
    }));
  }

  function randomizeMock() {
    const next = designPrompts[Math.floor(Math.random() * designPrompts.length)];
    setStudy((current) => ({ ...current, mock: { ...current.mock, promptId: next.id, checks: {} } }));
    setFollowUpsShown(false);
  }

  /**
   * The one thing the mock room never did: record that a mock happened. Without
   * it the stage ticks were a to-do list that erased itself on the next draw,
   * and nothing on Today or in the streak knew a spoken attempt had been run.
   */
  function logMock() {
    setStudy((current) => ({
      ...current,
      mock: {
        ...current.mock,
        checks: {},
        log: [{ promptId: current.mock.promptId, date: localDateKey() }, ...current.mock.log].slice(0, 200),
      },
      activityDates: addActivity(current.activityDates),
    }));
    setFollowUpsShown(false);
    setNotice({
      slot: "mock",
      tone: "success",
      text: `Logged — ${study.mock.log.length + 1} spoken mock${study.mock.log.length === 0 ? "" : "s"} on record. The stage checklist is clear for the next one.`,
    });
  }

  function toggleMockPhase(phaseId: string, checked: boolean) {
    setStudy((current) => ({
      ...current,
      mock: { ...current.mock, checks: { ...current.mock.checks, [phaseId]: checked } },
    }));
  }

  function toggleChecklistQuestion(questionId: string, checked: boolean) {
    setStudy((current) => ({
      ...current,
      draft: { ...current.draft, checklist: { ...current.draft.checklist, [questionId]: checked } },
    }));
  }

  /**
   * Twelve weeks of notes, attempts and mistakes used to end at one misclick
   * plus one Enter, with no snapshot anywhere. localStorage is the only store
   * here, so the destructive path now leaves two ways back: a copy under the
   * backup key that outlives the reset, and an in-page Undo for this session.
   */
  function resetProgress() {
    if (!window.confirm("Reset all locally saved progress, notes, attempts, and mistakes for this site?")) return;
    const snapshot = JSON.stringify(study);
    try {
      window.localStorage.setItem(BACKUP_KEY, snapshot);
    } catch {
      // A full quota must not turn "reset with a backup" into "reset without
      // one" silently; the notice below says which of the two happened.
    }
    setResetBackup(snapshot);
    window.localStorage.removeItem(STORAGE_KEY);
    const fresh = defaultState();
    fresh.theme = study.theme;
    setStudy(fresh);
    setSecondsLeft(fresh.draft.secondsRemaining);
    setPracticeCategory(designPrompts[0].category);
    setReferenceRevealed(false);
    setQuizAnswers({});
    setSessionSeen([]);
    setRecallRevealed(false);
    setChecklistOpen(false);
    setNotice(null);
  }

  function undoReset() {
    if (!resetBackup) return;
    const restored = mergeStoredState(resetBackup);
    const prompt = designPrompts.find((item) => item.id === restored.draft.promptId) ?? designPrompts[0];
    setStudy(restored);
    setSecondsLeft(
      restored.draft.deadline
        ? Math.max(0, Math.ceil((restored.draft.deadline - Date.now()) / 1000))
        : restored.draft.secondsRemaining,
    );
    setPracticeCategory(prompt.category);
    setResetBackup(null);
    window.localStorage.removeItem(BACKUP_KEY);
    setNotice({
      slot: "danger",
      tone: "success",
      text: `Restored — ${restored.mistakes.length} mistake${restored.mistakes.length === 1 ? "" : "s"}, ${restored.attempts.length} attempt${restored.attempts.length === 1 ? "" : "s"}, and every module's progress are back.`,
    });
  }

  /**
   * The cheap half of the safety net, and the only one that survives clearing
   * the browser: the whole store as a file the learner keeps.
   */
  function exportProgress() {
    const payload = JSON.stringify(study, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `system-design-lab-${localDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice({
      slot: "danger",
      tone: "success",
      text: `Downloaded system-design-lab-${localDateKey()}.json — ${Math.round(payload.length / 1024)} KB covering every module, attempt, and mistake.`,
    });
  }

  /**
   * The inline acknowledgement for one slot. Always rendered as a live region so
   * the message reaches assistive tech even when the slot is empty on arrival.
   */
  function renderNotice(slot: NoticeSlot) {
    const shown = notice?.slot === slot ? notice : null;
    return (
      <p
        className={`inline-notice${shown ? ` is-shown tone-${shown.tone}` : ""}`}
        data-slot={slot}
        role="status"
        aria-live="polite"
      >
        {shown ? shown.text : ""}
      </p>
    );
  }

  /**
   * The four dashboard metrics. A zero used to render as a 37px numeral with no
   * explanation and nowhere to go, three of them unactionable by construction on
   * day one — so each tile carries the meaning of its empty state and a route in.
   */
  function metricTiles(firstTopicId: string) {
    type Tile = {
      /** Zero-padded, like every other index in the app. These four were the
       *  only A–D sequence in a product that numbers 01–08 nav items, 01–03
       *  ledger rows, W01–W12 weeks and M1–M4 modules. */
      index: string;
      value: number;
      label: string;
      emptyLabel: string;
      action?: { label: string; run: () => void };
      emptyAction?: { label: string; run: () => void };
    };
    const tiles: Tile[] = [
      {
        index: "01",
        value: streak,
        label: "day study streak",
        emptyLabel: "Streak starts with your first completed module",
        emptyAction: { label: "Open the next module", run: () => openTopic(firstTopicId) },
      },
      {
        index: "02",
        value: dueCards.length,
        label: "cards due for recall",
        emptyLabel: "Recall unlocks once a module is started",
        action: { label: "Start review", run: () => startRecall("due") },
        emptyAction: { label: "Start a module", run: () => openTopic(firstTopicId) },
      },
      {
        index: "03",
        value: unresolvedMistakes.length,
        label: "mistakes to review",
        emptyLabel: "Mistake log is empty",
        action: { label: "Open the log", run: () => selectView("review") },
        emptyAction: { label: "Open the log", run: () => selectView("review") },
      },
      {
        index: "04",
        value: weakTopics.length,
        label: "weak topics flagged",
        // "Nothing rated 1 or 2" would be a lie once a low-rated module is
        // finished, since finishing it takes it out of the flag.
        emptyLabel: ratedTopicCount
          ? `Nothing flagged · ${ratedTopicCount} module${ratedTopicCount === 1 ? "" : "s"} rated`
          : "No module rated yet",
        action: { label: "Review them", run: () => openTopic(weakTopics[0]?.id ?? firstTopicId) },
        emptyAction: { label: "Rate a module", run: () => openTopic(firstTopicId) },
      },
    ];
    return tiles;
  }

  function renderDashboard() {
    const dueTopics = currentWeekTopics.filter((topic) => study.topics[topic.id]?.status !== "completed").slice(0, 3);
    // Key off the week's tier, not its number: the syllabus was re-paced to
    // twelve weeks and a hardcoded week ladder silently recommends the wrong
    // discipline the moment those boundaries move.
    const targetCategory: DesignCategory = currentWeek.tier >= 3 ? "llm" : currentWeek.tier === 2 ? "ml" : "classic";
    // Prefer the designs this week actually schedules; fall back to the tier's
    // whole library when the week names none.
    const scheduled = designPrompts.filter((prompt) => currentWeek.designs.includes(prompt.title));
    const nextPromptPool = scheduled.length > 0
      ? scheduled
      : designPrompts.filter((prompt) => prompt.category === targetCategory);
    const nextPrompt = nextPromptPool[study.attempts.length % nextPromptPool.length] ?? designPrompts[0];
    const dueMinutes = dueTopics.reduce((sum, topic) => sum + topic.estimatedMinutes, 0);
    const latestAttempt = study.attempts[0];
    // Mock interview had no inbound link from anywhere, while the syllabus
    // schedules spoken mocks in weeks 7, 10 and 12. Read that off the modules
    // themselves rather than hardcoding a week ladder that the re-pacing to
    // twelve weeks would silently invalidate again.
    const mockModules = currentWeekTopics.filter((topic) => topic.id.startsWith("mock-"));
    const mockModulesLeft = mockModules.filter((topic) => study.topics[topic.id]?.status !== "completed");
    return (
      <>
        {/* This opened with a hardcoded headline and a lede that read the same
            on day 1 and day 365, and put the actual to-do list 82% below the
            fold. The masthead is now the state the learner came to check, and
            the second button moved out: the practice ticket below fires the
            identical action from 600px closer to the thing it describes. */}
        <section className="hero-grid" aria-labelledby="dashboard-title">
          <div className="hero-copy">
            <h1 id="dashboard-title">
              Week {currentWeek.week} · {completedWeekTopics} of {currentWeekTopics.length} modules
              {dueCards.length > 0 ? ` · ${dueCards.length} cards due` : ""}
            </h1>
            <p className="hero-lede">
              {dueTopics.length > 0
                ? <>Next up: <strong>{dueTopics[0].title}</strong> · {dueTopics[0].estimatedMinutes} min</>
                : <>Week {currentWeek.week} is complete. Consolidate it with a timed design.</>}
            </p>
            <div className="hero-actions">
              <button className="button primary" onClick={() => openTopic(dueTopics[0]?.id ?? currentWeekTopics[0].id)}>
                {dueTopics.length > 0 ? "Start today's study" : "Reopen this week"}
              </button>
            </div>
          </div>

          <div className="progress-seal" style={{ "--progress": `${weekProgressPercent * 3.6}deg` } as CSSProperties}>
            <div className="progress-seal-inner">
              <strong>{weekProgressPercent}%</strong>
              <span>Week {currentWeek.week}</span>
            </div>
            <p>{completedWeekTopics} of {currentWeekTopics.length} modules complete</p>
          </div>
        </section>

        <section className="metric-strip" aria-label="Study status">
          {metricTiles(dueTopics[0]?.id ?? currentWeekTopics[0].id).map((tile) => {
            const filled = tile.value > 0;
            // A zero here is not a number the user can act on, it is a state
            // with a way out. Both get the affordance the one live metric had.
            const action = filled ? tile.action : tile.emptyAction;
            return (
              <article
                key={tile.index}
                className={filled ? (action ? "metric-actionable" : undefined) : "metric-empty"}
              >
                <span className="metric-index">{tile.index}</span>
                {filled ? <strong>{tile.value}</strong> : null}
                <p>{filled ? tile.label : tile.emptyLabel}</p>
                {action ? <button className="metric-action" onClick={action.run}>{action.label} →</button> : null}
              </article>
            );
          })}
        </section>

        <div className="dashboard-grid">
          <section className="paper-panel today-panel" aria-labelledby="today-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Study ledger</p>
                <h2 id="today-heading">Due today</h2>
              </div>
              <span className="section-note">{dueMinutes ? `~${Math.max(1, Math.round(dueMinutes / 60))} hours total` : "Week complete"}</span>
            </div>
            <div className="task-list">
              {dueTopics.length ? dueTopics.map((topic, index) => (
                <article className="task-row" key={topic.id}>
                  <button
                    className="completion-box"
                    aria-label={`Mark ${topic.title} complete`}
                    onClick={() => updateTopic(topic.id, { status: "completed" })}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                  <button className="task-copy" onClick={() => openTopic(topic.id)}>
                    <strong>{topic.title}</strong>
                    <span>Week {topic.week} · Module {topic.day} · {topic.estimatedMinutes} min</span>
                  </button>
                  <span className={`status-mark ${study.topics[topic.id]?.status}`}>
                    {statusLabel(study.topics[topic.id]?.status ?? "not-started")}
                  </span>
                </article>
              )) : (
                <div className="empty-state">
                  <strong>Week {currentWeek.week} complete.</strong>
                  <p>Use a timed design to consolidate the week before moving on.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="practice-ticket" aria-labelledby="next-practice-heading">
            <p className="eyebrow inverted">Next full design</p>
            <h2 id="next-practice-heading">{nextPrompt.title}</h2>
            <p>{nextPrompt.prompt}</p>
            <div className="ticket-meta">
              <span>{nextPrompt.category}</span><span>{nextPrompt.difficulty}</span><span>{nextPrompt.durationMinutes} min</span>
            </div>
            <div className="ticket-actions">
              <button className="button primary on-dark" onClick={() => choosePractice(nextPrompt)}>Open practice room</button>
              {/* Mock had exactly one inbound link, on a panel that only appears
                  in the three weeks the syllabus schedules a mock module. The
                  written and the spoken form of the same attempt belong side by
                  side, on every day. */}
              <button className="text-button inverted" onClick={() => selectView("mock")}>Or run it spoken →</button>
            </div>
          </aside>

          {mockModules.length > 0 ? (
            <section className="paper-panel mock-call" aria-labelledby="mock-call-heading">
              <div>
                <p className="eyebrow">Week {currentWeek.week} schedules a spoken mock</p>
                <h2 id="mock-call-heading">
                  {mockModules.length} mock module{mockModules.length === 1 ? "" : "s"} this week
                  {mockModulesLeft.length === 0 ? " · all complete" : ""}
                </h2>
                <p>
                  {mockModulesLeft.length > 0
                    ? `Next up: ${mockModulesLeft[0].title}. Say the answer out loud against a drawn prompt and a stage checklist — reading it back silently is a different skill.`
                    : "You have finished this week's mock modules. Draw a fresh prompt and run one more against the clock."}
                </p>
                <p className="mock-call-log">
                  {study.mock.log.length === 0
                    ? "No spoken mock logged yet."
                    : `${study.mock.log.length} spoken mock${study.mock.log.length === 1 ? "" : "s"} logged · last ${study.mock.log[0].date}`}
                </p>
              </div>
              <div className="mock-call-actions">
                <button className="button primary" onClick={() => selectView("mock")}>Open the mock room</button>
                {mockModulesLeft.length > 0 ? (
                  <button className="button quiet" onClick={() => openTopic(mockModulesLeft[0].id)}>
                    Read module {mockModulesLeft[0].day} first
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="paper-panel framework-panel" aria-labelledby="framework-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Reusable structure</p>
                <h2 id="framework-heading">The {BASELINE_INTERVIEW_MINUTES}-minute loop</h2>
              </div>
              <button className="text-button" onClick={() => selectView("practice")}>Use in practice →</button>
            </div>
            <ol className="phase-line">
              {interviewPhases.map((phase, index) => (
                <li key={phase.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{phase.label}</strong>
                  <small>{phaseMinutes(phase.share, BASELINE_INTERVIEW_MINUTES)} min</small>
                </li>
              ))}
            </ol>
          </section>

          <section className="paper-panel signals-panel" aria-labelledby="signals-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Feedback loop</p>
                <h2 id="signals-heading">Signals to revisit</h2>
              </div>
            </div>
            {weakTopics.length ? (
              <div className="signal-list">
                {weakTopics.slice(0, 3).map((topic) => (
                  <button key={topic.id} onClick={() => openTopic(topic.id)}>
                    <span>Confidence {study.topics[topic.id].confidence}/5</span>
                    <strong>{topic.title}</strong>
                  </button>
                ))}
              </div>
            ) : unresolvedMistakes.length ? (
              <div className="signal-list">
                {unresolvedMistakes.slice(0, 3).map((mistake) => (
                  <button key={mistake.id} onClick={() => selectView("review")}>
                    <span>{mistake.category}</span>
                    <strong>{mistake.mistake}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">
                <strong>No weak signals yet.</strong>
                <p>Rate confidence honestly after each topic; this panel will become your review queue.</p>
              </div>
            )}
            {latestAttempt && (
              <button className="attempt-preview" onClick={() => reopenAttempt(latestAttempt)}>
                <span>Latest attempt</span>
                <strong>{designPrompts.find((item) => item.id === latestAttempt.promptId)?.title}</strong>
                <em>{averageScore(latestAttempt.scores).toFixed(1)}/5 average →</em>
              </button>
            )}
          </section>
        </div>
      </>
    );
  }

  function renderCurriculum() {
    return (
      <section aria-labelledby="curriculum-title">
        <div className="page-intro">
          <div>
            <p className="eyebrow">{curriculumWeeks.length}-week program</p>
            <h1 id="curriculum-title">A deliberate path from fundamentals to mocks.</h1>
          </div>
          <p>{allTopics.length} senior-level modules with mechanisms, failure diagnosis, decision rules, quizzes, and {designPrompts.length} full design rooms.</p>
        </div>

        <div className="week-list">
          {curriculumWeeks.map((week) => {
            const weekTopics = allTopics.filter((topic) => topic.week === week.week);
            const finished = weekTopics.filter((topic) => study.topics[topic.id]?.status === "completed").length;
            // Curriculum had 53 buttons and not one of them was primary: an
            // expanded week offered a flat grid with no "and the thing to do
            // here is this". The first unfinished module is that thing.
            const weekNext = weekTopics.find((topic) => study.topics[topic.id]?.status !== "completed");
            return (
              <details className="week-row" key={week.week} open={week.week === currentWeek.week}>
                <summary>
                  <span className="week-number">W{String(week.week).padStart(2, "0")}</span>
                  <span className="week-title">
                    <small>Tier {week.tier} · {finished}/{weekTopics.length} complete</small>
                    <strong>{week.title}</strong>
                  </span>
                  <span className="week-hours">{week.hours}</span>
                </summary>
                <div className="week-content">
                  <p>{week.focus}</p>
                  <div>
                    <span className="mini-label">Concepts</span>
                    <ul className="tag-list">{week.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
                  </div>
                  <div>
                    <span className="mini-label">Full designs</span>
                    <ul className="plain-list">{week.designs.map((design) => <li key={design}>{design}</li>)}</ul>
                  </div>
                  {week.extraDesigns.length > 0 && (
                    <div>
                      <span className="mini-label">Extra practice</span>
                      <ul className="plain-list">{week.extraDesigns.map((design) => <li key={design}>{design}</li>)}</ul>
                    </div>
                  )}
                  <div className="week-one-grid">
                    {weekTopics.map((topic) => (
                      <button key={topic.id} onClick={() => openTopic(topic.id)}>
                        <span>Module {topic.day}</span>
                        <strong>{topic.title}</strong>
                        <small>{statusLabel(study.topics[topic.id]?.status ?? "not-started")} · {topic.estimatedMinutes} min</small>
                      </button>
                    ))}
                  </div>
                  <div className="week-commit">
                    {weekNext ? (
                      <button className="button primary" onClick={() => openTopic(weekNext.id)}>
                        {finished === 0 ? `Start module ${weekNext.day}` : `Continue with module ${weekNext.day}`}
                      </button>
                    ) : (
                      <button className="button" onClick={() => openTopic(weekTopics[0].id)}>Revisit module 1</button>
                    )}
                    <span className="section-note">{weekNext ? weekNext.title : `Week ${week.week} complete`}</span>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    );
  }

  function renderTopic() {
    const topicProgress = study.topics[activeTopic.id];
    // One marking scope per section, created fresh on every render so the
    // output stays a pure function of the topic. Scoping per section rather
    // than per module is deliberate: most sections are collapsed, and a
    // once-per-module rule would spend a term's only mark inside a panel the
    // reader never opened. See app/content/glossaryMatch.ts.
    const markPrimer = createSectionMarker(activeTopic.glossary);
    const markMechanics = createSectionMarker(activeTopic.glossary);
    const markTradeoffs = createSectionMarker(activeTopic.glossary);
    const markFailures = createSectionMarker(activeTopic.glossary);
    const markQuestions = createSectionMarker(activeTopic.glossary);
    const markChecklist = createSectionMarker(activeTopic.glossary);
    const markConcepts = createSectionMarker(activeTopic.glossary);
    const activeWeek = curriculumWeeks.find((week) => week.week === activeTopic.week);
    // "Next" has to mean what is actually next for this learner. Incrementing
    // the index blindly sends someone who worked out of order straight back
    // into a module they already finished, so prefer the first unfinished one
    // after this and say plainly which of the two the button is offering.
    const topicIndex = allTopics.findIndex((item) => item.id === activeTopic.id);
    const immediateNext = allTopics[topicIndex + 1];
    const nextTopic = allTopics.slice(topicIndex + 1).find((item) => study.topics[item.id]?.status !== "completed")
      ?? immediateNext;
    return (
      <section aria-labelledby="topic-title">
        {/* The module page had no route back up to the syllabus it belongs to:
            Curriculum was reachable only from the sidebar. */}
        <nav className="topic-breadcrumb" aria-label="Breadcrumb">
          <button className="text-button" onClick={() => selectView("curriculum")}>Curriculum</button>
          <span aria-hidden="true">/</span>
          {/* Context, not a link: the week tabs immediately below already own
              "switch week", and a crumb that jumped you to a different module
              would be a navigation dressed up as a location. */}
          <span>Week {String(activeTopic.week).padStart(2, "0")} · {activeWeek?.title ?? "This week"}</span>
          <span aria-hidden="true">/</span>
          {/* Absorbed the header eyebrow, which said the same week and module
              number 400px further down. */}
          <span aria-current="page">Module {activeTopic.day} · {activeTopic.estimatedMinutes} min</span>
        </nav>

        <div className="topic-header">
          <div>
            <h1 id="topic-title">{activeTopic.title}</h1>
            <p>{activeTopic.summary}</p>
            <div className="topic-context">
              <span>Prerequisites: {activeTopic.prerequisites.map(resolveContentLabel).join(" · ")}</span>
              <span>Related: {activeTopic.relatedDesigns.map(resolveContentLabel).join(" · ")}</span>
            </div>
          </div>
          <div className="topic-controls">
            {/* Nothing is pressed until the learner presses it, so the label has
                to say which of the two states this is. */}
            <span className="mini-label">
              Confidence
              <em className="control-state">
                {topicProgress.confidence === null ? "Not rated" : `${topicProgress.confidence}/5`}
              </em>
            </span>
            <div
              className="confidence-picker"
              role="group"
              aria-label={topicProgress.confidence === null
                ? "Confidence from 1 to 5, not rated yet"
                : `Confidence from 1 to 5, currently ${topicProgress.confidence}`}
              data-rated={topicProgress.confidence !== null}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  aria-pressed={topicProgress.confidence === value}
                  onClick={() => updateTopic(activeTopic.id, { confidence: value, status: topicProgress.status === "not-started" ? "in-progress" : topicProgress.status })}
                >{value}</button>
              ))}
            </div>
            <div className="topic-status-row">
              {/* Completion used to be confirmed only by the button relabelling
                  itself. The chip states the module's status in its own words. */}
              <span className={`status-mark ${topicProgress.status}`} data-status={topicProgress.status}>
                {topicProgress.status === "completed" ? "✓ " : ""}{statusLabel(topicProgress.status)}
              </span>
              <button
                className={`button ${topicProgress.status === "completed" ? "quiet" : "primary"}`}
                onClick={() => updateTopic(activeTopic.id, { status: topicProgress.status === "completed" ? "in-progress" : "completed" })}
              >
                {topicProgress.status === "completed" ? "Mark in progress" : "Mark complete"}
              </button>
            </div>
          </div>
        </div>

        {/* Both switchers moved below the title. Navigation to a module you are
            not reading is not the first thing a module page has to say. */}
        <div className="topic-switcher">
          <div className="topic-week-chips" role="group" aria-label="Curriculum week">
            {curriculumWeeks.map((week) => {
              const current = week.week === topicWeek;
              return (
                <button
                  key={week.week}
                  className={current ? "active" : ""}
                  onClick={() => chooseTopicWeek(week.week)}
                  aria-pressed={current}
                >
                  <span>W{String(week.week).padStart(2, "0")}</span>
                  {/* Only the week you are on spells its title out. The other
                      eleven keep theirs for screen readers, which cannot infer
                      "Observability" from "W07". */}
                  {current
                    ? <strong>{week.title}</strong>
                    : <em className="sr-only">{week.title}</em>}
                </button>
              );
            })}
          </div>

          <div className="topic-picker" role="group" aria-label={`Week ${topicWeek} modules`}>
            {visibleTopicWeek.map((topic) => {
              const status = study.topics[topic.id]?.status ?? "not-started";
              return (
                <button
                  key={topic.id}
                  className={topic.id === activeTopic.id ? "active" : ""}
                  onClick={() => setActiveTopicId(topic.id)}
                  aria-pressed={topic.id === activeTopic.id}
                  data-status={status}
                >
                  {/* The chip is the one part of the page still on screen after
                      marking complete, so completion has to show here too. */}
                  <span>{status === "completed" ? "✓" : `M${topic.day}`}</span>
                  {topic.title}
                  {status === "completed" ? <em className="sr-only">completed</em> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* The module's own contents. Eight foldable sections with no anchors
            made "go and read the trade-offs" a scroll hunt through four screens
            of primer; each chip jumps to its section and opens it if closed. */}
        <nav className="topic-subrail" aria-label="Sections in this module" ref={subrailRef} data-fade={subrailFade}>
          {topicSectionOrder.map((id) => {
            const open = isSectionOpen(id);
            return (
              <button
                key={id}
                data-open={open}
                aria-expanded={open}
                aria-controls={`topic-section-${id}`}
                onClick={() => jumpToSection(id)}
              >
                {topicSections[id].short}
              </button>
            );
          })}
        </nav>

        <div className="topic-grid">
          <article className="topic-why topic-wide">
            <p className="eyebrow inverted">Why senior interviewers care</p>
            <h2>{activeTopic.whyItMatters}</h2>
          </article>
          <article className="paper-panel">
            <p className="eyebrow">Learning objectives</p>
            <ul className="number-list">
              {activeTopic.objectives.map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}
            </ul>
          </article>
          <article className="paper-panel">
            <p className="eyebrow">Core concepts</p>
            {/* This panel used to restate, without definitions, a subset of a
                glossary 5,000px below it. Running the chips through the same
                marker the prose uses turns the restatement into the definition:
                ~71% of them are glossary terms, and those now answer in place
                instead of pointing at a list nobody scrolls to. */}
            <ul className="tag-list large">
              {activeTopic.concepts.map((item) => <li key={item}><Prose nodes={markConcepts(item)} /></li>)}
            </ul>
          </article>

          <Section id="primer" note="No background assumed" className="primer-panel">
            <div className="primer-lede">
              <p className="primer-plain"><Prose nodes={markPrimer(activeTopic.primer.plainSummary)} /></p>
              <aside className="primer-analogy">
                <p className="eyebrow">Think of it like</p>
                <p><Prose nodes={markPrimer(activeTopic.primer.analogy)} /></p>
              </aside>
            </div>
            <div className="primer-sections">
              {activeTopic.primer.sections.map((section, index) => (
                <section key={section.heading}>
                  <h3><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{section.heading}</h3>
                  {section.body.map((paragraph) => <p key={paragraph.slice(0, 48)}><Prose nodes={markPrimer(paragraph)} /></p>)}
                </section>
              ))}
            </div>
            <figure className="primer-example">
              <figcaption>
                <p className="eyebrow">Worked example</p>
                <strong>{activeTopic.primer.workedExample.title}</strong>
              </figcaption>
              <p className="primer-example-setup"><Prose nodes={markPrimer(activeTopic.primer.workedExample.setup)} /></p>
              <ol>
                {activeTopic.primer.workedExample.steps.map((step, index) => (
                  <li key={step.slice(0, 48)}><span aria-hidden="true">{index + 1}</span><p><Prose nodes={markPrimer(step)} /></p></li>
                ))}
              </ol>
              <p className="primer-example-takeaway"><strong>Takeaway.</strong> <Prose nodes={markPrimer(activeTopic.primer.workedExample.takeaway)} /></p>
            </figure>
          </Section>

          <Section id="mechanics" count={activeTopic.deepDive.length} note="Explain, don't name-drop" className="deep-dive-panel">
            <div className="deep-dive-list">
              {activeTopic.deepDive.map((section, index) => (
                <details key={section.title} open={index === 0}>
                  <summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{section.title}</strong></summary>
                  <p><Prose nodes={markMechanics(section.summary)} /></p>
                  <ul>{section.points.map((point) => <li key={point}><Prose nodes={markMechanics(point)} /></li>)}</ul>
                </details>
              ))}
            </div>
          </Section>

          <Section id="glossary" count={activeTopic.glossary.length} note="Also on hover, in place" className="glossary-panel">
            <p className="section-lede">
              Every term is marked at its first use in each section above — hover, tap, or tab to it for the
              definition. This is the same list, for scanning before an interview: cover the definitions and
              see how many you can say.
            </p>
            <dl className="glossary-list">
              {activeTopic.glossary.map((entry) => (
                <div key={entry.term}>
                  <dt>
                    {entry.term}
                    {entry.expansion ? <span className="glossary-expansion">{entry.expansion}</span> : null}
                  </dt>
                  <dd>{entry.definition}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="tradeoffs" count={activeTopic.tradeoffs.length}>
            <div className="tradeoff-table">
              {activeTopic.tradeoffs.map((item) => (
                <div key={item.decision}>
                  <strong>{item.decision}</strong>
                  <p><span>A</span><Prose nodes={markTradeoffs(item.preferA)} /></p>
                  <p><span>B</span><Prose nodes={markTradeoffs(item.preferB)} /></p>
                  <small>Watch: <Prose nodes={markTradeoffs(item.watch)} /></small>
                </div>
              ))}
            </div>
          </Section>

          <Section id="failures" count={activeTopic.failureModes.length} className="danger-paper">
            <div className="failure-grid">
              {activeTopic.failureModes.map((item) => (
                <div key={item.mode}>
                  <strong>{item.mode}</strong>
                  <p><span>Signal</span><Prose nodes={markFailures(item.symptom)} /></p>
                  <p><span>Mitigation</span><Prose nodes={markFailures(item.mitigation)} /></p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="questions" count={activeTopic.interviewQuestions.length}>
            <ol className="question-list">{activeTopic.interviewQuestions.map((item) => <li key={item}><Prose nodes={markQuestions(item)} /></li>)}</ol>
          </Section>

          <Section id="checklist" count={activeTopic.decisionChecklist.length} className="decision-panel">
            <ul className="decision-checklist">
              {activeTopic.decisionChecklist.map((item) => <li key={item}><span>✓</span><Prose nodes={markChecklist(item)} /></li>)}
            </ul>
          </Section>

          <article className="paper-panel topic-wide recall-cta">
            <div>
              <p className="eyebrow">Retrieval practice</p>
              <h2>Close the page and say it back.</h2>
              <p>{topicCards.length} scheduled cards for this module. Free recall builds the pathway you need under interview pressure; recognising a right answer in a list does not.</p>
            </div>
            <button className="button primary" onClick={() => startRecall("topic")}>Drill this module</button>
          </article>

          <Section id="quiz" count={activeTopic.quiz.length} className="quiz-panel">
            <div className="quiz-list">
              {activeTopic.quiz.map((question, questionIndex) => {
                const selected = quizAnswers[activeTopic.id]?.[questionIndex];
                const answered = selected !== undefined;
                return (
                  <fieldset key={question.prompt}>
                    <legend><span>Q{questionIndex + 1}</span>{question.prompt}</legend>
                    <div className="quiz-options">
                      {question.options.map((option, optionIndex) => {
                        const isCorrect = answered && optionIndex === question.answerIndex;
                        const isWrong = answered && optionIndex === selected && optionIndex !== question.answerIndex;
                        // Colour alone cannot carry the verdict: the letter becomes a
                        // mark and the state is spelled out for screen readers and for
                        // anyone who cannot separate the mint and pink washes.
                        const verdict = isCorrect
                          ? (optionIndex === selected ? "Correct — your answer" : "Correct answer")
                          : isWrong ? "Your answer — incorrect" : null;
                        return (
                          <button
                            type="button"
                            key={option}
                            className={isCorrect ? "correct" : isWrong ? "wrong" : ""}
                            onClick={() => answerQuiz(activeTopic.id, questionIndex, optionIndex)}
                            disabled={answered}
                            aria-pressed={answered ? optionIndex === selected : undefined}
                          >
                            <span className="quiz-mark" aria-hidden="true">
                              {isCorrect ? "✓" : isWrong ? "✗" : String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span>{option}{verdict ? <em className="quiz-verdict">{verdict}</em> : null}</span>
                          </button>
                        );
                      })}
                    </div>
                    {answered && <p className="quiz-explanation" role="status" aria-live="polite">{selected === question.answerIndex ? "Correct. " : "Not quite. "}{question.explanation}</p>}
                  </fieldset>
                );
              })}
            </div>
          </Section>

          <article className="exercise-card topic-wide">
            <div><p className="eyebrow inverted">Component exercise</p><h2>{activeTopic.exercise}</h2></div>
            <button className="button primary on-dark" onClick={openTopicExercise}>Open workspace</button>
          </article>

          {activeTopic.furtherReading?.length ? (
            <article className="paper-panel topic-wide reading-panel">
              <p className="eyebrow">Primary reading</p>
              <div>{activeTopic.furtherReading.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.label}<span>↗</span></a>)}</div>
            </article>
          ) : null}

          <article className="paper-panel topic-wide">
            <label className="field-label" htmlFor="topic-notes">Personal notes</label>
            <textarea
              id="topic-notes"
              className="lined-textarea"
              value={topicProgress.notes}
              onChange={(event) => updateTopic(activeTopic.id, { notes: event.target.value, status: topicProgress.status === "not-started" ? "in-progress" : topicProgress.status })}
              placeholder="Capture the one distinction or failure mode you want to recall tomorrow…"
              rows={6}
            />
            <p className="save-hint">Saved on this device as you type.</p>
          </article>

          {/* The page used to end here, ~6,900px below "Mark complete", with
              nothing to press. Every action the end of a module implies now
              lives at the end of the module. */}
          <article className="paper-panel topic-wide topic-next">
            <div className="topic-next-copy">
              <p className="eyebrow">End of module</p>
              <h2>
                {topicProgress.status === "completed"
                  ? "Module complete. Keep the loop going."
                  : "Finished reading? Close it out."}
              </h2>
              <p>
                {topicProgress.status === "completed"
                  ? "Recall is what makes it stick — drill the cards now, then take the next module."
                  : "Mark it done, drill its cards while the material is fresh, or move on and come back."}
              </p>
            </div>
            <div className="topic-next-actions">
              {topicProgress.status === "completed" ? null : (
                <button
                  className="button primary"
                  onClick={() => updateTopic(activeTopic.id, { status: "completed" })}
                >
                  Mark complete
                </button>
              )}
              {topicCards.length ? (
                <button className="button quiet" onClick={() => startRecall("topic")}>
                  Drill {topicCards.length} cards
                </button>
              ) : null}
            </div>
            {nextTopic ? (
              <button className="topic-next-link" onClick={() => openTopic(nextTopic.id)}>
                <span>{nextTopic.id === immediateNext?.id ? "Next module" : "Next unfinished module"}</span>
                <strong>{nextTopic.title}</strong>
                <small>
                  Week {nextTopic.week} · Module {nextTopic.day} · {nextTopic.estimatedMinutes} min ·{" "}
                  {statusLabel(study.topics[nextTopic.id]?.status ?? "not-started")}
                </small>
                <em aria-hidden="true">→</em>
              </button>
            ) : (
              <button className="topic-next-link" onClick={() => selectView("curriculum")}>
                <span>Last module in the syllabus</span>
                <strong>Back to the {curriculumWeeks.length}-week curriculum</strong>
                <small>Pick any week to revisit, or run a mock</small>
                <em aria-hidden="true">→</em>
              </button>
            )}
          </article>
        </div>
      </section>
    );
  }

  function renderRecall() {
    const graded = sessionSeen.length;
    const remaining = recallQueue.length;
    const scheduled = activeCard ? study.srs[activeCard.key] : undefined;
    // The honest-grading sermon is a first-session artifact. Once there is a
    // real schedule to read, it is 100px of instructions the learner has
    // already followed, sitting between them and the card.
    const firstSession = Object.keys(study.srs).length === 0;

    return (
      <section aria-labelledby="recall-title">
        <div className="page-intro" data-terse={!firstSession}>
          <div>
            <p className="eyebrow">Retrieval practice</p>
            <h1 id="recall-title">Answer first. Then reveal.</h1>
          </div>
          {firstSession ? (
            <p>Say the answer out loud before revealing it. Grading yourself honestly is what sets the next interval—marking a card you fumbled as Good is only cheating the schedule.</p>
          ) : (
            <p className="page-intro-terse">Out loud, then reveal. Grade what actually happened.</p>
          )}
        </div>

        <div className="recall-toolbar">
          <div className="recall-scope" role="group" aria-label="Review scope">
            <button className={recallScope === "due" ? "active" : ""} onClick={() => startRecall("due")}>
              Due today<span>{dueCards.length}</span>
            </button>
            <button className={recallScope === "topic" ? "active" : ""} onClick={() => startRecall("topic")}>
              This module<span>{topicCards.length}</span>
            </button>
          </div>
          <p className="recall-counter" aria-live="polite">
            {graded} graded · {remaining} left
          </p>
        </div>

        {activeCard ? (
          <article className="paper-panel recall-card">
            <div className="recall-card-meta">
              <span className={`recall-kind ${activeCard.kind}`}>{activeCard.kind === "recall" ? "Free recall" : "Multiple choice"}</span>
              <span>{activeCard.topicTitle}</span>
              {scheduled ? (
                <span className="recall-history">
                  {scheduled.reps} review{scheduled.reps === 1 ? "" : "s"}
                  {scheduled.lapses > 0 ? ` · ${scheduled.lapses} lapse${scheduled.lapses === 1 ? "" : "s"}` : ""}
                </span>
              ) : <span className="recall-history">New card</span>}
            </div>

            <h2 className="recall-prompt">{activeCard.prompt}</h2>

            {activeCard.kind === "quiz" && activeCard.options ? (
              <ol className="recall-options">
                {activeCard.options.map((option, index) => (
                  <li key={option} className={recallRevealed && index === activeCard.answerIndex ? "correct" : ""}>
                    <span>{String.fromCharCode(65 + index)}</span>{option}
                  </li>
                ))}
              </ol>
            ) : null}

            {recallRevealed ? (
              <div className="recall-answer" role="region" aria-live="polite">
                <p className="eyebrow">Model answer</p>
                <p>{activeCard.answer}</p>
              </div>
            ) : (
              <button className="button primary recall-reveal" onClick={revealAnswer}>
                Reveal answer <kbd>space</kbd>
              </button>
            )}

            {recallRevealed ? (
              <div className="recall-grades">
                {gradeButtons.map((button, index) => (
                  <button key={button.id} className={`grade-${button.id}`} onClick={() => gradeRecall(activeCard.key, button.id)}>
                    <strong>{button.label}<kbd>{index + 1}</kbd></strong>
                    <small>{button.hint}</small>
                    <span>{describeNextInterval(study.srs[activeCard.key] ?? newSrsCard(localDateKey()), button.id)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ) : (
          <article className="paper-panel empty-state">
            <strong>{graded > 0 ? `Session complete — ${graded} card${graded === 1 ? "" : "s"} graded.` : "Nothing due right now."}</strong>
            <p>
              {recallScope === "due"
                ? "Cards enter this queue once you start their module, then return on their own schedule. Start a module in the topic lab to add its cards."
                : "This module has no cards left in the current session."}
            </p>
            <div className="hero-actions">
              {/* The empty queue used to offer two identical quiet buttons and
                  no answer to "so what do I do now". Starting a module is what
                  fills the queue, so that is the primary. */}
              <button className="button primary" onClick={() => selectView("topic")}>Back to topic lab</button>
              {recallScope === "topic" ? <button className="button quiet" onClick={() => startRecall("due")}>Review due cards</button> : null}
            </div>
          </article>
        )}
      </section>
    );
  }

  function renderDrills() {
    return (
      <section aria-labelledby="drills-title">
        <div className="page-intro">
          <div><p className="eyebrow">Back-of-envelope lab</p><h1 id="drills-title">Estimate, interpret, then reveal.</h1></div>
          <p>Use one significant digit. The architectural consequence matters more than a perfectly precise answer.</p>
        </div>

        <div className="drill-tabs" role="tablist" aria-label="Estimation drills" ref={drillStripRef} data-fade={drillStripFade}>
          {estimationDrills.map((drill, index) => (
            <button
              key={drill.id}
              id={`drill-tab-${drill.id}`}
              role="tab"
              aria-selected={index === activeDrillIndex}
              aria-controls="drill-panel"
              tabIndex={index === activeDrillIndex ? 0 : -1}
              className={index === activeDrillIndex ? "active" : ""}
              onClick={() => chooseDrill(index)}
              onKeyDown={(event) => {
                let nextIndex = activeDrillIndex;
                if (event.key === "ArrowRight") nextIndex = (activeDrillIndex + 1) % estimationDrills.length;
                else if (event.key === "ArrowLeft") nextIndex = (activeDrillIndex - 1 + estimationDrills.length) % estimationDrills.length;
                else if (event.key === "Home") nextIndex = 0;
                else if (event.key === "End") nextIndex = estimationDrills.length - 1;
                else return;
                event.preventDefault();
                chooseDrill(nextIndex);
                window.requestAnimationFrame(() => document.getElementById(`drill-tab-${estimationDrills[nextIndex].id}`)?.focus());
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {drill.title}
            </button>
          ))}
        </div>

        <div
          className="drill-workspace"
          id="drill-panel"
          role="tabpanel"
          aria-labelledby={`drill-tab-${activeDrill.id}`}
          tabIndex={0}
        >
          <article className="drill-prompt">
            <p className="eyebrow inverted">{activeDrill.kind}</p>
            <h2>{activeDrill.prompt}</h2>
            <p className="chalk-note">Write assumptions first. Keep units visible at every step.</p>
          </article>
          <div className="drill-answer paper-panel">
            <label className="field-label" htmlFor="drill-answer">Your calculation</label>
            <textarea
              id="drill-answer"
              className="lined-textarea tall"
              value={drillAnswer}
              onChange={(event) => updateDrillAnswer(activeDrill.id, event.target.value)}
              placeholder={'Assumptions:\n\nCalculation:\n\nApproximate answer:\n\nWhat this changes:'}
            />
            <button
              className="button primary"
              onClick={() => setDrillRevealed((value) => !value)}
              aria-expanded={drillRevealed}
              aria-controls="drill-solution"
            >
              {drillRevealed ? "Hide worked answer" : "Reveal worked answer"}
            </button>
          </div>
        </div>

        {drillRevealed && (
          <article className="solution-sheet" id="drill-solution">
            <div>
              <p className="eyebrow">Assumptions</p>
              <ul>{activeDrill.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <p className="eyebrow">Calculation</p>
              <ol>{activeDrill.steps.map((item) => <li key={item}>{item}</li>)}</ol>
            </div>
            <div className="solution-result">
              <p className="eyebrow">Approximate answer</p>
              <strong>{activeDrill.answer}</strong>
              <p>{activeDrill.architecturalInterpretation}</p>
            </div>
          </article>
        )}
      </section>
    );
  }

  function renderPractice() {
    // An empty canvas used to count as a skipped step, which was never true:
    // the Architecture textarea on the same step records the same attempt, and
    // the canvas is pointer-only, so a keyboard user could not clear the gate
    // at all. Either one counts as having attempted the design.
    const architectureAttempted = study.draft.sketch.length > 0 || study.draft.fields.architecture.trim().length > 0;
    return (
      <section aria-labelledby="practice-title">
        <div className="practice-topbar">
          <div>
            <p className="eyebrow">Timed design room</p>
            <h1 id="practice-title">{activePrompt.title}</h1>
          </div>
        </div>

        <div className="practice-category-tabs" role="group" aria-label="Design category">
          {(["classic", "ml", "llm"] as DesignCategory[]).map((category) => (
            <button
              key={category}
              className={category === practiceCategory ? "active" : ""}
              onClick={() => {
                setPracticeCategory(category);
                const first = designPrompts.find((prompt) => prompt.category === category);
                if (first && activePrompt.category !== category) choosePractice(first);
              }}
              aria-pressed={category === practiceCategory}
            >
              <strong>{category === "ml" ? "ML systems" : category === "llm" ? "LLM infrastructure" : "Classic systems"}</strong>
              <span>{designPrompts.filter((prompt) => prompt.category === category).length} prompts</span>
            </button>
          ))}
        </div>

        <div className="prompt-switcher" role="group" aria-label="Design prompt" ref={promptStripRef} data-fade={promptStripFade}>
          {visiblePrompts.map((prompt) => (
            <button
              key={prompt.id}
              className={prompt.id === activePrompt.id ? "active" : ""}
              onClick={() => choosePractice(prompt)}
              aria-pressed={prompt.id === activePrompt.id}
            >
              <span>{prompt.category} · {prompt.difficulty}</span>
              <strong>{prompt.title}</strong>
            </button>
          ))}
        </div>

        <article className="prompt-brief">
          <div>
            <p className="eyebrow inverted">Interview prompt</p>
            <h2>{activePrompt.prompt}</h2>
          </div>
          <div>
            <span className="mini-label inverted-label">Clarify before designing</span>
            <ul>{activePrompt.requirementsToExplore.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </article>

        <div className="practice-sticky">
        <div className="practice-workbar">
          <span className="workbar-title">{activePrompt.title}</span>
          <div className="timer-cluster">
            <span
              className="timer"
              role="timer"
              data-expired={secondsLeft === 0}
              aria-label={secondsLeft === 0 ? "Time is up" : `${Math.floor(secondsLeft / 60)} minutes ${secondsLeft % 60} seconds remaining`}
            >
              {formatTimer(secondsLeft)}
            </span>
            <span className="sr-only" role="status" aria-live="polite">{timerAnnouncement}</span>
            <button className="button primary" onClick={toggleTimer}>
              {study.draft.deadline ? "Pause" : secondsLeft === 0 ? "Start again" : secondsLeft === activePrompt.durationMinutes * 60 ? "Start timer" : "Resume"}
            </button>
            <button className="button quiet" onClick={resetTimer}>Reset</button>
          </div>
        </div>
        <nav className="practice-step-tabs" aria-label="Interview phases" ref={stepStripRef} data-fade={stepStripFade}>
          {practiceSteps.map((step, index) => {
            const filled = step.fields.filter((field) => study.draft.fields[field].trim().length > 0).length;
            return (
              <button
                key={step.id}
                className={step.id === practiceStep ? "active" : ""}
                onClick={() => setPracticeStep(step.id)}
                aria-current={step.id === practiceStep ? "step" : undefined}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step.label}</strong>
                <small>{stepMinutes(step, activePrompt.durationMinutes)}</small>
                {step.fields.length > 0 ? (
                  <i className={filled === step.fields.length ? "done" : filled > 0 ? "partial" : ""} aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </nav>
        </div>

        {activeStep.fields.length > 0 ? (
          <div className="editor-grid">
            {activeStep.fields.map((fieldId) => {
              const field = practiceFields.find((item) => item.id === fieldId)!;
              return (
                <label className={`editor-field ${activeStep.fields.length === 1 ? "wide" : ""}`} key={field.id}>
                  <span className="field-label">{field.label}</span>
                  <textarea
                    value={study.draft.fields[field.id]}
                    onChange={(event) => updateDraftField(field.id, event.target.value)}
                    placeholder={field.prompt}
                    rows={activeStep.fields.length === 1 ? 10 : 8}
                  />
                </label>
              );
            })}
          </div>
        ) : null}

        {activeStep.kind === "sketch" ? (
        <article className="paper-panel sketch-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Whiteboard</p>
              <h2>Draw the architecture.</h2>
            </div>
            <span className="section-note">Boxes, arrows, and one request path</span>
          </div>
          <p className="sketch-note">
            The interview is a drawing exercise. Sketch components and the flow between them before you reveal the reference—
            a diagram you cannot draw from memory is one you do not yet own. The Architecture field above is an equally valid
            record of the same attempt if you would rather write the boxes and arrows out.
          </p>
          <SketchPad
            strokes={study.draft.sketch}
            onChange={(sketch) => setStudy((current) => ({ ...current, draft: { ...current.draft, sketch } }))}
            theme={study.theme}
          />
        </article>
        ) : null}

        {activeStep.kind === "reference" ? (
        <>
        <section className="reference-gate" aria-labelledby="reference-heading">
          <div>
            <p className="eyebrow inverted">Calibration guide</p>
            <h2 id="reference-heading">Compare against a senior-level reference.</h2>
            <p>
              {!architectureAttempted && !referenceRevealed
                ? "Draw or write the architecture first—comparing before attempting turns practice into reading."
                : "Attempt the design first. The guide is a decision map—not the only valid architecture."}
            </p>
          </div>
          <button
            className="button primary on-dark"
            onClick={() => setReferenceRevealed((value) => !value)}
            aria-expanded={referenceRevealed}
            aria-controls="reference-solution"
          >
            {referenceRevealed ? "Hide reference" : architectureAttempted ? "Reveal reference" : "Reveal anyway"}
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {referenceRevealed ? "Reference solution revealed." : ""}
          </span>
        </section>

        {referenceRevealed && (
          <section className="reference-solution" id="reference-solution" aria-labelledby="reference-heading">
            <div className="reference-columns">
              <article>
                <p className="eyebrow">Scope choices</p>
                <ul>{activePrompt.reference.scope.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
              <article>
                <p className="eyebrow">Correctness invariants</p>
                <ul>{activePrompt.reference.invariants.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
              <article>
                <p className="eyebrow">API contracts</p>
                <ul>{activePrompt.reference.apis.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
              </article>
              <article>
                <p className="eyebrow">Data model</p>
                <ul>{activePrompt.reference.dataModel.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
              </article>
            </div>

            <article className="reference-flow">
              <p className="eyebrow">End-to-end architecture</p>
              <ul className="arch-legend" aria-label="Diagram legend">
                <li><i className="lg-service" />Service</li>
                <li><i className="lg-store" />Durable store</li>
                <li><i className="lg-cache" />Cache</li>
                <li><i className="lg-stream" />Stream / queue</li>
                <li><i className="lg-async" />Off the request path</li>
              </ul>
              <ArchitectureFigure diagram={activePrompt.reference.diagram} id={activePrompt.id} />
              <ol>{activePrompt.reference.architecture.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol>
            </article>

            <div className="reference-deep-dives">
              {activePrompt.reference.deepDives.map((section) => (
                <article key={section.title}>
                  <p className="eyebrow">Deep dive</p>
                  <h3>{section.title}</h3>
                  <p>{section.summary}</p>
                  <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
                </article>
              ))}
            </div>

            <div className="reference-columns compact-reference">
              <article>
                <p className="eyebrow">10× evolution</p>
                <ul>{activePrompt.reference.scaling.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
              <article>
                <p className="eyebrow">SLIs & operational signals</p>
                <ul>{activePrompt.reference.observability.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            </div>
          </section>
        )}
        </>
        ) : null}

        {activeStep.kind === "score" ? (
        <>
        <section className="rubric-section" aria-labelledby="rubric-heading">
          <div className="section-heading">
            <div><p className="eyebrow">Self-evaluation</p><h2 id="rubric-heading">Score the attempt honestly.</h2></div>
            <strong className="score-total">{averageScore(study.draft.scores).toFixed(1)}<span>/5</span></strong>
          </div>
          <div className="score-grid">
            {scoreFields.map((field) => (
              <label key={field.id}>
                <span>{field.label}</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={study.draft.scores[field.id]}
                  onChange={(event) => updateScore(field.id, Number(event.target.value))}
                />
                <strong>{study.draft.scores[field.id]}</strong>
              </label>
            ))}
          </div>
        </section>

        <section className="paper-panel checklist-section">
          {/* The ticks live on the draft, so they survive a step change, a view
              change and a reload — and they are saved with the attempt. */}
          <details open={checklistOpen} onToggle={(event) => setChecklistOpen(event.currentTarget.open)}>
            <summary>
              20-question reliability and trade-off checklist
              <em className="control-state">{checklistTicked} of {standardQuestions.length} checked</em>
            </summary>
            <ol className="standard-checklist">
              {standardQuestions.map((question) => (
                <li key={question.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={study.draft.checklist[String(question.id)] === true}
                      onChange={(event) => toggleChecklistQuestion(String(question.id), event.target.checked)}
                    />
                    <span>{question.text}</span>
                  </label>
                </li>
              ))}
            </ol>
          </details>
        </section>

        <section className="mistake-entry" aria-labelledby="practice-mistake-heading">
          <div><p className="eyebrow inverted">Mistake log</p><h2 id="practice-mistake-heading">Capture only the three highest-leverage misses.</h2></div>
          {renderMistakeForm()}
        </section>
        </>
        ) : null}

        <div className="sticky-savebar">
          {/* The live region stays mounted whether or not it has a message:
              inserting a live region together with its text is unreliably
              announced. The idle hint is what gives way instead. */}
          <div className="savebar-copy">
            {renderNotice("practice")}
            {notice?.slot === "practice" ? null : <p className="savebar-hint">Draft changes are stored locally as you type.</p>}
          </div>
          <button className="button primary" onClick={saveAttempt}>Save scored attempt</button>
        </div>

        {study.attempts.length > 0 && (
          <section className="attempt-history">
            <div className="section-heading"><div><p className="eyebrow">Prior work</p><h2>Compare attempts</h2></div></div>
            <div className="attempt-list">
              {study.attempts.filter((attempt) => attempt.promptId === activePrompt.id).map((attempt) => (
                <button key={attempt.id} onClick={() => reopenAttempt(attempt)}>
                  <span>{new Date(attempt.savedAt).toLocaleDateString()}</span>
                  <strong>{attempt.durationMinutes} min · {averageScore(attempt.scores).toFixed(1)}/5</strong>
                  <em>Reopen →</em>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>
    );
  }

  function renderMock() {
    return (
      <section aria-labelledby="mock-title">
        <div className="page-intro" data-terse={study.mock.log.length > 0 ? "true" : undefined}>
          <div>
            <p className="eyebrow">Spoken practice</p>
            <h1 id="mock-title">
              {study.mock.log.length === 0
                ? "Run the interview, not the notes."
                : `${study.mock.log.length} spoken mock${study.mock.log.length === 1 ? "" : "s"} on record.`}
            </h1>
            {study.mock.log.length > 0 ? (
              <p className="page-intro-terse">Last run {study.mock.log[0].date} · {mockLogTitle}</p>
            ) : null}
          </div>
          <button className="button quiet" onClick={randomizeMock}>Draw another prompt</button>
        </div>
        <article className="mock-card">
          <div className="mock-card-copy">
            <div className="ticket-meta"><span>{mockPrompt.category}</span><span>{mockPrompt.difficulty}</span><span>{mockPrompt.durationMinutes} min</span></div>
            <h2>{mockPrompt.title}</h2>
            <p>{mockPrompt.prompt}</p>
            <button className="button primary on-dark" onClick={() => choosePractice(mockPrompt)}>Start this mock</button>
          </div>
          <div className="mock-phases">
            <p className="eyebrow inverted">
              Stage checklist
              <em className="control-state inverted">
                {mockChecked} of {interviewPhases.length} done
              </em>
            </p>
            {interviewPhases.map((phase) => (
              <label key={phase.id}>
                <input
                  type="checkbox"
                  checked={study.mock.checks[phase.id] === true}
                  onChange={(event) => toggleMockPhase(phase.id, event.target.checked)}
                />
                <span><strong>{phase.label}</strong><small>{phase.description}</small></span>
                <em>{phaseMinutes(phase.share, mockPrompt.durationMinutes)}m</em>
              </label>
            ))}
            {/* The ticks used to be a list that erased itself on the next draw.
                Closing the mock is now a write: it counts towards the streak,
                shows on Today, and clears the board for the next attempt. */}
            <div className="mock-commit">
              <button className="button primary on-dark" onClick={logMock} disabled={mockChecked === 0}>
                {mockChecked === interviewPhases.length ? "Log this mock as done" : `Log this mock (${mockChecked}/${interviewPhases.length})`}
              </button>
              {renderNotice("mock")}
            </div>
          </div>
        </article>
        <div className="topic-grid">
          <article className="paper-panel">
            <p className="eyebrow">Expected deep dives</p>
            <ul className="arrow-list">{mockPrompt.expectedTopics.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="paper-panel danger-paper">
            <p className="eyebrow">Likely misses</p>
            <ul className="arrow-list">{mockPrompt.commonFailureModes.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
        {/* The interviewer's probe list. Kept behind a reveal so it can be used
            as a self-check after the attempt rather than read as a crib first. */}
        <article className="paper-panel mock-followups">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Interviewer follow-ups</p>
              <h2>{mockPrompt.followUpQuestions.length} questions they will push on</h2>
            </div>
            <button
              className="button primary"
              onClick={() => setFollowUpsShown((shown) => !shown)}
              aria-expanded={followUpsShown}
              aria-controls="mock-followup-list"
            >
              {followUpsShown ? "Hide follow-ups" : "Reveal follow-ups"}
            </button>
          </div>
          {followUpsShown ? (
            <ol className="question-list" id="mock-followup-list">
              {mockPrompt.followUpQuestions.map((question) => <li key={question}>{question}</li>)}
            </ol>
          ) : (
            <p className="section-note" id="mock-followup-list">
              Answer the prompt first, then reveal these and count how many you covered unprompted.
            </p>
          )}
        </article>
      </section>
    );
  }

  function renderMistakeForm() {
    return (
      <div className="mistake-form">
        <label>
          <span className="field-label on-dark">Category</span>
          <select value={mistakeForm.category} onChange={(event) => setMistakeForm((current) => ({ ...current, category: event.target.value as MistakeCategory }))}>
            {mistakeCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label>
          <span className="field-label on-dark">What went wrong?</span>
          <input value={mistakeForm.mistake} onChange={(event) => setMistakeForm((current) => ({ ...current, mistake: event.target.value }))} placeholder="I chose a queue before stating the ordering requirement…" />
        </label>
        <label>
          <span className="field-label on-dark">Correct approach</span>
          <input value={mistakeForm.correctApproach} onChange={(event) => setMistakeForm((current) => ({ ...current, correctApproach: event.target.value }))} placeholder="Ask which events require per-key ordering first…" />
        </label>
        <label>
          <span className="field-label on-dark">Review date</span>
          <input type="date" value={mistakeForm.reviewDate} onChange={(event) => setMistakeForm((current) => ({ ...current, reviewDate: event.target.value }))} />
        </label>
        <div className="mistake-form-commit">
          <button className="button primary on-dark" onClick={addMistake}>Add to review queue</button>
          {renderNotice("mistake")}
        </div>
      </div>
    );
  }

  function renderReview() {
    return (
      <section aria-labelledby="review-title">
        <div className="page-intro">
          <div><p className="eyebrow">Close the loop</p><h1 id="review-title">Notes, mistakes, and weak signals.</h1></div>
          <p>Review the correction, not just the error. Resolve an item only when you can explain the better approach aloud.</p>
        </div>
        <div className="review-grid">
          <article className="paper-panel notes-panel">
            <label className="field-label" htmlFor="general-notes">Interview notebook</label>
            <textarea
              id="general-notes"
              className="lined-textarea notebook"
              value={study.generalNotes}
              onChange={(event) => setStudy((current) => ({ ...current, generalNotes: event.target.value }))}
              placeholder="Principles, reusable phrases, diagrams to redraw, questions to ask a mock interviewer…"
            />
            <p className="save-hint">Saved only in this browser.</p>
          </article>
          <aside className="review-entry">
            <p className="eyebrow inverted">New review item</p>
            <h2>Record a mistake</h2>
            {renderMistakeForm()}
          </aside>
        </div>

        <section className="mistake-log" aria-labelledby="mistake-log-title">
          <div className="section-heading">
            <div><p className="eyebrow">Review queue</p><h2 id="mistake-log-title">Mistake log</h2></div>
            <span className="section-note">{unresolvedMistakes.length} unresolved</span>
          </div>
          {study.mistakes.length ? (
            <div className="mistake-table-wrap">
              <table className="mistake-table">
                <thead><tr><th>Status</th><th>Category</th><th>Mistake</th><th>Correct approach</th><th>Review</th></tr></thead>
                <tbody>
                  {study.mistakes.map((item) => (
                    <tr key={item.id} className={item.resolved ? "resolved" : ""}>
                      <td><button className="resolve-button" onClick={() => toggleMistake(item.id)}>{item.resolved ? "Resolved" : "Open"}</button></td>
                      <td>{item.category}</td>
                      <td>{item.mistake}</td>
                      <td>{item.correctApproach}</td>
                      <td>{item.reviewDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><strong>Your mistake log is empty.</strong><p>After a mock, record only the three misses most likely to improve the next attempt.</p></div>
          )}
        </section>

        <section className="danger-zone">
          <div>
            <strong>Your data lives in this browser only</strong>
            <p>
              Nothing is on a server. Download a copy before you clear this browser, change machines, or reset below —
              the file is the only backup that outlives this profile.
            </p>
            {renderNotice("danger")}
          </div>
          <div className="danger-actions">
            <button className="button" onClick={exportProgress}>Download my data</button>
            <button className="button danger" onClick={resetProgress}>Reset everything</button>
          </div>
        </section>

        {/* A destroyed twelve weeks used to be announced by a message that was
            not rendered in this view, with no way back at all. The undo is
            offered for the rest of the session; the backup key outlives it. */}
        {resetBackup !== null ? (
          <section className="reset-undo" role="alert">
            <div>
              <strong>Everything cleared.</strong>
              <p>A copy is held in this browser under <code>{BACKUP_KEY}</code>. Undo is available until you close the tab.</p>
            </div>
            <button className="button primary" onClick={undoReset}>Undo the reset</button>
          </section>
        ) : null}
      </section>
    );
  }

  const viewContent: Record<View, () => React.ReactNode> = {
    dashboard: renderDashboard,
    curriculum: renderCurriculum,
    topic: renderTopic,
    recall: renderRecall,
    drills: renderDrills,
    practice: renderPractice,
    mock: renderMock,
    review: renderReview,
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="site-rail">
        <button className="brand" onClick={() => selectView("dashboard")} aria-label="System Design Lab home">
          <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span><strong>System Design</strong><small>Interview Lab</small></span>
        </button>

        <nav aria-label="Primary navigation">
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)} aria-current={view === item.id ? "page" : undefined}>
              <span>{item.index}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="rail-progress">
          <div><span>Full syllabus</span><strong>{overallProgressPercent}%</strong></div>
          <div className="progress-track" aria-hidden="true"><i style={{ width: `${overallProgressPercent}%` }} /></div>
          <p>{totalCompletedTopics}/{allTopics.length} modules · {streak} day streak</p>
        </div>
      </aside>

      <div className="workspace">
        {/* `data-attempt` is what lets the phone header give the wordmark's
            space to the clock, and only while there is a clock. */}
        <header className="site-header" data-attempt={timerChipState === "off" ? undefined : timerChipState}>
          <div className="mobile-brand"><strong>System Design Lab</strong><span>W{String(currentWeek.week).padStart(2, "0")}</span></div>
          <nav className="mobile-nav" ref={mobileNavRef} aria-label="Mobile navigation">
            {navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)} aria-current={view === item.id ? "page" : undefined}>{item.label}</button>)}
          </nav>
          <div className="header-context">
            <span className="live-dot" aria-hidden="true" />
            <p><strong>Current focus</strong><span>Week {currentWeek.week} · {currentWeek.title}</span></p>
          </div>
          <div className="header-actions">
            {/* A 40-minute attempt used to be invisible the moment you left the
                design room: navigate away and no digits existed anywhere in the
                DOM, reload and you landed on Today with a live clock running and
                nothing to tell you. The chip is the attempt's presence in the one
                bar that is on every view, and it is the way back to it. */}
            {timerChipState !== "off" ? (
              <button
                className="timer-chip"
                data-state={timerChipState}
                onClick={() => selectView("practice")}
                aria-label={
                  timerChipState === "expired"
                    ? `Time is up on ${activePrompt.title}. Return to the design room.`
                    : `${Math.ceil(secondsLeft / 60)} minutes left on ${activePrompt.title}. Return to the design room.`
                }
              >
                <span aria-hidden="true">{timerChipState === "expired" ? "Time" : "Running"}</span>
                <strong aria-hidden="true">{formatTimer(secondsLeft)}</strong>
              </button>
            ) : null}
            {/* Was hardcoded text. The one element in permanent view now carries
                the state of the write it is claiming. */}
            <span className={`local-badge state-${saveState}`} role="status" aria-live="polite">
              {saveState === "failed"
                ? "Save failed"
                : saveState === "saving"
                  ? "Saving…"
                  : lastSavedAt !== null
                    ? `Saved · ${savedAgo || "just now"}`
                    : "Local only"}
            </span>
            <button
              className="theme-toggle"
              onClick={() => setStudy((current) => ({ ...current, theme: current.theme === "light" ? "dark" : "light" }))}
              aria-label={`Switch to ${study.theme === "light" ? "dark" : "light"} mode`}
            >
              <span aria-hidden="true">{study.theme === "light" ? "◐" : "☀"}</span>
            </button>
          </div>
        </header>

        <main className="site-main" id="main" ref={mainRef} tabIndex={-1}>
          <p className="sr-only" role="status" aria-live="polite">{viewAnnouncement}</p>
          {!hydrated && <p className="sr-only" aria-live="polite">Loading saved study progress.</p>}
          {/* Storage failure is not scoped to a view, so it gets a slot that is
              rendered on all eight. */}
          {renderNotice("global")}
          {viewContent[view]()}
        </main>
        <footer className="site-footer"><span>System Design Interview Lab</span><p>Estimate → design → stress → reflect.</p><span>{allTopics.length} modules · local-first</span></footer>
      </div>
    </div>
  );
}
