"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  allTopics,
  curriculumWeeks,
  designPrompts,
  estimationDrills,
  interviewPhases,
  mistakeCategories,
  standardQuestions,
  type ArchitectureDiagram,
  type DesignCategory,
  type DesignPrompt,
  type MistakeCategory,
} from "./studyData";

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
  confidence: number;
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
  sketch: Stroke[];
};

const SKETCH_WIDTH = 1600;
const SKETCH_HEIGHT = 900;

const NODE_W = 158;
const NODE_H = 58;
const COL_GAP = 92;
const ROW_GAP = 28;
const DIAGRAM_PAD = 10;

const nodeX = (col: number) => DIAGRAM_PAD + col * (NODE_W + COL_GAP);
const nodeY = (row: number) => DIAGRAM_PAD + row * (NODE_H + ROW_GAP);

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
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const cols = Math.max(...diagram.nodes.map((node) => node.col)) + 1;
  const rows = Math.max(...diagram.nodes.map((node) => node.row)) + 1;
  const width = DIAGRAM_PAD * 2 + cols * NODE_W + (cols - 1) * COL_GAP;
  const height = DIAGRAM_PAD * 2 + rows * NODE_H + (rows - 1) * ROW_GAP;
  const marker = `arrow-${id}`;
  const markerAsync = `arrow-async-${id}`;

  const paths = diagram.edges.flatMap((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return [];
    const fx = nodeX(from.col);
    const fy = nodeY(from.row);
    const tx = nodeX(to.col);
    const ty = nodeY(to.row);
    let d: string;
    let mid: { x: number; y: number };

    if (from.col === to.col) {
      const down = to.row > from.row;
      const x = fx + NODE_W / 2;
      const y1 = down ? fy + NODE_H : fy;
      const y2 = down ? ty : ty + NODE_H;
      d = `M ${x} ${y1} L ${x} ${y2}`;
      mid = { x, y: (y1 + y2) / 2 };
    } else if (to.col > from.col) {
      const x1 = fx + NODE_W;
      const y1 = fy + NODE_H / 2;
      const x2 = tx;
      const y2 = ty + NODE_H / 2;
      const dx = Math.max(24, (x2 - x1) / 2);
      d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 7 };
    } else {
      // Backward edge: drop below both boxes and return.
      const x1 = fx + NODE_W / 2;
      const y1 = fy + NODE_H;
      const x2 = tx + NODE_W / 2;
      const y2 = ty + NODE_H;
      const dip = Math.max(y1, y2) + ROW_GAP * 0.8;
      d = `M ${x1} ${y1} C ${x1} ${dip}, ${x2} ${dip}, ${x2} ${y2}`;
      mid = { x: (x1 + x2) / 2, y: dip + 4 };
    }
    return [{ edge, d, mid }];
  });

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
    context.lineWidth = 3;
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
  srs: Record<string, SrsCard>;
  /** Section id -> collapsed. Absent means "use the section's default". */
  collapsed: Record<string, boolean>;
};

/**
 * Topic sections that can be folded away. Defaults give the page a reading
 * order: mechanics first, the rest opened deliberately.
 */
const topicSections = {
  primer: { eyebrow: "Start here", title: "Explained from zero", defaultOpen: true },
  glossary: { eyebrow: "Vocabulary", title: "Every term this module uses", defaultOpen: true },
  mechanics: { eyebrow: "Mechanics", title: "What happens under the hood", defaultOpen: true },
  // Closed by default now that the primer sits above it: the top of the page
  // should be the explanation, not four open panels of compressed prose.
  tradeoffs: { eyebrow: "Trade-offs", title: "Say these aloud", defaultOpen: false },
  failures: { eyebrow: "Failure diagnosis", title: "How this breaks in production", defaultOpen: false },
  questions: { eyebrow: "Pressure questions", title: "What an interviewer will push on", defaultOpen: false },
  checklist: { eyebrow: "Decision discipline", title: "Before leaving this topic", defaultOpen: false },
  quiz: { eyebrow: "Knowledge check", title: "Commit before revealing the reasoning", defaultOpen: false },
} as const;

type TopicSectionId = keyof typeof topicSections;

