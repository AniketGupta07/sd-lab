import { classicPrompts, classicTopics } from "./content/classic";
import { foundationPrompts, foundationTopics } from "./content/foundations";
import { llmPrompts, llmTopics } from "./content/llm";
import { mlPrompts, mlTopics } from "./content/ml";
import { classicPrimers } from "./content/primers/classic";
import { foundationPrimers } from "./content/primers/foundations";
import { llmPrimers } from "./content/primers/llm";
import { mlPrimers } from "./content/primers/ml";
import type { CurriculumTier, DesignPrompt, RawStudyTopic, StudyTopic, TopicPrimerEntry } from "./content/types";

export type { ArchitectureDiagram, DesignCategory, DesignPrompt, StudyTopic } from "./content/types";

export type WeekPlan = {
  week: number;
  title: string;
  tier: CurriculumTier;
  focus: string;
  topics: string[];
  /** Design prompts on the critical path. Titles must resolve to a prompt. */
  designs: string[];
  /** Reachable-but-optional prompts, so nothing in the library is orphaned. */
  extraDesigns: string[];
  /** Derived from the week's module minutes plus its core designs, never hand-written. */
  hours: string;
};

/** A week before its hours are computed. */
type WeekPlanSeed = Omit<WeekPlan, "hours">;

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
  /**
   * Fraction of the interview this phase should occupy. Stored as a share
   * rather than a minute range because design prompts run anywhere from 40 to
   * 60 minutes; a hardcoded range would contradict the countdown on the same
   * screen. Shares sum to 1.
   */
  share: number;
  description: string;
};

/** The clock the dashboard's reusable structure is quoted against. */
export const BASELINE_INTERVIEW_MINUTES = 45;

/** A phase's budget against one prompt's actual duration. */
export function phaseMinutes(share: number, totalMinutes: number): string {
  const target = share * totalMinutes;
  const low = Math.max(1, Math.round(target * 0.85));
  const high = Math.round(target * 1.15);
  return low === high ? `≈${low}` : `${low}–${high}`;
}

export type StandardQuestion = {
  id: number;
  text: string;
};

const weekPlanSeeds: WeekPlanSeed[] = [
  {
    week: 1,
    title: "Scale, guarantees & replication",
    tier: 0,
    focus: "Build fast intuition for capacity, consistency guarantees per operation, replication ownership, and the request path.",
    topics: ["Latency and capacity", "Consistency", "Idempotency", "Replication", "Consensus", "Networking"],
    designs: ["URL shortener"],
    extraDesigns: [],
  },
  {
    week: 2,
    title: "Storage, caching & identity",
    tier: 0,
    focus: "Choose storage engines and caches from access patterns, then establish who the caller is and what they may do.",
    topics: ["Caching", "Queues and logs", "Storage engines", "Indexing", "Authentication", "Authorization", "Timed practice"],
    designs: ["Distributed rate limiter"],
    extraDesigns: [],
  },
  {
    week: 3,
    title: "Coordination & conflict",
    tier: 1,
    focus: "Survive partial failure: atomic commitment, compensation, causality, conflict resolution, membership, and reconciliation.",
    topics: ["2PC and sagas", "Vector clocks", "CRDTs", "Outbox", "Gossip and discovery", "Reconciliation"],
    designs: ["Unique ID Service"],
    extraDesigns: [],
  },
  {
    week: 4,
    title: "Read-heavy & real-time systems",
    tier: 1,
    focus: "Reason about fan-out, ranking, pagination, persistent connections, and per-entity ordering.",
    topics: ["Fan-out", "Ranking", "Pagination", "WebSockets", "Ordering", "Delivery"],
    designs: ["Newsfeed or Timeline"],
    extraDesigns: [],
  },
  {
    week: 5,
    title: "Stateful & asynchronous systems",
    tier: 1,
    focus: "Design ledgers, presence, notification orchestration, and large-object ingestion that survive ambiguous outcomes.",
    topics: ["Presence", "Ledgers", "Notifications", "Multipart upload", "Content addressing", "Idempotent effects"],
    designs: ["Chat and Messaging", "Payment and Ledger System"],
    extraDesigns: ["Notification System"],
  },
  {
    week: 6,
    title: "Sync, geo & search",
    tier: 1,
    focus: "Handle offline conflicts, spatial indexing and its privacy duties, crawling, and incremental index serving.",
    topics: ["File sync", "Spatial indexes", "Crawl frontier", "Politeness", "Inverted indexes", "Segment merging"],
    designs: ["File Storage and Synchronization", "Nearby-Location Service"],
    extraDesigns: [],
  },
  {
    week: 7,
    title: "Observability, SLOs & first mocks",
    tier: 1,
    focus: "Instrument high-cardinality telemetry, define SLOs and degradation, plan regional recovery, then run a timed classic mock.",
    topics: ["Cardinality", "Retention", "SLOs", "Backpressure", "Multi-region", "Interview clock"],
    designs: ["Web Crawler and Search Index", "Metrics, Logging, and Observability Platform"],
    extraDesigns: [],
  },
  {
    week: 8,
    title: "ML system design foundations",
    tier: 2,
    focus: "Connect a product decision to targets, labels with point-in-time correctness, and a feature platform without skew.",
    topics: ["Problem framing", "Metrics and slices", "Labels", "Leakage", "Feature stores", "Training-serving skew"],
    designs: ["Recommendation feed"],
    extraDesigns: ["ETA prediction"],
  },
  {
    week: 9,
    title: "Retrieval, ranking & calibration",
    tier: 2,
    focus: "Build two-stage retrieval and ranking, then make probabilities and thresholds usable as decisions.",
    topics: ["ANN and HNSW", "Two-stage ranking", "Position bias", "Registry", "Calibration", "Delayed labels"],
    designs: ["Search ranking", "Ads click-through-rate prediction"],
    extraDesigns: ["Credit-risk scoring"],
  },
  {
    week: 10,
    title: "Experimentation & safe rollout",
    tier: 2,
    focus: "Measure impact trustworthily, roll out with guardrails, monitor drift and feedback loops, then run an ML mock.",
    topics: ["A/B testing", "SRM", "Interference", "Canary and rollback", "Drift", "Feedback loops"],
    designs: ["Real-time fraud detection", "Content moderation"],
    extraDesigns: ["Personalized notifications"],
  },
  {
    week: 11,
    title: "LLM inference & training infrastructure",
    tier: 3,
    focus: "Balance KV memory, batching, parallelism, and retrieval quality across serving and distributed training.",
    topics: ["Prefill and decode", "KV cache", "Continuous batching", "Paged attention", "Parallelism", "RAG"],
    designs: ["Large-scale LLM serving", "Enterprise RAG assistant"],
    extraDesigns: [],
  },
  {
    week: 12,
    title: "LLM operations & final mocks",
    tier: 3,
    focus: "Close post-training, evaluation, safety, and cost, then convert everything into spoken 40–45 minute designs.",
    topics: ["Post-training", "Evaluation", "Judges", "Prompt injection", "Unit economics", "Executive close"],
    designs: ["Multi-model inference gateway", "Post-training platform"],
    extraDesigns: ["Generative evaluation platform", "Human-preference collection and arena"],
  },
];

