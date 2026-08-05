import type { DesignPrompt, StudyTopic } from "./types";

export const classicTopics: StudyTopic[] = [
  {
    id: "classic-feed-fanout",
    week: 2,
    day: 1,
    tier: 1,
    title: "Feed Fan-out Strategies",
    eyebrow: "Week 2 · Read-heavy systems",
    estimatedMinutes: 75,
    summary:
      "Choose where a feed pays its join cost: when an author publishes, when a reader opens the feed, or through a hybrid that treats high-fan-out authors differently.",
    whyItMatters:
      "Newsfeeds expose the central read-heavy trade-off between write amplification, read latency, freshness, and hotspot isolation. Interviewers expect the fan-out policy to follow measured graph shape and product latency goals.",
    objectives: [
      "Derive fan-out-on-write, fan-out-on-read, and hybrid designs from follower-count and freshness requirements.",
      "Define an idempotent materialization pipeline with an explicit source of truth.",
      "Explain how celebrity accounts change partitioning, queueing, and cache behavior.",
    ],
    concepts: [
      "fan-out on write",
      "fan-out on read",
      "hybrid fan-out",
      "celebrity problem",
      "materialized inbox",
      "eventual consistency",
      "write amplification",
      "feed freshness",
    ],
    deepDive: [
      {
        title: "Write-time materialization",
        summary: "A post commit emits one durable event; workers expand it into follower inbox entries outside the author transaction.",
        points: [
          "Partition the event log by author so posts from one author remain ordered, then shard follower expansion into bounded batches.",
          "Store compact `(recipientId, postId, authorId, createdAt)` entries and enforce uniqueness on `(recipientId, postId)` so replay is harmless.",
          "Advance a per-post fan-out checkpoint only after each batch is durable; lag is observable and retry does not duplicate visible entries.",
        ],
      },
      {
        title: "Read-time merge",
        summary: "The read path fetches recent posts from followed authors and performs a bounded k-way merge rather than precomputing every inbox.",
        points: [
          "Fetch a limited head per author or author shard, merge by the product ordering key, and stop once the requested page plus slack is filled.",
          "Keep author timelines independently cacheable; do not issue one storage request per follow for users with very large graphs.",
          "Use a candidate service or grouped author shards to cap fan-in, then hydrate post bodies after candidate selection.",
        ],
      },
      {
        title: "Hybrid celebrity handling",
        summary: "Materialize ordinary authors while merging high-fan-out authors at read time to bound publish amplification.",
        points: [
          "Choose the threshold from observed fan-out cost and queue-delay SLOs, not from a hard-coded follower count.",
          "Record the policy version on feed generation so a threshold change can be backfilled without duplicate candidates.",
          "Protect celebrity timelines with replicated caches and request coalescing because the write hotspot becomes a read hotspot.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "When to perform the social-graph join",
        preferA: "Fan-out on write when reads dominate, follower counts are bounded, and opening the feed must be consistently fast.",
        preferB: "Fan-out on read when posting volume is high, readership is sparse, or follower counts are extremely skewed.",
        watch: "A global policy ignores the long tail; hybrid policies add operational and correctness complexity.",
      },
      {
        decision: "What the inbox stores",
        preferA: "Store post IDs and ranking features when post edits, deletes, and policy changes must appear quickly.",
        preferB: "Store denormalized render data when hydration latency dominates and edits are rare.",
        watch: "Denormalization multiplies invalidation work and can leak deleted or access-revoked content.",
      },
      {
        decision: "Freshness versus smoothing",
        preferA: "Reserve capacity for immediate fan-out when seconds-level freshness is a user-facing SLI.",
        preferB: "Queue and batch expansion when throughput and cost matter more than immediate appearance.",
        watch: "Queue age, not just queue depth, reveals whether old posts are missing their freshness objective.",
      },
    ],
    failureModes: [
      {
        mode: "Celebrity fan-out overload",
        symptom: "Publish latency is normal but fan-out lag and worker saturation spike for a small set of authors.",
        mitigation: "Route those authors to read-time merge, batch follower scans, rate-limit backfills, and reserve queue capacity by priority.",
      },
      {
        mode: "Duplicate or missing inbox entries",
        symptom: "Users see repeated posts or holes after worker retries and partial batch failures.",
        mitigation: "Use deterministic entry keys, durable batch checkpoints, idempotent upserts, and a reconciliation scan from post events to inbox rows.",
      },
      {
        mode: "Deleted content remains visible",
        symptom: "Cached candidates hydrate to missing data or continue rendering after moderation or privacy changes.",
        mitigation: "Authorize during hydration, propagate tombstones on a high-priority path, and keep candidate-cache TTLs bounded.",
      },
    ],
    interviewQuestions: [
      "What graph and traffic measurements determine your fan-out policy?",
      "How does a retried fan-out event avoid producing duplicate feed entries?",
      "How would the design change if one author has hundreds of millions of followers?",
    ],
    decisionChecklist: [
      "Name the canonical post store and social-graph source of truth.",
      "Estimate publish amplification and feed-read fan-in at peak.",
      "Define ordering and freshness guarantees explicitly.",
      "Bound queue work and isolate celebrity traffic.",
      "Cover deletes, blocks, retries, backfills, and regional failure.",
    ],
    exercise:
      "Given a feed where 99.9% of authors have fewer than 5,000 followers but the top 100 exceed 20 million, define the fan-out policy, event and inbox keys, retry boundary, and a migration plan when an author crosses the threshold.",
    prerequisites: ["queues-and-streams", "replication-and-partitioning"],
    relatedDesigns: ["classic-newsfeed"],
    quiz: [
      {
        prompt: "Which mechanism most directly makes retried fan-out safe?",
        options: [
          "A uniqueness constraint on recipient and post IDs",
          "A longer cache TTL",
          "Random worker selection",
          "Ordering all authors in one partition",
        ],
        answerIndex: 0,
        explanation: "A deterministic uniqueness key turns replay into an idempotent upsert; the other choices do not prevent duplicate effects.",
      },
      {
        prompt: "Why is hybrid fan-out commonly used for celebrity authors?",
        options: [
          "It guarantees global ordering",
          "It moves extreme write amplification to a bounded read-time merge",
          "It removes the need for caching",
          "It makes the feed strongly consistent",
        ],
        answerIndex: 1,
        explanation: "Read-time merging for the high-fan-out tail prevents a single publish from creating an unbounded materialization burst.",
      },
    ],
  },
  {
    id: "classic-feed-ranking-cache-pagination",
    week: 2,
    day: 2,
    tier: 1,
    title: "Feed Ranking, Caching, and Pagination",
    eyebrow: "Week 2 · Read-heavy systems",
    estimatedMinutes: 80,
    summary:
      "Build a stable, low-latency feed from candidate IDs, mutable ranking signals, layered caches, and opaque cursors that survive concurrent inserts.",
    whyItMatters:
      "A feed is not complete when candidates exist. The interview signal comes from explaining hydration, freshness, invalidation, pagination stability, and the contract between ranking and storage.",
    objectives: [
      "Separate candidate generation, ranking, hydration, and policy filtering into measurable stages.",
      "Design cache keys and invalidation paths that preserve deletes and access changes.",
      "Define cursor semantics for chronological and ranked feeds without offset-scan drift.",
    ],
    concepts: [
      "candidate generation",
      "ranking features",
      "cache-aside",
      "request coalescing",
      "hot-key splitting",
      "keyset pagination",
      "opaque cursor",
      "stable tie-breaker",
    ],
    deepDive: [
      {
        title: "Candidate-to-render pipeline",
        summary: "Keep feed IDs and ranking metadata separate from mutable post bodies and viewer-specific policy checks.",
        points: [
          "Generate more candidates than one page, filter blocked or deleted content, rank the remainder, then hydrate only selected IDs.",
          "Version ranking features and model/config snapshots so a bad rollout can be diagnosed and rolled back.",
          "Carry stage budgets for candidate fetch, rank, hydrate, and render; a total latency target without sub-budgets hides the bottleneck.",
        ],
      },
      {
        title: "Layered cache design",
        summary: "Cache immutable post fragments broadly and viewer-specific candidate pages narrowly.",
        points: [
          "Use cache-aside with single-flight fills and jittered TTLs to prevent a popular feed from stampeding storage.",
          "Key ranked pages by viewer, cursor boundary, and ranking-policy version; cap the number of cached pages per viewer.",
          "Push delete and authorization tombstones through a faster invalidation path than ordinary content edits.",
        ],
      },
      {
        title: "Stable pagination under mutation",
        summary: "A cursor captures the last ordering tuple and any snapshot semantics required by the product.",
        points: [
          "For chronological order, query strictly after `(createdAt, postId)` so equal timestamps cannot duplicate or omit records.",
          "For ranked order, include a rank-session or candidate-set version because scores may change between page requests.",
          "Encode and authenticate cursor state as an opaque token; reject incompatible policy versions rather than silently changing semantics.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Chronological versus ranked pagination",
        preferA: "Use a simple `(time, id)` keyset when deterministic freshness and explainability dominate.",
        preferB: "Use a rank-session cursor when relevance matters enough to hold a candidate snapshot or policy version.",
        watch: "Re-ranking every page independently produces duplicates and gaps as scores move.",
      },
      {
        decision: "Cache fully rendered pages versus candidate IDs",
        preferA: "Rendered pages minimize reads for mostly immutable public content.",
        preferB: "Candidate IDs keep edits, viewer policy, and deletes correct with targeted hydration.",
        watch: "Viewer-specific rendered pages have poor reuse and a large invalidation surface.",
      },
      {
        decision: "Push invalidation versus bounded staleness",
        preferA: "Push tombstones for safety, privacy, and moderation changes.",
        preferB: "Use TTL expiry for ordinary rank and engagement changes where brief staleness is acceptable.",
        watch: "Treating every mutation as urgent can overload the invalidation channel.",
      },
    ],
    failureModes: [
      {
        mode: "Pagination drift",
        symptom: "Users see the same item twice or miss items when new posts arrive between requests.",
        mitigation: "Use a unique ordering tuple, strict keyset predicates, and an explicit rank-session or snapshot contract.",
      },
      {
        mode: "Cache stampede",
        symptom: "A popular key expires and storage QPS, tail latency, and timeout rates rise together.",
        mitigation: "Apply request coalescing, early refresh, jittered TTLs, stale-if-error, and per-key load shedding.",
      },
      {
        mode: "Policy-stale cache",
        symptom: "Blocked, private, or deleted posts remain visible despite correct source-of-truth state.",
        mitigation: "Recheck access during hydration, use versioned policy keys, and distribute high-priority tombstones.",
      },
    ],
    interviewQuestions: [
      "What exactly is encoded in the next-page cursor?",
      "Which content is safe to cache globally, and which must be viewer-specific?",
      "How do you keep a mutable ranked feed from duplicating items across pages?",
    ],
    decisionChecklist: [
      "State the feed ordering and freshness contract.",
      "Use a unique, indexed cursor tuple rather than offset pagination.",
      "Separate candidates, ranking, policy checks, and hydration.",
      "Version ranking and cache keys for rollback.",
      "Design urgent invalidation for deletion and access revocation.",
    ],
    exercise:
      "Specify `GET /feed` for a ranked feed: define the cursor payload, supporting index, cache hierarchy, deletion path, and behavior when the ranking policy changes between page one and page two.",
    prerequisites: ["classic-feed-fanout", "caching"],
    relatedDesigns: ["classic-newsfeed"],
    quiz: [
      {
        prompt: "What makes a chronological cursor safe when timestamps collide?",
        options: [
          "A larger page size",
          "A unique secondary tie-breaker such as post ID",
          "A shorter cache TTL",
          "Offset pagination",
        ],
        answerIndex: 1,
        explanation: "The query boundary needs a total order; `(createdAt, postId)` is stable even when many posts share a timestamp.",
      },
      {
        prompt: "Which cache entry generally has the broadest safe reuse?",
        options: [
          "A viewer's fully ranked first page",
          "An immutable public post fragment",
          "A viewer's block-list result",
          "A mutable presence record",
        ],
        answerIndex: 1,
        explanation: "Immutable public fragments are neither viewer-specific nor frequently invalidated, so they can be shared broadly.",
      },
    ],
  },
  {
    id: "classic-realtime-connections",
    week: 2,
    day: 3,
    tier: 1,
    title: "Real-Time Connection Architecture",
    eyebrow: "Week 2 · Real-time systems",
    estimatedMinutes: 75,
    summary:
      "Operate persistent client connections through stateless-enough gateways, leased routing state, bounded buffers, heartbeats, and controlled reconnect behavior.",
    whyItMatters:
      "Chat designs often fail at the connection layer before message storage. Senior answers distinguish connection count from request QPS and reason about file descriptors, memory, routing, and slow consumers.",
    objectives: [
      "Choose long polling or WebSockets from traffic shape and delivery requirements.",
      "Route events to a user's active connections without making one gateway a permanent source of truth.",
      "Size heartbeats, buffers, reconnects, and load shedding around explicit resource limits.",
    ],
    concepts: [
      "WebSockets",
      "long polling",
      "connection gateway",
      "session directory",
      "heartbeats and leases",
      "connection draining",
      "slow-consumer backpressure",
      "reconnect jitter",
    ],
    deepDive: [
      {
        title: "Gateway ownership and routing",
        summary: "Gateways own sockets; a soft-state directory maps users and devices to gateway instances.",
        points: [
          "On connect, authenticate once, allocate a connection ID, and renew a short lease keyed by `(userId, deviceId, connectionId)`.",
          "Publish outbound events through user-keyed partitions; routers resolve current gateways and tolerate stale directory entries.",
          "Make reconnection resume from a durable message cursor so losing a gateway loses sockets, not accepted messages.",
        ],
      },
      {
        title: "Capacity and lifecycle",
        summary: "Connection capacity is constrained by memory, descriptors, kernel buffers, TLS cost, and heartbeat traffic.",
        points: [
          "Estimate concurrent connections separately from messages per second and leave headroom for rolling deploys and zone loss.",
          "Drain an instance by refusing new sockets, notifying clients to reconnect with jitter, and waiting for a bounded grace period.",
          "Use heartbeat intervals longer than ordinary network jitter but shorter than the acceptable ghost-session window.",
        ],
      },
      {
        title: "Backpressure at the edge",
        summary: "Every connection needs a bounded outbound queue and an explicit overflow policy.",
        points: [
          "Track queued bytes and oldest-event age per socket; message count alone misses a few very large frames.",
          "Coalesce replaceable signals such as presence, but never silently drop durable chat messages.",
          "Disconnect persistently slow consumers with a resume cursor so durable history is fetched after reconnect.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "WebSockets versus long polling",
        preferA: "Use WebSockets for frequent bidirectional events and low delivery latency.",
        preferB: "Use long polling for sparse events, simpler infrastructure, or constrained intermediaries.",
        watch: "WebSockets reduce handshake overhead but create stateful capacity and deployment concerns.",
      },
      {
        decision: "Sticky routing versus external session directory",
        preferA: "Use bounded stickiness to reduce directory lookups within a healthy edge pool.",
        preferB: "Use a leased directory when any producer must locate any active device connection.",
        watch: "Treat directory entries as hints; stale records must not cause message loss.",
      },
      {
        decision: "Buffer versus disconnect a slow client",
        preferA: "Buffer briefly when bursts are common and memory is bounded.",
        preferB: "Disconnect and require cursor-based catch-up when a client remains behind.",
        watch: "Unbounded per-socket buffers turn one slow client class into fleet-wide memory exhaustion.",
      },
    ],
    failureModes: [
      {
        mode: "Reconnect storm",
        symptom: "A gateway or zone loss causes synchronized handshakes, authentication load, and repeated connection failures.",
        mitigation: "Return retry hints, require exponential backoff with jitter, rate-limit handshakes, and reserve recovery capacity.",
      },
      {
        mode: "Stale connection routing",
        symptom: "Publishers repeatedly route to a dead gateway and online users appear unreachable.",
        mitigation: "Use expiring leases, negative acknowledgements that evict stale routes, and client cursor catch-up.",
      },
      {
        mode: "Slow-consumer memory exhaustion",
        symptom: "Gateway memory and event-loop latency climb while a subset of sockets accumulates queued bytes.",
        mitigation: "Enforce byte limits, coalesce ephemeral events, shed or disconnect slow clients, and expose per-connection lag metrics.",
      },
    ],
    interviewQuestions: [
      "How many concurrent sockets can one gateway hold, and what resource is limiting?",
      "How does an outbound event locate every active device for a user?",
      "What happens to accepted messages when a gateway dies?",
    ],
    decisionChecklist: [
      "Estimate concurrent connections, heartbeat QPS, and outbound bytes.",
      "Keep durable messages outside gateway memory.",
      "Use leases for routing state and cursors for recovery.",
      "Bound per-connection buffers and define overflow behavior.",
      "Plan jittered reconnects, connection draining, and zone loss.",
    ],
    exercise:
      "Design a gateway tier for two million concurrent chat connections. Estimate heartbeat load, specify the session-directory lease, define slow-client limits, and walk through a full-zone failure.",
    prerequisites: ["networking", "queues-and-streams"],
    relatedDesigns: ["classic-chat"],
    quiz: [
      {
        prompt: "Where should an accepted chat message live so a gateway crash does not lose it?",
        options: [
          "Only in the socket buffer",
          "In durable message storage or a durable log",
          "Only in the session directory",
          "In the load balancer cookie",
        ],
        answerIndex: 1,
        explanation: "Gateways own transient connections; acceptance must cross a durable boundary before the client receives a durable acknowledgement.",
      },
      {
        prompt: "What is the safest response to a persistently slow consumer?",
        options: [
          "Grow its buffer without limit",
          "Drop arbitrary chat messages",
          "Disconnect it and resume from a durable cursor",
          "Block the gateway event loop",
        ],
        answerIndex: 2,
        explanation: "A bounded queue protects the fleet, while cursor-based recovery preserves durable message semantics.",
      },
    ],
  },
  {
    id: "classic-message-ordering-delivery-sync",
    week: 2,
    day: 4,
    tier: 1,
    title: "Message Ordering, Delivery, and Multi-Device Sync",
    eyebrow: "Week 2 · Real-time systems",
    estimatedMinutes: 85,
    summary:
      "Promise only per-conversation order, make at-least-once delivery harmless, and give every device a durable cursor for offline catch-up and receipt state.",
    whyItMatters:
      "Messaging interviews test whether candidates separate acceptance, durability, delivery, and read state. Claims of global or exactly-once delivery usually hide unavailable coordination or duplicate effects.",
    objectives: [
      "Define per-conversation sequence allocation and gap handling without depending on client clocks.",
      "Model accepted, delivered, and read acknowledgements as distinct durable transitions.",
      "Synchronize multiple devices through idempotent message IDs and monotonic cursors.",
    ],
    concepts: [
      "per-conversation sequence",
      "client-generated idempotency key",
      "at-least-once delivery",
      "offline inbox",
      "delivery receipt",
      "read watermark",
      "device cursor",
      "causal ordering",
    ],
    deepDive: [
      {
        title: "Sequence allocation and storage",
        summary: "A conversation's write owner assigns a monotonic sequence after deduplicating the sender's client message ID.",
        points: [
          "Route a conversation to one logical partition or leader and atomically persist `(conversationId, sequence, messageId, bodyRef)`.",
          "Return the existing sequence when the same `(conversationId, senderId, clientMessageId)` is retried.",
          "Use the sequence for conversation order and a server timestamp for display; never infer order from device clocks.",
        ],
      },
      {
        title: "Delivery and receipt state",
        summary: "Durable acceptance is not the same event as delivery to a device or reading by a user.",
        points: [
          "A durable acknowledgement means the message can be replayed; gateway push is an opportunistic low-latency path.",
          "Represent delivered state per device only if product requirements need it; aggregate read state as a monotonic per-user watermark when possible.",
          "Publish receipt changes as idempotent events and reject watermark regressions caused by delayed devices.",
        ],
      },
      {
        title: "Offline and multi-device catch-up",
        summary: "Each device asks for changes after its last durable cursor and can safely receive overlaps.",
        points: [
          "Page by conversation sequence or a user-inbox cursor; retain enough history to cover the offline window.",
          "Send a high-water mark with each page so clients know whether they are caught up despite concurrent arrivals.",
          "Deduplicate by message ID locally and reconcile gaps before advancing the committed device cursor.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Ordering scope",
        preferA: "Use per-conversation ordering for intuitive chat semantics and independent partition scaling.",
        preferB: "Use causal metadata only when cross-conversation causality is a real product requirement.",
        watch: "Global total order creates a coordination bottleneck without meaningful user value.",
      },
      {
        decision: "Receipt granularity",
        preferA: "Track a monotonic read watermark for compact one-to-one or ordered group conversations.",
        preferB: "Track per-message receipts when compliance or detailed group UX explicitly requires them.",
        watch: "Per-message, per-member receipts grow multiplicatively for large groups.",
      },
      {
        decision: "Push versus pull recovery",
        preferA: "Push over active connections for low latency.",
        preferB: "Pull from a durable cursor for offline recovery and after routing uncertainty.",
        watch: "Push-only systems lose state whenever a client or gateway is unavailable.",
      },
    ],
    failureModes: [
      {
        mode: "Duplicate send after unknown commit",
        symptom: "A sender times out, retries, and recipients see the same logical message twice.",
        mitigation: "Require a stable client message ID and deduplicate it atomically with sequence assignment.",
      },
      {
        mode: "Sequence gap",
        symptom: "A device observes sequence 43 before 42 and renders a misleading order.",
        mitigation: "Buffer briefly, request the missing range, and advance the durable cursor only through contiguous sequences.",
      },
      {
        mode: "Receipt regression",
        symptom: "An old device sync makes a conversation appear unread after a newer device marked it read.",
        mitigation: "Store read state as a monotonic maximum sequence and make updates conditional on increasing the watermark.",
      },
    ],
    interviewQuestions: [
      "At what exact boundary do you acknowledge a send to the client?",
      "How do retries interact with sequence allocation?",
      "How does a device recover messages after being offline for a week?",
    ],
    decisionChecklist: [
      "Name the required ordering scope and partition key.",
      "Use client message IDs for idempotent send retries.",
      "Separate durable acceptance, delivery, and read semantics.",
      "Define cursor retention, gap recovery, and high-water marks.",
      "Keep read watermarks monotonic across devices.",
    ],
    exercise:
      "Specify `sendMessage` and `syncMessages` for a multi-device chat client, including idempotency keys, sequence assignment, acknowledgement semantics, gap recovery, and read-watermark updates.",
    prerequisites: ["classic-realtime-connections", "consistency-and-idempotency"],
    relatedDesigns: ["classic-chat"],
    quiz: [
      {
        prompt: "Which identifier should remain stable when a client retries a timed-out send?",
        options: [
          "Gateway instance ID",
          "Client-generated message ID",
          "Current TCP connection ID",
          "Server wall-clock timestamp",
        ],
        answerIndex: 1,
        explanation: "A stable client message ID lets storage return the original committed result after an ambiguous timeout.",
      },
      {
        prompt: "What is a compact representation of read state in an ordered conversation?",
        options: [
          "A monotonic highest-read sequence per user",
          "A random receipt for every reconnect",
          "The gateway's local clock",
          "An unbounded list of unread timestamps",
        ],
        answerIndex: 0,
        explanation: "A monotonic watermark represents all messages through one sequence as read and naturally rejects stale regressions.",
      },
    ],
  },
  {
    id: "classic-presence-group-chat",
    week: 2,
    day: 5,
    tier: 1,
    title: "Presence and Group Chat",
    eyebrow: "Week 2 · Real-time systems",
    estimatedMinutes: 75,
    summary:
      "Treat presence as privacy-sensitive, expiring soft state while keeping group membership, messages, and authorization durable and versioned.",
    whyItMatters:
      "Presence and groups combine high-churn ephemeral writes with large fan-out and security checks. The key is to avoid giving weak presence state authority over durable delivery or membership.",
    objectives: [
      "Aggregate device leases into bounded-staleness user presence.",
      "Scale group delivery without creating one durable message copy per online socket.",
      "Enforce membership versions, privacy, and retention on send, sync, and fan-out paths.",
    ],
    concepts: [
      "presence lease",
      "last-seen state",
      "subscription fan-out",
      "membership version",
      "group message log",
      "large-group fan-out",
      "authorization at read",
      "privacy retention",
    ],
    deepDive: [
      {
        title: "Lease-based presence",
        summary: "Each active device renews an expiring lease; user presence is the aggregate of valid device leases.",
        points: [
          "Write heartbeats to a partition keyed by user, coalesce frequent renewals, and expire leases without a synchronous disconnect requirement.",
          "Publish only state transitions such as offline-to-online, not every heartbeat, to bound subscriber fan-out.",
          "Persist last-seen separately with a privacy policy because presence storage is intentionally ephemeral and may be lost.",
        ],
      },
      {
        title: "Group message distribution",
        summary: "Persist one ordered group message, then route notifications or pointers to members and active devices.",
        points: [
          "Key the durable log by group and sequence; derive per-user inbox pointers only where unread or notification queries require them.",
          "For large groups, partition recipients into fan-out batches and let online gateways fetch the canonical message body once.",
          "Apply per-group and per-sender quotas so one busy group cannot consume all delivery capacity.",
        ],
      },
      {
        title: "Membership and authorization",
        summary: "Membership is durable, versioned state; delivery is never proof that a later read remains authorized.",
        points: [
          "Record the membership version observed at send and check current membership on history reads and attachment fetches.",
          "Propagate removals and access revocations on a priority path while retaining an audit trail appropriate to policy.",
          "Avoid embedding sensitive membership or presence details in broadly cached payloads.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Presence freshness",
        preferA: "Use shorter leases for rapid offline detection in small, high-value sessions.",
        preferB: "Use longer leases and transition coalescing to reduce heartbeat writes at large scale.",
        watch: "The lease must exceed normal mobile jitter or users will flap between online and offline.",
      },
      {
        decision: "Group fan-out representation",
        preferA: "Materialize per-user pointers when unread counts and fast inbox queries dominate.",
        preferB: "Keep one group log and read by membership when groups are very large or mostly inactive.",
        watch: "Per-user copies amplify writes; pure read-time joins amplify inbox reads.",
      },
      {
        decision: "Authorization timing",
        preferA: "Authorize again on history and attachment reads for revocation correctness.",
        preferB: "Trust a short-lived signed capability for bounded low-latency media access.",
        watch: "Capability lifetime defines the maximum revocation delay and must match the privacy requirement.",
      },
    ],
    failureModes: [
      {
        mode: "Ghost or flapping presence",
        symptom: "Disconnected users remain online, or mobile clients alternate state during transient packet loss.",
        mitigation: "Use leases with grace windows, coalesce transitions, and expose bounded-staleness semantics to clients.",
      },
      {
        mode: "Large-group fan-out lag",
        symptom: "Messages are durable but notification and unread updates fall progressively behind in large groups.",
        mitigation: "Batch recipients, isolate large-group queues, prioritize active users, and measure oldest-undelivered age.",
      },
      {
        mode: "Removed member retains access",
        symptom: "A former member can fetch history or attachments from a stale cache or capability.",
        mitigation: "Version membership, reauthorize sensitive reads, shorten capability TTLs, and prioritize revocation invalidation.",
      },
    ],
    interviewQuestions: [
      "What staleness does online presence promise during a network partition?",
      "How is one group message delivered to a million-member group?",
      "Where is membership checked after a user is removed?",
    ],
    decisionChecklist: [
      "Separate ephemeral device leases from durable last-seen policy.",
      "Publish presence transitions rather than raw heartbeat traffic.",
      "Persist one canonical group message and define fan-out representation.",
      "Version membership and reauthorize sensitive reads.",
      "Isolate large groups and make privacy retention explicit.",
    ],
    exercise:
      "Design presence and delivery for a group with one million members, including lease timing, active-subscriber fan-out, unread state, member removal, and behavior during a regional partition.",
    prerequisites: ["classic-realtime-connections", "classic-message-ordering-delivery-sync"],
    relatedDesigns: ["classic-chat"],
    quiz: [
      {
        prompt: "Why should presence use expiring leases rather than durable connect/disconnect truth?",
        options: [
          "Disconnect events are guaranteed to arrive",
          "Clients can disappear without sending a disconnect",
          "Leases provide strong global consistency",
          "Leases eliminate heartbeat traffic",
        ],
        answerIndex: 1,
        explanation: "Crashes and partitions suppress disconnect events, so expiry gives a bounded stale-online window without requiring perfect failure detection.",
      },
      {
        prompt: "What should be durable for a large group message?",
        options: [
          "One canonical group-log entry plus required delivery metadata",
          "Only each gateway's socket buffer",
          "One full body copy per online socket",
          "Only an ephemeral presence event",
        ],
        answerIndex: 0,
        explanation: "A canonical log entry preserves order and recovery while pointers or notifications can be fanned out according to product needs.",
      },
    ],
  },
  {
    id: "classic-idempotent-workflows-outbox-sagas",
    week: 3,
    day: 1,
    tier: 1,
    title: "Idempotent Workflows, Outbox, and Sagas",
    eyebrow: "Week 3 · Stateful asynchronous systems",
    estimatedMinutes: 85,
    summary:
      "Turn a retried intent into one durable state transition, publish its event without a dual write, and coordinate multi-service work through an explicit saga state machine.",
    whyItMatters:
      "Timeouts make commit outcomes ambiguous and brokers redeliver. Senior designs do not promise end-to-end exactly-once delivery; they place idempotency records, state, and outbox rows inside clear transaction boundaries.",
    objectives: [
      "Define idempotency-key scope, request fingerprinting, retention, and atomic result storage.",
      "Use transactional outbox and consumer inbox patterns to bridge database state and at-least-once messaging.",
      "Model saga progress, compensations, and irrecoverable manual-review states explicitly.",
    ],
    concepts: [
      "idempotency key",
      "request fingerprint",
      "unknown commit outcome",
      "transactional outbox",
      "consumer inbox",
      "change-data capture",
      "orchestrated saga",
      "compensating action",
    ],
    deepDive: [
      {
        title: "Atomic idempotency claim",
        summary: "The idempotency record and business mutation commit in one local transaction.",
        points: [
          "Scope the key to caller and operation, store a request hash, and reject reuse with a different payload.",
          "Insert a pending record under a uniqueness constraint, apply the state transition, then store the canonical response before commit.",
          "On retry, return the committed response; if work is still pending, return its status rather than running a second effect.",
        ],
      },
      {
        title: "Outbox and inbox delivery",
        summary: "A local transaction writes domain state and an event row; a separate relay publishes rows until acknowledged.",
        points: [
          "Relay by polling ordered keys or reading change data, and mark or checkpoint only after broker acknowledgement.",
          "Expect publication duplicates after relay crashes; consumers atomically record event IDs with their local effects.",
          "Retain outbox and inbox data long enough to cover maximum replay, then compact with audited watermarks.",
        ],
      },
      {
        title: "Saga state and compensation",
        summary: "A saga records each step and drives forward actions or compensations without a distributed transaction.",
        points: [
          "Persist the saga state, next action, attempts, and deadlines before dispatching each idempotent command.",
          "Compensation is a new business action, not time travel; it can fail and must itself be retried and observed.",
          "Define terminal states for completed, compensated, and manual intervention so stuck work is queryable.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Synchronous orchestration versus event choreography",
        preferA: "Use an orchestrator when the workflow has explicit sequencing, deadlines, and compensations.",
        preferB: "Use choreography for simple reactions with low coupling and no central workflow state.",
        watch: "Unbounded choreography hides the end-to-end state; a central orchestrator can become a throughput and ownership bottleneck.",
      },
      {
        decision: "Outbox polling versus change-data capture",
        preferA: "Use polling for operational simplicity and moderate volume.",
        preferB: "Use change-data capture when lower latency and high throughput justify log-integration complexity.",
        watch: "Both still publish at least once and require consumer idempotency.",
      },
      {
        decision: "Idempotency retention",
        preferA: "Retain keys through the longest documented client retry and replay window.",
        preferB: "Archive compact result hashes when indefinite retention is too costly.",
        watch: "Expiring a key too early permits a delayed retry to repeat the business effect.",
      },
    ],
    failureModes: [
      {
        mode: "Check-then-act race",
        symptom: "Concurrent retries both observe no record and apply the same effect.",
        mitigation: "Claim the key with a uniqueness constraint and commit the claim, mutation, and response atomically.",
      },
      {
        mode: "Outbox lag or duplication",
        symptom: "Domain state is committed but downstream work is delayed, or one event is observed repeatedly.",
        mitigation: "Alert on oldest unpublished age, partition relays, replay safely, and require atomic consumer inbox deduplication.",
      },
      {
        mode: "Saga stuck during compensation",
        symptom: "The primary step failed and compensation retries exceed their deadline without a terminal state.",
        mitigation: "Persist retry policy and deadlines, escalate to manual review, and expose each uncompensated obligation as an invariant breach.",
      },
    ],
    interviewQuestions: [
      "What transaction contains the idempotency record and business effect?",
      "What happens if the outbox relay publishes and crashes before checkpointing?",
      "Which saga steps are compensable, and what happens if compensation fails?",
    ],
    decisionChecklist: [
      "Scope and fingerprint every idempotency key.",
      "Persist the canonical response with the business mutation.",
      "Assume broker and relay duplicates.",
      "Make every saga command and compensation idempotent.",
      "Monitor pending age and define manual-review terminal states.",
    ],
    exercise:
      "Design an order workflow that reserves inventory, authorizes payment, and schedules fulfillment. Draw every local transaction, outbox event, idempotency key, compensation, timeout, and manual-review state.",
    prerequisites: ["consistency-and-idempotency", "queues-and-streams"],
    relatedDesigns: ["classic-payment-ledger", "classic-notifications"],
    quiz: [
      {
        prompt: "Why can a transactional outbox publish the same event more than once?",
        options: [
          "The database cannot enforce uniqueness",
          "The relay can crash after broker acknowledgement but before its checkpoint",
          "Consumers always reorder partitions",
          "The outbox does not use transactions",
        ],
        answerIndex: 1,
        explanation: "The acknowledgement/checkpoint boundary is not atomic across broker and database, so replay is expected and consumers must deduplicate.",
      },
      {
        prompt: "What should happen when an idempotency key is reused with a different request body?",
        options: [
          "Execute the newer request",
          "Average the two results",
          "Reject it as a key conflict",
          "Delete the original record",
        ],
        answerIndex: 2,
        explanation: "Binding the key to a request fingerprint prevents accidental reuse from applying a different intent under an old identity.",
      },
    ],
  },
  {
    id: "classic-payment-state-ledger",
    week: 3,
    day: 2,
    tier: 1,
    title: "Payment State Machines and Immutable Ledgers",
    eyebrow: "Week 3 · Stateful asynchronous systems",
    estimatedMinutes: 90,
    summary:
      "Separate an externally asynchronous payment state machine from an immutable, transactionally balanced double-entry ledger that records financial truth.",
    whyItMatters:
      "Money systems must tolerate retries, webhook duplication, and uncertain provider outcomes while applying each financial effect once. Mutable balances without journal invariants are not an auditable source of truth.",
    objectives: [
      "Model legal authorization, capture, settlement, refund, failure, and unknown transitions.",
      "Post balanced, immutable debit and credit entries in one database transaction.",
      "Use optimistic concurrency, idempotency, outbox, and reconciliation without claiming exactly-once delivery.",
    ],
    concepts: [
      "payment state machine",
      "authorization and capture",
      "settlement",
      "refund",
      "double-entry accounting",
      "immutable journal",
      "optimistic concurrency",
      "audit trail",
    ],
    deepDive: [
      {
        title: "Payment transition control",
        summary: "Every command validates the current state and version before creating the next durable transition.",
        points: [
          "Represent provider-pending and unknown outcomes explicitly; never infer failure merely because a call timed out.",
          "Use a version compare-and-swap so concurrent capture or refund commands cannot both advance stale state.",
          "Persist provider request IDs and webhook IDs for idempotent query and callback handling.",
        ],
      },
      {
        title: "Balanced ledger posting",
        summary: "A journal transaction contains two or more entries where total debits equal total credits independently per currency.",
        points: [
          "Insert the journal header, all entries, and the payment transition atomically under a unique business-event ID.",
          "Derive account balances from journal entries or maintained aggregates; correct mistakes with reversing entries, never mutation.",
          "Keep amount and currency integral and explicit, and forbid cross-currency balancing without a modeled exchange transaction.",
        ],
      },
      {
        title: "Provider boundary and audit",
        summary: "External authorization and settlement are asynchronous facts reconciled against internal intent and ledger state.",
        points: [
          "Send provider commands through an idempotent adapter and ingest signed callbacks through a deduplicating inbox.",
          "Use a transactional outbox to publish payment and ledger changes after the local commit.",
          "Retain immutable command, response, actor, and correlation metadata sufficient to reconstruct each transition.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Single relational transaction versus distributed ledger updates",
        preferA: "Keep entries for one financial event in one relational transaction for enforceable balance invariants.",
        preferB: "Partition separate accounts only after proving one posting can remain atomic within a chosen ownership boundary.",
        watch: "Splitting a single posting across independent stores turns balance into an eventually repaired property.",
      },
      {
        decision: "Synchronous provider response versus pending state",
        preferA: "Return a final result only when the provider outcome is unambiguous within the request deadline.",
        preferB: "Return pending and expose status when timeouts or asynchronous settlement make the outcome unknown.",
        watch: "Mapping timeout to failure can trigger a duplicate authorization on retry.",
      },
      {
        decision: "Computed versus materialized balances",
        preferA: "Compute from journal entries for low-volume audit paths and verification.",
        preferB: "Maintain transactional aggregates for high-volume balance reads.",
        watch: "Aggregates are projections and require continuous comparison with the immutable journal.",
      },
    ],
    failureModes: [
      {
        mode: "Duplicate financial effect",
        symptom: "Two captures or refunds exist for one client intent after a retry or duplicate webhook.",
        mitigation: "Enforce scoped idempotency and provider IDs with unique constraints in the same transaction as the state and ledger update.",
      },
      {
        mode: "Unbalanced or mutable journal",
        symptom: "A journal transaction’s total debits differ from total credits, or historical entries change after posting.",
        mitigation: "Validate balance at commit, make entries append-only, and correct through linked reversing transactions.",
      },
      {
        mode: "Concurrent illegal transition",
        symptom: "A refund and capture both succeed from an outdated payment version.",
        mitigation: "Use an explicit transition table and optimistic version check, then retry by re-reading current state.",
      },
    ],
    interviewQuestions: [
      "What does the API return when the provider times out after receiving the request?",
      "Which database invariant proves a journal transaction is balanced?",
      "How is an incorrect posting corrected without editing history?",
    ],
    decisionChecklist: [
      "List legal states and transitions, including pending and unknown.",
      "Define one idempotency scope for every money-moving command.",
      "Balance entries atomically by currency.",
      "Keep the journal immutable and corrections linked.",
      "Cover webhooks, outbox publication, reconciliation, and audit evidence.",
    ],
    exercise:
      "Model a partial capture followed by a partial refund: provide the payment transitions, journal transactions and entries, unique keys, provider timeout behavior, and correction path for a wrongly classified account.",
    prerequisites: ["classic-idempotent-workflows-outbox-sagas", "storage-and-indexing"],
    relatedDesigns: ["classic-payment-ledger"],
    quiz: [
      {
        prompt: "What is the correct response to an ambiguous provider timeout after authorization was sent?",
        options: [
          "Mark it failed and immediately authorize again",
          "Keep an unknown or pending state and query or reconcile by idempotent provider ID",
          "Delete the payment row",
          "Post both success and failure entries",
        ],
        answerIndex: 1,
        explanation: "The provider may have committed the authorization; preserving uncertainty avoids a second financial effect while status is resolved.",
      },
      {
        prompt: "How should a posted ledger error be corrected?",
        options: [
          "Update the original entry in place",
          "Delete the journal transaction",
          "Append a linked reversing or adjustment transaction",
          "Change only the cached balance",
        ],
        answerIndex: 2,
        explanation: "Append-only corrections preserve the audit trail and keep every balance derivable from the journal.",
      },
    ],
  },
  {
    id: "classic-retries-reconciliation",
    week: 3,
    day: 3,
    tier: 1,
    title: "Retries and Reconciliation",
    eyebrow: "Week 3 · Stateful asynchronous systems",
    estimatedMinutes: 75,
    summary:
      "Retry only bounded transient work, quarantine poison messages, and reconcile independent records to discover silent loss, duplication, or disagreement.",
    whyItMatters:
      "Retries repair many failures but amplify overload and cannot prove two systems agree. Reconciliation is the independent control loop that finds errors normal request paths cannot observe.",
    objectives: [
      "Classify transient, permanent, throttled, and ambiguous failures before retrying.",
      "Apply deadlines, exponential backoff, jitter, budgets, dead-letter handling, and safe redrive.",
      "Design repeatable reconciliation with watermarks, matching rules, and append-only corrections.",
    ],
    concepts: [
      "retry budget",
      "exponential backoff",
      "jitter",
      "deadline propagation",
      "poison message",
      "dead-letter queue",
      "reconciliation watermark",
      "compensating correction",
    ],
    deepDive: [
      {
        title: "Retry decision matrix",
        summary: "The caller chooses retry behavior from error class, idempotency, remaining deadline, and dependency health.",
        points: [
          "Retry transient transport and throttling errors with capped exponential backoff and full jitter; honor server retry hints.",
          "Do not automatically retry validation or authorization failures, and resolve ambiguous commits through idempotent status lookup.",
          "Limit attempts and total elapsed time; one request's retry budget must fit inside the user-visible deadline.",
        ],
      },
      {
        title: "Poison work and redrive",
        summary: "Repeatedly failing items leave the hot queue with their full diagnostic and replay context.",
        points: [
          "Move an item to a dead-letter queue after a policy limit and record error class, attempts, payload version, and correlation ID.",
          "Redrive through the normal idempotent consumer after fixing the cause; do not bypass validation or rate limits.",
          "Quarantine by tenant or key when one malformed producer would otherwise monopolize a shared partition.",
        ],
      },
      {
        title: "Independent reconciliation",
        summary: "A deterministic job compares internal records with the external or canonical source over a closed time window.",
        points: [
          "Use stable business identifiers and watermarks, and delay the window until late-arriving records are expected to settle.",
          "Classify missing, duplicate, amount/state mismatch, and unmatched records rather than collapsing them into one error count.",
          "Write reconciliation results and corrective actions immutably so reruns are repeatable and audited.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Aggressive versus conservative retries",
        preferA: "Retry quickly when an idempotent dependency has spare capacity and failures are brief.",
        preferB: "Back off or fail fast when saturation, throttling, or little deadline remains.",
        watch: "Retries consume the same constrained resource that is already failing.",
      },
      {
        decision: "Automatic redrive versus manual review",
        preferA: "Automatically redrive known transient failures after the dependency recovers.",
        preferB: "Require review for malformed data, money movement, or uncertain side effects.",
        watch: "Bulk redrive can recreate the original incident unless paced and isolated.",
      },
      {
        decision: "Online versus batch reconciliation",
        preferA: "Use online checks for narrow, high-value invariants requiring rapid intervention.",
        preferB: "Use batch windows for high-volume independent comparison and lower coupling.",
        watch: "Online coupling can reduce availability; batch detection increases divergence time.",
      },
    ],
    failureModes: [
      {
        mode: "Retry storm",
        symptom: "Dependency errors trigger more request volume, rising queue age, and collapsing recovery capacity.",
        mitigation: "Use jitter, retry budgets, circuit breaking, admission control, and a single retry layer per call chain.",
      },
      {
        mode: "Poison-message partition stall",
        symptom: "One item fails repeatedly while later items in the ordered partition stop progressing.",
        mitigation: "Bound attempts, quarantine with ordering-aware policy, preserve the failed offset, and alert for controlled redrive.",
      },
      {
        mode: "Silent source divergence",
        symptom: "Request success metrics look healthy while provider and internal totals differ over time.",
        mitigation: "Run independent reconciliation by watermark, alarm on classified deltas, and apply idempotent append-only corrections.",
      },
    ],
    interviewQuestions: [
      "Which errors are retryable, and which layer owns the retry?",
      "How do you prevent redriving a dead-letter queue from repeating financial effects?",
      "What independent datasets and keys does reconciliation compare?",
    ],
    decisionChecklist: [
      "Classify errors before selecting a retry policy.",
      "Cap attempts, elapsed time, and total retry load.",
      "Preserve diagnostic context in dead-letter records.",
      "Make redrive use the normal idempotent path.",
      "Define reconciliation watermarks, mismatch classes, and correction ownership.",
    ],
    exercise:
      "Create a retry and reconciliation policy for payment capture: cover timeouts, throttling, validation failure, duplicate webhook, poison events, delayed settlement files, redrive, and manual review.",
    prerequisites: ["classic-idempotent-workflows-outbox-sagas", "queues-and-streams"],
    relatedDesigns: ["classic-payment-ledger", "classic-notifications"],
    quiz: [
      {
        prompt: "What is the most effective way to avoid synchronized retry bursts?",
        options: [
          "Fixed zero-delay retries",
          "Capped exponential backoff with jitter",
          "Infinite attempts",
          "A larger response payload",
        ],
        answerIndex: 1,
        explanation: "Backoff reduces pressure and jitter spreads retries so clients do not reissue work in lockstep.",
      },
      {
        prompt: "Why is reconciliation still needed when handlers are idempotent?",
        options: [
          "Idempotency guarantees every event arrives",
          "It detects missing, delayed, or mismatched records across independent systems",
          "It makes external providers transactional",
          "It replaces monitoring",
        ],
        answerIndex: 1,
        explanation: "Idempotency prevents repeated effects; it cannot prove that a required effect occurred or that another system recorded the same result.",
      },
    ],
  },
  {
    id: "classic-notification-orchestration",
    week: 3,
    day: 4,
    tier: 1,
    title: "Notification Orchestration",
    eyebrow: "Week 3 · Stateful asynchronous systems",
    estimatedMinutes: 80,
    summary:
      "Turn one durable notification intent into policy-compliant, prioritized, rate-limited delivery attempts across email, SMS, push, and in-app channels.",
    whyItMatters:
      "Notification systems combine bursty fan-out, user preferences, schedules, unreliable providers, and duplicate risk. The design must preserve accepted intent without letting campaigns starve transactional traffic.",
    objectives: [
      "Separate notification intent, recipient planning, channel delivery, and provider callbacks.",
      "Apply preferences, quiet hours, deduplication, priority, and quotas at explicit stages.",
      "Handle provider throttling, failover, retries, dead-letter work, and delivery-state monotonicity.",
    ],
    concepts: [
      "notification intent",
      "channel fan-out",
      "priority queue",
      "scheduled delivery",
      "user preferences",
      "provider adapter",
      "deduplication window",
      "dead-letter queue",
    ],
    deepDive: [
      {
        title: "Intent and recipient planning",
        summary: "The API durably records intent before asynchronous expansion into recipient-channel deliveries.",
        points: [
          "Validate template version, audience reference, schedule, priority, and idempotency key before committing intent and outbox rows.",
          "Expand large audiences in checkpointed batches and store a deterministic delivery key per recipient, channel, and intent.",
          "Evaluate consent, preferences, quiet hours, and channel eligibility near send time so scheduled work uses current policy.",
        ],
      },
      {
        title: "Priority, fairness, and rate control",
        summary: "Channel queues isolate providers while fair scheduling protects transactional traffic and tenants.",
        points: [
          "Separate urgent transactional, normal, and bulk lanes, then apply weighted fairness rather than strict priority starvation.",
          "Enforce global provider, tenant, campaign, and recipient token buckets before dispatch.",
          "Autoscale workers from oldest-ready age and provider headroom, not raw queue depth alone.",
        ],
      },
      {
        title: "Provider outcome handling",
        summary: "Adapters normalize provider-specific accepted, delivered, bounced, throttled, and permanent-failure outcomes.",
        points: [
          "Persist provider request IDs and deduplicate signed callbacks before advancing delivery state.",
          "Retry transient failures with jitter; send poison or exhausted work to a diagnosable dead-letter queue.",
          "Fail over only when duplicate semantics and sender identity remain acceptable; provider acceptance may make the outcome ambiguous.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Preference evaluation timing",
        preferA: "Evaluate near send for scheduled work and rapid opt-out correctness.",
        preferB: "Precompute eligibility during planning to reduce hot-path reads for short-lived transactional sends.",
        watch: "A stale preference snapshot can violate consent or quiet-hour policy.",
      },
      {
        decision: "Strict priority versus fair queues",
        preferA: "Reserve capacity for urgent transactional notifications.",
        preferB: "Use weighted fairness so bulk work progresses without starving smaller tenants.",
        watch: "Strict priority can starve bulk indefinitely; equal treatment can delay password or security messages.",
      },
      {
        decision: "Provider failover",
        preferA: "Fail over before an unambiguous provider acceptance when availability is more important than affinity.",
        preferB: "Hold and reconcile after an ambiguous acceptance when duplicate user contact is unacceptable.",
        watch: "Two providers generally cannot share an atomic idempotency boundary.",
      },
    ],
    failureModes: [
      {
        mode: "Duplicate user contact",
        symptom: "A recipient receives the same logical notification twice after timeout, callback replay, or provider failover.",
        mitigation: "Use deterministic delivery keys, provider request IDs, callback inbox dedupe, and cautious handling of ambiguous outcomes.",
      },
      {
        mode: "Bulk campaign starvation",
        symptom: "Oldest bulk queue age grows without bound while transactional traffic remains healthy.",
        mitigation: "Use weighted fair scheduling, per-class capacity floors, tenant quotas, and explicit backlog SLOs.",
      },
      {
        mode: "Provider outage amplification",
        symptom: "Retries and failover saturate alternate providers while queue age and throttle responses climb.",
        mitigation: "Circuit-break the failing adapter, honor rate limits, apply jitter and budgets, and degrade low-priority traffic first.",
      },
    ],
    interviewQuestions: [
      "At which point is a notification considered durably accepted?",
      "How do preferences and quiet hours interact with scheduled messages?",
      "When is provider failover safe after a timeout?",
    ],
    decisionChecklist: [
      "Persist intent before fan-out and use deterministic delivery keys.",
      "Separate priorities, channels, tenants, and providers for isolation.",
      "Apply preferences and consent at a freshness-appropriate stage.",
      "Rate-limit at provider, tenant, campaign, and recipient scopes.",
      "Define callback dedupe, ambiguous outcomes, DLQ, and redrive.",
    ],
    exercise:
      "Design a notification flow for a security alert and a ten-million-recipient digest sharing the same providers. Specify intent and delivery records, scheduling, preference timing, fairness, retry, failover, and callback handling.",
    prerequisites: ["classic-idempotent-workflows-outbox-sagas", "classic-retries-reconciliation"],
    relatedDesigns: ["classic-notifications"],
    quiz: [
      {
        prompt: "Which metric best indicates whether scheduled notifications are meeting their delivery objective?",
        options: [
          "Total queue capacity",
          "Oldest ready-item age by priority",
          "Number of provider SDK methods",
          "Template character count",
        ],
        answerIndex: 1,
        explanation: "Oldest ready age directly captures how late actionable work is; depth alone varies with batch size and throughput.",
      },
      {
        prompt: "Why can immediate failover after a provider timeout create duplicates?",
        options: [
          "The first provider may have accepted the request before its response was lost",
          "Preferences cannot be cached",
          "Queues always provide exactly-once delivery",
          "SMS has no provider identifier",
        ],
        answerIndex: 0,
        explanation: "A timeout is an ambiguous result; a second provider may deliver even though the first provider also committed the send.",
      },
    ],
  },
  {
    id: "classic-multipart-content-addressed-storage",
    week: 3,
    day: 5,
    tier: 1,
    title: "Multipart and Content-Addressed File Storage",
    eyebrow: "Week 3 · Stateful asynchronous systems",
    estimatedMinutes: 85,
    summary:
      "Move large byte streams directly to object storage, verify resumable parts, and atomically commit a manifest of durable content-addressed chunks.",
    whyItMatters:
      "File services must separate high-throughput blob transfer from strongly consistent metadata. Multipart upload, hashing, deduplication, and garbage collection introduce correctness and security boundaries interviewers expect you to name.",
    objectives: [
      "Design resumable multipart upload with checksums, expiry, and an atomic commit point.",
      "Explain fixed versus content-defined chunks and safe content-addressed deduplication.",
      "Keep manifests, reference tracking, scanning, CDN download, and delayed garbage collection consistent.",
    ],
    concepts: [
      "multipart upload",
      "signed upload URL",
      "chunk manifest",
      "content hash",
      "deduplication",
      "object storage",
      "reference tracking",
      "CDN-backed download",
    ],
    deepDive: [
      {
        title: "Resumable upload session",
        summary: "A metadata service creates an expiring session while clients upload parts directly to object storage.",
        points: [
          "Record expected part ranges, maximum size, uploader authorization, and session expiry before issuing narrowly scoped signed URLs.",
          "Verify each part's length and checksum, allowing safe overwrite of the same part number during retry.",
          "Commit only after all required parts are durable and verified; the commit transaction creates the immutable file-version manifest.",
        ],
      },
      {
        title: "Content addressing and dedupe",
        summary: "A chunk hash names verified bytes, while the manifest preserves order and file identity.",
        points: [
          "Use fixed chunks for simpler range mapping or content-defined chunks for better dedupe after insertions.",
          "Hash on trusted infrastructure or verify client claims before referencing an existing object.",
          "Scope dedupe to an authorization boundary so hash existence cannot reveal another tenant's data.",
        ],
      },
      {
        title: "Lifecycle and delivery",
        summary: "Committed manifests are durable metadata; unreferenced chunks are reclaimed only after a safety window.",
        points: [
          "Track references transactionally or derive them through mark-and-sweep; never delete based on a stale decrement alone.",
          "Quarantine new content until required malware or policy scans complete, without mutating the immutable bytes.",
          "Serve authorized downloads through short-lived URLs and a CDN while keeping metadata and access checks at the control plane.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Chunk size",
        preferA: "Use larger chunks for fewer objects, smaller manifests, and efficient sequential transfer.",
        preferB: "Use smaller or content-defined chunks for resumability, delta reuse, and deduplication.",
        watch: "Very small chunks amplify metadata, requests, hashes, and garbage-collection work.",
      },
      {
        decision: "Reference count versus mark-and-sweep",
        preferA: "Use transactional reference counts when manifest updates and chunk ownership share a reliable boundary.",
        preferB: "Use periodic mark-and-sweep when references are distributed or count repair must be authoritative.",
        watch: "Immediate deletion on count zero is unsafe under races, delayed events, and restore windows.",
      },
      {
        decision: "Cross-tenant deduplication",
        preferA: "Deduplicate within a tenant or encryption domain for safer isolation.",
        preferB: "Use global dedupe only with a threat model that addresses hash-probing and key ownership.",
        watch: "Content hashes can become an oracle that reveals whether another user stores known bytes.",
      },
    ],
    failureModes: [
      {
        mode: "Orphaned upload parts",
        symptom: "Object-storage bytes grow faster than committed file versions and expired sessions accumulate.",
        mitigation: "Expire sessions, tag temporary parts, sweep only past a safety watermark, and monitor orphan bytes by age.",
      },
      {
        mode: "Manifest references missing or corrupt bytes",
        symptom: "A committed file fails checksum verification or returns missing chunks during download.",
        mitigation: "Verify durability and hashes before atomic manifest commit, replicate objects, and continuously scrub stored content.",
      },
      {
        mode: "Unsafe garbage collection",
        symptom: "Live file versions lose chunks shortly after concurrent overwrite, restore, or delayed reference processing.",
        mitigation: "Use epochs and grace periods, mark from canonical manifests, recheck before deletion, and retain deletion audit records.",
      },
    ],
    interviewQuestions: [
      "What exact operation makes an uploaded file visible?",
      "How do you verify a client-provided content hash without trusting the client?",
      "How can garbage collection prove a chunk is no longer referenced?",
    ],
    decisionChecklist: [
      "Keep bulk bytes off application servers through scoped direct upload.",
      "Verify part size and checksums before commit.",
      "Commit one immutable manifest as the visibility boundary.",
      "Scope dedupe and downloads to authorization policy.",
      "Use delayed, auditable garbage collection with a canonical mark source.",
    ],
    exercise:
      "Design upload and download for a 50 GB file over an unreliable connection. Define session, part, chunk, and manifest records; retry behavior; verification; dedupe scope; commit; CDN authorization; and orphan cleanup.",
    prerequisites: ["storage-and-indexing", "consistency-and-idempotency"],
    relatedDesigns: ["classic-file-sync"],
    quiz: [
      {
        prompt: "When should a new file version become visible?",
        options: [
          "After the first part arrives",
          "After an atomic manifest commit references all verified durable chunks",
          "When a signed URL is issued",
          "After garbage collection",
        ],
        answerIndex: 1,
        explanation: "The manifest commit is the single metadata boundary that proves the full version is reconstructable.",
      },
      {
        prompt: "What is a security risk of unrestricted global hash deduplication?",
        options: [
          "It removes all checksums",
          "A caller may probe whether another tenant stores known content",
          "It prevents multipart upload",
          "It makes chunks larger",
        ],
        answerIndex: 1,
        explanation: "Observable dedupe behavior can act as a content-existence oracle across authorization boundaries.",
      },
    ],
  },
  {
    id: "classic-file-sync-version-conflicts",
    week: 3,
    day: 6,
    tier: 1,
    title: "File Sync, Versioning, and Conflict Resolution",
    eyebrow: "Week 3 · Stateful asynchronous systems",
    estimatedMinutes: 85,
    summary:
      "Synchronize metadata changes through an append-only cursor, require base-version compare-and-swap for writes, and preserve concurrent edits as explicit versions rather than silent overwrites.",
    whyItMatters:
      "Offline devices create delayed, concurrent edits, moves, and deletes. A correct sync protocol separates byte transfer from namespace metadata and defines tombstone retention, cursor semantics, and conflict policy.",
    objectives: [
      "Design an append-only change log with stable cursors and snapshot recovery.",
      "Use version preconditions to detect concurrent edits, moves, and deletes.",
      "Choose explicit conflict, merge, or last-writer policy from file semantics and user expectations.",
    ],
    concepts: [
      "change journal",
      "sync cursor",
      "base version",
      "optimistic concurrency",
      "conflict copy",
      "tombstone",
      "delta synchronization",
      "version history",
    ],
    deepDive: [
      {
        title: "Namespace and change journal",
        summary: "A strongly consistent metadata transaction updates the namespace and appends one ordered change record.",
        points: [
          "Key each node by stable ID rather than path so rename and move do not change file identity.",
          "Assign a monotonic cursor within an account or namespace and return changes plus a high-water mark.",
          "When a device cursor is older than retention, require a fresh snapshot and resume from the snapshot watermark.",
        ],
      },
      {
        title: "Concurrent updates and conflicts",
        summary: "A client commits against the version it read; a mismatch triggers product-specific conflict handling.",
        points: [
          "Use compare-and-swap on node version for content, name, parent, and tombstone transitions.",
          "Auto-merge only formats with a well-defined merge function; preserve opaque binary edits as sibling or conflict-copy versions.",
          "Make the conflict result deterministic and sync it to every device so clients do not create an endless conflict loop.",
        ],
      },
      {
        title: "Delete, restore, and delta transfer",
        summary: "Deletion creates a retained tombstone, while chunk manifests make unchanged byte ranges reusable.",
        points: [
          "Retain tombstones longer than the supported offline window so an old device cannot resurrect deleted content silently.",
          "Restore creates a new version linked to prior history and must resolve any current namespace name conflict.",
          "Compare chunk manifests and transfer only missing hashes; metadata commit still controls which full version is current.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Conflict handling",
        preferA: "Create explicit conflict versions for opaque or high-value files where no safe merge exists.",
        preferB: "Apply deterministic auto-merge for formats with tested semantic merge behavior.",
        watch: "Last-writer-wins is simple but silently discards concurrent work and depends on a trustworthy ordering rule.",
      },
      {
        decision: "Global versus per-namespace cursor",
        preferA: "Use per-namespace cursors for scalable independent ordering and smaller sync scans.",
        preferB: "Use a global account cursor when clients need one simple total change stream.",
        watch: "Global sequencing can become a hot coordination point; multiple cursors complicate atomic cross-namespace moves.",
      },
      {
        decision: "Tombstone retention",
        preferA: "Retain through the maximum offline and restore window for deletion correctness.",
        preferB: "Compact earlier only when old devices are forced to resnapshot before uploading changes.",
        watch: "Short retention permits stale clients to resurrect deleted nodes.",
      },
    ],
    failureModes: [
      {
        mode: "Silent lost update",
        symptom: "One device's edit disappears after another device uploads from an older version.",
        mitigation: "Require base-version compare-and-swap and preserve a conflict version instead of overwriting.",
      },
      {
        mode: "Cursor gap or premature advance",
        symptom: "A client claims to be synchronized but permanently misses a change after a partial page failure.",
        mitigation: "Advance only after applying a contiguous page, return high-water marks, and make page replay idempotent.",
      },
      {
        mode: "Stale-device resurrection",
        symptom: "A long-offline device recreates a file that was deleted on every current device.",
        mitigation: "Retain tombstones through the offline contract and force clients beyond retention to take a fresh snapshot.",
      },
    ],
    interviewQuestions: [
      "What does a sync cursor order, and when may a client advance it?",
      "How are simultaneous edits to the same binary file represented?",
      "How does an offline device learn that a file was deleted months ago?",
    ],
    decisionChecklist: [
      "Use stable node IDs independent of paths.",
      "Append namespace mutation and change record atomically.",
      "Require base versions and define deterministic conflict results.",
      "Retain tombstones through the supported offline window.",
      "Provide snapshot recovery when cursors expire.",
    ],
    exercise:
      "Walk through two offline devices editing, renaming, and deleting the same file. Specify metadata versions, change-log records, cursor replay, conflict output, tombstone retention, and eventual convergence.",
    prerequisites: ["classic-multipart-content-addressed-storage", "replication-and-partitioning"],
    relatedDesigns: ["classic-file-sync"],
    quiz: [
      {
        prompt: "What prevents an offline client from silently overwriting a newer file version?",
        options: [
          "A longer CDN TTL",
          "A base-version compare-and-swap",
          "A smaller upload chunk",
          "A random filename",
        ],
        answerIndex: 1,
        explanation: "The version precondition turns concurrent modification into an explicit conflict rather than an unnoticed last write.",
      },
      {
        prompt: "What should happen when a device's sync cursor predates retained change history?",
        options: [
          "Assume nothing changed",
          "Replay an arbitrary recent page",
          "Fetch a fresh snapshot and resume from its watermark",
          "Upload every local file as new",
        ],
        answerIndex: 2,
        explanation: "Once incremental history is gone, only a consistent snapshot can establish a correct new baseline.",
      },
    ],
  },
  {
    id: "classic-geo-indexing-hot-regions-privacy",
    week: 4,
    day: 1,
    tier: 1,
    title: "Geo Indexing, Hot Regions, and Privacy",
    eyebrow: "Week 4 · Geo, search, and operations",
    estimatedMinutes: 85,
    summary:
      "Use an approximate spatial index to generate nearby candidates, filter by exact distance and eligibility, and bound freshness, hotspot, and location-privacy risk.",
    whyItMatters:
      "Nearby search turns two-dimensional coordinates into skewed partitioned access. A good design explains cell boundaries, moving objects, downtown hotspots, stale positions, and deletion or retention obligations.",
    objectives: [
      "Compare geohash, quadtree, and database spatial indexes for radius and update workloads.",
      "Query neighboring cells and apply exact geometry to remove approximate-index false positives.",
      "Handle hot regions, location freshness, privacy, deletion, and retention as first-class constraints.",
    ],
    concepts: [
      "geohash",
      "quadtree",
      "spatial index",
      "neighbor-cell expansion",
      "exact distance filter",
      "location freshness",
      "adaptive partitioning",
      "privacy retention",
    ],
    deepDive: [
      {
        title: "Candidate generation by cells",
        summary: "Map each entity to one or more index cells, then cover a query radius with cells before exact filtering.",
        points: [
          "Choose cell precision so typical queries scan a bounded candidate set; include adjacent cells because radii cross cell boundaries.",
          "Fetch candidate IDs from covered cells, hydrate latest coordinates and eligibility, then compute exact spherical distance.",
          "Deduplicate overlapping-cell results. For best-effort live pagination, use `(distance, entityId)` and accept drift; when duplicates or omissions are unacceptable, pin a location snapshot or search-session candidate set and track seen entity IDs.",
        ],
      },
      {
        title: "Moving-object updates",
        summary: "Versioned location updates replace an entity's prior cell membership without allowing late events to regress state.",
        points: [
          "Authenticate the producer and store event time, receive time, version, and expiry with the latest location.",
          "Apply only increasing versions, remove old cell postings idempotently, and tolerate a brief dual-posting window through hydration checks.",
          "Coalesce noisy updates according to distance or time thresholds that match the product freshness SLI.",
        ],
      },
      {
        title: "Hot regions and privacy",
        summary: "Dense cells need independent splits, while precise location requires minimization and access control.",
        points: [
          "Split dense cells recursively or add deterministic subshards; query all child shards while isolating their write load.",
          "Keep stable entity metadata separate from volatile location so each store can use an appropriate retention and replication policy.",
          "Enforce authorization, purpose, precision reduction, expiry, and deletion before returning any location-derived result.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Spatial cell precision",
        preferA: "Use finer cells to reduce false-positive candidates in dense regions.",
        preferB: "Use coarser cells to reduce index fan-out and update churn in sparse regions.",
        watch: "One global precision performs poorly across both downtown and rural density.",
      },
      {
        decision: "Update freshness versus cost",
        preferA: "Ingest frequent updates for safety-critical or rapidly moving entities.",
        preferB: "Coalesce by movement and time when minute-level freshness is sufficient.",
        watch: "Aggressive coalescing reduces write cost but increases stale and incorrectly ordered results.",
      },
      {
        decision: "Index ownership",
        preferA: "Use a managed spatial index when supported query semantics and operational simplicity dominate.",
        preferB: "Use explicit geohash or quadtree partitions when scale and hotspot control require custom placement.",
        watch: "Generic indexes can hide shard skew; custom indexes expand correctness and operational surface.",
      },
    ],
    failureModes: [
      {
        mode: "Boundary miss",
        symptom: "Nearby entities disappear when the query point lies near a spatial-cell edge.",
        mitigation: "Cover all intersecting neighbor cells, deduplicate candidates, and validate with exact distance tests at boundaries.",
      },
      {
        mode: "Dense-cell hotspot",
        symptom: "A small urban cell has disproportionate write QPS, query fan-in, and tail latency.",
        mitigation: "Use adaptive splits or subshards, cap radius and candidates, cache stable metadata, and isolate hot-cell capacity.",
      },
      {
        mode: "Stale or unauthorized location exposure",
        symptom: "Queries return expired, unavailable, deleted, or access-restricted entities.",
        mitigation: "Hydrate authoritative freshness and eligibility, apply TTL and policy filters, and prioritize deletion propagation.",
      },
    ],
    interviewQuestions: [
      "How do you avoid missing results across a geohash boundary?",
      "What changes when one downtown block receives a thousand times the normal update rate?",
      "Where are freshness, authorization, and retention enforced?",
    ],
    decisionChecklist: [
      "Define radius, result limit, freshness, and eligibility requirements.",
      "Use approximate cells only for candidate generation.",
      "Version updates and reject late state regression.",
      "Plan adaptive hot-cell isolation and candidate caps.",
      "Minimize, expire, authorize, and delete location data explicitly.",
    ],
    exercise:
      "Design nearby-driver lookup for a dense city and a sparse region. Choose index precision, update coalescing, exact filtering, cursor, hotspot split, stale-location rule, and privacy retention.",
    prerequisites: ["replication-and-partitioning", "storage-and-indexing"],
    relatedDesigns: ["classic-nearby-service"],
    quiz: [
      {
        prompt: "Why is exact distance filtering still required after a geohash lookup?",
        options: [
          "Geohashes encrypt coordinates",
          "Grid cells are approximate and include points outside the radius",
          "Distance cannot be indexed",
          "It creates a global order",
        ],
        answerIndex: 1,
        explanation: "The index deliberately returns a superset; exact geometry removes false positives and enforces the requested radius.",
      },
      {
        prompt: "What is a robust response to a persistently hot spatial cell?",
        options: [
          "Put every location in one larger cell",
          "Recursively split or deterministically subshard the cell",
          "Stop expiring locations",
          "Trust client clocks for ordering",
        ],
        answerIndex: 1,
        explanation: "Adaptive splitting spreads the exceptional region without forcing unnecessary fan-out everywhere else.",
      },
    ],
  },
  {
    id: "classic-crawler-frontier-politeness-dedupe",
    week: 4,
    day: 2,
    tier: 1,
    title: "Crawler Frontier, Politeness, and Deduplication",
    eyebrow: "Week 4 · Geo, search, and operations",
    estimatedMinutes: 85,
    summary:
      "Schedule a broad crawl through a host-aware frontier that obeys robots policy, limits per-origin load, canonicalizes URLs, and detects URL and content duplicates.",
    whyItMatters:
      "A crawler is a distributed scheduler constrained by external systems it does not control. Coverage is meaningless if crawl traps explode the frontier or politeness violations harm origin servers.",
    objectives: [
      "Design a prioritized URL frontier with per-host eligibility time and bounded concurrency.",
      "Apply robots rules, canonicalization, redirect policy, and crawl-trap defenses before fetching.",
      "Distinguish URL deduplication from post-fetch content fingerprinting and recrawl freshness.",
    ],
    concepts: [
      "URL frontier",
      "host-aware scheduling",
      "robots.txt",
      "crawl politeness",
      "canonical URL",
      "Bloom filter",
      "content fingerprint",
      "recrawl priority",
    ],
    deepDive: [
      {
        title: "Two-level frontier scheduling",
        summary: "A global priority selects important hosts while each host queue enforces its own next-allowed fetch time.",
        points: [
          "Partition host state consistently so one scheduler owns per-origin concurrency, delay, backoff, and robots policy.",
          "Store URLs durably with priority, discovery source, attempts, and next-fetch time; lease work so crashed fetchers do not lose it.",
          "Balance discovery coverage and recrawl freshness using explicit priority classes and bounded starvation.",
        ],
      },
      {
        title: "Polite fetching",
        summary: "Fetchers resolve current policy and origin budget before making a conditional request.",
        points: [
          "Cache robots policy with expiry and conservative behavior when it cannot be refreshed; identify the crawler clearly.",
          "Use per-host connection and request limits, exponential backoff, and conditional headers such as validators when available.",
          "Bound response size, redirects, content types, and fetch time to protect capacity and prevent malicious traps.",
        ],
      },
      {
        title: "Duplicate and trap control",
        summary: "Normalize discovered URLs early, then fingerprint fetched content to detect aliases and mirrors.",
        points: [
          "Canonicalize scheme, host, default ports, fragments, and safe parameter rules without merging semantically different URLs.",
          "Treat a Bloom filter as a prefilter: on a definite negative, attempt an atomic insert into the definitive URL store; on a positive, consult that store before discarding the URL. Never exclude a URL from the Bloom result alone.",
          "Detect unbounded calendars, session parameters, repeated path shapes, and near-identical content; cap crawl depth and host expansion.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Coverage versus freshness",
        preferA: "Prioritize newly discovered hosts and pages when corpus breadth is the product goal.",
        preferB: "Prioritize high-change known pages when index freshness dominates.",
        watch: "A single queue score can starve either the long tail or important recrawls.",
      },
      {
        decision: "Probabilistic versus definitive URL dedupe",
        preferA: "Use a Bloom filter to skip many definitive reads on definite negatives; positives still require a lookup before rejection.",
        preferB: "Use a definitive store before permanently excluding a URL from coverage.",
        watch: "Bloom false positives silently reduce coverage; definitive lookups add storage and latency.",
      },
      {
        decision: "Central versus host-partitioned scheduling",
        preferA: "Use a central priority view for simple global policy at smaller scale.",
        preferB: "Partition by host to scale politeness state and prevent concurrent origin overload.",
        watch: "Global reprioritization is harder when work is distributed across host owners.",
      },
    ],
    failureModes: [
      {
        mode: "Politeness violation",
        symptom: "One origin sees excess concurrency or request rate, and throttling or complaints increase.",
        mitigation: "Give one owner authority over host budgets, cache robots policy, honor backoff, and alarm on per-host violations.",
      },
      {
        mode: "Crawl trap explosion",
        symptom: "Frontier growth, duplicate ratios, and one host's URL cardinality rise without proportional unique content.",
        mitigation: "Normalize parameters, detect repeating path shapes, cap depth and expansion, and quarantine suspect hosts.",
      },
      {
        mode: "Lease loss or duplicate fetch",
        symptom: "Fetcher crashes cause URLs to disappear or be fetched repeatedly before eligibility.",
        mitigation: "Use expiring leases, idempotent fetch-result writes, deterministic URL IDs, and lease-recovery metrics.",
      },
    ],
    interviewQuestions: [
      "How does the scheduler guarantee per-host politeness with thousands of fetchers?",
      "Which URL transformations are safe to canonicalize?",
      "How do you prevent a generated calendar from consuming the entire crawl budget?",
    ],
    decisionChecklist: [
      "State corpus scope, coverage, and recrawl-freshness goals.",
      "Partition politeness ownership by host or origin.",
      "Persist leased frontier work and explicit next-fetch times.",
      "Apply URL and content duplicate defenses separately.",
      "Bound redirects, bytes, time, depth, and per-host expansion.",
    ],
    exercise:
      "Design the frontier for one billion known URLs. Define host ownership, priority, robots caching, lease recovery, recrawl scheduling, canonicalization, duplicate stores, and crawl-trap controls.",
    prerequisites: ["queues-and-streams", "networking"],
    relatedDesigns: ["classic-crawler-search"],
    quiz: [
      {
        prompt: "Why should frontier work usually be partitioned by host?",
        options: [
          "To make page bodies smaller",
          "To give one owner control of per-host concurrency and delay",
          "To guarantee all pages rank equally",
          "To avoid storing robots policy",
        ],
        answerIndex: 1,
        explanation: "Host ownership serializes the politeness budget even when many fetchers operate concurrently.",
      },
      {
        prompt: "Why is a Bloom filter alone unsafe as the permanent URL source of truth?",
        options: [
          "It cannot hash strings",
          "False positives can cause uncrawled URLs to be discarded",
          "It stores full page bodies",
          "It always produces false negatives",
        ],
        answerIndex: 1,
        explanation: "A Bloom filter may report a never-seen URL as present; definitive storage is needed when coverage loss matters.",
      },
    ],
  },
  {
    id: "classic-inverted-index-incremental-serving",
    week: 4,
    day: 3,
    tier: 1,
    title: "Inverted Indexing, Incremental Serving, and Ranking",
    eyebrow: "Week 4 · Geo, search, and operations",
    estimatedMinutes: 90,
    summary:
      "Transform parsed documents into immutable inverted-index segments, publish coherent shard manifests, merge incrementally, and rank bounded candidate sets at query time.",
    whyItMatters:
      "Search design tests storage layout, indexing freshness, immutable publication, shard fan-out, and ranking latency. Serving must remain coherent while segments, updates, and tombstones change continuously.",
    objectives: [
      "Build term dictionaries and compressed postings with document IDs, frequencies, and optional positions.",
      "Index updates into immutable segments and publish versions atomically before background merge.",
      "Route, retrieve, rank, paginate, and degrade queries across replicated index shards.",
    ],
    concepts: [
      "inverted index",
      "term dictionary",
      "postings list",
      "immutable segment",
      "segment merge",
      "tombstone",
      "query broker",
      "ranking function",
    ],
    deepDive: [
      {
        title: "Index construction",
        summary: "Parsers emit versioned documents that segment builders tokenize into term-to-document postings.",
        points: [
          "Assign stable document IDs, normalize terms, and store frequency, field, and optional position data required by ranking and phrase queries.",
          "Sort and compress postings, write immutable segment files, then atomically register checksums and document-version coverage.",
          "Deduplicate ingestion by document and source version so event replay does not create multiple live versions.",
        ],
      },
      {
        title: "Incremental publish and merge",
        summary: "Small fresh segments become searchable quickly while compaction rewrites them into efficient larger segments.",
        points: [
          "Each shard publishes an immutable manifest only after its segments are durable. A query pins either a broker-issued vector with one manifest version per shard or a global manifest published after every referenced shard view is durable.",
          "Represent updates and deletes with newer document versions or tombstones, filtering obsolete postings at query time.",
          "Merge segments by policy, preserve live newest versions, and delete old files only after no reader references their manifests.",
        ],
      },
      {
        title: "Distributed query and ranking",
        summary: "A broker parses the query, fans out to relevant shards, and merges each shard's top results.",
        points: [
          "Retrieve candidates through postings intersection or union, compute lexical scores, and return top-K with a unique tie-breaker.",
          "Apply metadata, safety, and access filters before final results; cache only where query and policy scope permit.",
          "Bound shard fan-out and per-query work, return explicit partial status on replica loss, and paginate with a query-version cursor.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Index freshness versus segment efficiency",
        preferA: "Publish small segments frequently for low indexing latency.",
        preferB: "Batch larger segments for better compression and query efficiency.",
        watch: "Too many small segments increase query fan-out and merge debt.",
      },
      {
        decision: "Document-sharded versus term-sharded index",
        preferA: "Shard by document for parallel independent indexing and uniform query fan-out.",
        preferB: "Shard by term for targeted lookup when term distribution and coordination are manageable.",
        watch: "Term frequencies are highly skewed; document sharding requires top-K merge from many shards.",
      },
      {
        decision: "Strict versus partial query availability",
        preferA: "Fail when complete results are required for legal or exact lookup semantics.",
        preferB: "Return labeled partial results for discovery search when a shard is temporarily unavailable.",
        watch: "Silent partial results make relevance and availability metrics misleading.",
      },
    ],
    failureModes: [
      {
        mode: "Incoherent manifest publication",
        symptom: "Queries reference missing segment files or mix document versions across replicas.",
        mitigation: "Verify durable replicated segments, atomically swap manifests, pin versions per query, and delay old-segment deletion.",
      },
      {
        mode: "Merge backlog",
        symptom: "Segment count, storage amplification, query CPU, and indexing latency rise together.",
        mitigation: "Reserve compaction capacity, throttle ingestion selectively, prioritize merges by read cost, and alert on merge debt.",
      },
      {
        mode: "Stale delete or update",
        symptom: "Removed or superseded documents remain searchable beyond the freshness objective.",
        mitigation: "Version every document, prioritize tombstones, filter old versions at query time, and reconcile source versions to index manifests.",
      },
    ],
    interviewQuestions: [
      "What data is stored in a posting and why?",
      "How does a new segment become visible without queries seeing partial files?",
      "What does the system return when one search shard misses its deadline?",
    ],
    decisionChecklist: [
      "Define document identity, source version, and deletion SLA.",
      "Store only posting features required by retrieval and ranking.",
      "Publish immutable segments through atomic manifests.",
      "Budget merge debt and old-version cleanup.",
      "Bound query fan-out, work, cursor version, and partial-result semantics.",
    ],
    exercise:
      "Design incremental indexing and serving for a billion-document corpus with a one-minute freshness target. Specify segment creation, manifest publish, delete handling, merge policy, sharding, top-K merge, cursor, and partial failure.",
    prerequisites: ["classic-crawler-frontier-politeness-dedupe", "storage-and-indexing"],
    relatedDesigns: ["classic-crawler-search"],
    quiz: [
      {
        prompt: "What provides a coherent index view while new segments are published?",
        options: [
          "Overwriting segment files in place",
          "An atomically selected immutable manifest",
          "Client wall-clock time",
          "A longer URL frontier",
        ],
        answerIndex: 1,
        explanation: "Readers pin one manifest whose referenced immutable files are already durable, preventing mixed or partial publication.",
      },
      {
        prompt: "What is a common cost of very frequent tiny segment publication?",
        options: [
          "Lower query fan-out",
          "More segment checks and merge debt",
          "Guaranteed global ranking",
          "No tombstones",
        ],
        answerIndex: 1,
        explanation: "Tiny segments improve freshness but multiply files, query work, and background compaction.",
      },
    ],
  },
  {
    id: "classic-observability-ingestion-cardinality-retention",
    week: 4,
    day: 4,
    tier: 1,
    title: "Observability Ingestion, Cardinality, and Retention",
    eyebrow: "Week 4 · Geo, search, and operations",
    estimatedMinutes: 90,
    summary:
      "Collect metrics and logs through durable regional buffers, control tenant and label cardinality before indexing, and tier raw and aggregated data by retention value.",
    whyItMatters:
      "An observability platform must stay available during the incidents it diagnoses. High-cardinality dimensions, bursty logs, compaction, and expensive queries make cost and backpressure part of correctness.",
    objectives: [
      "Design agent, collector, durable-stream, storage, query, dashboard, and alert paths.",
      "Partition metrics and logs while enforcing tenant isolation, quotas, and cardinality limits.",
      "Choose indexing, aggregation, downsampling, retention, and cold-tier policies from query needs.",
    ],
    concepts: [
      "agent and collector",
      "write-ahead buffer",
      "event-stream partition",
      "time-series index",
      "high-cardinality labels",
      "log indexing",
      "downsampling",
      "retention tier",
    ],
    deepDive: [
      {
        title: "Loss-aware ingestion",
        summary: "Agents batch locally; regional collectors authenticate, validate, buffer, and acknowledge only after a durable boundary.",
        points: [
          "Batch and compress records, attach tenant identity at the trusted edge, and reject malformed or over-quota traffic with explicit counters.",
          "Spool briefly to disk during stream outages with strict byte and age limits; define whether overflow drops newest, oldest, or low-priority data.",
          "Partition the durable stream by tenant plus series hash for metrics and by tenant plus time or source for logs, balancing order and spread.",
        ],
      },
      {
        title: "Cardinality and indexing",
        summary: "Series identity is the metric name plus normalized labels; every unbounded label can multiply memory and index cost.",
        points: [
          "Enforce active-series and label-value quotas per tenant, and reject or rewrite unsafe dimensions such as request IDs.",
          "Use an inverted label index to find time-series IDs, then scan time-partitioned compressed sample blocks.",
          "Index a curated subset of log attributes; keep raw bodies in cheaper segments so arbitrary fields do not explode the index.",
        ],
      },
      {
        title: "Aggregation and retention",
        summary: "Recent raw data serves debugging; older rollups preserve trends at lower resolution and cost.",
        points: [
          "Build idempotent time buckets with explicit late-data and out-of-order rules before marking a rollup complete.",
          "Retain raw, indexed, and aggregated tiers independently, and enforce tenant deletion across every tier and cache.",
          "Route queries by time range and resolution, fan out with cost limits, and label partial results when a shard misses its deadline.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Index breadth",
        preferA: "Index dimensions used frequently for filtering and alerting.",
        preferB: "Scan or post-filter rare fields from cheaper raw storage.",
        watch: "Indexing every arbitrary field causes unbounded memory, write, and compaction amplification.",
      },
      {
        decision: "Raw retention versus rollups",
        preferA: "Keep raw high-resolution data for recent incident debugging.",
        preferB: "Keep long-lived aggregates for trends, capacity, and cost control.",
        watch: "Rollups cannot answer later questions that require discarded labels or fine temporal detail.",
      },
      {
        decision: "Drop versus block under overload",
        preferA: "Drop sampled or low-priority telemetry with explicit accounting to protect applications and critical signals.",
        preferB: "Block only when telemetry loss is less acceptable than propagating backpressure to the producer.",
        watch: "Unreported dropping creates false confidence; blocking can worsen the production incident being observed.",
      },
    ],
    failureModes: [
      {
        mode: "Cardinality explosion",
        symptom: "Active-series count, index memory, compaction backlog, and ingestion latency rise after a new label appears.",
        mitigation: "Enforce per-tenant budgets, reject unbounded labels, aggregate at collection, and expose top cardinality contributors.",
      },
      {
        mode: "Collector overload and silent loss",
        symptom: "Applications remain healthy while telemetry gaps appear and collector buffers fill or restart.",
        mitigation: "Bound local spools, report accepted/rejected/dropped counts externally, shed by priority, and alert on oldest buffered age.",
      },
      {
        mode: "Retention or deletion leak",
        symptom: "Expired or deleted data remains searchable in a rollup, cold tier, index, or query cache.",
        mitigation: "Track deletion across every derived tier, version retention manifests, verify completion, and audit with periodic scans.",
      },
    ],
    interviewQuestions: [
      "At what boundary is an ingestion acknowledgement durable?",
      "How does one request-ID label affect a time-series database?",
      "Which data remains after raw samples expire, and which queries become impossible?",
    ],
    decisionChecklist: [
      "Define accepted, rejected, delayed, and dropped semantics.",
      "Partition by tenant and stable data identity.",
      "Budget active series, label values, query fan-out, and storage.",
      "Make late-data and rollup completion semantics explicit.",
      "Apply retention and deletion to raw, derived, indexed, cached, and cold data.",
    ],
    exercise:
      "Design a multi-tenant pipeline for metrics and structured logs. Specify acknowledgement, partitions, cardinality quotas, indexes, raw and rollup retention, overload shedding, expensive-query controls, and self-monitoring.",
    prerequisites: ["queues-and-streams", "storage-and-indexing"],
    relatedDesigns: ["classic-observability-platform"],
    quiz: [
      {
        prompt: "Why is a request ID usually unsafe as a metric label?",
        options: [
          "It is not a string",
          "It creates roughly one time series per request",
          "It prevents batching logs",
          "It forces UDP transport",
        ],
        answerIndex: 1,
        explanation: "A near-unique label value multiplies active series and overwhelms indexes, memory, and storage.",
      },
      {
        prompt: "What should an observability collector do if its buffer reaches a hard limit?",
        options: [
          "Consume unbounded memory",
          "Apply an explicit priority-aware drop or backpressure policy and count the loss",
          "Acknowledge data it did not retain",
          "Disable all quotas",
        ],
        answerIndex: 1,
        explanation: "A bounded, observable overload policy protects production and makes telemetry gaps visible rather than silently corrupting trust.",
      },
    ],
  },
  {
    id: "classic-slos-backpressure-degradation",
    week: 4,
    day: 5,
    tier: 1,
    title: "SLOs, Backpressure, and Graceful Degradation",
    eyebrow: "Week 4 · Geo, search, and operations",
    estimatedMinutes: 80,
    summary:
      "Translate user outcomes into SLIs and error budgets, then bound admission and queues so overload triggers intentional degradation instead of uncontrolled collapse.",
    whyItMatters:
      "Reliability discussion is strongest when it connects a measurable user promise to load shedding, dependency budgets, retry policy, and a product-safe degraded mode.",
    objectives: [
      "Define latency, availability, correctness, and freshness SLIs with valid-event populations.",
      "Use error budgets and burn-rate alerts to distinguish urgent incidents from normal variance.",
      "Place backpressure, admission control, and graceful degradation at each queue and dependency boundary.",
    ],
    concepts: [
      "service-level indicator",
      "service-level objective",
      "error budget",
      "burn-rate alert",
      "bounded queue",
      "admission control",
      "load shedding",
      "graceful degradation",
    ],
    deepDive: [
      {
        title: "User-centered SLI math",
        summary: "An SLI is a ratio or distribution over clearly defined valid user events, not an internal average.",
        points: [
          "Define good and total events, exclusions, aggregation window, and percentile or threshold from the user-visible operation.",
          "Track availability separately from correctness and freshness so a fast stale response cannot pass the wrong objective.",
          "Allocate end-to-end latency and availability budgets to dependencies without assuming independent failure.",
        ],
      },
      {
        title: "Error budget and alerting",
        summary: "The allowed bad-event fraction guides release pace and multi-window burn alerts.",
        points: [
          "Calculate remaining budget over the objective window and show both fast-burn and slow-burn rates.",
          "Page on actionable rapid exhaustion; create lower-urgency work for sustained slow burn.",
          "Combine symptom alerts with queue age, saturation, and dependency signals for diagnosis, not as substitutes for the SLO.",
        ],
      },
      {
        title: "Overload control and degradation",
        summary: "Every admitted request consumes bounded concurrency, queue, deadline, and downstream work.",
        points: [
          "Reject early using tenant, priority, and cost-aware admission before scarce workers or database connections are consumed.",
          "Propagate deadlines and backpressure; cap queues by age and bytes, and avoid retries at multiple layers.",
          "Define degraded outputs in advance: stale cache, reduced ranking, delayed analytics, or disabled optional fan-out while protecting correctness.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Fail open versus fail closed",
        preferA: "Fail open for optional personalization or analytics when a safe default exists.",
        preferB: "Fail closed for authorization, privacy, payment invariants, and unsafe unknown state.",
        watch: "One blanket policy either harms availability or violates correctness and security.",
      },
      {
        decision: "Queue versus reject",
        preferA: "Queue short bounded bursts when work remains valuable within its deadline.",
        preferB: "Reject or shed when queue delay will exceed usefulness or amplify an outage.",
        watch: "Deep queues convert overload into delayed timeouts and make recovery slow.",
      },
      {
        decision: "Strict freshness versus stale serving",
        preferA: "Require fresh source-of-truth reads for money, authorization, and explicit freshness contracts.",
        preferB: "Serve labeled stale cached data for feeds, search, or dashboards when availability is more valuable.",
        watch: "Stale fallback needs a maximum age and must not bypass deletion or access revocation.",
      },
    ],
    failureModes: [
      {
        mode: "Retry amplification",
        symptom: "A slow dependency causes more attempts, longer queues, lower success, and fleet-wide saturation.",
        mitigation: "Use one retry owner, budgets, jitter, circuit breaking, early admission control, and deadline propagation.",
      },
      {
        mode: "Healthy averages hide tail failure",
        symptom: "Mean latency and host uptime look normal while a user cohort or high percentile burns the SLO.",
        mitigation: "Measure event-level thresholds and percentiles by important slice, and alert on multi-window error-budget burn.",
      },
      {
        mode: "Unsafe degradation",
        symptom: "Fallback improves availability but returns unauthorized, financially inconsistent, or excessively stale results.",
        mitigation: "Classify invariants before the incident, test degraded modes, cap staleness, and fail closed on safety-critical checks.",
      },
    ],
    interviewQuestions: [
      "What are the exact good and total events for this design's primary SLO?",
      "Where does the system reject work before overload reaches storage?",
      "Which features degrade safely, and which invariants must never degrade?",
    ],
    decisionChecklist: [
      "Define user-visible latency, availability, correctness, and freshness separately.",
      "Specify error-budget window and burn-rate alerts.",
      "Bound every queue by age, bytes, or work cost.",
      "Propagate deadlines and assign one retry owner.",
      "Predefine and test safe degraded modes and recovery.",
    ],
    exercise:
      "For a newsfeed or nearby service, write the primary SLO, dependency budgets, overload admission policy, queue limits, retry owner, three degraded modes, and one invariant that must fail closed.",
    prerequisites: ["classic-observability-ingestion-cardinality-retention", "classic-retries-reconciliation"],
    relatedDesigns: ["classic-newsfeed", "classic-nearby-service", "classic-observability-platform"],
    quiz: [
      {
        prompt: "Which is the best availability SLI for a user-facing read API?",
        options: [
          "Average CPU utilization",
          "The fraction of valid requests returning a correct response within the latency threshold",
          "Number of deployed hosts",
          "Total log volume",
        ],
        answerIndex: 1,
        explanation: "The ratio measures the actual user outcome and includes both errors and responses too slow to be useful.",
      },
      {
        prompt: "When should a system reject new work rather than queue it?",
        options: [
          "When predicted queue delay exceeds the request's value or deadline",
          "Only after memory is exhausted",
          "Whenever cache hit rate is high",
          "Never, because queues guarantee recovery",
        ],
        answerIndex: 0,
        explanation: "Work that will time out wastes scarce capacity and extends recovery; early rejection keeps the system responsive.",
      },
    ],
  },
  {
    id: "classic-multi-region-disaster-recovery",
    week: 4,
    day: 6,
    tier: 1,
    title: "Multi-Region Design and Disaster Recovery",
    eyebrow: "Week 4 · Geo, search, and operations",
    estimatedMinutes: 90,
    summary:
      "Place traffic and data across regions according to consistency and latency needs, fence failover to prevent split brain, and prove recovery through explicit RPO, RTO, restore, and failback procedures.",
    whyItMatters:
      "Multi-region diagrams are easy; correct ownership and recovery are not. Interviewers look for replication lag, conflict policy, regional dependencies, disaster detection, backups, and the dangerous path back to normal.",
    objectives: [
      "Choose active-passive, active-active, or home-region ownership per data invariant.",
      "Explain global routing, replication, fencing, failover, conflict handling, and failback.",
      "Define RPO and RTO, backup independence, restore verification, and disaster exercises.",
    ],
    concepts: [
      "active-passive",
      "active-active",
      "home region",
      "asynchronous replication",
      "fencing token",
      "split brain",
      "recovery point objective",
      "recovery time objective",
    ],
    deepDive: [
      {
        title: "Traffic and data placement",
        summary: "Route reads and writes only after deciding which region owns each consistency domain.",
        points: [
          "Use a home region or single leader for strongly ordered keys; route or proxy writes there while serving safe local replicas when allowed.",
          "Use active-active local writes only with a defined merge rule, commutative operation, or partitioned ownership that preserves invariants.",
          "Keep region routing metadata small, replicated, and versioned; clients and edges must tolerate stale placement information.",
        ],
      },
      {
        title: "Failover and fencing",
        summary: "Promotion requires evidence that the old writer cannot continue, not only evidence that it looks unreachable.",
        points: [
          "Acquire a higher epoch or fencing token from an independent quorum before the standby accepts writes.",
          "Measure and disclose replication lag so operators know the potential data loss before promotion.",
          "Storage rejects new mutation commands carrying a stale epoch. Establish a committed cutover log position, drain or replay pre-cutover events, and never discard a committed event solely because its epoch predates the current writer.",
        ],
      },
      {
        title: "Backup, restore, and failback",
        summary: "Replication handles availability; independent versioned backups handle corruption, deletion, and correlated software failure.",
        points: [
          "Derive backup frequency and replication mode from RPO, and automate restore measurement against RTO.",
          "Store backups in a separate failure and access domain, verify checksums, and run application-level invariant checks after restore.",
          "Before failback, reconcile divergent writes, seed the recovered region, reverse replication safely, and change ownership through a new fenced epoch.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Active-passive versus active-active writes",
        preferA: "Use active-passive or home-region writes for simpler ordering and conflict avoidance.",
        preferB: "Use active-active when local write availability justifies explicit conflict or partitioned ownership semantics.",
        watch: "Active-active is not a routing toggle; every non-commutative invariant needs a resolution strategy.",
      },
      {
        decision: "Synchronous versus asynchronous replication",
        preferA: "Replicate synchronously within the latency budget when near-zero data loss is required.",
        preferB: "Replicate asynchronously for lower write latency and regional independence with a nonzero RPO.",
        watch: "Distance makes synchronous cross-region writes slower and more vulnerable to network partition.",
      },
      {
        decision: "Automatic versus operator-confirmed failover",
        preferA: "Automate for stateless or safely fenced data paths with clear health evidence.",
        preferB: "Require confirmation for money or ambiguous split-brain conditions where wrong promotion is worse than downtime.",
        watch: "Slow manual decisions increase RTO; unsafe automation can create unrecoverable divergence.",
      },
    ],
    failureModes: [
      {
        mode: "Split-brain writers",
        symptom: "Two regions accept conflicting writes for the same ownership domain after a partition.",
        mitigation: "Use quorum-issued epochs, enforce fencing at storage, and choose availability loss over invariant loss where necessary.",
      },
      {
        mode: "Failover with hidden replication lag",
        symptom: "The promoted region serves stale state or lacks recently acknowledged writes.",
        mitigation: "Expose per-stream lag and safe restore points, compare with RPO, pause promotion or disclose degraded consistency.",
      },
      {
        mode: "Untested or correlated backup failure",
        symptom: "Backups exist on paper but restore misses its RTO, violates invariants, or shares the corrupted credentials and region.",
        mitigation: "Use independent immutable copies, recurring full restores, checksum and domain validation, and measured disaster exercises.",
      },
    ],
    interviewQuestions: [
      "Which writes can be accepted in two regions without conflict?",
      "How is the old primary fenced before promotion?",
      "What are the RPO and RTO, and when was a full restore last proven?",
    ],
    decisionChecklist: [
      "Assign an owner and consistency policy to every mutable dataset.",
      "State read and write behavior during regional partition.",
      "Fence writers with epochs before failover.",
      "Measure replication lag against RPO and restore against RTO.",
      "Design backup independence, invariant validation, reconciliation, and failback.",
    ],
    exercise:
      "Take a payment ledger and a newsfeed through loss of their primary region. Define routing, replication, promotion evidence, fencing, RPO/RTO, degraded behavior, reconciliation, restore, and failback for each.",
    prerequisites: ["replication-and-partitioning", "classic-slos-backpressure-degradation"],
    relatedDesigns: ["classic-payment-ledger", "classic-newsfeed", "classic-chat"],
    quiz: [
      {
        prompt: "What is the main purpose of a fencing token during failover?",
        options: [
          "Compress replicated data",
          "Prevent an old writer from committing after a new writer is promoted",
          "Reduce CDN latency",
          "Choose a cache TTL",
        ],
        answerIndex: 1,
        explanation: "A monotonically newer epoch lets storage reject stale-primary writes even if the old region later reconnects.",
      },
      {
        prompt: "Why are replicas not sufficient as backups?",
        options: [
          "Replicas cannot store bytes",
          "They may replicate corruption or deletion and share failure domains",
          "They always have infinite lag",
          "They cannot serve reads",
        ],
        answerIndex: 1,
        explanation: "Replication improves availability but can faithfully copy logical damage; independent versioned backups support point-in-time recovery.",
      },
    ],
  },
];

export const classicPrompts: DesignPrompt[] = [
  {
    id: "classic-unique-id-service",
    title: "Unique ID Service",
    category: "classic",
    difficulty: "medium",
    durationMinutes: 40,
    prompt:
      "Design a highly available service that issues globally unique, roughly time-sortable IDs to services in multiple regions. State the required throughput, lifetime, opacity, ordering scope, and behavior during clock or coordinator failure.",
    requirementsToExplore: [
      "Peak IDs per second, batch allocation, and expected scheme lifetime",
      "Uniqueness scope, time sortability, and whether IDs must be opaque",
      "Multi-region availability and acceptable coordination on the hot path",
      "Clock rollback, sequence exhaustion, process restart, and worker-ID reuse",
      "Migration when the bit layout or capacity assumptions change",
    ],
    expectedTopics: [
      "Database sequences, UUIDs, and Snowflake-style layouts",
      "Epoch, timestamp, region or worker, and per-tick sequence bit budgets",
      "Leased worker identities, encoded incarnation epochs, and coordinator isolation",
      "Monotonic-clock guards and rollback policy",
      "Sortability versus strict global ordering and coordination trade-offs",
    ],
    commonFailureModes: [
      "Claiming rough timestamp order is a gap-free global sequence",
      "Reusing a worker ID before the previous lease is fenced",
      "Allowing sequence wrap or wall-clock rollback to repeat a bit pattern",
      "Putting a strongly consistent coordinator on every ID issuance",
    ],
    followUpQuestions: [
      "How many years does the timestamp field last, and how many IDs can one worker issue per tick?",
      "What does a generator do when its clock moves backward?",
      "How are stale workers prevented from issuing after lease reassignment?",
      "How would you support clients that need IDs in batches while offline?",
    ],
    reference: {
      scope: [
        "Issue unique IDs within a named namespace at the stated peak and availability target.",
        "Provide rough creation-time sortability, not gap-free or globally linearizable order unless explicitly required.",
        "Support regional generators and optional batches; human-readable decoding is an internal diagnostic, not a public security boundary.",
      ],
      apis: [
        "`POST /v1/ids { namespace, count } -> { ids, layoutVersion }`, with bounded count and request idempotency if callers may retry batches.",
        "Internal `AcquireWorker(region, owner, ttl)` returns a non-reused incarnation; `RenewWorker(workerId, incarnation, leaseEpoch, ttl)` renews ownership by compare-and-swap.",
        "Internal `GetLayout(version)` exposes epoch, bit allocation, and compatibility state to SDKs and operators.",
      ],
      dataModel: [
        "ID layout v1: `[timestampSinceCustomEpoch | regionOrWorker | workerIncarnation | sequence]`, with every field's bit width derived from lifetime, reassignment, and peak-per-worker demand.",
        "WorkerLease `{ workerId, region, owner, incarnation, epoch, expiresAt }`, unique on worker ID and renewed by compare-and-swap.",
        "LayoutConfig `{ version, epochMillis, bitAllocation, status }` and an audit record for lease issue, revoke, and conflict.",
      ],
      architecture: [
        "Regional stateful generator processes issue IDs locally from a cached lease, encoded worker incarnation, and retained last-timestamp plus sequence state.",
        "A strongly consistent control plane assigns worker identities and a never-reused incarnation for the scheme lifetime, but is absent from the per-ID hot path.",
        "An SDK can reserve small batches from a local generator; services validate layout version and treat IDs as opaque values.",
        "Generators stop issuance on expired lease, unsafe clock rollback, or exhausted sequence until the next safe tick.",
      ],
      invariants: [
        "No two live or restarted generators may emit the same namespace and bit pattern.",
        "Every ID encodes the lease incarnation; reassignment receives a distinct non-wrapping incarnation so a paused old generator cannot collide with the new owner.",
        "The per-tick sequence never wraps, and clock rollback never moves emitted logical time backward into an already-used range.",
        "Sortability is approximate across hosts; the API does not promise gap-free IDs or strict global order.",
      ],
      deepDives: [
        {
          title: "Bit budget and lifetime",
          summary: "Capacity follows directly from timestamp resolution, scheme lifetime, worker count, and peak IDs per worker per tick.",
          points: [
            "Compute timestamp bits from the custom epoch and desired years, then reserve enough sequence bits for burst capacity with headroom.",
            "Model signed database types and client language precision before selecting a 64-bit layout.",
            "Version the layout and plan dual-read or dual-decode before timestamp or worker space is exhausted.",
          ],
        },
        {
          title: "Clock rollback and sequence exhaustion",
          summary: "The generator protects uniqueness even when wall time is unsafe.",
          points: [
            "Track the last emitted timestamp; for small rollback use logical time only within a documented bound, otherwise stop and alarm.",
            "When a sequence fills, wait for the next safe tick or shed load rather than wrap.",
            "Persist or fence restart state so a process cannot reuse sequence values under the same worker and timestamp.",
          ],
        },
        {
          title: "Lease fencing",
          summary: "Lease expiry alone is not fencing for local generation, so each reassignment must create a disjoint encoded identity or ID range.",
          points: [
            "Issue a monotonically increasing incarnation on reassignment, encode it in every ID, and prevent wrap or reuse during the scheme lifetime.",
            "Use bounded-clock and early-expiry assumptions, persist local timestamp/sequence state, and stop on coordinator uncertainty; availability loss is preferable to duplicate IDs.",
            "Detect concurrent owners through lease-conflict telemetry and duplicate sampling at downstream boundaries.",
          ],
        },
      ],
      scaling: [
        "Keep allocation local and batch-friendly so generation scales with processes rather than coordinator QPS.",
        "Allocate worker or region capacity from measured peak, including one-region and rolling-restart headroom.",
        "Load-test the hottest timestamp tick, lease-renewal outage, sequence saturation, and mass restart.",
        "Add a new layout version before timestamp, incarnation, or worker-bit exhaustion; never reinterpret existing IDs in place.",
      ],
      observability: [
        "Generation QPS and p50/p99 latency by region and layout version",
        "Sequence utilization and saturation waits per worker and tick",
        "Clock rollback count, magnitude, blocked duration, and logical-time use",
        "Lease renew failures, conflicting owners, stale epochs, and remaining scheme lifetime",
        "Duplicate invariant alarms from downstream sampling or uniqueness checks",
      ],
    },
  },
  {
    id: "classic-newsfeed",
    title: "Newsfeed or Timeline",
    category: "classic",
    difficulty: "hard",
    durationMinutes: 45,
    prompt:
      "Design a personalized home feed where users publish posts, follow authors, and page through fresh ranked or chronological results. Handle celebrity authors, deletes, privacy changes, retries, and a tenfold traffic increase.",
    requirementsToExplore: [
      "Active users, follow-graph skew, publish rate, feed-read rate, and page size",
      "Chronological versus ranked order and publish-to-visible freshness",
      "Post edit, delete, block, privacy, and moderation behavior",
      "Stable pagination during concurrent inserts and ranking changes",
      "Regional reads, write ownership, disaster recovery, and degraded mode",
    ],
    expectedTopics: [
      "Fan-out on write, fan-out on read, and a celebrity-aware hybrid",
      "Post and social-graph sources of truth with an idempotent outbox pipeline",
      "Sharded feed-entry storage, candidate cache, ranking, hydration, and filtering",
      "Opaque keyset or rank-session cursors with unique tie-breakers",
      "Queue backpressure, cache stampede control, tombstones, and reconciliation",
    ],
    commonFailureModes: [
      "Applying fan-out-on-write uniformly to extreme follower counts",
      "Using offset pagination for a rapidly mutating feed",
      "Rendering cached deleted or unauthorized content",
      "Acknowledging a post before its canonical state is durable",
    ],
    followUpQuestions: [
      "What data moves when a celebrity publishes?",
      "How does an unfollow or block affect already materialized entries?",
      "What is encoded in the feed cursor when rank scores change?",
      "Which feature degrades first when the ranking service is slow?",
    ],
    reference: {
      scope: [
        "Create and delete posts, follow and unfollow authors, and read a personalized home feed.",
        "Support chronological or lightweight ranked order, stable forward pagination, privacy filtering, and a stated freshness SLI.",
        "Include celebrity skew and regional operation; exclude model-training design unless the interviewer asks for it.",
      ],
      apis: [
        "`POST /posts { clientPostId, bodyRef, visibility } -> { postId, createdAt }` and `DELETE /posts/{postId}`.",
        "`PUT /users/{viewerId}/following/{authorId}` and matching delete, both idempotent.",
        "`GET /feeds/home?cursor&limit -> { items, nextCursor, rankVersion }`.",
        "Events: `PostCreated`, `PostDeleted`, `FollowChanged`, and `VisibilityChanged`, each with stable event ID and source version.",
      ],
      dataModel: [
        "Post `{ postId, authorId, bodyRef, visibility, createdAt, version, deletedAt }` is the content source of truth.",
        "FollowEdge `{ followerId, authorId, createdAt }`, indexed by follower and author for reads and fan-out.",
        "FeedEntry `{ viewerId, postId, authorId, createdAt, rankFeatures, policyVersion }`, unique on `(viewerId, postId)` and sharded by viewer.",
        "Opaque cursor contains ordering tuple plus candidate or ranking version and is authenticated against tampering.",
      ],
      architecture: [
        "Post service commits post and outbox atomically; a durable author-partitioned stream feeds expansion workers.",
        "Fan-out workers read follower batches and idempotently upsert ordinary-author entries into viewer-sharded timeline storage.",
        "Celebrity posts remain in author timelines and are merged with materialized candidates by the feed service.",
        "The read path fetches candidates, applies block and visibility policy, ranks, hydrates post bodies, and fills a versioned cache.",
        "Deletion and access-change tombstones use a priority channel and are rechecked during hydration.",
      ],
      invariants: [
        "Canonical post and current relationship or visibility policy decide whether an item may be returned.",
        "One logical feed entry exists per viewer and post despite outbox or broker replay.",
        "Feed pagination has a deterministic unique order within its documented rank-session semantics.",
        "A successful post response follows durable source-of-truth commit; fan-out may be eventually consistent within the freshness SLO.",
      ],
      deepDives: [
        {
          title: "Push, pull, and hybrid fan-out",
          summary: "Choose the join location per author class from measured amplification and latency.",
          points: [
            "Batch and checkpoint ordinary follower expansion with deterministic entry keys.",
            "Merge high-fan-out author heads at read time and cache them independently.",
            "Version threshold changes and backfill gradually so policy migration does not duplicate or omit candidates.",
          ],
        },
        {
          title: "Ranking, cache, and cursor",
          summary: "Candidate IDs, mutable content, and viewer policy have different cache lifetimes and reuse.",
          points: [
            "Cache immutable post fragments broadly and viewer-ranked pages narrowly by ranking version.",
            "Use request coalescing, jittered expiry, and stale-if-error for safe content to contain stampedes.",
            "Use `(createdAt, postId)` for chronology or a rank-session boundary for mutable scores.",
          ],
        },
      ],
      scaling: [
        "Shard follower expansion by author batches and timeline storage by viewer; reserve independent queue capacity for backfills.",
        "Detect celebrity and hot post keys from observed amplification; replicate their author-head caches.",
        "Hydrate in batches and cap candidate windows so ranking and storage fan-in remain bounded.",
        "Serve local-region replicas when allowed while assigning one home region to ordered writes and policy changes.",
      ],
      observability: [
        "Post commit-to-feed-visible latency and oldest fan-out event age",
        "Entries attempted, deduplicated, failed, and reconciled per post class",
        "Feed read latency by candidate, rank, filter, hydrate, and cache stage",
        "Cache hit rate, stampede suppression, stale fallback, and hot-key distribution",
        "Duplicate, missing, deleted, blocked, or unauthorized exposure invariant counters",
      ],
    },
  },
  {
    id: "classic-chat",
    title: "Chat and Messaging",
    category: "classic",
    difficulty: "hard",
    durationMinutes: 45,
    prompt:
      "Design a one-to-one and group chat system with persistent connections, offline delivery, per-conversation ordering, delivery and read receipts, presence, and multi-device synchronization.",
    requirementsToExplore: [
      "Concurrent connections, messages per second, group sizes, message retention, and attachment scope",
      "Ordering, durable acknowledgement, delivery, and read semantics",
      "Offline duration, history pagination, and multi-device cursor behavior",
      "Presence freshness, privacy, membership changes, and large groups",
      "Slow clients, reconnect storms, regional partitions, and degradation",
    ],
    expectedTopics: [
      "WebSocket or long-poll gateway capacity and session routing",
      "Conversation-partitioned sequencing and idempotent client message IDs",
      "Durable message log, outbox delivery, per-device cursor, and receipts",
      "Lease-based presence and versioned group membership",
      "Backpressure, reconnect jitter, offline push, and multi-region ownership",
    ],
    commonFailureModes: [
      "Acknowledging a message while it exists only in gateway memory",
      "Promising exactly-once or global message ordering",
      "Using device timestamps for canonical order",
      "Allowing stale membership or presence cache to authorize history",
    ],
    followUpQuestions: [
      "How does a client retry a send after an ambiguous timeout?",
      "What happens when a device receives sequence 43 before 42?",
      "How do you deliver one message to a million-member group?",
      "How does the fleet recover from losing every gateway in one zone?",
    ],
    reference: {
      scope: [
        "Support one-to-one and group conversations, real-time push, durable history, offline catch-up, receipts, and bounded-stale presence.",
        "Promise order only within a conversation and distinguish accepted, delivered, and read states.",
        "Treat attachments and end-to-end encryption as follow-ups unless required, while preserving access control hooks.",
      ],
      apis: [
        "WebSocket `Connect(deviceId, resumeCursor)` authenticates and registers a leased connection.",
        "`SendMessage(conversationId, clientMessageId, bodyRef) -> { messageId, sequence, acceptedAt }` is idempotent.",
        "`GET /conversations/{id}/messages?afterSequence&limit` and `GET /sync?cursor&limit` support history and account-wide catch-up.",
        "`AckDelivered(conversationId, sequence, deviceId)` and `AckRead(conversationId, throughSequence)` advance monotonic state.",
      ],
      dataModel: [
        "Conversation `{ id, type, homePartition, membershipVersion }` and Member `{ conversationId, userId, role, joinedAt, removedAt }`.",
        "Message keyed by `(conversationId, sequence)` with unique `(conversationId, senderId, clientMessageId)` and immutable body reference.",
        "DeviceCursor `{ userId, deviceId, syncOffset }` and Receipt `{ conversationId, userId, deliveredThrough, readThrough }` use monotonic offsets.",
        "PresenceLease `{ userId, deviceId, connectionId, gatewayId, expiresAt }` is soft state; last-seen policy is separate.",
      ],
      architecture: [
        "Connection gateways terminate sockets, authenticate devices, maintain bounded buffers, and renew session-directory leases.",
        "Chat service routes a conversation to one logical partition, deduplicates the client ID, assigns sequence, and durably stores before acknowledging.",
        "A transactional outbox publishes message events to user or conversation fan-out workers, which push to live gateways and update offline inboxes.",
        "Clients recover through durable cursors; ephemeral presence publishes coalesced state transitions independently of message truth.",
        "Object storage and a CDN serve authorized attachments without routing large bytes through chat gateways.",
      ],
      invariants: [
        "Only current members may send or read; delivery is not proof of continuing authorization.",
        "A durable accepted acknowledgement is sent only after message storage commits.",
        "A repeated client message ID returns the original message ID and sequence without a second effect.",
        "Sequence order is monotonic per conversation, and device or receipt cursors never regress.",
        "Presence is explicitly ephemeral and cannot determine whether durable history exists.",
      ],
      deepDives: [
        {
          title: "Order and retry safety",
          summary: "One conversation owner sequences idempotent commands while clients tolerate replay and gaps.",
          points: [
            "Store client dedupe and sequence assignment atomically; never order by sender clocks.",
            "Buffer a short out-of-order gap and fetch the missing range before advancing the device cursor.",
            "Represent read state as a monotonic high-water mark when product semantics allow it.",
          ],
        },
        {
          title: "Connections and fan-out",
          summary: "Gateways hold sockets, but durable state and recovery live behind them.",
          points: [
            "Estimate sockets, heartbeat QPS, memory, descriptors, and reconnection headroom independently from message QPS.",
            "Use leased routing hints and cursor recovery when gateways fail or routes are stale.",
            "For large groups, persist one message and batch member pointers or notifications with quota isolation.",
          ],
        },
      ],
      scaling: [
        "Shard conversations by ID and isolate exceptional hot groups with dedicated partitions or hierarchical fan-out.",
        "Scale gateways by connection resource budgets and use jittered draining for deploys and zone loss.",
        "Batch offline delivery and receipt updates; compact monotonic watermarks instead of storing unnecessary per-message rows.",
        "Use home-region conversation writers where strong order is needed and asynchronous replicas for allowed local reads.",
      ],
      observability: [
        "Active connections, handshake failures, reconnect rate, heartbeat lag, and buffered bytes",
        "Send acceptance, durable-store, gateway-delivery, and offline-delivery latency",
        "Duplicate suppression, sequence gaps, redelivery, and cursor replay volume",
        "Consumer lag, hot-conversation throughput, and large-group oldest-delivery age",
        "Presence staleness, membership-denied reads, and unauthorized attachment attempts",
      ],
    },
  },
  {
    id: "classic-payment-ledger",
    title: "Payment and Ledger System",
    category: "classic",
    difficulty: "hard",
    durationMinutes: 45,
    prompt:
      "Design a payment platform that authorizes, captures, settles, and refunds payments through an external processor while maintaining an immutable double-entry ledger, idempotent APIs, auditability, and reconciliation.",
    requirementsToExplore: [
      "Supported payment lifecycle, partial capture or refund, currencies, and excluded chargeback or FX scope",
      "Client retries, provider timeouts, duplicate webhooks, and unknown outcomes",
      "Ledger accounts, balance reads, settlement, and audit requirements",
      "Concurrency, outbox publication, reconciliation cadence, and manual review",
      "Regional write ownership, disaster recovery, security, and retention",
    ],
    expectedTopics: [
      "Explicit payment state machine and optimistic versioning",
      "Scoped idempotency record with request fingerprint and canonical response",
      "Immutable balanced journal transaction and entries",
      "Provider adapter, webhook inbox, transactional outbox, and at-least-once processing",
      "Settlement-file reconciliation, corrections, alerts, and audit trail",
    ],
    commonFailureModes: [
      "Treating a provider timeout as a definite failure",
      "Claiming end-to-end exactly-once message delivery",
      "Mutating posted ledger entries or balances without journal evidence",
      "Updating payment and publishing its event as an unsafe dual write",
    ],
    followUpQuestions: [
      "How is a duplicate capture request recognized after a process restart?",
      "What does the API return while a provider outcome is unknown?",
      "How do you prove every journal transaction balances by currency?",
      "What happens when settlement records disagree with internal state?",
    ],
    reference: {
      scope: [
        "Create payments and support authorization, capture, settlement, refund, status, and provider callbacks.",
        "Maintain immutable accounting and reconcile processor records; state whether partial operations and multiple currencies are included.",
        "Exclude card vault details, FX, disputes, and chargebacks unless requested, while preserving security boundaries.",
      ],
      apis: [
        "`POST /payments` with scoped idempotency key and amount/currency returns committed or pending payment state.",
        "`POST /payments/{id}/captures` and `/refunds` each use independent idempotency keys and explicit amounts.",
        "`GET /payments/{id}` exposes state, version, amounts, and unresolved-provider status without leaking sensitive credentials.",
        "`POST /providers/{name}/webhook` verifies signature and deduplicates provider event ID before transition.",
      ],
      dataModel: [
        "Payment `{ id, merchantId, amount, currency, authorized, captured, refunded, state, version }` with legal transition checks.",
        "IdempotencyRecord `{ principal, operation, key, requestHash, status, response }`, unique on its scope.",
        "ProviderAttempt `{ paymentId, operation, providerRequestId, status, responseRef, startedAt }` and deduplicated webhook inbox.",
        "LedgerTransaction `{ id, businessEventId, postedAt, reversalOf }` plus immutable LedgerEntry `{ transactionId, accountId, currency, debit, credit }`.",
        "OutboxEvent and ReconciliationResult records link domain transitions, publication, settlement comparison, and correction.",
      ],
      architecture: [
        "API validates and atomically claims idempotency before an orchestration state machine advances payment intent.",
        "A relational transaction commits payment version, balanced journal entries, idempotency response, and outbox event together.",
        "Provider adapters execute asynchronous commands with stable provider IDs; signed callbacks enter through a deduplicating inbox.",
        "Outbox relay publishes state changes at least once, and all consumers apply inbox deduplication.",
        "A reconciliation service compares closed processor windows with internal attempts, payments, and journal postings and queues exceptions.",
      ],
      invariants: [
        "Only legal versioned payment transitions commit, and cumulative refund never exceeds captured amount.",
        "For every ledger transaction and currency, `SUM(debit) = SUM(credit)`; a signed-entry representation would equivalently require `SUM(amount) = 0`.",
        "Journal entries are immutable; corrections are linked reversing or adjustment transactions.",
        "One financial effect occurs per idempotency scope despite request, webhook, or event redelivery.",
        "An ambiguous provider outcome remains pending or unknown until queried or reconciled; it is never guessed.",
      ],
      deepDives: [
        {
          title: "Ambiguous outcomes and idempotency",
          summary: "The platform binds one intent to one result across client retries and provider uncertainty.",
          points: [
            "Persist request fingerprint and pending claim before work; return the original canonical response on replay.",
            "Use a stable provider request ID and query it after timeout instead of issuing a new authorization blindly.",
            "Deduplicate provider callbacks and outbox events independently because each boundary delivers at least once.",
          ],
        },
        {
          title: "Ledger and reconciliation",
          summary: "The ledger records internal financial truth while reconciliation compares it with external settlement facts.",
          points: [
            "Post all entries for one business event in one balanced transaction and derive or transactionally maintain balances.",
            "Match settlement by stable identifiers and classify missing, duplicate, amount, currency, and state mismatches.",
            "Correct through new postings and state transitions with audit links, never destructive edits.",
          ],
        },
      ],
      scaling: [
        "Partition payment orchestration by merchant or payment while keeping one journal posting inside an atomic ownership boundary.",
        "Use optimistic versioning to serialize concurrent operations and isolate hot merchants with quotas.",
        "Run provider I/O, webhook processing, publication, and reconciliation asynchronously with separate capacity and backpressure.",
        "Use a fenced home-region writer for money-moving state and independently tested replicas and backups.",
      ],
      observability: [
        "Unbalanced posting count is a zero-tolerance invariant alarm",
        "Payment transition latency, illegal transition attempts, and optimistic conflicts",
        "Provider timeout, throttle, unknown-state count and age, and webhook verification failures",
        "Idempotency replay and conflict rates, inbox dedupe, and outbox oldest age",
        "Unmatched settlement count, value delta, reconciliation age, and manual-review SLA",
      ],
    },
  },
  {
    id: "classic-notifications",
    title: "Notification System",
    category: "classic",
    difficulty: "medium",
    durationMinutes: 40,
    prompt:
      "Design a multi-tenant notification platform for transactional and scheduled email, SMS, push, and in-app messages, including preferences, priorities, deduplication, rate limits, provider failure, retries, and dead-letter handling.",
    requirementsToExplore: [
      "Channels, transactional versus bulk traffic, schedules, latency, and delivery status",
      "Preferences, consent, quiet hours, templates, and localization boundaries",
      "Audience size, tenant fairness, priority, per-recipient and provider quotas",
      "Provider acceptance, callback, retry, failover, cancellation, and duplicate semantics",
      "Retention, privacy, audit, and degraded behavior during provider outage",
    ],
    expectedTopics: [
      "Durable intent and transactional outbox before recipient fan-out",
      "Checkpointed audience expansion and deterministic delivery IDs",
      "Priority and fair channel queues with scheduled ready times",
      "Preference evaluation, rate limiting, provider adapters, and callback inbox",
      "Jittered retry, circuit breaking, dead-letter queue, redrive, and status storage",
    ],
    commonFailureModes: [
      "Acknowledging an intent before it is durable",
      "Letting bulk traffic starve transactional notifications",
      "Retrying an ambiguous provider send through a second provider without duplicate analysis",
      "Applying stale preferences to delayed scheduled work",
    ],
    followUpQuestions: [
      "How do ten million recipients expand without one oversized transaction?",
      "Where and when are user preferences checked?",
      "How does the system respond to provider throttling and callback duplication?",
      "How is dead-letter work safely redriven after a code fix?",
    ],
    reference: {
      scope: [
        "Accept transactional and scheduled notification intents across email, SMS, push, and in-app channels.",
        "Apply policy, preference, priority, fairness, rate, retry, and provider status while exposing delivery state.",
        "Treat campaign authoring and content generation as out of scope; accept a versioned template and audience reference.",
      ],
      apis: [
        "`POST /notifications` with idempotency key, template version, audience, channels, priority, and schedule returns intent ID.",
        "`POST /notifications/{id}/cancel` stops not-yet-dispatched deliveries and records the cutoff semantics.",
        "`GET /notifications/{id}` returns aggregate status and paged recipient exceptions.",
        "Preference APIs update versioned channel consent, quiet hours, and mandatory-message policy; provider callbacks are signed and deduplicated.",
      ],
      dataModel: [
        "NotificationIntent `{ id, tenantId, templateVersion, audienceRef, priority, scheduledAt, state }` with scoped idempotency key.",
        "Delivery `{ intentId, recipientId, channel, state, attempt, nextAttemptAt, providerId }`, unique on deterministic delivery key.",
        "Preference `{ userId, channel, category, enabled, quietHours, version }` and immutable ConsentAudit where required.",
        "TemplateVersion, ProviderAttempt, CallbackInbox, OutboxEvent, and DeadLetter records preserve retry and audit context.",
      ],
      architecture: [
        "API persists validated intent and outbox; scheduler releases intents when ready.",
        "A checkpointed planner expands audience pages, evaluates coarse eligibility, and emits deterministic recipient-channel deliveries.",
        "Fair priority queues feed channel workers that recheck current policy, acquire hierarchical rate tokens, render, and call provider adapters.",
        "Callback processors deduplicate provider events and advance monotonic delivery state; retry scheduler and DLQ handle failure classes.",
        "Provider isolation and circuit breakers let healthy channels continue while low-priority work is delayed or shed explicitly.",
      ],
      invariants: [
        "An acknowledged intent is durably recoverable and never silently disappears.",
        "One deterministic recipient-channel delivery exists per intent unless the product explicitly models repeat sends.",
        "Consent and mandatory-message policy are enforced at the documented freshness point.",
        "Delivery state advances monotonically and duplicate callbacks cannot regress it.",
        "Provider, tenant, campaign, recipient, and channel quotas are enforced before external dispatch.",
      ],
      deepDives: [
        {
          title: "Fan-out, priority, and fairness",
          summary: "Audience expansion is incremental and isolated from channel dispatch capacity.",
          points: [
            "Checkpoint expansion pages and use deterministic keys so planner replay is harmless.",
            "Reserve transactional capacity while applying weighted tenant fairness to prevent starvation.",
            "Schedule by ready time and oldest age; depth alone is not a lateness metric.",
          ],
        },
        {
          title: "Provider failures and duplicates",
          summary: "Normalize provider outcomes and treat timeouts as ambiguous until status is resolved.",
          points: [
            "Retry only classified transient errors with capped jitter and provider rate hints.",
            "Persist stable provider request IDs and deduplicate signed callbacks.",
            "Fail over only when duplicate risk and sender identity remain acceptable; otherwise hold for reconciliation.",
          ],
        },
      ],
      scaling: [
        "Shard intent and delivery data by tenant and intent; expand huge audiences in bounded pages.",
        "Use separate channel and priority lanes, fair scheduling, and hierarchical rate limiters.",
        "Batch provider calls where semantics permit and autoscale from ready-item age and downstream headroom.",
        "Isolate exceptional campaigns, tenants, and providers so they cannot monopolize shared partitions.",
      ],
      observability: [
        "Intent acceptance-to-ready, ready-to-dispatch, provider-accept, and confirmed-delivery latency",
        "Oldest ready age and throughput by priority, tenant, channel, and provider",
        "Preference and policy suppression counts with freshness version",
        "Provider success, throttle, timeout, bounce, callback lag, retry, and circuit state",
        "Duplicate-send indicators, deterministic-key conflicts, DLQ age, and redrive outcomes",
      ],
    },
  },
  {
    id: "classic-file-sync",
    title: "File Storage and Synchronization",
    category: "classic",
    difficulty: "hard",
    durationMinutes: 45,
    prompt:
      "Design a file storage and synchronization service for large resumable uploads, multi-device offline edits, version history, conflict handling, deduplication, sharing, and CDN-backed downloads.",
    requirementsToExplore: [
      "File and account scale, maximum object size, upload reliability, and supported offline period",
      "Folder namespace, moves, deletes, restores, version history, and sharing permissions",
      "Multipart and delta transfer, chunking, dedupe scope, integrity, and scanning",
      "Sync cursor, conflict policy, tombstone retention, and cross-device convergence",
      "Regional metadata ownership, object durability, CDN authorization, and disaster recovery",
    ],
    expectedTopics: [
      "Direct multipart upload, checksummed parts, immutable manifest, and atomic commit",
      "Content-addressed chunks, tenant-scoped dedupe, reference safety, and delayed garbage collection",
      "Strong metadata store with stable node IDs, base-version compare-and-swap, and change journal",
      "Delta sync, cursors, snapshots, tombstones, explicit conflict versions, and restore",
      "Object storage, CDN, signed URLs, access checks, scanning, and retention",
    ],
    commonFailureModes: [
      "Making uploaded bytes visible before every referenced chunk is durable",
      "Trusting a client hash or leaking cross-tenant content existence through dedupe",
      "Using last-writer-wins without acknowledging lost offline edits",
      "Deleting chunks immediately after a stale reference-count decrement",
    ],
    followUpQuestions: [
      "What operation makes a multipart upload visible to other devices?",
      "How do two offline edits to the same binary file converge?",
      "What happens when a sync cursor is older than retained change history?",
      "How does deletion propagate to a device offline for several months?",
    ],
    reference: {
      scope: [
        "Support folders and files, resumable upload and download, offline multi-device sync, versioning, conflicts, deletes, restore, and sharing ACLs.",
        "Provide content integrity and optional deduplication without exposing another tenant's content.",
        "Exclude simultaneous collaborative document editing; treat each committed file version as an opaque byte sequence.",
      ],
      apis: [
        "`POST /uploads { nodeId?, size, baseVersion, chunking } -> { sessionId, partUrls, expiresAt }`.",
        "`PUT` signed part URLs are retryable by part number; `POST /uploads/{id}/commit { manifest, fileHash }` atomically creates a version.",
        "`GET /sync?cursor&limit -> { changes, nextCursor, highWatermark }` and a snapshot endpoint recover expired cursors.",
        "Metadata commands `move`, `rename`, `delete`, and `restore` include expected node version; downloads request a short-lived authorized URL.",
      ],
      dataModel: [
        "NamespaceNode `{ id, accountId, parentId, name, currentVersion, aclVersion, tombstonedAt }`, unique on live `(parentId, name)`.",
        "FileVersion `{ nodeId, version, baseVersion, manifestId, size, hash, createdAt, conflictOf }` is immutable.",
        "Chunk `{ tenantScope, hash, size, objectKey, verifiedAt }` and ordered ChunkRef manifest reconstruct bytes.",
        "UploadSession and Part records track authorization, ranges, checksums, expiry, scan state, and commit status.",
        "ChangeLog `{ accountId, cursor, nodeId, operation, version }`, Tombstone, DeviceCursor, and optional reference-mark epochs support sync and lifecycle.",
      ],
      architecture: [
        "A strongly consistent metadata service owns namespace, versions, ACLs, and the append-only account change journal.",
        "Clients transfer parts directly to object storage through scoped URLs; an upload coordinator verifies checksums and durable chunk existence.",
        "Commit transaction compare-and-swaps the base node version, writes immutable version and manifest, updates the node, and appends one change record.",
        "Sync clients page the journal, fetch missing manifests or chunks, and upload local changes with expected versions.",
        "CDN downloads use short-lived capabilities after metadata authorization; background scanners, scrubbers, and delayed mark-and-sweep manage content lifecycle.",
      ],
      invariants: [
        "Every committed version references only verified durable chunks in the correct ordered manifest.",
        "Namespace uniqueness and ACL checks hold in the same transaction as metadata mutation.",
        "A stale base version never silently overwrites a newer version; it produces an explicit deterministic conflict result.",
        "Change-log cursors advance with committed metadata and can be replayed idempotently.",
        "Tombstones outlive the supported offline window, and garbage collection never deletes a chunk reachable from a live or retained version.",
      ],
      deepDives: [
        {
          title: "Chunk, verify, and commit",
          summary: "Byte transfer is asynchronous; one metadata transaction is the visibility boundary.",
          points: [
            "Choose chunk size from resume granularity, object requests, manifest size, and delta reuse.",
            "Verify hashes on trusted infrastructure and scope dedupe to a tenant or encryption domain.",
            "Create the manifest only after all chunks are durable; collect abandoned session bytes after expiry and a safety window.",
          ],
        },
        {
          title: "Delta sync and conflict",
          summary: "A journal distributes committed metadata changes while optimistic versions expose concurrency.",
          points: [
            "Devices advance cursors only after applying contiguous pages and use a snapshot when history is compacted.",
            "Preserve concurrent opaque edits as sibling versions or conflict copies rather than silent last-writer overwrite.",
            "Retain tombstones and version history long enough for offline devices and restore policy.",
          ],
        },
      ],
      scaling: [
        "Shard metadata and change logs by account or namespace while routing all large byte transfer directly to object storage.",
        "Use chunk and manifest batching, CDN caching for hot downloads, and background dedupe or garbage collection with strict rate limits.",
        "Keep one home-region metadata writer per account for simple conflict order; replicate object bytes and metadata independently.",
        "Cap folder listing and sync page sizes, and isolate accounts with extreme file count or churn.",
      ],
      observability: [
        "Upload start-to-commit latency, part retry rate, expired sessions, and orphan bytes by age",
        "Hash mismatch, missing-chunk, corrupt-object scrub, and manifest-integrity alarms",
        "Change-log lag, expired cursors, snapshot frequency, and device sync completion latency",
        "Version conflict, tombstone resurrection attempt, and ACL-denied access rates",
        "Reference-mark violations, garbage-collection candidates and deletes, CDN hit rate, and download p99",
      ],
    },
  },
  {
    id: "classic-nearby-service",
    title: "Nearby-Location Service",
    category: "classic",
    difficulty: "hard",
    durationMinutes: 45,
    prompt:
      "Design a service that ingests moving-entity locations and returns fresh, eligible entities within a radius, ordered by distance. Address spatial indexing, hot geographic regions, privacy, retention, and regional failure.",
    requirementsToExplore: [
      "Entity and update volume, peak queries, radius distribution, result limit, and location freshness",
      "Eligibility filters, exact distance ordering, pagination, and acceptable approximation",
      "Dense-region hotspots, moving-object churn, stale updates, and deletion",
      "Location authorization, precision, retention, privacy, and access audit",
      "Regional routing, cross-border movement, failover, and degraded results",
    ],
    expectedTopics: [
      "Geohash, quadtree, or spatial index candidate generation with neighboring cells",
      "Versioned latest-location store and exact distance or geometry filter",
      "Update coalescing, adaptive cells, subshards, and candidate caps",
      "Separate stable entity metadata from volatile location state",
      "Freshness SLI, expiry, privacy policy, retention, cache, and multi-region placement",
    ],
    commonFailureModes: [
      "Querying only the center geohash and missing boundary neighbors",
      "Trusting cell membership as exact radius inclusion",
      "Letting late location events move an entity backward in state",
      "Caching precise location beyond eligibility, expiry, or deletion",
    ],
    followUpQuestions: [
      "How does the query cover a radius that crosses cell boundaries?",
      "How do you split a downtown cell without changing every other region?",
      "What happens when an entity moves between regions during a partition?",
      "Which data is retained after an entity stops sharing location?",
    ],
    reference: {
      scope: [
        "Authenticated entities publish versioned locations and availability; clients query bounded nearby results with filters.",
        "Results obey freshness, eligibility, authorization, radius, and privacy constraints and may state an approximation contract.",
        "Route optimization, dispatch matching, and map rendering are out of scope unless requested.",
      ],
      apis: [
        "`PUT /entities/{id}/location { lat, lon, eventTime, version, ttl }` is idempotent and rejects version regression.",
        "`DELETE /entities/{id}/location { version }` removes visibility and starts policy-defined deletion propagation.",
        "`GET /nearby?lat&lon&radius&filters&cursor&limit -> { entities, nextCursor, freshness }`.",
        "Eligibility or availability updates are versioned separately from high-churn coordinates.",
      ],
      dataModel: [
        "Entity `{ id, type, eligibility, attributes, policyVersion }` is stable metadata and authorization source.",
        "LatestLocation `{ entityId, lat, lon, cellId, version, eventTime, receivedAt, expiresAt }` rejects late versions.",
        "SpatialPosting `{ cellId, shard, entityId, locationVersion }` supports candidate lookup and idempotent cell movement.",
        "LocationUpdate event log and PrivacyPolicy or RetentionRecord support recovery, deletion, and audit.",
      ],
      architecture: [
        "Regional ingestion authenticates, validates, coalesces, and publishes versioned location updates.",
        "Consumers update the latest-location store and spatial postings, tolerating a brief old/new-cell overlap.",
        "Query planner covers the radius with cells, fans out to their shards, deduplicates candidate IDs, hydrates current state, filters exact distance and eligibility, then ranks.",
        "Stable entity metadata and policy caches have independent invalidation from volatile location indexes.",
        "Regional ownership follows data-residency and latency policy; failover advertises freshness and may reduce radius or result count.",
      ],
      invariants: [
        "No result may be unauthorized, ineligible, expired, or outside the exact requested radius unless approximation is explicitly labeled.",
        "Location version never regresses even when stream events arrive out of order.",
        "Approximate spatial cells only generate candidates; exact geometry decides inclusion and order.",
        "Deletion and privacy changes propagate to indexes, caches, logs, and replicas within a stated SLA.",
        "Query radius, candidate count, and result count are bounded to protect shared capacity.",
      ],
      deepDives: [
        {
          title: "Geohash or quadtree search",
          summary: "Cell precision trades candidate false positives against query fan-out and update churn.",
          points: [
            "Cover all cells intersecting the radius, including neighbors, and deduplicate overlap.",
            "Hydrate the newest coordinates and compute exact spherical distance before ordering.",
            "Use `(distance, entityId)` plus query snapshot or freshness state for stable bounded pagination.",
          ],
        },
        {
          title: "Moving entities and hot regions",
          summary: "Versioned updates and adaptive partitions keep dense, fast-moving areas from dominating the index.",
          points: [
            "Coalesce updates by movement and time while preserving the promised freshness.",
            "Split dense cells recursively or add subshards and query all children behind one logical cell.",
            "Resolve dual postings during movement through latest-version hydration rather than a distributed transaction across cells.",
          ],
        },
      ],
      scaling: [
        "Shard and adapt cells by measured entity density and QPS; isolate dense-event traffic from ordinary regions.",
        "Coalesce noisy updates, batch stream writes, and cap query radius and candidate amplification.",
        "Cache stable metadata, not precise locations beyond their freshness or privacy lifetime.",
        "Geo-route requests to the owning region and define handoff for entities crossing ownership boundaries.",
      ],
      observability: [
        "Location ingest-to-query freshness distribution and stale-result count",
        "Candidates scanned per returned entity, cells per query, and exact-filter rejection rate",
        "Update version regressions, old/new-cell overlap age, and index/store reconciliation mismatch",
        "Hot cell and subshard QPS, storage, throttling, and query p99 by radius",
        "Unauthorized, expired, deleted, or out-of-radius result invariant alarms",
      ],
    },
  },
  {
    id: "classic-crawler-search",
    title: "Web Crawler and Search Index",
    category: "classic",
    difficulty: "hard",
    durationMinutes: 45,
    prompt:
      "Design a web crawler and keyword search index that discovers and recrawls public pages politely, removes URL and content duplicates, builds an incremental inverted index, and serves fresh ranked results.",
    requirementsToExplore: [
      "Corpus size, seed and discovery sources, coverage, recrawl freshness, and allowed content",
      "Robots policy, host politeness, retries, conditional requests, and crawl-trap limits",
      "URL canonicalization, redirect policy, exact and near content duplicates, and deletions",
      "Index fields, ranking needs, publish freshness, shard count, query latency, and pagination",
      "Regional crawling, storage retention, takedown SLA, and partial search results",
    ],
    expectedTopics: [
      "Host-partitioned URL frontier with priority, leases, robots cache, and next-allowed time",
      "Canonical URL store, probabilistic prefilter, definitive dedupe, and content fingerprints",
      "Fetch, raw object storage, parse, document version, and link extraction pipeline",
      "Immutable inverted-index segments, tombstones, merge, and atomic manifest publication",
      "Query broker, shard replicas, postings retrieval, ranking, cache, and freshness monitoring",
    ],
    commonFailureModes: [
      "Distributing URLs randomly so several schedulers violate one host's limit",
      "Using a Bloom filter as the only permanent seen-URL truth",
      "Overwriting live index files during incremental update",
      "Returning silent partial results when one query shard times out",
    ],
    followUpQuestions: [
      "How do you enforce per-host delay with thousands of fetchers?",
      "How do you stop an infinite calendar or session-parameter crawl trap?",
      "How does a document deletion become visible before a full index rebuild?",
      "What consistency does one search query see while segments are publishing?",
    ],
    reference: {
      scope: [
        "Crawl a defined public corpus from seeds and discovered links while respecting robots policy and origin limits.",
        "Canonicalize and deduplicate pages, parse searchable fields, and incrementally publish a keyword index with ranking and takedown.",
        "Exclude full semantic retrieval and a web-scale ML ranking pipeline unless explicitly requested.",
      ],
      apis: [
        "`POST /crawl/seeds` and `POST /crawl/urls/{id}/recrawl` enqueue durable prioritized work with authorization.",
        "Internal events `URLDiscovered`, `FetchCompleted`, `DocumentParsed`, `DocumentDeleted`, and `SegmentPublished` carry stable versions.",
        "`GET /search?q&filters&cursor&limit -> { results, nextCursor, indexVersion, partial }`.",
        "Takedown API records policy reason and deadline and emits a priority document tombstone.",
      ],
      dataModel: [
        "URLRecord `{ id, canonicalUrl, host, status, priority, nextFetchAt, etag, contentHash, version }` with unique canonical URL.",
        "HostPolicy `{ host, robotsVersion, crawlDelay, maxConcurrency, nextAllowedAt, backoff }` owned by one scheduler partition.",
        "FrontierItem includes priority, eligibility time, lease owner and expiry, attempts, and discovery provenance.",
        "Document `{ docId, sourceUrlId, sourceVersion, fields, contentRef, deletedAt }` and immutable index segments with term dictionary and postings.",
        "ShardManifest `{ version, shard, segmentRefs, publishedAt }`; a GlobalManifest or broker-issued manifest vector pins one durable version for every queried shard.",
      ],
      architecture: [
        "Discovery feeds a canonicalizer and URL dedupe store before durable host-aware frontier insertion.",
        "Schedulers own host budgets and lease eligible work to sandboxed fetchers that enforce size, type, redirect, and time limits.",
        "Raw responses go to object storage; parsers extract canonical documents and links, then content fingerprints suppress duplicates.",
        "Segment builders consume versioned documents into immutable postings; mergers compact segments and publishers atomically swap manifests.",
        "Search brokers parse requests, select replicas, fan out to index shards, merge ranked top-K, hydrate snippets, and label partial responses.",
      ],
      invariants: [
        "Before every fetch, enforce the most recently fetched unexpired robots rules plus per-host limits; when refresh fails after expiry, apply the documented conservative fallback.",
        "A canonical URL and document version are ingested idempotently despite lease recovery and event replay.",
        "A query pins a coherent global manifest or per-shard manifest vector and references only durable immutable segment files.",
        "Newer document versions and tombstones suppress obsolete postings within the freshness or takedown SLA.",
        "Fetch bytes, redirects, duration, depth, host expansion, and query work are bounded.",
      ],
      deepDives: [
        {
          title: "Frontier and duplicate control",
          summary: "Host scheduling protects external origins while layered dedupe protects internal capacity.",
          points: [
            "Partition by host to serialize robots, delay, concurrency, and backoff state.",
            "On a Bloom definite-negative, attempt an atomic insert in canonical storage; on a positive, consult that definitive store before discarding the URL.",
            "Detect traps through path and parameter patterns, depth, host budgets, and unique-content yield.",
          ],
        },
        {
          title: "Incremental inverted index",
          summary: "Immutable small segments provide freshness; atomic manifests and background merges provide coherent efficient reads.",
          points: [
            "Build compressed postings with only the term, field, frequency, and position data ranking requires.",
            "Publish durable shard manifests, then pin a global manifest or per-shard manifest vector for the life of a query.",
            "Filter superseded documents and tombstones until merges remove obsolete postings safely.",
          ],
        },
      ],
      scaling: [
        "Partition crawl scheduling by host, fetch capacity by network domain, and indexing independently by document shard.",
        "Prioritize recrawl from change rate and product importance while guaranteeing bounded new-host coverage.",
        "Compress postings, tier raw content, reserve merge capacity, and cap query shard fan-out and top-K.",
        "Replicate serving shards and return explicit partial status or fail according to search completeness requirements.",
      ],
      observability: [
        "Robots or per-host concurrency violations, fetch status, latency, bytes, and throttle rate",
        "Frontier size and oldest age by priority, host, and new-versus-recrawl class",
        "Canonical and content duplicate ratio, crawl-trap quarantine, parser failure, and unique-content yield",
        "Document-to-searchable freshness, segment count, merge debt, tombstone age, and publish failure",
        "Search p50/p99, shard timeout, partial-result rate, cache hit, zero-result rate, and freshness by corpus slice",
      ],
    },
  },
  {
    id: "classic-observability-platform",
    title: "Metrics, Logging, and Observability Platform",
    category: "classic",
    difficulty: "hard",
    durationMinutes: 45,
    prompt:
      "Design a multi-tenant platform that ingests metrics and structured logs, supports range and aggregate queries, dashboards and alerts, controls cardinality and query cost, and applies tiered retention without failing during incidents.",
    requirementsToExplore: [
      "Tenants, ingestion volume, metric series, log bytes, burst factor, and acknowledgement durability",
      "Out-of-order and duplicate data, indexing, query shapes, latency, and partial-result policy",
      "Cardinality limits, tenant fairness, dashboards, alerts, and notification dependencies",
      "Raw retention, aggregation, downsampling, cold storage, deletion, and cost attribution",
      "Collector outage, stream lag, query overload, regional failure, and platform self-monitoring",
    ],
    expectedTopics: [
      "Agents, regional collectors, local spooling, durable stream, and partition choice",
      "Time-series identity and label index, log attribute index, immutable time segments, and object tier",
      "High-cardinality quotas, aggregation, downsampling, retention, and tenant isolation",
      "Query frontend, shard fan-out, cache, cost limits, dashboards, and alert evaluators",
      "Backpressure, priority shedding, deadman monitoring, SLOs, and disaster recovery",
    ],
    commonFailureModes: [
      "Using unbounded request IDs or user IDs as metric labels",
      "Acknowledging telemetry before any durable buffer owns it",
      "Blocking production applications indefinitely when telemetry is overloaded",
      "Monitoring the observability platform only with itself",
    ],
    followUpQuestions: [
      "What happens when one tenant creates ten million new series in a minute?",
      "Which log attributes are indexed and what does an arbitrary-field query cost?",
      "How does an alert evaluator resume after a crash without double-notifying?",
      "How are retention and deletion enforced across raw, rollup, index, cache, and cold tiers?",
    ],
    reference: {
      scope: [
        "Ingest batched metrics and structured logs from authenticated tenants with explicit accepted, rejected, and dropped semantics.",
        "Serve metric range and aggregate queries, log search, dashboards, and alert rules under cardinality and cost limits.",
        "Apply downsampling, tiered retention, deletion, and cost attribution; traces are optional and may be out of scope.",
      ],
      apis: [
        "Batched OTLP-like `POST /v1/metrics` and `/v1/logs` return accepted, rejected, and retryable counts after the durable boundary.",
        "`GET /v1/query_range?expr&start&end&step` and `POST /v1/logs/search { filters, timeRange, cursor, limit }` expose partial status.",
        "Alert-rule CRUD stores expression, evaluation interval, hold duration, labels, and notification route.",
        "Tenant APIs define retention, label allowlists, active-series budget, ingest quota, and query-cost budget.",
      ],
      dataModel: [
        "Series identity `{ tenantId, metricName, sortedLabels }` maps to series ID; samples are compressed timestamp/value blocks by time partition.",
        "LogEvent `{ tenantId, timestamp, attributes, bodyRef }` is stored in immutable segments with selected attribute indexes.",
        "Durable stream record carries tenant, schema version, producer sequence, and batch checksum for validation and dedupe policy.",
        "RollupBucket `{ seriesId, window, count, min, max, sum, completeness }` and RetentionPolicy govern derived tiers.",
        "AlertRule, EvaluationCheckpoint, AlertInstance state, and NotificationOutbox preserve evaluator retry and delivery state.",
      ],
      architecture: [
        "Agents batch and compress locally; regional collectors authenticate, validate, quota, and spool before durable-stream acknowledgement.",
        "Stream partitions feed metric and log consumers that normalize, aggregate, index, and write immutable time-partitioned storage.",
        "Recent indexed data stays on fast storage; compacted raw segments and rollups move to object-backed tiers by retention policy.",
        "Query frontend authenticates, plans time and label pruning, enforces cost, fans out to shards, merges, caches, and labels partial results.",
        "Checkpointed alert evaluators atomically commit the evaluation watermark, alert-instance transition, and deterministic notification-outbox row; an independent relay publishes the outbox at least once.",
      ],
      invariants: [
        "Tenant data, quotas, encryption, query results, and cost accounting remain isolated.",
        "An acknowledged batch survives collector loss according to the documented durability contract.",
        "Duplicate and out-of-order acceptance windows are explicit and produce deterministic query behavior.",
        "Raw and rollup queries state resolution and completeness; missing shards are never silently treated as zero.",
        "Retention and deletion apply to raw, index, rollup, cache, replica, and cold tiers within their SLA.",
      ],
      deepDives: [
        {
          title: "Cardinality, partitioning, and retention",
          summary: "Series identity drives memory and index cost, so quotas must act before expensive storage work.",
          points: [
            "Partition by tenant plus stable series hash and isolate heavy tenants from shared consumers.",
            "Reject or transform unbounded label values, expose top contributors, and aggregate safe dimensions at collection.",
            "Keep recent raw resolution and long-lived rollups according to known queries and deletion policy.",
          ],
        },
        {
          title: "Query and alert execution",
          summary: "Time and label pruning bound work; checkpoints make repeated evaluation deterministic.",
          points: [
            "Estimate query cost before fan-out and cap time range, series count, concurrency, and returned bytes.",
            "Return explicit partial metadata when a shard misses deadline instead of silently undercounting.",
            "Atomically commit the evaluation watermark, alert state, and deterministic notification-outbox row; relay at least once and deduplicate at the notification boundary.",
          ],
        },
      ],
      scaling: [
        "Batch and compress ingestion, shard by tenant and series hash, and scale consumers from oldest-stream age.",
        "Isolate high-volume tenants, enforce active-series budgets, and aggregate before storage where semantics permit.",
        "Downsample and tier cold data, reserve compaction bandwidth, and apply query concurrency and cost guardrails.",
        "Deploy collectors regionally but keep cross-region query and disaster paths aware of lag and partial data.",
      ],
      observability: [
        "Externally hosted deadman signal and independent health checks for the platform itself",
        "Accepted, rejected, delayed, and dropped samples or log bytes by tenant and reason",
        "Stream and spool oldest age, consumer lag, write latency, and compaction backlog",
        "Active-series cardinality, label-value growth, index memory, storage growth, and cost by tenant",
        "Query p99, scanned-to-returned ratio, partial-result rate, alert-evaluation lateness, and notification delivery",
      ],
    },
  },
];
