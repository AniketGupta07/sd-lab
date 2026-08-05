export type CurriculumTier = 0 | 1 | 2 | 3;

export type WeekPlan = {
  week: number;
  title: string;
  tier: CurriculumTier;
  focus: string;
  topics: string[];
  designs: string[];
  hours: string;
};

export type WeekOneTopic = {
  id: string;
  day: number;
  title: string;
  eyebrow: string;
  estimatedMinutes: number;
  summary: string;
  objectives: string[];
  concepts: string[];
  tradeoffs: string[];
  failureModes: string[];
  interviewQuestions: string[];
  exercise: string;
  prerequisites: string[];
  relatedDesigns: string[];
};

export type DesignPrompt = {
  id: string;
  title: string;
  category: "classic" | "ml" | "llm";
  difficulty: "easy" | "medium" | "hard";
  durationMinutes: number;
  prompt: string;
  requirementsToExplore: string[];
  expectedTopics: string[];
  commonFailureModes: string[];
  followUpQuestions: string[];
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
    title: "Foundations & estimation",
    tier: 0,
    focus: "Build fast intuition for scale, guarantees, data movement, and storage choices.",
    topics: ["Latency and capacity", "Consistency", "Replication", "Networking", "Caching and queues", "Storage internals"],
    designs: ["URL shortener", "Distributed rate limiter"],
    hours: "8–10 h",
  },
  {
    week: 2,
    title: "Read-heavy & real-time systems",
    tier: 1,
    focus: "Reason about fan-out, persistent connections, ordering, presence, and freshness.",
    topics: ["Fan-out", "WebSockets", "Ordering", "Presence", "Pagination"],
    designs: ["Newsfeed", "Chat system"],
    hours: "8–10 h",
  },
  {
    week: 3,
    title: "Stateful & asynchronous systems",
    tier: 1,
    focus: "Design idempotent workflows that survive retries, reconciliation, and partial failure.",
    topics: ["Ledgers", "Queues", "Retries", "Reconciliation", "File synchronization"],
    designs: ["Payment ledger", "Notification system", "File sync"],
    hours: "9–11 h",
  },
  {
    week: 4,
    title: "Geo, search & observability",
    tier: 1,
    focus: "Explore spatial indexing, crawling, metrics pipelines, multi-region design, and SLOs.",
    topics: ["Spatial indexes", "Search indexing", "Metrics pipelines", "Multi-region", "Graceful degradation"],
    designs: ["Nearby service", "Web crawler", "Metrics platform"],
    hours: "9–11 h",
  },
  {
    week: 5,
    title: "ML system design foundations",
    tier: 2,
    focus: "Connect product objectives to labels, retrieval, ranking, evaluation, and serving.",
    topics: ["Metrics", "Labels", "Feature stores", "Candidate generation", "Ranking"],
    designs: ["Recommendation feed", "Search ranking"],
    hours: "8–10 h",
  },
  {
    week: 6,
    title: "High-stakes ML & experimentation",
    tier: 2,
    focus: "Handle delayed labels, calibration, drift, guardrails, rollout, and feedback loops.",
    topics: ["Delayed labels", "Calibration", "Drift", "A/B testing", "Canary and rollback"],
    designs: ["Fraud detection", "Content moderation", "Ads CTR"],
    hours: "8–10 h",
  },
  {
    week: 7,
    title: "LLM & training infrastructure",
    tier: 3,
    focus: "Balance GPU memory, throughput, latency, retrieval quality, evaluation, safety, and cost.",
    topics: ["LLM inference", "Distributed training", "RAG", "Post-training", "LLM evaluation"],
    designs: ["Enterprise RAG", "Inference gateway", "Post-training platform"],
    hours: "9–11 h",
  },
  {
    week: 8,
    title: "Timed mock interviews",
    tier: 3,
    focus: "Convert knowledge into six coherent, spoken 40–45 minute interviews.",
    topics: ["Communication", "Time control", "Trade-off narration", "Mistake review"],
    designs: ["2 classic mocks", "2 ML mocks", "2 LLM infrastructure mocks"],
    hours: "8–10 h",
  },
];