const STORAGE_KEY = "ai-system-design-study:v1";

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
 */
const practiceSteps: Array<{
  id: string;
  label: string;
  minutes: string;
  fields: PracticeField[];
  kind?: "sketch" | "reference" | "score";
}> = [
  { id: "clarify", label: "Clarify", minutes: "3–5", fields: ["requirements", "assumptions"] },
  { id: "estimate", label: "Estimate", minutes: "3–5", fields: ["estimation"] },
  { id: "contract", label: "APIs + data", minutes: "3–5", fields: ["apis", "dataModel"] },
  { id: "architecture", label: "Architecture", minutes: "5–7", fields: ["architecture"], kind: "sketch" },
  { id: "deep-dive", label: "Deep dive", minutes: "15–20", fields: ["failureModes", "tradeoffs"] },
  { id: "close", label: "Close", minutes: "≈5", fields: ["finalSummary"] },
  { id: "compare", label: "Compare", minutes: "after", fields: [], kind: "reference" },
  { id: "score", label: "Score", minutes: "after", fields: [], kind: "score" },
];

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
    sketch: [],
  };
}

function defaultState(): StudyState {
  return {
    version: 1,
    topics: Object.fromEntries(
      allTopics.map((topic) => [
        topic.id,
        { status: "not-started", confidence: 3, notes: "" },
      ]),
    ),
    generalNotes: "",
    mistakes: [],
    attempts: [],
    activityDates: [],
    theme: "light",
    draft: makeDraft(designPrompts[0]),
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
    sketch: normalizeSketch(raw.sketch),
  };
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
          const confidence = typeof rawTopic.confidence === "number" && Number.isFinite(rawTopic.confidence)
            ? Math.max(1, Math.min(5, Math.round(rawTopic.confidence)))
            : fallback.topics[topic.id].confidence;
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
      srs: normalizeSrs(saved.srs),
      collapsed: isRecord(saved.collapsed)
        ? Object.fromEntries(
            Object.entries(saved.collapsed).filter(
              ([key, value]) => key in topicSections && typeof value === "boolean",
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

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [study, setStudy] = useState<StudyState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState(allTopics[0].id);
  const [topicWeek, setTopicWeek] = useState(1);
  const [activeDrillIndex, setActiveDrillIndex] = useState(0);
  const [drillAnswer, setDrillAnswer] = useState("");
  const [drillRevealed, setDrillRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(designPrompts[0].durationMinutes * 60);
  const [saveNotice, setSaveNotice] = useState("");
  const [mockPrompt, setMockPrompt] = useState<DesignPrompt>(designPrompts[0]);
  const [mockChecks, setMockChecks] = useState<Record<string, boolean>>({});
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

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const next = stored ? mergeStoredState(stored) : defaultState();
      const restoredPrompt = designPrompts.find((prompt) => prompt.id === next.draft.promptId);
      const nextTopic = allTopics.find((topic) => next.topics[topic.id]?.status !== "completed") ?? allTopics[allTopics.length - 1];
      if (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches) next.theme = "dark";
      setStudy(next);
      if (restoredPrompt) setPracticeCategory(restoredPrompt.category);
      if (nextTopic) {
        setActiveTopicId(nextTopic.id);
        setTopicWeek(nextTopic.week);
      }
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
      } catch {
        setSaveNotice("This browser could not save your changes. Copy important notes before leaving.");
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [hydrated, study]);

  useEffect(() => {
    if (!study.draft.deadline) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((study.draft.deadline! - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setStudy((current) => ({
          ...current,
          draft: { ...current.draft, deadline: null, secondsRemaining: 0 },
        }));
        setSaveNotice("Time. Take two minutes to summarize your design and record the three biggest mistakes.");
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
  const activePrompt = designPrompts.find((prompt) => prompt.id === study.draft.promptId) ?? designPrompts[0];
  const visiblePrompts = designPrompts.filter((prompt) => prompt.category === practiceCategory);
  const activeStep = practiceSteps.find((step) => step.id === practiceStep) ?? practiceSteps[0];
  const unresolvedMistakes = study.mistakes.filter((mistake) => !mistake.resolved);

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

  // Spaced repetition is a keyboard workflow: space reveals, 1-4 grade. Bound
  // only while the recall view is showing a card, and never while typing.
  useEffect(() => {
    if (view !== "recall" || !activeCard) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;

      if (!recallRevealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRecallRevealed(true);
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
  const weakTopics = allTopics.filter((topic) => {
    const progress = study.topics[topic.id];
    return progress?.confidence <= 2 && progress.status !== "completed";
  });

  function selectView(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    setActiveTopicId(topicId);
    selectView("topic");
  }

  function chooseDrill(index: number) {
    setActiveDrillIndex(index);
    setDrillAnswer("");
    setDrillRevealed(false);
  }

  function choosePractice(prompt: DesignPrompt, fresh = true) {
    setPracticeCategory(prompt.category);
    setReferenceRevealed(false);
    setStudy((current) => ({
      ...current,
      draft: fresh ? makeDraft(prompt, newId("attempt")) : current.draft,
    }));
    setSecondsLeft(prompt.durationMinutes * 60);
    setSaveNotice("");
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
    return study.collapsed[id] === undefined ? topicSections[id].defaultOpen : !study.collapsed[id];
  }

  function toggleSection(id: TopicSectionId) {
    setStudy((current) => ({
      ...current,
      collapsed: { ...current.collapsed, [id]: isSectionOpen(id) },
    }));
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
      <article className={`paper-panel topic-wide topic-section ${className}`.trim()} data-open={open}>
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
          deadline: Date.now() + secondsLeft * 1000,
          secondsRemaining: secondsLeft,
          startedAt: current.draft.startedAt || new Date().toISOString(),
        },
        activityDates: addActivity(current.activityDates),
      };
    });
  }

  function resetTimer() {
    const seconds = activePrompt.durationMinutes * 60;
    setSecondsLeft(seconds);
    setStudy((current) => ({
      ...current,
      draft: { ...current.draft, deadline: null, secondsRemaining: seconds },
    }));
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
    setStudy((current) => ({
      ...current,
      attempts: [attempt, ...current.attempts.filter((item) => item.id !== attempt.id)],
      activityDates: addActivity(current.activityDates),
      draft: { ...current.draft, deadline: null, secondsRemaining: secondsLeft },
    }));
    setSaveNotice("Attempt saved. Your dashboard and review history are up to date.");
  }

  function reopenAttempt(attempt: SavedAttempt) {
    const prompt = designPrompts.find((item) => item.id === attempt.promptId) ?? designPrompts[0];
    setStudy((current) => ({ ...current, draft: { ...attempt, deadline: null } }));
    setSecondsLeft(attempt.secondsRemaining);
    setPracticeCategory(prompt.category);
    setReferenceRevealed(false);
    setSaveNotice("Saved attempt reopened. Editing it will not replace the saved copy until you save again.");
    selectView("practice");
  }

  function addMistake() {
    if (!mistakeForm.mistake.trim() || !mistakeForm.correctApproach.trim()) {
      setSaveNotice("Add both the mistake and the corrected approach.");
      return;
    }
    const linkedCount = study.mistakes.filter(
      (item) => item.designProblemId === activePrompt.id && item.date === localDateKey(),
    ).length;
    if (view === "practice" && linkedCount >= 3) {
      setSaveNotice("Keep the log focused: choose only the three highest-leverage mistakes from this attempt.");
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
    setSaveNotice("Mistake added to the review queue.");
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
    setMockPrompt(next);
    setMockChecks({});
  }

  function resetProgress() {
    if (!window.confirm("Reset all locally saved progress, notes, attempts, and mistakes for this site?")) return;
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
    setSaveNotice("Local study data reset.");
  }

  function renderDashboard() {
    const dueTopics = currentWeekTopics.filter((topic) => study.topics[topic.id]?.status !== "completed").slice(0, 3);
    const targetCategory: DesignCategory | null = currentWeek.week <= 4
      ? "classic"
      : currentWeek.week <= 6
        ? "ml"
        : currentWeek.week === 7
          ? "llm"
          : null;
    const nextPromptPool = targetCategory
      ? designPrompts.filter((prompt) => prompt.category === targetCategory)
      : designPrompts;
    const nextPrompt = nextPromptPool[study.attempts.length % nextPromptPool.length] ?? designPrompts[0];
    const dueMinutes = dueTopics.reduce((sum, topic) => sum + topic.estimatedMinutes, 0);
    const latestAttempt = study.attempts[0];
    return (
      <>
        <section className="hero-grid" aria-labelledby="dashboard-title">
          <div className="hero-copy">
            <p className="eyebrow">Week {String(currentWeek.week).padStart(2, "0")} · Tier {currentWeek.tier}</p>
            <h1 id="dashboard-title">Turn technical depth into interview signal.</h1>
            <p className="hero-lede">
              {currentWeek.focus} Build the habit of stating assumptions aloud and defending every trade-off.
            </p>
            <div className="hero-actions">
              <button className="button primary" onClick={() => openTopic(dueTopics[0]?.id ?? currentWeekTopics[0].id)}>
                Start today&apos;s study
              </button>
              <button className="button quiet" onClick={() => choosePractice(nextPrompt)}>
                Run a 40-min design
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
          <article>
            <span className="metric-index">A</span>
            <strong>{streak}</strong>
            <p>day study streak</p>
          </article>
          <article className={dueCards.length > 0 ? "metric-actionable" : undefined}>
            <span className="metric-index">B</span>
            <strong>{dueCards.length}</strong>
            <p>cards due for recall</p>
            {dueCards.length > 0 ? <button className="metric-action" onClick={() => startRecall("due")}>Start review →</button> : null}
          </article>
          <article>
            <span className="metric-index">C</span>
            <strong>{unresolvedMistakes.length}</strong>
            <p>mistakes to review</p>
          </article>
          <article>
            <span className="metric-index">D</span>
            <strong>{weakTopics.length}</strong>
            <p>weak topics flagged</p>
          </article>
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
                    <span>{topic.eyebrow} · {topic.estimatedMinutes} min</span>
                  </button>
                  <span className={`status-mark ${study.topics[topic.id]?.status}`}>
                    {study.topics[topic.id]?.status === "in-progress" ? "In progress" : "Not started"}
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
            <button className="button light" onClick={() => choosePractice(nextPrompt)}>Open practice room</button>
          </aside>

          <section className="paper-panel framework-panel" aria-labelledby="framework-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Reusable structure</p>
                <h2 id="framework-heading">The 45-minute loop</h2>
              </div>
              <button className="text-button" onClick={() => selectView("practice")}>Use in practice →</button>
            </div>
            <ol className="phase-line">
              {interviewPhases.map((phase, index) => (
                <li key={phase.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{phase.label}</strong>
                  <small>{phase.minutes} min</small>
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
            <p className="eyebrow">Eight-week program</p>
            <h1 id="curriculum-title">A deliberate path from fundamentals to mocks.</h1>
          </div>
          <p>{allTopics.length} senior-level modules with mechanisms, failure diagnosis, decision rules, quizzes, and {designPrompts.length} full design rooms.</p>
        </div>

        <div className="week-list">
          {curriculumWeeks.map((week) => {
            const weekTopics = allTopics.filter((topic) => topic.week === week.week);
            const finished = weekTopics.filter((topic) => study.topics[topic.id]?.status === "completed").length;
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
                  <div className="week-one-grid">
                    {weekTopics.map((topic) => (
                      <button key={topic.id} onClick={() => openTopic(topic.id)}>
                        <span>Module {topic.day}</span>
                        <strong>{topic.title}</strong>
                        <small>{study.topics[topic.id]?.status.replace("-", " ")} · {topic.estimatedMinutes} min</small>
                      </button>
                    ))}
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
    return (
      <section aria-labelledby="topic-title">
        <div className="topic-week-tabs" aria-label="Curriculum week">
          {curriculumWeeks.map((week) => (
            <button
              key={week.week}
              className={week.week === topicWeek ? "active" : ""}
              onClick={() => chooseTopicWeek(week.week)}
              aria-pressed={week.week === topicWeek}
            >
              <span>W{String(week.week).padStart(2, "0")}</span>
              <strong>{week.title}</strong>
            </button>
          ))}
        </div>

        <div className="topic-picker" aria-label={`Week ${topicWeek} modules`}>
          {visibleTopicWeek.map((topic) => (
            <button
              key={topic.id}
              className={topic.id === activeTopic.id ? "active" : ""}
              onClick={() => setActiveTopicId(topic.id)}
              aria-pressed={topic.id === activeTopic.id}
            >
              <span>M{topic.day}</span>{topic.title}
            </button>
          ))}
        </div>

        <div className="topic-header">
          <div>
            <p className="eyebrow">Week {activeTopic.week} · Module {activeTopic.day} · {activeTopic.estimatedMinutes} minutes</p>
            <h1 id="topic-title">{activeTopic.title}</h1>
            <p>{activeTopic.summary}</p>
            <div className="topic-context">
              <span>Prerequisites: {activeTopic.prerequisites.map(resolveContentLabel).join(" · ")}</span>
              <span>Related: {activeTopic.relatedDesigns.map(resolveContentLabel).join(" · ")}</span>
            </div>
          </div>
          <div className="topic-controls">
            <span className="mini-label">Confidence</span>
            <div className="confidence-picker" aria-label="Confidence from 1 to 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  aria-pressed={topicProgress.confidence === value}
                  onClick={() => updateTopic(activeTopic.id, { confidence: value, status: topicProgress.status === "not-started" ? "in-progress" : topicProgress.status })}
                >{value}</button>
              ))}
            </div>
            <button
              className={`button ${topicProgress.status === "completed" ? "quiet" : "primary"}`}
              onClick={() => updateTopic(activeTopic.id, { status: topicProgress.status === "completed" ? "in-progress" : "completed" })}
            >
              {topicProgress.status === "completed" ? "Mark in progress" : "Mark complete"}
            </button>
          </div>
        </div>

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
            <ul className="tag-list large">{activeTopic.concepts.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>

          <Section id="primer" note="No background assumed" className="primer-panel">
            <div className="primer-lede">
              <p className="primer-plain">{activeTopic.primer.plainSummary}</p>
              <aside className="primer-analogy">
                <p className="eyebrow">Think of it like</p>
                <p>{activeTopic.primer.analogy}</p>
              </aside>
            </div>
            <div className="primer-sections">
              {activeTopic.primer.sections.map((section, index) => (
                <section key={section.heading}>
                  <h3><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{section.heading}</h3>
                  {section.body.map((paragraph) => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
                </section>
              ))}
            </div>
            <figure className="primer-example">
              <figcaption>
                <p className="eyebrow">Worked example</p>
                <strong>{activeTopic.primer.workedExample.title}</strong>
              </figcaption>
              <p className="primer-example-setup">{activeTopic.primer.workedExample.setup}</p>
              <ol>
                {activeTopic.primer.workedExample.steps.map((step, index) => (
                  <li key={step.slice(0, 48)}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>
                ))}
              </ol>
              <p className="primer-example-takeaway"><strong>Takeaway.</strong> {activeTopic.primer.workedExample.takeaway}</p>
            </figure>
          </Section>

          <Section id="glossary" count={activeTopic.glossary.length} note="Defined before it is used" className="glossary-panel">
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

          <Section id="mechanics" count={activeTopic.deepDive.length} note="Explain, don't name-drop" className="deep-dive-panel">
            <div className="deep-dive-list">
              {activeTopic.deepDive.map((section, index) => (
                <details key={section.title} open={index === 0}>
                  <summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{section.title}</strong></summary>
                  <p>{section.summary}</p>
                  <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
                </details>
              ))}
            </div>
          </Section>

          <Section id="tradeoffs" count={activeTopic.tradeoffs.length}>
            <div className="tradeoff-table">
              {activeTopic.tradeoffs.map((item) => (
                <div key={item.decision}>
                  <strong>{item.decision}</strong>
                  <p><span>A</span>{item.preferA}</p>
                  <p><span>B</span>{item.preferB}</p>
                  <small>Watch: {item.watch}</small>
                </div>
              ))}
            </div>
          </Section>

          <Section id="failures" count={activeTopic.failureModes.length} className="danger-paper">
            <div className="failure-grid">
              {activeTopic.failureModes.map((item) => (
                <div key={item.mode}>
                  <strong>{item.mode}</strong>
                  <p><span>Signal</span>{item.symptom}</p>
                  <p><span>Mitigation</span>{item.mitigation}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="questions" count={activeTopic.interviewQuestions.length}>
            <ol className="question-list">{activeTopic.interviewQuestions.map((item) => <li key={item}>{item}</li>)}</ol>
          </Section>

          <Section id="checklist" count={activeTopic.decisionChecklist.length} className="decision-panel">
            <ul className="decision-checklist">
              {activeTopic.decisionChecklist.map((item) => <li key={item}><span>✓</span>{item}</li>)}
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
                        return (
                          <button
                            type="button"
                            key={option}
                            className={isCorrect ? "correct" : isWrong ? "wrong" : ""}
                            onClick={() => answerQuiz(activeTopic.id, questionIndex, optionIndex)}
                            disabled={answered}
                            aria-pressed={answered ? optionIndex === selected : undefined}
                          >
                            <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
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
            <button className="button light" onClick={openTopicExercise}>Open workspace</button>
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
        </div>
      </section>
    );
  }

  function renderRecall() {
    const graded = sessionSeen.length;
    const remaining = recallQueue.length;
    const scheduled = activeCard ? study.srs[activeCard.key] : undefined;

    return (
      <section aria-labelledby="recall-title">
        <div className="page-intro">
          <div>
            <p className="eyebrow">Retrieval practice</p>
            <h1 id="recall-title">Answer first. Then reveal.</h1>
          </div>
          <p>Say the answer out loud before revealing it. Grading yourself honestly is what sets the next interval—marking a card you fumbled as Good is only cheating the schedule.</p>
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
              <button className="button primary recall-reveal" onClick={() => setRecallRevealed(true)}>
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
              <button className="button quiet" onClick={() => selectView("topic")}>Back to topic lab</button>
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

        <div className="drill-tabs" role="tablist" aria-label="Estimation drills">
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
              onChange={(event) => setDrillAnswer(event.target.value)}
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
    return (
      <section aria-labelledby="practice-title">
        <div className="practice-topbar">
          <div>
            <p className="eyebrow">Timed design room</p>
            <h1 id="practice-title">{activePrompt.title}</h1>
          </div>
        </div>

        <div className="practice-category-tabs" aria-label="Design category">
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

        <div className="prompt-switcher" aria-label="Design prompt">
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
            <span className="timer" aria-label={`${Math.ceil(secondsLeft / 60)} minutes remaining`}>{formatTimer(secondsLeft)}</span>
            <button className="button primary" onClick={toggleTimer}>{study.draft.deadline ? "Pause" : secondsLeft === activePrompt.durationMinutes * 60 ? "Start timer" : "Resume"}</button>
            <button className="button quiet" onClick={resetTimer}>Reset</button>
          </div>
        </div>
        <nav className="practice-step-tabs" aria-label="Interview phases">
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
                <small>{step.minutes}{step.minutes === "after" ? "" : "m"}</small>
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
                  <span>{field.label}</span>
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
            a diagram you cannot draw from memory is one you do not yet own.
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
              {study.draft.sketch.length === 0 && !referenceRevealed
                ? "Sketch the architecture above first—comparing before attempting turns practice into reading."
                : "Attempt the design first. The guide is a decision map—not the only valid architecture."}
            </p>
          </div>
          <button
            className="button light"
            onClick={() => setReferenceRevealed((value) => !value)}
            aria-expanded={referenceRevealed}
            aria-controls="reference-solution"
          >
            {referenceRevealed ? "Hide reference" : study.draft.sketch.length === 0 ? "Reveal anyway" : "Reveal reference"}
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
          <details>
            <summary>20-question reliability and trade-off checklist</summary>
            <ol className="standard-checklist">
              {standardQuestions.map((question) => (
                <li key={question.id}><label><input type="checkbox" /> <span>{question.text}</span></label></li>
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
          <p aria-live="polite">{saveNotice || "Draft changes are stored locally as you type."}</p>
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
        <div className="page-intro">
          <div><p className="eyebrow">Spoken practice</p><h1 id="mock-title">Run the interview, not the notes.</h1></div>
          <button className="button quiet" onClick={randomizeMock}>Draw another prompt</button>
        </div>
        <article className="mock-card">
          <div className="mock-card-copy">
            <div className="ticket-meta"><span>{mockPrompt.category}</span><span>{mockPrompt.difficulty}</span><span>{mockPrompt.durationMinutes} min</span></div>
            <h2>{mockPrompt.title}</h2>
            <p>{mockPrompt.prompt}</p>
            <button className="button light" onClick={() => choosePractice(mockPrompt)}>Start this mock</button>
          </div>
          <div className="mock-phases">
            <p className="eyebrow inverted">Stage checklist</p>
            {interviewPhases.map((phase) => (
              <label key={phase.id}>
                <input
                  type="checkbox"
                  checked={Boolean(mockChecks[phase.id])}
                  onChange={(event) => setMockChecks((current) => ({ ...current, [phase.id]: event.target.checked }))}
                />
                <span><strong>{phase.label}</strong><small>{phase.description}</small></span>
                <em>{phase.minutes}m</em>
              </label>
            ))}
          </div>
        </article>
        <div className="topic-grid mock-followups">
          <article className="paper-panel">
            <p className="eyebrow">Expected deep dives</p>
            <ul className="arrow-list">{mockPrompt.expectedTopics.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="paper-panel danger-paper">
            <p className="eyebrow">Likely misses</p>
            <ul className="arrow-list">{mockPrompt.commonFailureModes.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>
    );
  }

  function renderMistakeForm() {
    return (
      <div className="mistake-form">
        <label>
          <span>Category</span>
          <select value={mistakeForm.category} onChange={(event) => setMistakeForm((current) => ({ ...current, category: event.target.value as MistakeCategory }))}>
            {mistakeCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label>
          <span>What went wrong?</span>
          <input value={mistakeForm.mistake} onChange={(event) => setMistakeForm((current) => ({ ...current, mistake: event.target.value }))} placeholder="I chose a queue before stating the ordering requirement…" />
        </label>
        <label>
          <span>Correct approach</span>
          <input value={mistakeForm.correctApproach} onChange={(event) => setMistakeForm((current) => ({ ...current, correctApproach: event.target.value }))} placeholder="Ask which events require per-key ordering first…" />
        </label>
        <label>
          <span>Review date</span>
          <input type="date" value={mistakeForm.reviewDate} onChange={(event) => setMistakeForm((current) => ({ ...current, reviewDate: event.target.value }))} />
        </label>
        <button className="button light" onClick={addMistake}>Add to review queue</button>
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
          <div><strong>Reset local study data</strong><p>Clears only this site&apos;s progress, notes, attempts, and mistakes from this browser.</p></div>
          <button className="button danger" onClick={resetProgress}>Reset everything</button>
        </section>
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
        <header className="site-header">
          <div className="mobile-brand"><strong>System Design Lab</strong><span>W{String(currentWeek.week).padStart(2, "0")}</span></div>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)} aria-current={view === item.id ? "page" : undefined}>{item.label}</button>)}
          </nav>
          <div className="header-context">
            <span className="live-dot" aria-hidden="true" />
            <p><strong>Current focus</strong><span>Week {currentWeek.week} · {currentWeek.title}</span></p>
          </div>
          <div className="header-actions">
            <span className="local-badge">Saved locally</span>
            <button
              className="theme-toggle"
              onClick={() => setStudy((current) => ({ ...current, theme: current.theme === "light" ? "dark" : "light" }))}
              aria-label={`Switch to ${study.theme === "light" ? "dark" : "light"} mode`}
            >
              <span aria-hidden="true">{study.theme === "light" ? "◐" : "☀"}</span>
            </button>
          </div>
        </header>

        <main className="site-main">
          {!hydrated && <p className="sr-only" aria-live="polite">Loading saved study progress.</p>}
          {viewContent[view]()}
        </main>
        <footer className="site-footer"><span>System Design Interview Lab</span><p>Estimate → design → stress → reflect.</p><span>{allTopics.length} modules · local-first</span></footer>
      </div>
    </div>
  );
}
