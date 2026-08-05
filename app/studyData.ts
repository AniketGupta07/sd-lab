import { classicPrompts, classicTopics } from "./content/classic";
import { foundationPrompts, foundationTopics } from "./content/foundations";
import { llmPrompts, llmTopics } from "./content/llm";
import { mlPrompts, mlTopics } from "./content/ml";
import type { CurriculumTier, DesignPrompt, StudyTopic } from "./content/types";

export type { ArchitectureDiagram, DesignCategory, DesignPrompt, StudyTopic } from "./content/types";

export type WeekPlan = {
  week: number;
  title: string;
  tier: CurriculumTier;
  focus: string;
  topics: string[];
  designs: string[];
  hours: string;
};

export type EstimationDrill = {
  id: string;
  title: string;
  kind: string;
  prompt: string;
  assumptions: string[];
  steps: string[];
  answer: string;
  architecturalInterpretation: string;
};

export type InterviewPhase = {
  id: string;
  label: string;
  minutes: string;
  description: string;
};

export type StandardQuestion = {
  id: number;
  text: string;
};

export const curriculumWeeks: WeekPlan[] = [
  {
    week: 1,
    title: "Scale, guarantees & replication",
    tier: 0,
    focus: "Build fast intuition for capacity, consistency guarantees per operation, replication ownership, and the request path.",
    topics: ["Latency and capacity", "Consistency", "Idempotency", "Replication", "Consensus", "Networking"],
    designs: ["URL shortener"],
    hours: "5–6 h",
  },
  {
    week: 2,
    title: "Storage, caching & identity",
    tier: 0,
    focus: "Choose storage engines and caches from access patterns, then establish who the caller is and what they may do.",
    topics: ["Caching", "Queues and logs", "Storage engines", "Indexing", "Authentication", "Authorization"],
    designs: ["Distributed rate limiter"],
    hours: "5–6 h",
  },
  {
    week: 3,
    title: "Coordination & conflict",
    tier: 1,
    focus: "Survive partial failure: atomic commitment, compensation, causality, conflict resolution, membership, and reconciliation.",
    topics: ["2PC and sagas", "Vector clocks", "CRDTs", "Outbox", "Gossip and discovery", "Reconciliation"],
    designs: ["Unique ID Service"],
    hours: "6–7 h",
  },
  {
    week: 4,
    title: "Read-heavy & real-time systems",
    tier: 1,
    focus: "Reason about fan-out, ranking, pagination, persistent connections, and per-entity ordering.",
    topics: ["Fan-out", "Ranking", "Pagination", "WebSockets", "Ordering", "Delivery"],
    designs: ["Newsfeed or Timeline"],
    hours: "5–6 h",
  },
  {
    week: 5,
    title: "Stateful & asynchronous systems",
    tier: 1,
    focus: "Design ledgers, presence, notification orchestration, and large-object ingestion that survive ambiguous outcomes.",
    topics: ["Presence", "Ledgers", "Notifications", "Multipart upload", "Content addressing", "Idempotent effects"],
    designs: ["Chat and Messaging", "Payment and Ledger System"],
    hours: "6–7 h",
  },
  {
    week: 6,
    title: "Sync, geo & search",
    tier: 1,
    focus: "Handle offline conflicts, spatial indexing and its privacy duties, crawling, and incremental index serving.",
    topics: ["File sync", "Spatial indexes", "Crawl frontier", "Politeness", "Inverted indexes", "Segment merging"],
    designs: ["File Storage and Synchronization", "Nearby-Location Service"],
    hours: "6–7 h",
  },
  {
    week: 7,
    title: "Observability, SLOs & first mocks",
    tier: 1,
    focus: "Instrument high-cardinality telemetry, define SLOs and degradation, plan regional recovery, then run a timed classic mock.",
    topics: ["Cardinality", "Retention", "SLOs", "Backpressure", "Multi-region", "Interview clock"],
    designs: ["Web Crawler and Search Index", "Observability Platform"],
    hours: "7–8 h",
  },
  {
    week: 8,
    title: "ML system design foundations",
    tier: 2,
    focus: "Connect a product decision to targets, labels with point-in-time correctness, and a feature platform without skew.",
    topics: ["Problem framing", "Metrics and slices", "Labels", "Leakage", "Feature stores", "Training-serving skew"],
    designs: ["Recommendation feed"],
    hours: "5–6 h",
  },
  {
    week: 9,
    title: "Retrieval, ranking & calibration",
    tier: 2,
    focus: "Build two-stage retrieval and ranking, then make probabilities and thresholds usable as decisions.",
    topics: ["ANN and HNSW", "Two-stage ranking", "Position bias", "Registry", "Calibration", "Delayed labels"],
    designs: ["Search ranking", "Ads click-through-rate prediction"],
    hours: "6–7 h",
  },
  {
    week: 10,
    title: "Experimentation & safe rollout",
    tier: 2,
    focus: "Measure impact trustworthily, roll out with guardrails, monitor drift and feedback loops, then run an ML mock.",
    topics: ["A/B testing", "SRM", "Interference", "Canary and rollback", "Drift", "Feedback loops"],
    designs: ["Real-time fraud detection", "Content moderation"],
    hours: "6–7 h",
  },
  {
    week: 11,
    title: "LLM inference & training infrastructure",
    tier: 3,
    focus: "Balance KV memory, batching, parallelism, and retrieval quality across serving and distributed training.",
    topics: ["Prefill and decode", "KV cache", "Continuous batching", "Paged attention", "Parallelism", "RAG"],
    designs: ["Large-scale LLM serving", "Enterprise RAG assistant"],
    hours: "7–8 h",
  },
  {
    week: 12,
    title: "LLM operations & final mocks",
    tier: 3,
    focus: "Close post-training, evaluation, safety, and cost, then convert everything into spoken 40–45 minute designs.",
    topics: ["Post-training", "Evaluation", "Judges", "Prompt injection", "Unit economics", "Executive close"],
    designs: ["Multi-model inference gateway", "Post-training platform"],
    hours: "7–8 h",
  },
];