/**
 * The beginner layer lives in its own files so it reads as one continuous body
 * of writing rather than being scattered through four content files that are
 * already hundreds of kilobytes each. Merging here means a module cannot ship
 * without one: `attachPrimers` throws rather than rendering a topic with a
 * missing "start here" section, which would be the one failure a beginner
 * could least recover from.
 */
const topicPrimers: Record<string, TopicPrimerEntry> = {
  ...foundationPrimers,
  ...classicPrimers,
  ...mlPrimers,
  ...llmPrimers,
};

function attachPrimers(topics: RawStudyTopic[]): StudyTopic[] {
  const missing = topics.filter((topic) => !topicPrimers[topic.id]).map((topic) => topic.id);
  if (missing.length > 0) {
    throw new Error(`Study content invariant failed: these modules have no primer: ${missing.join(", ")}`);
  }
  const known = new Set(topics.map((topic) => topic.id));
  const orphaned = Object.keys(topicPrimers).filter((id) => !known.has(id));
  if (orphaned.length > 0) {
    throw new Error(`Study content invariant failed: primers reference unknown modules: ${orphaned.join(", ")}`);
  }
  return topics.map((topic) => ({ ...topic, ...topicPrimers[topic.id] }));
}

export const allTopics: StudyTopic[] = attachPrimers([...foundationTopics, ...classicTopics, ...mlTopics, ...llmTopics])
  .sort((a, b) => a.week - b.week || a.day - b.day);

export const designPrompts: DesignPrompt[] = [...foundationPrompts, ...classicPrompts, ...mlPrompts, ...llmPrompts];

/**
 * Weekly effort is computed, not asserted. The hand-written figures had drifted
 * from the module times rendered directly beneath them on the same card, and
 * they drifted hardest in the tier-2 and tier-3 weeks, whose design prompts run
 * 55-60 minutes rather than 40.
 */
function weekHours(seed: WeekPlanSeed, topics: StudyTopic[], prompts: DesignPrompt[]): string {
  const moduleMinutes = topics
    .filter((topic) => topic.week === seed.week)
    .reduce((sum, topic) => sum + topic.estimatedMinutes, 0);
  const designMinutes = seed.designs.reduce((sum, title) => {
    const prompt = prompts.find((candidate) => candidate.title === title);
    return sum + (prompt?.durationMinutes ?? 0);
  }, 0);
  const total = (moduleMinutes + designMinutes) / 60;
  const low = Math.floor(total);
  return low === total ? `${total} h` : `${low}–${low + 1} h`;
}