export const weekOneTopics: WeekOneTopic[] = [
  {
    id: "estimation",
    day: 1,
    title: "Estimation & latency intuition",
    eyebrow: "Capacity before components",
    estimatedMinutes: 75,
    summary: "Translate product scale into QPS, storage, bandwidth, concurrency, cache working set, and GPU demand—then state what each estimate changes in the design.",
    objectives: ["Estimate with orders of magnitude", "Separate average from peak", "Connect numbers to bottlenecks"],
    concepts: ["1 day ≈ 100,000 seconds", "Peak factor", "Replication overhead", "Usable accelerator throughput"],
    tradeoffs: ["Precision versus interview time", "Headroom versus cost", "Batch efficiency versus tail latency"],
    failureModes: ["False precision", "Ignoring egress", "Using theoretical GPU throughput", "Numbers with no architectural consequence"],
    interviewQuestions: ["Which number could change your architecture?", "What peak factor is justified?", "Where is the first saturation point?"],
    exercise: "Estimate traffic, storage, bandwidth, and cache size for a URL shortener serving 100M redirects per day.",
    prerequisites: ["Basic arithmetic", "Units"],
    relatedDesigns: ["URL shortener", "LLM inference service"],
  },
  {
    id: "consistency-idempotency",
    day: 2,
    title: "Consistency & idempotency",
    eyebrow: "Guarantees by operation",
    estimatedMinutes: 75,
    summary: "Choose the weakest guarantee that preserves the product invariant, and make every retryable write safe by design.",
    objectives: ["Distinguish linearizability and serializability", "Apply CAP and PACELC", "Design idempotent effects"],
    concepts: ["Linearizability", "Snapshot isolation", "Causal consistency", "Idempotency keys", "Optimistic concurrency"],
    tradeoffs: ["Freshness versus availability", "Coordination versus latency", "Deduplication storage versus duplicate effects"],
    failureModes: ["Claiming exactly-once delivery", "Retrying non-idempotent writes", "Global locking by default"],
    interviewQuestions: ["Which operation requires strong consistency?", "What happens when the client times out after commit?", "How long is a dedupe key retained?"],
    exercise: "Choose guarantees for payments, inventory, chat presence, profile updates, likes, and analytics.",
    prerequisites: ["Transactions"],
    relatedDesigns: ["Payment ledger", "Chat"],
  },
  {
    id: "replication-partitioning",
    day: 3,
    title: "Replication & partitioning",
    eyebrow: "Scale data without losing invariants",
    estimatedMinutes: 75,
    summary: "Match replication and partitioning strategies to access patterns, failure tolerance, rebalancing cost, and hotspot risk.",
    objectives: ["Compare leader, multi-leader, and leaderless systems", "Select a partition key", "Plan resharding"],
    concepts: ["Quorums", "Replication lag", "Hash and range partitioning", "Consistent hashing", "Virtual nodes"],
    tradeoffs: ["Write availability versus conflict resolution", "Range scans versus even load", "Replication factor versus cost"],
    failureModes: ["Hot keys", "Cross-shard transactions", "Unbounded replication lag", "Rebalance storms"],
    interviewQuestions: ["What is the partition key?", "How do you move a hot tenant?", "What does a regional failover read?"],
    exercise: "Design the storage layer of a distributed key-value store and narrate a resharding event.",
    prerequisites: ["Consistency models"],
    relatedDesigns: ["Distributed cache", "Newsfeed"],
  },
  {
    id: "networking",
    day: 4,
    title: "Networking & service boundaries",
    eyebrow: "Trace the request path",
    estimatedMinutes: 70,
    summary: "Explain how requests travel from client to service and how protocols, proxies, pooling, retries, and timeouts affect reliability and latency.",
    objectives: ["Choose REST, gRPC, WebSocket, or WebRTC", "Place L4 and L7 balancing", "Budget timeouts"],
    concepts: ["TCP versus UDP", "HTTP/2", "Reverse proxy", "Service discovery", "Connection pooling", "CDN"],
    tradeoffs: ["Human-readable payloads versus efficiency", "Persistent connections versus operational complexity", "Retries versus amplification"],
    failureModes: ["Retry storms", "Connection exhaustion", "Mismatched timeouts", "Head-of-line blocking"],
    interviewQuestions: ["Where does TLS terminate?", "Who owns the retry budget?", "How is backpressure signaled?"],
    exercise: "Trace video playback, chat delivery, and an internal gRPC call from edge to storage.",
    prerequisites: ["TCP/IP basics"],
    relatedDesigns: ["Chat", "Video streaming"],
  },
  {
    id: "caching-queues",
    day: 5,
    title: "Caching, queues & backpressure",
    eyebrow: "Control load and asynchronous work",
    estimatedMinutes: 80,
    summary: "Use caches to remove repeated work and queues to absorb bursts while preserving ordering, retry safety, and bounded resource use.",
    objectives: ["Choose a cache pattern and TTL", "Explain delivery semantics", "Design backpressure and dead-letter handling"],
    concepts: ["Cache-aside", "Write-through", "Stampede control", "Consumer groups", "At-least-once delivery", "Dead-letter queues"],
    tradeoffs: ["Freshness versus hit rate", "Ordering versus parallelism", "Buffering versus stale work"],
    failureModes: ["Cache stampede", "Poison messages", "Unbounded lag", "Duplicate side effects", "Hot keys"],
    interviewQuestions: ["What is cached and how is it invalidated?", "What happens to a message delivered twice?", "Where is the queue depth alarm?"],
    exercise: "Explain duplicate payment-message delivery and prevent the financial effect from being applied twice.",
    prerequisites: ["Idempotency"],
    relatedDesigns: ["Notification system", "Payment ledger"],
  },
  {
    id: "storage-indexing",
    day: 6,
    title: "Storage selection & indexing",
    eyebrow: "Access patterns choose the database",
    estimatedMinutes: 80,
    summary: "Start from reads, writes, consistency, and query shape; then justify a storage model, keys, indexes, and operational trade-offs.",
    objectives: ["Select storage by workload", "Compare B-trees and LSM-trees", "Reason about index and replication overhead"],
    concepts: ["Relational", "Key-value", "Wide-column", "Object", "Vector", "B-tree", "LSM-tree", "Bloom filter"],
    tradeoffs: ["Read versus write amplification", "Flexible queries versus horizontal scale", "Secondary indexes versus write cost"],
    failureModes: ["Database by brand name", "Missing access pattern", "Unbounded indexes", "Compaction stalls"],
    interviewQuestions: ["What is the source of truth?", "Which query needs a secondary index?", "What changes at 10× write volume?"],
    exercise: "Select and justify storage for six workloads: ledger, chat history, blobs, metrics, embeddings, and search documents.",
    prerequisites: ["Replication and partitioning"],
    relatedDesigns: ["URL shortener", "Search index"],
  },
  {
    id: "timed-designs",
    day: 7,
    title: "Timed designs",
    eyebrow: "Turn knowledge into a 40-minute narrative",
    estimatedMinutes: 100,
    summary: "Run the same interview structure under time pressure, choose one meaningful deep dive, and leave time for reliability and trade-offs.",
    objectives: ["Reach a coherent architecture by minute 20", "Make assumptions explicit", "Close with risks and evolution"],
    concepts: ["Requirements", "Estimation", "APIs", "Architecture", "Deep dive", "Reliability"],
    tradeoffs: ["Breadth versus depth", "Drawing versus explaining", "Completeness versus time"],
    failureModes: ["Premature deep dive", "Silent assumptions", "Component listing without data flow", "No closing summary"],
    interviewQuestions: ["Why is this the right deep dive?", "What breaks first?", "What would you change with ten more minutes?"],
    exercise: "Complete a URL shortener and distributed rate limiter using a 40-minute timer.",
    prerequisites: ["Days 1–6"],
    relatedDesigns: ["URL shortener", "Distributed rate limiter"],
  },
];

