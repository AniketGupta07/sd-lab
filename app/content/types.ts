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
  furtherReading?: Array<{ label: string; url: string }>;
};

export type DesignCategory = "classic" | "ml" | "llm";

export type DesignReference = {
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