export const curriculumWeeks: WeekPlan[] = weekPlanSeeds.map((seed) => ({
  ...seed,
  hours: weekHours(seed, allTopics, designPrompts),
}));

export const estimationDrills: EstimationDrill[] = [
  {
    id: "redirect-qps",
    title: "Redirect traffic",
    kind: "QPS + bandwidth",
    prompt: "A URL shortener serves 100M redirects/day. Peak traffic is 5× average and each response transfers 700 bytes. Estimate peak QPS and peak egress.",
    assumptions: ["A day is 86,400 s, rounded to 100,000 for one-significant-digit work", "Peak factor is 5", "Ignore request ingress"],
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
  {
    id: "token-unit-economics",
    title: "Cost per million tokens",
    kind: "Unit economics",
    prompt: "An inference fleet runs on GPUs billed at $2.50/GPU-hour on reserved capacity. One GPU sustains 1,200 output tokens/s at the target SLO, and the fleet averages 60% utilization across the day. Estimate the cost per million output tokens, then the same figure at 80% utilization.",
    assumptions: ["$2.50 per GPU-hour, reserved", "1,200 sustained output tokens/s per GPU at the SLO", "60% average utilization, then 80%", "Prefill and prompt tokens are modeled separately"],
    steps: [
      "3,600 s × 1,200 tokens/s = 4.32M output tokens per GPU-hour at saturation",
      "4.32M × 0.60 ≈ 2.6M billable output tokens per GPU-hour",
      "$2.50 ÷ 2.6M ≈ $0.96 per million output tokens",
      "At 80%: 4.32M × 0.80 ≈ 3.46M, so $2.50 ÷ 3.46M ≈ $0.72 per million",
    ],
    answer: "≈$0.96 per million output tokens at 60% utilization, falling to ≈$0.72 at 80%.",
    architecturalInterpretation: "Utilization is a first-class cost lever, which is why batching, admission, and routing are economic decisions and not only latency ones. Note the scope: this prices decode alone, and for retrieval-heavy workloads the prompt-to-output ratio and the prefix-cache hit rate can dominate the bill.",
  },
  {
    id: "pretraining-scale",
    title: "Pretraining run",
    kind: "GPU-hours + checkpoints",
    prompt: "Pretrain a 30-billion-parameter dense model on 2 trillion tokens. Assume 6 FLOPs per parameter per token for forward plus backward, and GPUs delivering 400 teraFLOP/s of useful throughput. Estimate total FLOPs, GPU-hours, wall clock on 1,024 GPUs, and checkpoint size and write bandwidth.",
    assumptions: ["6 FLOPs per parameter per token", "400 TFLOP/s useful per GPU after model FLOPs utilization", "1,024 GPUs at near-linear scaling", "Mixed-precision Adam: 12 bytes/parameter of master weights plus moments"],
    steps: [
      "6 × 30e9 params × 2e12 tokens = 3.6e23 FLOPs for the whole run",
      "3.6e23 ÷ 4e14 FLOP/s = 9e8 GPU-seconds = 250,000 GPU-hours",
      "250,000 ÷ 1,024 ≈ 244 hours ≈ 10 days, before restarts, stragglers, and evaluation",
      "Checkpoint = 30e9 × 12 B ≈ 360 GB of master weights and optimizer moments",
      "Checkpointing every 30 minutes is ≈488 writes; a 60-second write window needs ≈6 GB/s sustained to durable storage",
    ],
    answer: "≈3.6 × 10²³ FLOPs, ≈250,000 GPU-hours (≈10 days on 1,024 GPUs), ≈360 GB per checkpoint at ≈6 GB/s.",
    architecturalInterpretation: "The FLOP count sets the budget; the checkpoint bandwidth decides whether the run survives. A restart costs one checkpoint interval of compute across the whole fleet, so the interval is a trade between storage bandwidth and expected preemption rate rather than a default to accept.",
  },
];

export const interviewPhases: InterviewPhase[] = [
  { id: "clarify", label: "Clarify", share: 0.1, description: "Users, operations, scale, SLAs, invariants, security, and scope." },
  { id: "estimate", label: "Estimate", share: 0.1, description: "Only numbers that can change architecture." },
  { id: "contract", label: "APIs + data", share: 0.1, description: "Contracts, entities, keys, indexes, labels, and events." },
  { id: "architecture", label: "Architecture", share: 0.15, description: "Components plus one complete request or data flow." },
  { id: "deep-dive", label: "Deep dive", share: 0.42, description: "The dominant risk: consistency, ranking, queues, GPUs, or regions." },
  { id: "reliability", label: "Reliability", share: 0.13, description: "Failures, monitoring, security, cost, degradation, and 10× evolution." },
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