export const urlShortenerPrompt: DesignPrompt = {
  id: "url-shortener",
  title: "URL shortener",
  category: "classic",
  difficulty: "medium",
  durationMinutes: 40,
  prompt: "Design a globally available service that creates short URLs and redirects readers with very low latency. Support expiration, abuse controls, and basic analytics.",
  requirementsToExplore: ["Custom aliases", "Redirect latency and availability", "Expiration", "Traffic scale", "Analytics freshness", "Abuse prevention"],
  expectedTopics: ["ID generation", "Base encoding", "Collision handling", "Schema and indexes", "Cache strategy", "Multi-region redirects"],
  commonFailureModes: ["Sequential IDs leak volume", "Cache misses overload storage", "Hot links create hot keys", "Analytics blocks redirects"],
  followUpQuestions: ["How do you migrate to a longer code space?", "How do you handle a celebrity link?", "What changes for editable destinations?"],
};

export const distributedRateLimiterPrompt: DesignPrompt = {
  id: "distributed-rate-limiter",
  title: "Distributed rate limiter",
  category: "classic",
  difficulty: "medium",
  durationMinutes: 40,
  prompt: "Design a distributed rate limiter for public APIs. Support per-user and per-tenant policies, bursts, low overhead, and predictable behavior during dependency failure.",
  requirementsToExplore: ["Enforcement scope", "Burst allowance", "Accuracy", "Latency budget", "Policy updates", "Fail-open or fail-closed"],
  expectedTopics: ["Token bucket", "Sliding-window counter", "Local versus global enforcement", "Atomic counters", "Approximation", "Hot tenants"],
  commonFailureModes: ["One global counter", "Clock assumptions", "No degraded mode", "Policy cache inconsistency"],
  followUpQuestions: ["How do you bound global overshoot?", "How are limits changed safely?", "How do you protect the limiter itself?"],
};

export const designPrompts = [urlShortenerPrompt, distributedRateLimiterPrompt];