export const allTopics: StudyTopic[] = [...foundationTopics, ...classicTopics, ...mlTopics, ...llmTopics]
  .sort((a, b) => a.week - b.week || a.day - b.day);

export const designPrompts: DesignPrompt[] = [...foundationPrompts, ...classicPrompts, ...mlPrompts, ...llmPrompts];

function assertStudyContent(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Study content invariant failed: ${message}`);
}

function validateStudyContent(topics: StudyTopic[], prompts: DesignPrompt[]) {
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
    assertStudyContent(topic.quiz.length >= 2, `${topic.id} needs two recall checks`);
    assertStudyContent(topic.recallCards.length >= 2, `${topic.id} needs two free-recall cards`);
    for (const card of topic.recallCards) {
      assertStudyContent(card.prompt.length >= 40, `${topic.id} recall prompt is too thin`);
      assertStudyContent(card.answer.length >= 200, `${topic.id} recall answer must be a full model answer`);
    }
    for (const question of topic.quiz) {
      assertStudyContent(question.options.length >= 3, `${topic.id} quiz needs plausible options`);
      assertStudyContent(question.answerIndex >= 0 && question.answerIndex < question.options.length, `${topic.id} quiz answer is invalid`);
      assertStudyContent(question.explanation.length >= 40, `${topic.id} quiz needs an explanation`);
    }
  }

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
  }
}

validateStudyContent(allTopics, designPrompts);

export const estimationDrills: EstimationDrill[] = [
  {
    id: "redirect-qps",
    title: "Redirect traffic",
    kind: "QPS + bandwidth",
    prompt: "A URL shortener serves 100M redirects/day. Peak traffic is 5× average and each response transfers 700 bytes. Estimate peak QPS and peak egress.",
    assumptions: ["A day is approximately 100,000 seconds", "Peak factor is 5", "Ignore request ingress"],
    steps: ["100M ÷ 100k ≈ 1,000 average QPS", "1,000 × 5 ≈ 5,000 peak QPS", "5,000 × 700 B ≈ 3.5 MB/s"],
    answer: "≈5,000 peak redirects/s and ≈3.5 MB/s peak response egress.",
    architecturalInterpretation: "Raw bandwidth is modest; cache hit rate, p99 latency, hot-link skew, and regional failure load are the real design drivers.",
  },
  {
    id: "chat-storage",
    title: "Chat retention",
    kind: "Storage + replication",
    prompt: "Ten million daily users send 40 messages/day. Each stored message averages 1 KB. Estimate one year of logical and 3× replicated storage.",
    assumptions: ["400M messages/day", "1 KB/message includes metadata", "365 days", "Replication factor 3"],
    steps: ["400M × 1 KB ≈ 400 GB/day", "400 GB × 365 ≈ 146 TB/year", "146 TB × 3 ≈ 438 TB replicated"],
    answer: "≈146 TB logical/year; ≈438 TB with 3× replication, before indexes and compaction slack.",
    architecturalInterpretation: "Partition by conversation and time, tier old bodies, and budget indexes separately. Searchable metadata may need a derived index with its own retention.",
  },
  {
    id: "llm-gpu",
    title: "LLM serving fleet",
    kind: "GPU capacity",
    prompt: "Peak demand is 240,000 output tokens/s. One GPU sustains 1,200 usable output tokens/s at the target sequence mix and SLO. Estimate the fleet after adding 30% headroom above the saturation estimate.",
    assumptions: ["Usable throughput already reflects batching and memory fit", "Prompt-prefill demand is modeled separately", "30% additive headroom covers failures and forecast error"],
    steps: ["240,000 ÷ 1,200 = 200 GPUs at measured saturation", "200 × 1.3 = 260 GPUs"],
    answer: "≈260 GPUs, then validate per-replica model/KV memory, prefill load, failure domains, and batch efficiency.",
    architecturalInterpretation: "Admission must be weighted by prompt plus decode demand. A token-rate estimate alone can still OOM on long contexts or miss TTFT.",
  },
  {
    id: "presence-connections",
    title: "Chat connections",
    kind: "Concurrency",
    prompt: "A chat product has 25M daily users. At peak, 12% are online with one persistent connection each. A gateway safely holds 60,000 connections. Estimate gateways with 25% headroom.",
    assumptions: ["3M peak concurrent users", "One connection per user", "60k safe connections/gateway at the target heartbeat rate"],
    steps: ["25M × 12% = 3M connections", "3M ÷ 60k = 50 gateways", "50 × 1.25 ≈ 63 gateways"],
    answer: "≈63 gateways; deploy more to preserve capacity after a zone loss.",
    architecturalInterpretation: "Distribute ownership across zones and jitter reconnects. Authentication, presence writes, and session lookup may see a much larger recovery spike than steady state.",
  },
  {
    id: "feed-cache",
    title: "Feed working set",
    kind: "Cache working set",
    prompt: "A feed caches 200 post IDs for each of 20M recently active users. Each cached entry costs 24 bytes including score and metadata. Estimate one copy and a 2× replicated cache.",
    assumptions: ["4B entries", "24 bytes is effective in-memory cost", "Two independent cache copies"],
    steps: ["20M × 200 = 4B entries", "4B × 24 B ≈ 96 GB", "96 GB × 2 ≈ 192 GB"],
    answer: "≈96 GB for one logical working set; ≈192 GB with 2× cache replication.",
    architecturalInterpretation: "The set is affordable, but per-user key overhead and hot-celebrity fan-out may dominate. Measure allocator overhead and keep source data able to survive cache loss.",
  },
  {
    id: "upload-egress",
    title: "File ingestion",
    kind: "Bandwidth + daily bytes",
    prompt: "Five million users upload two 8 MB files per day. Peak ingress is 4× average. Estimate logical bytes/day and peak ingress bandwidth.",
    assumptions: ["Decimal units are sufficient", "Uploads are evenly sized for estimation", "A day is 86,400 seconds"],
    steps: ["5M × 2 × 8 MB = 80M MB ≈ 80 TB/day", "80 TB ÷ 86,400 s ≈ 0.93 GB/s average", "0.93 × 4 ≈ 3.7 GB/s ≈ 30 Gbit/s peak"],
    answer: "≈80 TB/day logical ingestion and ≈3.7 GB/s (≈30 Gbit/s) peak ingress.",
    architecturalInterpretation: "Use direct multipart upload to object storage so application servers do not proxy the bytes; include retry and cross-region replication traffic in the network budget.",
  },
  {
    id: "metrics-retention",
    title: "Metrics ingestion",
    kind: "Events + retention",
    prompt: "10,000 hosts emit 500 metric points/s each. An encoded point averages 32 bytes. Estimate ingress and 30-day raw storage with 3× replication.",
    assumptions: ["5M points/s", "No compression or aggregation in the raw estimate", "30 days", "Replication factor 3"],
    steps: ["10k × 500 = 5M points/s", "5M × 32 B = 160 MB/s", "160 MB/s × 86,400 ≈ 13.8 TB/day", "13.8 × 30 × 3 ≈ 1.24 PB"],
    answer: "≈160 MB/s ingress and ≈1.24 PB for 30 raw replicated days.",
    architecturalInterpretation: "Retention tiers, compression, rollups, and cardinality controls are architectural requirements—not later optimizations.",
  },
  {
    id: "vector-memory",
    title: "Vector index memory",
    kind: "Vector capacity",
    prompt: "A corpus produces 800M vectors of 768 dimensions stored in FP16. Estimate raw vector bytes and added graph bytes if each vector stores 32 four-byte neighbor IDs.",
    assumptions: ["2 bytes per FP16 value", "128 graph bytes/vector", "Exclude allocator, metadata, and replica overhead"],
    steps: ["768 × 2 B = 1,536 B/vector", "800M × 1,536 B ≈ 1.23 TB raw vectors", "800M × 128 B ≈ 102 GB graph links"],
    answer: "≈1.23 TB vectors plus ≈0.10 TB graph links before metadata, allocator overhead, and replicas.",
    architecturalInterpretation: "A full in-memory exact representation is expensive. Quantization, sharding, filtered routing, and a disk-backed or compressed tier may be needed; benchmark recall and latency on the actual distribution.",
  },
];

export const interviewPhases: InterviewPhase[] = [
  { id: "clarify", label: "Clarify", minutes: "3–5", description: "Users, operations, scale, SLAs, invariants, security, and scope." },
  { id: "estimate", label: "Estimate", minutes: "3–5", description: "Only numbers that can change architecture." },
  { id: "contract", label: "APIs + data", minutes: "3–5", description: "Contracts, entities, keys, indexes, labels, and events." },
  { id: "architecture", label: "Architecture", minutes: "5–7", description: "Components plus one complete request or data flow." },
  { id: "deep-dive", label: "Deep dive", minutes: "15–20", description: "The dominant risk: consistency, ranking, queues, GPUs, or regions." },
  { id: "reliability", label: "Reliability", minutes: "≈5", description: "Failures, monitoring, security, cost, degradation, and 10× evolution." },
];

export const standardQuestions: StandardQuestion[] = [
  "What is the source of truth?",
  "What are the dominant access patterns?",
  "Which invariants require coordination?",
  "What may be stale, by how much, and for whom?",
  "What happens after an ambiguous timeout?",
  "What happens when a message is delivered twice or out of order?",
  "Where can backpressure occur?",
  "What happens when a dependency becomes slow?",
  "What happens when one availability zone fails?",
  "What happens when an entire region fails?",
  "What is cached, versioned, and invalidated?",
  "How is data partitioned and ownership changed?",
  "What creates hot keys, tenants, or partitions?",
  "What is the first bottleneck at 10× traffic?",
  "What are the user-facing SLIs and SLOs?",
  "What can be rejected, queued, approximated, or degraded?",
  "What is the most expensive resource?",
  "How are correctness, quality, and drift monitored?",
  "How is a bad data, config, or model release rolled back?",
  "What security and privacy boundary is easiest to violate?",
].map((text, index) => ({ id: index + 1, text }));

export const mistakeCategories = [
  "Missed requirement",
  "Incorrect assumption",
  "Weak estimation",
  "Poor storage choice",
  "Poor cache choice",
  "Missing consistency discussion",
  "Missing idempotency",
  "Missing failure handling",
  "Missing backpressure",
  "Missing monitoring",
  "Unclear explanation",
  "Unjustified product choice",
  "Incorrect ML metric",
  "Data leakage",
  "Training-serving skew",
  "Missing guardrail metric",
  "Weak GPU-capacity estimate",
  "Time-management issue",
] as const;

export type MistakeCategory = (typeof mistakeCategories)[number];
