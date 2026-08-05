"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  curriculumWeeks,
  designPrompts,
  estimationDrills,
  interviewPhases,
  mistakeCategories,
  standardQuestions,
  weekOneTopics,
  type DesignPrompt,
  type MistakeCategory,
} from "./studyData";

type View =
  | "dashboard"
  | "curriculum"
  | "topic"
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

type PracticeDraft = {
  id: string;
  promptId: string;
  startedAt: string;
  deadline: number | null;
  secondsRemaining: number;
  fields: Record<PracticeField, string>;
  scores: Record<ScoreField, number>;
};

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

type StudyState = {
  version: 1;
  topics: Record<string, TopicProgress>;
  generalNotes: string;
  mistakes: Mistake[];
  attempts: SavedAttempt[];
  activityDates: string[];
  theme: "light" | "dark";
  draft: PracticeDraft;
};

const STORAGE_KEY = "ai-system-design-study:v1";

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
  { id: "drills", index: "04", label: "Estimation" },
  { id: "practice", index: "05", label: "Design practice" },
  { id: "mock", index: "06", label: "Mock interview" },
  { id: "review", index: "07", label: "Notes & review" },
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
  };
}

function defaultState(): StudyState {
  return {
    version: 1,
    topics: Object.fromEntries(
      weekOneTopics.map((topic) => [
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

function mergeStoredState(raw: string): StudyState {
  const fallback = defaultState();
  try {
    const saved = JSON.parse(raw) as Partial<StudyState>;
    if (saved.version !== 1) return fallback;
    const savedTopics = saved.topics && typeof saved.topics === "object" ? saved.topics : {};
    return {
      ...fallback,
      ...saved,
      version: 1,
      topics: Object.fromEntries(
        weekOneTopics.map((topic) => [
          topic.id,
          { ...fallback.topics[topic.id], ...(savedTopics[topic.id] ?? {}) },
        ]),
      ),
      mistakes: Array.isArray(saved.mistakes) ? saved.mistakes : [],
      attempts: Array.isArray(saved.attempts) ? saved.attempts : [],
      activityDates: Array.isArray(saved.activityDates) ? saved.activityDates : [],
      draft: saved.draft?.fields && saved.draft?.scores ? saved.draft : fallback.draft,
    };
  } catch {
    return fallback;
  }
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
  const [activeTopicId, setActiveTopicId] = useState(weekOneTopics[0].id);
  const [activeDrillIndex, setActiveDrillIndex] = useState(0);
  const [drillAnswer, setDrillAnswer] = useState("");
  const [drillRevealed, setDrillRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(designPrompts[0].durationMinutes * 60);
  const [saveNotice, setSaveNotice] = useState("");
  const [mockPrompt, setMockPrompt] = useState<DesignPrompt>(designPrompts[0]);
  const [mockChecks, setMockChecks] = useState<Record<string, boolean>>({});
  const [mistakeForm, setMistakeForm] = useState({
    category: mistakeCategories[0] as MistakeCategory,
    mistake: "",
    correctApproach: "",
    reviewDate: tomorrowPlus(7),
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = stored ? mergeStoredState(stored) : defaultState();
    if (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches) next.theme = "dark";
    setStudy(next);
    setSecondsLeft(
      next.draft.deadline
        ? Math.max(0, Math.ceil((next.draft.deadline - Date.now()) / 1000))
        : next.draft.secondsRemaining,
    );
    setHydrated(true);

    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) setStudy(mergeStoredState(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
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

  const completedTopics = useMemo(
    () => weekOneTopics.filter((topic) => study.topics[topic.id]?.status === "completed").length,
    [study.topics],
  );
  const progressPercent = Math.round((completedTopics / weekOneTopics.length) * 100);
  const streak = useMemo(() => calculateStreak(study.activityDates), [study.activityDates]);
  const activeTopic = weekOneTopics.find((topic) => topic.id === activeTopicId) ?? weekOneTopics[0];
  const activeDrill = estimationDrills[activeDrillIndex];
  const activePrompt = designPrompts.find((prompt) => prompt.id === study.draft.promptId) ?? designPrompts[0];
  const unresolvedMistakes = study.mistakes.filter((mistake) => !mistake.resolved);
  const weakTopics = weekOneTopics.filter((topic) => {
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
    setActiveTopicId(topicId);
    selectView("topic");
  }

  function chooseDrill(index: number) {
    setActiveDrillIndex(index);
    setDrillAnswer("");
    setDrillRevealed(false);
  }

  function choosePractice(prompt: DesignPrompt, fresh = true) {
    setStudy((current) => ({
      ...current,
      draft: fresh ? makeDraft(prompt, newId("attempt")) : current.draft,
    }));
    setSecondsLeft(prompt.durationMinutes * 60);
    setSaveNotice("");
    selectView("practice");
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
    setStudy((current) => ({ ...current, draft: { ...attempt, deadline: null } }));
    setSecondsLeft(attempt.secondsRemaining);
    setView("practice");
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
    setSaveNotice("Local study data reset.");
  }

  function renderDashboard() {
    const dueTopics = weekOneTopics.filter((topic) => study.topics[topic.id]?.status !== "completed").slice(0, 3);
    const latestAttempt = study.attempts[0];
    return (
      <>
        <section className="hero-grid" aria-labelledby="dashboard-title">
          <div className="hero-copy">
            <p className="eyebrow">Week 01 · Foundations</p>
            <h1 id="dashboard-title">Turn technical depth into interview signal.</h1>
            <p className="hero-lede">
              Build the habit of estimating first, stating assumptions aloud, and defending every trade-off.
              Today&apos;s work is intentionally small enough to finish.
            </p>
            <div className="hero-actions">
              <button className="button primary" onClick={() => openTopic(dueTopics[0]?.id ?? weekOneTopics[0].id)}>
                Start today&apos;s study
              </button>
              <button className="button quiet" onClick={() => choosePractice(designPrompts[0])}>
                Run a 40-min design
              </button>
            </div>
          </div>

          <div className="progress-seal" style={{ "--progress": `${progressPercent * 3.6}deg` } as CSSProperties}>
            <div className="progress-seal-inner">
              <strong>{progressPercent}%</strong>
              <span>Week 1</span>
            </div>
            <p>{completedTopics} of {weekOneTopics.length} sessions complete</p>
          </div>
        </section>

        <section className="metric-strip" aria-label="Study status">
          <article>
            <span className="metric-index">A</span>
            <strong>{streak}</strong>
            <p>day study streak</p>
          </article>
          <article>
            <span className="metric-index">B</span>
            <strong>{study.attempts.length}</strong>
            <p>saved designs</p>
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
              <span className="section-note">~3 hours total</span>
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
                  <strong>Week 1 complete.</strong>
                  <p>Use the design practice to consolidate what you learned.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="practice-ticket" aria-labelledby="next-practice-heading">
            <p className="eyebrow inverted">Next full design</p>
            <h2 id="next-practice-heading">URL shortener</h2>
            <p>Low-latency redirects, ID generation, hot links, expiration, analytics, and abuse prevention.</p>
            <div className="ticket-meta">
              <span>Classic</span><span>Medium</span><span>40 min</span>
            </div>
            <button className="button light" onClick={() => choosePractice(designPrompts[0])}>Open practice room</button>
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
          <p>Two full designs, three component drills, and one review loop each week. Later weeks shift the balance toward spoken, timed practice.</p>
        </div>

        <div className="week-list">
          {curriculumWeeks.map((week) => (
            <details className="week-row" key={week.week} open={week.week === 1}>
              <summary>
                <span className="week-number">W{String(week.week).padStart(2, "0")}</span>
                <span className="week-title">
                  <small>Tier {week.tier}</small>
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
                {week.week === 1 && (
                  <div className="week-one-grid">
                    {weekOneTopics.map((topic) => (
                      <button key={topic.id} onClick={() => openTopic(topic.id)}>
                        <span>Day {topic.day}</span>
                        <strong>{topic.title}</strong>
                        <small>{study.topics[topic.id]?.status.replace("-", " ")} · {topic.estimatedMinutes} min</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
    );
  }

  function renderTopic() {
    const topicProgress = study.topics[activeTopic.id];
    return (
      <section aria-labelledby="topic-title">
        <div className="topic-picker" aria-label="Week 1 topics">
          {weekOneTopics.map((topic) => (
            <button
              key={topic.id}
              className={topic.id === activeTopic.id ? "active" : ""}
              onClick={() => setActiveTopicId(topic.id)}
              aria-pressed={topic.id === activeTopic.id}
            >
              <span>D{topic.day}</span>{topic.title}
            </button>
          ))}
        </div>

        <div className="topic-header">
          <div>
            <p className="eyebrow">Day {activeTopic.day} · {activeTopic.estimatedMinutes} minutes</p>
            <h1 id="topic-title">{activeTopic.title}</h1>
            <p>{activeTopic.summary}</p>
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
          <article className="paper-panel">
            <p className="eyebrow">Trade-offs to say aloud</p>
            <ul className="arrow-list">{activeTopic.tradeoffs.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="paper-panel danger-paper">
            <p className="eyebrow">Failure modes</p>
            <ul className="arrow-list">{activeTopic.failureModes.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="paper-panel topic-wide">
            <div className="section-heading">
              <div><p className="eyebrow">Active recall</p><h2>Questions an interviewer may push on</h2></div>
            </div>
            <ol className="question-list">{activeTopic.interviewQuestions.map((item) => <li key={item}>{item}</li>)}</ol>
          </article>
          <article className="exercise-card topic-wide">
            <div><p className="eyebrow inverted">Component exercise</p><h2>{activeTopic.exercise}</h2></div>
            <button className="button light" onClick={() => selectView(activeTopic.id === "estimation" ? "drills" : "practice")}>Open workspace</button>
          </article>
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
              role="tab"
              aria-selected={index === activeDrillIndex}
              className={index === activeDrillIndex ? "active" : ""}
              onClick={() => chooseDrill(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {drill.title}
            </button>
          ))}
        </div>

        <div className="drill-workspace">
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
            <button className="button primary" onClick={() => setDrillRevealed((value) => !value)}>
              {drillRevealed ? "Hide worked answer" : "Reveal worked answer"}
            </button>
          </div>
        </div>

        {drillRevealed && (
          <article className="solution-sheet" aria-live="polite">
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
          <div className="timer-cluster">
            <span className="timer" aria-label={`${Math.ceil(secondsLeft / 60)} minutes remaining`}>{formatTimer(secondsLeft)}</span>
            <button className="button primary" onClick={toggleTimer}>{study.draft.deadline ? "Pause" : secondsLeft === activePrompt.durationMinutes * 60 ? "Start timer" : "Resume"}</button>
            <button className="button quiet" onClick={resetTimer}>Reset</button>
          </div>
        </div>

        <div className="prompt-switcher" aria-label="Design prompt">
          {designPrompts.map((prompt) => (
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

        <ol className="practice-phase-strip" aria-label="Interview phases">
          {interviewPhases.map((phase, index) => (
            <li key={phase.id}><span>0{index + 1}</span><strong>{phase.label}</strong><small>{phase.minutes}m</small></li>
          ))}
        </ol>

        <div className="editor-grid">
          {practiceFields.map((field) => (
            <label className={`editor-field ${field.wide ? "wide" : ""}`} key={field.id}>
              <span>{field.label}</span>
              <textarea
                value={study.draft.fields[field.id]}
                onChange={(event) => updateDraftField(field.id, event.target.value)}
                placeholder={field.prompt}
                rows={field.wide ? 8 : 6}
              />
            </label>
          ))}
        </div>

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
          <div><span>Week 1 progress</span><strong>{progressPercent}%</strong></div>
          <div className="progress-track" aria-hidden="true"><i style={{ width: `${progressPercent}%` }} /></div>
          <p>{completedTopics}/{weekOneTopics.length} sessions · {streak} day streak</p>
        </div>
      </aside>

      <div className="workspace">
        <header className="site-header">
          <div className="mobile-brand"><strong>System Design Lab</strong><span>W01</span></div>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)}>{item.label}</button>)}
          </nav>
          <div className="header-context">
            <span className="live-dot" aria-hidden="true" />
            <p><strong>Current focus</strong><span>Foundations & estimation</span></p>
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
        <footer className="site-footer"><span>System Design Interview Lab</span><p>Estimate → design → stress → reflect.</p><span>Local-first · v1</span></footer>
      </div>
    </div>
  );
}