export const estimationDrills: EstimationDrill[] = [
  {
    id: "redirect-qps",
    title: "Redirect traffic",
    kind: "QPS + bandwidth",
    prompt: "A URL shortener serves 100M redirects/day. Peak traffic is 5× average and each response transfers 700 bytes. Estimate peak QPS and peak egress.",
    assumptions: ["A day is approximately 100,000 seconds", "Peak factor is 5", "Ignore request ingress"],
    steps: ["100M ÷ 100k ≈ 1,000 average QPS", "1,000 × 5 ≈ 5,000 peak QPS", "5,000 × 700 B ≈ 3.5 MB/s"],
    answer: "≈5,000 peak redirects/s and ≈3.5 MB/s peak response egress.",
    architecturalInterpretation: "The traffic is modest for a distributed cache tier; tail latency and hot-link skew matter more than raw bandwidth.",
  },
  {
    id: "chat-storage",
    title: "Chat retention",
    kind: "Storage + replication",
    prompt: "Ten million daily users send 40 messages/day. Each stored message averages 1 KB. Estimate one year of logical and 3× replicated storage.",
    assumptions: ["400M messages/day", "1 KB/message includes metadata", "365 days", "Replication factor 3"],
    steps: ["400M × 1 KB ≈ 400 GB/day", "400 GB × 365 ≈ 146 TB/year", "146 TB × 3 ≈ 438 TB replicated"],
    answer: "≈146 TB logical/year; ≈438 TB with 3× replication, before indexes and compaction overhead.",
    architecturalInterpretation: "Plan sharding, lifecycle tiers, and index budgets early; message bodies and searchable metadata may need separate storage paths.",
  },
  {
    id: "llm-gpu",
    title: "LLM serving fleet",
    kind: "GPU capacity",
    prompt: "Peak demand is 240,000 output tokens/s. One GPU sustains 1,200 usable tokens/s at the target latency. Estimate the serving fleet with 30% spare capacity.",
    assumptions: ["Usable throughput already reflects batching", "No prompt-prefill adjustment", "30% headroom is added after base capacity"],
    steps: ["240,000 ÷ 1,200 = 200 GPUs at saturation", "200 × 1.3 = 260 GPUs"],
    answer: "≈260 GPUs, then validate memory fit, prefill load, failure domains, and batching efficiency.",
    architecturalInterpretation: "Separate prefill and decode estimates if prompt lengths vary widely; admission control protects latency when headroom disappears.",
  },
  {
    id: "presence-connections",
    title: "Concurrent chat connections",
    kind: "Concurrency",
    prompt: "A chat product has 25M daily users. At peak, 12% are online with one persistent connection each. A gateway safely holds 60,000 connections. Estimate gateway count with 25% headroom.",
    assumptions: ["3M peak concurrent users", "One connection per user", "60k safe connections/gateway"],
    steps: ["25M × 12% = 3M connections", "3M ÷ 60k = 50 gateways", "50 × 1.25 ≈ 63 gateways"],
    answer: "≈63 connection gateways.",
    architecturalInterpretation: "Spread gateways across failure zones and design reconnect jitter; the reconnect storm can dominate steady-state capacity.",
  },
];

export const interviewPhases: InterviewPhase[] = [
  { id: "clarify", label: "Clarify", minutes: "3–5", description: "Users, operations, scale, SLAs, guarantees, security, and scope." },
  { id: "estimate", label: "Estimate", minutes: "3–5", description: "Only numbers that can change architecture." },
  { id: "contract", label: "APIs + data", minutes: "3–5", description: "Endpoints, entities, keys, indexes, and events." },
  { id: "architecture", label: "Architecture", minutes: "5–7", description: "Components and the main request or data flow." },
  { id: "deep-dive", label: "Deep dive", minutes: "15–20", description: "The hardest requirement: storage, queues, ranking, GPUs, or regions." },
  { id: "reliability", label: "Reliability", minutes: "≈5", description: "Failures, monitoring, cost, degradation, and 10× evolution." },
];

export const standardQuestions: StandardQuestion[] = [
  "What is the source of truth?",
  "What are the dominant access patterns?",
  "Which operations require strong consistency?",
  "What may be eventually consistent?",
  "What happens when a request is retried?",
  "What happens when a message is delivered twice?",
  "Where can backpressure occur?",
  "What happens when a dependency becomes slow?",
  "What happens when one availability zone fails?",
  "What happens when an entire region fails?",
  "What is cached?",
  "How is the cache invalidated?",
  "How is the data partitioned?",
  "What creates hot keys or hot partitions?",
  "What is the first bottleneck at 10× traffic?",
  "What are the user-facing SLIs and SLOs?",
  "What can be gracefully degraded?",
  "What is the most expensive component?",
  "How is the system monitored?",
  "How is the system rolled back?",
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
  "Incorrect ML metric",
  "Data leakage",
  "Training-serving skew",
  "Weak GPU-capacity estimate",
  "Time-management issue",
] as const;

export type MistakeCategory = (typeof mistakeCategories)[number];
