export type CurriculumTier = 0 | 1 | 2 | 3;

export type DeepDiveSection = {
  title: string;
  summary: string;
  points: string[];
};

export type TopicTradeoff = {
  decision: string;
  preferA: string;
  preferB: string;
  watch: string;
};

export type TopicFailureMode = {
  mode: string;
  symptom: string;
  mitigation: string;
};

export type QuizQuestion = {
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

/**
 * A free-recall card. Unlike the multiple-choice quiz, nothing is shown to
 * choose between: you answer from memory, reveal, then grade yourself. This is
 * the retrieval practice that recognition-based questions cannot provide.
 */
export type RecallCard = {
  id: string;
  prompt: string;
  answer: string;
};

/**
 * A block of the from-zero explanation. `body` holds paragraphs rather than
 * bullets on purpose: bullets let you skip the reasoning that connects two
 * facts, and that connective tissue is exactly what a beginner is missing.
 */
export type PrimerSection = {
  heading: string;
  body: string[];
};

/** One fully-worked instance, so the idea is seen doing something concrete. */
export type WorkedExample = {
  title: string;
  setup: string;
  steps: string[];
  takeaway: string;
};

/**
 * The beginner layer. Everything else in a module is written for someone who
 * already owns the vocabulary; this is written for someone who does not, and
 * it renders first so nobody has to guess where to start.
 */
export type TopicPrimer = {
  /** The module's subject in words a first-year CS student already has. */
  plainSummary: string;
  /** A situation outside computing with the same structure. */
  analogy: string;
  sections: PrimerSection[];
  workedExample: WorkedExample;
};

/**
 * Every acronym, named theorem, and term of art the module leans on. The rule
 * this enforces: nothing is used before it is defined.
 */
export type GlossaryEntry = {
  term: string;
  /** What the letters stand for, when the term is an acronym. */
  expansion?: string;
  definition: string;
};

export type StudyTopic = {
  id: string;
  week: number;
  day: number;
  tier: CurriculumTier;
  title: string;
  eyebrow: string;
  estimatedMinutes: number;
  summary: string;
  whyItMatters: string;
  objectives: string[];
  concepts: string[];
  deepDive: DeepDiveSection[];
  tradeoffs: TopicTradeoff[];
  failureModes: TopicFailureMode[];
  interviewQuestions: string[];
  decisionChecklist: string[];
  exercise: string;
  prerequisites: string[];
  relatedDesigns: string[];
  quiz: QuizQuestion[];
  recallCards: RecallCard[];
  primer: TopicPrimer;
  glossary: GlossaryEntry[];
  furtherReading?: Array<{ label: string; url: string }>;
};

/**
 * What the domain content files declare. The primer and glossary live in their
 * own files and are merged in `studyData`, which keeps the beginner layer
 * readable as one continuous body of writing instead of being scattered
 * through four files that are already hundreds of kilobytes each. Deriving
 * this by `Omit` rather than redeclaring it means the merge cannot drift.
 */
export type RawStudyTopic = Omit<StudyTopic, "primer" | "glossary">;

/** The primer bundle a module must supply, keyed by topic id. */
export type TopicPrimerEntry = Pick<StudyTopic, "primer" | "glossary">;

export type DesignCategory = "classic" | "ml" | "llm";

/**
 * Node roles. These drive color and shape so a diagram can be read at a
 * glance: what stores state, what is merely compute, what crosses a trust
 * boundary.
 */
export type DiagramNodeKind =
  | "client"
  | "edge"
  | "service"
  | "store"
  | "cache"
  | "stream"
  | "compute"
  | "external";

/** `col`/`row` are grid coordinates, not pixels; the renderer computes layout. */
export type DiagramNode = {
  id: string;
  label: string;
  kind: DiagramNodeKind;
  col: number;
  row: number;
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  /** Dashed, for work that happens off the request path. */
  async?: boolean;
};

export type ArchitectureDiagram = {
  caption: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

export type DesignReference = {
  diagram: ArchitectureDiagram;
  scope: string[];
  apis: string[];
  dataModel: string[];
  architecture: string[];
  invariants: string[];
  deepDives: DeepDiveSection[];
  scaling: string[];
  observability: string[];
};

export type DesignPrompt = {
  id: string;
  title: string;
  category: DesignCategory;
  difficulty: "easy" | "medium" | "hard";
  durationMinutes: number;
  prompt: string;
  requirementsToExplore: string[];
  expectedTopics: string[];
  commonFailureModes: string[];
  followUpQuestions: string[];
  reference: DesignReference;
};
