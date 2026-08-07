import type { TopicPrimerEntry } from "../types";

/**
 * From-zero explanations for the classic distributed-systems modules. Each one
 * assumes only the tier-0 vocabulary (replication, partitioning, idempotency,
 * caching) and builds the module's specific ideas from there.
 */
export const classicPrimers: Record<string, TopicPrimerEntry> = {
  "classic-feed-fanout": {
    primer: {
      plainSummary:
        "When you post something, everyone who follows you should see it. There are only two moments at which that work can happen: at write time, when you post, or at read time, when a follower opens the app. This module is about that choice, why neither answer works alone, and why the accounts with the most followers break whichever one you pick.",
      analogy:
        "A newsletter. Fan-out on write is printing a copy for every subscriber the moment you finish writing and putting one in each mailbox - expensive to send, instant to read. Fan-out on read is pinning a single copy to a noticeboard and letting each subscriber come and check every noticeboard they follow - free to publish, slow to read. Now imagine a writer with 50 million subscribers, and you can feel the problem: printing 50 million copies takes hours, but making every reader check the noticeboard means the most popular writer is also the most expensive to read.",
      sections: [
        {
          heading: "The two strategies, and what each costs",
          body: [
            "Fan-out on write, also called push, means that when a user posts, the system immediately writes a reference to that post into a precomputed list for each follower. That list is often called an inbox or a materialized timeline. Reading a feed is then trivially cheap - fetch one list, in order, already built. The cost is on the write side: one post by a user with 10,000 followers becomes 10,000 writes. This is write amplification, and it is worth saying the number out loud because it is what makes the strategy fail at the top end.",
            "Fan-out on read, also called pull, means the system stores each post exactly once and builds the feed when it is requested, by fetching the recent posts of everyone you follow and merging them. Writes are cheap - one post, one write. Reads are expensive and get more expensive the more accounts you follow, because a feed request becomes hundreds of queries that must be merged and sorted while the user waits.",
            "The right way to choose is to look at the ratio between reads and writes. Social feeds are read-dominated - people scroll far more than they post - and the general principle is to move work to the less frequent side. That argues strongly for fan-out on write, and it is why most large feed systems are push-based by default. The reason the story does not end there is that the ratio is an average, and the accounts that break the system are precisely the ones that are not average.",
          ],
        },
        {
          heading: "The celebrity problem",
          body: [
            "Consider an account with 50 million followers posting under a push model. That single post triggers 50 million inbox writes. Even at 100,000 writes per second of dedicated capacity, the fan-out takes over eight minutes, during which followers see the post at wildly different times. Worse, these bursts are unpredictable and correlated - a major event means many large accounts posting at once - so the fan-out queue backs up and ordinary users' posts get stuck behind celebrity fan-out, making a problem caused by a handful of accounts into a delay felt by everyone.",
            "The standard resolution is a hybrid: push for ordinary accounts, pull for the small number of very large ones. When a follower requests their feed, the system reads their materialized inbox - which contains posts from everyone they follow except the celebrities - and separately fetches recent posts directly from the handful of celebrity accounts they follow, then merges the two sets at read time. Because a user follows at most a few dozen such accounts, the read-time merge stays small and bounded.",
            "This works because it applies each strategy where its cost is lowest. Ordinary accounts have few followers, so pushing is cheap. Celebrity accounts have enormous follower counts but there are very few of them, and their posts are read so often that they are almost certainly already in cache - so pulling costs one cached read rather than a database query. The threshold between the two is a tuning parameter, typically somewhere in the tens of thousands of followers, and it should be chosen from measured fan-out cost rather than picked as a round number.",
          ],
        },
        {
          heading: "Making the pipeline correct, not just fast",
          body: [
            "Fan-out is an asynchronous pipeline, which means every failure mode of asynchronous pipelines applies. The post itself must be durably stored first, in what is unambiguously the source of truth. Only then is a fan-out job enqueued. Getting this order wrong - enqueueing before committing - produces fan-out jobs referencing posts that do not exist, and the failure is intermittent and horrible to debug.",
            "Because the queue delivers at least once, fan-out workers will sometimes process the same post twice. Inbox insertion must therefore be idempotent, which is easy here: make the inbox entry's key the pair of follower and post ID, so a repeat insert overwrites rather than duplicating. Without this, users see the same post several times in their feed, which is one of the most visible possible bugs.",
            "Deletion is the case people forget. If a post is deleted, or an account is made private, or one user blocks another, there are now potentially millions of inbox rows referencing content that must not be shown. Chasing them all down is slow and unreliable. The robust design stores only post IDs in the inbox and checks visibility at read time during hydration - the step that turns IDs into full post content. Hydration filters out anything deleted or no longer visible. This costs a lookup per read, which is cheap and cached, and it means deletion is instant and correct everywhere without touching a single inbox.",
            "Finally, decide what the inbox is bounded to. Nobody scrolls back a year, so cap each materialized inbox at a few hundred entries and trim as new ones arrive. This keeps storage proportional to active users rather than to all history, and it means a user returning after six months gets their feed rebuilt from source rather than reading a stale enormous list.",
          ],
        },
      ],
      workedExample: {
        title: "Sizing fan-out for a social product",
        setup:
          "A social product has 100 million daily active users. The average user follows 200 accounts and posts twice per day. Follower counts are heavily skewed: most accounts have a few hundred followers, a few thousand accounts have millions.",
        steps: [
          "Compute the write load under pure push. 100 million users x 2 posts = 200 million posts per day. If the average post reaches 200 followers, that is 40 billion inbox writes per day, or roughly 460,000 writes per second sustained. That is large but achievable with a partitioned store - it is a capacity problem, not an impossibility.",
          "Compute the read load under pure pull. 100 million users checking their feed a few times a day, each requiring a merge across 200 followed accounts, gives tens of billions of queries daily with a fan-out of 200 per feed load, all on the latency-critical path. This is far worse than the write load, which settles the default: push.",
          "Find where push breaks. An account with 5 million followers generates 5 million writes for one post. At a dedicated 100,000 writes per second that is 50 seconds of fan-out for a single post, and the tail of that queue delays everyone else's posts too. So push is correct for the body of the distribution and wrong for the tail.",
          "Set the hybrid threshold. Above roughly 100,000 followers, switch the account to pull. Verify the read cost this creates: a user following 200 accounts might follow perhaps 5 above the threshold, so a feed load is one inbox read plus 5 recent-post lookups, all cacheable. Bounded and cheap.",
          "Make the merge correct. The inbox is ordered by post time; celebrity posts fetched at read time must be merged into that order using the same timestamp source, with a stable tie-breaker such as post ID so that two posts with identical timestamps always sort the same way. Without a stable tie-breaker, the same feed reloaded twice can return items in different orders, which makes pagination skip or repeat entries.",
          "Handle the failure path. If fan-out lags, feeds go stale rather than wrong, which is the correct degradation. Monitor fan-out lag in seconds, not in queue depth, and give celebrity fan-out its own queue so it cannot delay ordinary posts. Alert on the ordinary queue's lag, because that is the one users notice.",
        ],
        takeaway:
          "The design was chosen by computing both costs and comparing them, then noticing that the average hides a tail that breaks the winner. That pattern - pick the strategy that suits the common case, then handle the tail separately rather than compromising the common case - recurs constantly in system design, and articulating it is worth more than knowing the word 'hybrid'.",
      },
    },
    glossary: [
      { term: "Fan-out", definition: "The multiplication of one logical operation into many physical ones - here, one post becoming many timeline entries." },
      { term: "Fan-out on write (push)", definition: "Precomputing each follower's timeline when a post is created. Cheap reads, expensive writes, and unusable for accounts with enormous follower counts." },
      { term: "Fan-out on read (pull)", definition: "Storing a post once and assembling each timeline when requested. Cheap writes, expensive reads that grow with how many accounts a user follows." },
      { term: "Hybrid fan-out", definition: "Push for ordinary accounts, pull for accounts above a follower threshold, merged at read time. The standard answer for large social products." },
      { term: "Materialized inbox (timeline)", definition: "A precomputed per-user list of post references, kept ready so a feed read is a single ordered scan." },
      { term: "Celebrity problem", definition: "The failure of push fan-out for accounts with millions of followers, where one post generates millions of writes and delays everyone else's fan-out behind it." },
      { term: "Write amplification", definition: "How many physical writes one logical write produces. A post to 10,000 followers under push has an amplification factor of 10,000." },
      { term: "Hydration", definition: "Turning stored IDs into full displayable content at read time. The natural place to enforce deletion, privacy, and blocking, since it happens on every read." },
      { term: "Stable tie-breaker", definition: "A deterministic secondary sort key, such as post ID, ensuring items with equal timestamps always order identically - without which pagination can skip or repeat items." },
      { term: "Feed freshness", definition: "How long after a post is created it appears in followers' feeds. Under push this is fan-out lag; it is the metric worth alerting on." },
    ],
  },

  "classic-feed-ranking-cache-pagination": {
    primer: {
      plainSummary:
        "Once you can assemble a feed, three harder questions follow. Which items should be shown, out of the thousands that could be? How do you cache the answer when it is personalised and constantly changing? And how do you paginate a list that is being modified while the user scrolls through it? This module is about those three, and the third is the one that quietly breaks most implementations.",
      analogy:
        "A newspaper editor with far more stories than pages. First they gather everything plausibly relevant - that is candidate generation. Then they order it by importance - ranking. Then they lay out the actual page - hydration and policy filtering. The pagination problem has a physical analogue too: if you are reading a list of names and someone inserts new names above your place while you read, then counting 'items 21 to 40' will show you some names twice and skip others entirely. Every offset-based paginator has exactly this bug.",
      sections: [
        {
          heading: "The pipeline: candidates, ranking, hydration, policy",
          body: [
            "A ranked feed is not one operation but a pipeline of stages, and separating them is what makes the system measurable and debuggable. Candidate generation gathers everything that could plausibly appear - recent posts from followed accounts, plus perhaps recommended content - typically producing hundreds to a few thousand items. It optimises for recall, meaning it would rather include something irrelevant than miss something good, because a later stage can drop items but nothing can recover an item that was never a candidate.",
            "Ranking scores those candidates and orders them. Scoring every possible item would be far too expensive, which is exactly why candidate generation exists: it reduces millions of possibilities to a manageable few thousand so an expensive model only runs on those. This two-stage structure - cheap wide retrieval, then expensive narrow scoring - is one of the most reusable patterns in system design, appearing identically in search and recommendations.",
            "Hydration then fetches the full content for the top items: post text, media URLs, author details, engagement counts. This is a fan-out of lookups and is usually where feed latency actually goes, so it is heavily cached and batched. Policy filtering removes what must not be shown - blocked authors, deleted posts, region-restricted content, items already seen. Applying policy last, after ranking, is deliberate: a filter applied to a small ranked set is cheap, and correctness is enforced at the point closest to display, where nothing can slip past it.",
            "One trap worth naming: if policy filtering removes items after ranking has selected exactly 20, you return fewer than 20. Over-fetch at each stage - rank 50 to display 20 - so filtering has slack to work with.",
          ],
        },
        {
          heading: "Caching something personalised",
          body: [
            "Feeds seem uncacheable because every user's feed is different. The resolution is to notice that a feed is assembled from parts, and the parts are shared even though the assembly is not. So you cache at several layers with different keys and lifetimes rather than trying to cache the finished feed.",
            "The most valuable layer is the object cache used during hydration. A popular post appears in millions of feeds, so caching post content by post ID has an enormous hit rate and is shared across all users. The same is true of author profiles and engagement counts. This layer alone removes most of the database traffic.",
            "Above it, you may cache the ranked ID list per user for a short time - perhaps 30 seconds - so that a user refreshing repeatedly does not re-run ranking each time. This is a small cached value, since it is only IDs, and a short TTL bounds the staleness. Below it, candidate generation results can be cached per author, since 'recent posts by this account' is shared by all their followers.",
            "Invalidation has one rule that matters more than the others: never let the cache be the thing that decides visibility. If a post is deleted or an account blocked, that change must take effect immediately, and chasing it through millions of cached feed lists is unreliable. Enforce visibility during hydration against fresh authoritative state, so caching stale IDs is always safe - the worst outcome is a slightly short feed, never a leaked item. Designing so that stale cache produces degraded output rather than incorrect output is the general principle here.",
          ],
        },
        {
          heading: "Pagination that does not lie",
          body: [
            "The obvious way to paginate is LIMIT 20 OFFSET 40. It is wrong for two independent reasons, and both are worth being able to state.",
            "The correctness problem: offsets are positions in a list that is changing. If three new posts arrive while the user is reading page one, then page two - items 21 to 40 of the new list - starts three items later than where page one ended, so the user never sees three items. If items are deleted instead, they see duplicates. The user has no idea; the feed simply skips things.",
            "The performance problem: a database serving OFFSET 100000 must generate and discard 100,000 rows to return 20. Cost grows linearly with page depth, so deep pagination gets slower and slower for reasons invisible in testing, where nobody scrolls that far.",
            "Keyset pagination, also called cursor or seek pagination, fixes both. Instead of a position, the client sends back a pointer to the last item it saw - typically the sort key of that item, such as a timestamp plus a tie-breaking ID. The next query asks for items after that point, which is an index seek of constant cost regardless of depth, and which is immune to insertions above the cursor because the cursor names an item, not a position.",
            "For a ranked feed the cursor must carry more, because the ranking itself changes between requests. Encode the state needed to continue the same logical feed - a ranking session identifier or seed, the position within it, and a timestamp bound - into an opaque cursor, meaning a string the client cannot interpret and must return unmodified. Making it opaque is a deliberate API decision: it lets you change what the cursor contains without breaking clients, and it stops clients from constructing cursors and depending on internal structure.",
          ],
        },
      ],
      workedExample: {
        title: "Diagnosing a feed that skips posts",
        setup:
          "Users report that scrolling their feed sometimes skips posts they later find on the author's profile. The feed is ranked, cached for 30 seconds per user, and paginated with LIMIT and OFFSET against the ranked result.",
        steps: [
          "Reproduce with the mechanism in mind. Load page one - items 1 to 20 of the ranking computed at time T. Wait for the 30 second cache to expire. Load page two - items 21 to 40 of a ranking recomputed at time T plus 30. If ranking moved five items above position 20 in the interim, five items that were going to be on page two are now on page one, which the user has already passed. They are skipped permanently.",
          "Rule out the wrong suspects. This is not a fan-out bug, since the posts exist and appear on profiles, and it is not a caching bug in the sense of stale data, since the data is fresh - it is fresh data combined with positional pagination, which is exactly the combination that breaks. Naming the interaction rather than blaming one component is the diagnostic step.",
          "Replace the position with a cursor. On page one, return an opaque cursor encoding the ranking session ID, the sort key of the last item returned, and the timestamp at which the ranking was computed.",
          "Pin the ranking for the session. Page two decodes the cursor and continues the same ranking session rather than recomputing, so the ordering the user is paging through does not shift underneath them. Ranking sessions are cheap to store - a list of IDs - and can expire after a few minutes, at which point the client is told to restart from the top.",
          "Handle items that vanish mid-session. If a post in the pinned session is deleted or becomes invisible, hydration drops it. The page returns 19 items instead of 20 - acceptable - rather than the alternative of back-filling from a recomputed ranking, which reintroduces exactly the inconsistency being fixed.",
          "Verify the performance side too. Confirm that deep pages no longer degrade: with a cursor, page 50 costs the same as page 2, whereas with OFFSET it was scanning and discarding a thousand rows. Both the correctness bug and the latency cliff came from the same root cause and are fixed by the same change.",
        ],
        takeaway:
          "The bug was not in any single component - each behaved correctly - but in the interaction between a changing ranking and positional pagination. Interviewers ask about pagination precisely because offset-based paging looks fine and fails invisibly, so recognising it signals experience with systems under real mutation rather than with tutorials.",
      },
    },
    glossary: [
      { term: "Candidate generation", definition: "The cheap wide first stage that gathers everything plausibly relevant, optimising for recall because later stages can drop items but cannot recover missing ones." },
      { term: "Ranking", definition: "Scoring and ordering candidates, typically with a model too expensive to run over the full corpus - which is why candidate generation exists." },
      { term: "Recall vs precision", definition: "Recall is the fraction of good items retrieved; precision is the fraction of retrieved items that are good. Early stages favour recall, later stages favour precision." },
      { term: "Hydration", definition: "Fetching full content for selected IDs. Usually the dominant source of feed latency, and therefore heavily cached and batched." },
      { term: "Policy filtering", definition: "Removing blocked, deleted, restricted, or already-seen items. Applied late, against authoritative state, so stale caches can never leak content." },
      { term: "Over-fetching", definition: "Selecting more items than needed at each stage so later filtering still leaves a full page." },
      { term: "Offset pagination", definition: "Paging by numeric position (LIMIT/OFFSET). Skips and duplicates items when the list mutates, and gets linearly slower with depth." },
      { term: "Keyset (cursor) pagination", definition: "Paging by a pointer to the last item seen rather than a position. Constant cost at any depth and immune to insertions above the cursor." },
      { term: "Opaque cursor", definition: "A token the client returns unmodified and cannot interpret, letting the server change its contents freely and preventing clients from depending on internal structure." },
      { term: "Ranking session", definition: "A pinned ordering stored for the duration of a user's scroll, so pagination continues through one consistent list instead of a list that reshuffles between pages." },
      { term: "Hot-key splitting", definition: "Spreading a single very popular cache key across several physical keys to avoid saturating one cache node." },
    ],
  },

  "classic-realtime-connections": {
    primer: {
      plainSummary:
        "Ordinary web requests are started by the client: it asks, the server answers, the connection closes. That model cannot deliver a chat message the instant it arrives, because the server has no way to speak first. This module is about systems that hold millions of connections open so the server can push, and about the fact that the hard part is not the protocol but the bookkeeping - knowing which of your millions of open sockets belongs to the user you need to reach right now.",
      analogy:
        "The difference between writing letters and holding a phone line open. Letters are efficient because nobody occupies a line while nothing is being said, but you cannot be told something the moment it happens. An open line delivers instantly, at the cost of a switchboard that must track which line each person is on, notice when someone hangs up without saying so, and cope with a hundred thousand people ringing back at once after a fault.",
      sections: [
        {
          heading: "Choosing how to keep the channel open",
          body: [
            "The simplest approach is polling: the client asks every few seconds whether anything is new. It is trivial to build and terrible at scale, because almost every request returns nothing while still costing a full round trip, and latency is bounded below by the polling interval.",
            "Long polling improves on it: the client sends a request and the server holds it open, answering only when there is something to send or a timeout expires, after which the client immediately asks again. Delivery is near-instant and it works through any HTTP infrastructure, which is its real advantage. The cost is a held connection per client anyway, plus a new request after every message.",
            "WebSockets give a genuine bidirectional channel. After an HTTP upgrade handshake, both sides send messages freely over one TCP connection with very little per-message overhead. This is the right default for chat, collaborative editing, or multiplayer, where both directions carry traffic. If traffic flows only from server to client - live scores, notifications, progress updates - Server-Sent Events are simpler, being plain HTTP with automatic reconnection built in, and they avoid a class of proxy problems WebSockets can hit.",
            "Choose by traffic shape rather than by novelty. Bidirectional and chatty means WebSockets; server-push only means SSE; infrequent updates that tolerate delay means polling, which needs no connection state at all and should not be dismissed - not holding state is a real architectural advantage.",
          ],
        },
        {
          heading: "The routing problem, which is the actual problem",
          body: [
            "Connections terminate on gateway servers, and with millions of users you have many gateways. Now a message arrives for user B. It was received by whichever gateway happens to hold user A's connection, and user B is connected to some other gateway. Something must know which. This is the routing problem, and it is what the design is really about.",
            "The usual answer is a session directory: a fast shared store mapping user ID to the set of gateways currently holding that user's connections. A gateway registers on connect and removes the entry on disconnect. To deliver, look up the user's gateways and forward the message to them. The store must be fast, because every message consults it, and it should be treated as a cache rather than as truth - it will sometimes be wrong, and the system must tolerate that.",
            "The alternative avoids the lookup entirely: each gateway subscribes to a message bus for the users it holds, and delivery is a publish to the user's topic. This removes the directory from the delivery path at the cost of maintaining potentially millions of subscriptions, which some brokers handle well and others do not.",
            "Whichever you choose, the directory entry must expire on its own. If a gateway crashes, it will not clean up after itself, and stale entries mean messages routed to a machine that no longer exists. So registrations are leases with a TTL, refreshed by heartbeat while the gateway lives, and expiring automatically when it does not. This is the same lease reasoning that appears in leader election, applied to connection ownership.",
          ],
        },
        {
          heading: "Lifecycle, capacity, and the reconnect storm",
          body: [
            "An idle TCP connection gives no indication that the client has vanished - a phone that loses signal sends no notice. Both sides therefore send periodic heartbeats, and a connection with no heartbeat for some multiple of the interval is presumed dead and cleaned up. The interval is a genuine trade-off: shorter detects failure faster and drains battery and bandwidth on mobile devices; longer is cheaper and leaves stale connections consuming memory and routing messages nowhere.",
            "Capacity is dominated by memory rather than CPU, because an idle connection uses almost no CPU but holds socket buffers and application state, typically tens of kilobytes each. A gateway with 16 gigabytes might hold a few hundred thousand connections, and the arithmetic - total users divided by connections per gateway - gives the fleet size directly. It is a good number to compute aloud, because it makes the design concrete.",
            "The most dangerous moment is a mass reconnect. If a gateway holding 200,000 connections dies, all 200,000 clients reconnect at once, and if they retry immediately they arrive as a synchronised wall of TLS handshakes and directory writes that can knock over the gateways still standing - turning one machine's failure into a total outage. Clients must reconnect with exponential backoff and randomised jitter so arrivals spread over time. This is one of the cases where correct client behaviour is genuinely load-bearing for server availability, and it must be designed rather than assumed.",
            "Deployment needs the same care. Restarting a gateway drops its connections, so a rolling deploy across the fleet produces repeated reconnect waves. Draining - refusing new connections, then asking existing clients to reconnect gradually before shutdown - spreads that cost. And a slow consumer, a client that cannot read as fast as you send, must not be allowed to grow an unbounded server-side buffer: bound it, and on overflow either drop the client or drop messages according to what the product can tolerate. An unbounded buffer converts one slow phone into a server memory leak.",
          ],
        },
      ],
      workedExample: {
        title: "Sizing and routing a chat gateway tier",
        setup:
          "A messaging product has 10 million concurrent connected users at peak. Messages must be delivered within a second. Users connect from phones on unreliable networks and often have two devices online at once.",
        steps: [
          "Size the fleet. At roughly 50 kilobytes of memory per connection, one 32 gigabyte gateway holds about 500,000 connections after leaving room for the runtime. Ten million connections therefore needs around 20 gateways, and you provision perhaps 30 so that losing several does not push the rest past their limit. Note the failure headroom is the point - sizing exactly to peak means the first failure cascades.",
          "Handle multiple devices explicitly. The directory maps user ID to a set of connections, not to one, because a user with a phone and a laptop must receive messages on both. Delivery iterates the set. This also means disconnect removes one entry rather than the user, and getting that wrong silently breaks multi-device delivery for everyone.",
          "Make registrations expire. Each entry is written with a 30 second TTL and refreshed every 10 seconds while the connection is healthy. A gateway that dies leaves entries that vanish within 30 seconds without any cleanup process needing to run - which matters because the cleanup process would itself need to be available exactly when things are failing.",
          "Deliver, and tolerate a wrong directory. The sending gateway looks up the recipient's entries and forwards to the listed gateways. If a gateway no longer holds that connection, it discards the forward. The message is not lost, because it was already durably stored before delivery was attempted - real-time delivery is an optimisation over the durable inbox, never a replacement for it. This is what makes a stale directory safe.",
          "Detect death from both ends. The server sends a heartbeat every 20 seconds and closes a connection silent for 60. Clients do the same, since a client that notices a dead connection first can reconnect without waiting for the server's timeout - which on a mobile network is the common case.",
          "Survive the reconnect storm. When a gateway holding 500,000 connections dies, clients reconnect with exponential backoff starting near one second, plus jitter of up to 30 seconds, spreading arrivals across half a minute rather than concentrating them in one. Verify that the remaining 29 gateways can absorb 500,000 additional connections - roughly 17,000 each - which they can given the headroom provisioned in step one.",
        ],
        takeaway:
          "Almost nothing here was about WebSockets. The design was memory arithmetic, a directory with expiring leases, the decision that delivery is best-effort over a durable store, and client backoff behaviour. That is the shape of real-time systems generally: the protocol is a footnote, and the connection bookkeeping is the system.",
      },
    },
    glossary: [
      { term: "Polling", definition: "The client asks periodically whether anything is new. Simple and stateless; wastes requests and bounds latency by the interval." },
      { term: "Long polling", definition: "The server holds a request open until it has something to send or a timeout expires. Near-instant delivery over ordinary HTTP infrastructure." },
      { term: "WebSocket", definition: "A persistent bidirectional channel established by upgrading an HTTP connection, with low per-message overhead. The default for chatty two-way traffic." },
      { term: "SSE", expansion: "Server-Sent Events", definition: "A one-way server-to-client stream over plain HTTP with automatic reconnection. Simpler than WebSockets when the client does not need to push." },
      { term: "Gateway", definition: "A server that terminates client connections and forwards messages inward. Its capacity is bounded by memory per connection, not CPU." },
      { term: "Session directory", definition: "A fast shared mapping from user to the gateways currently holding their connections. Consulted on every delivery, and treated as a cache that may be wrong." },
      { term: "Heartbeat", definition: "A periodic message confirming a connection is alive, since a dead TCP connection is otherwise indistinguishable from an idle one." },
      { term: "Lease (on a connection registration)", definition: "A directory entry with a TTL refreshed by heartbeat, so a crashed gateway's entries expire without any cleanup process having to run." },
      { term: "Connection draining", definition: "Refusing new connections and gradually migrating existing ones before shutting down, so a deploy does not produce an instant reconnect wave." },
      { term: "Reconnect storm", definition: "Mass simultaneous reconnection after a gateway failure, which can overwhelm surviving gateways unless clients back off with jitter." },
      { term: "Slow consumer", definition: "A client that cannot read as fast as the server sends. Requires a bounded outbound buffer and an explicit drop policy, or it becomes a server-side memory leak." },
    ],
  },

  "classic-message-ordering-delivery-sync": {
    primer: {
      plainSummary:
        "In a chat, messages must appear in the right order, must not be lost, must not appear twice, and must look the same on your phone and your laptop. Each of those is harder than it sounds once messages travel over unreliable networks between devices that go offline. This module is about assigning order that does not depend on device clocks, tracking delivery state honestly, and letting several devices converge on the same view.",
      analogy:
        "A group of people writing letters that cross in the post. If everyone dates their own letter, the ordering is only as good as everyone's watch - and one person's watch being ten minutes fast rewrites the conversation. The reliable fix is a numbered ledger: a single clerk assigns each letter the next number as it arrives, so the numbers are authoritative regardless of anyone's watch. A gap in the numbers is also immediately visible, which is how you know a letter is missing rather than merely late.",
      sections: [
        {
          heading: "Ordering without trusting clocks",
          body: [
            "The instinct is to order messages by the timestamp the sending device attached. This fails, because device clocks are wrong. They drift, they are set by users, they jump when time zones or daylight saving change, and a phone with a clock a minute fast will have its messages sorted a minute into the future - appearing above replies that were genuinely written later. The conversation becomes incoherent, and no amount of sorting fixes data that was wrong when recorded.",
            "The fix is a server-assigned sequence number, allocated per conversation. When a message arrives, the conversation's owner assigns it the next integer in that conversation's sequence. Ordering is now total within the conversation, independent of every device clock, and the numbers are dense, meaning a client that has 1 through 40 and then receives 42 knows with certainty that it is missing 41. That gap detection is worth as much as the ordering itself, because it turns 'a message might be missing' into a definite, actionable fact.",
            "Note that ordering is per conversation, not global. A global sequence would require every message in the product to pass through one allocator, which does not scale and is not needed - nobody can observe the relative order of two messages in two different conversations. Scoping the guarantee to the conversation makes it both cheap and sufficient, because a conversation is exactly the unit within which order is observable. This is a general and reusable move: find the smallest scope in which the guarantee is observable, and provide it only there.",
            "Keep the device's own timestamp too, but treat it as display metadata rather than as ordering. Users like seeing when a message was written, and the two roles - what time it says, and where it sits in the list - are genuinely different and should not be served by the same field.",
          ],
        },
        {
          heading: "Delivery states are separate durable facts",
          body: [
            "A message passes through several states that are commonly conflated: accepted by the server, delivered to a device, and read by a person. Each is a distinct fact with a distinct meaning, each is durable, and each moves only forward. Conflating them produces the familiar bug where a message shows as read because it reached the device while the screen was off.",
            "Accepted means the server has durably stored the message and assigned its sequence number. This is what the sender's checkmark should reflect, and it should not be shown before the write commits, or a sender will believe a message was sent that a crash then loses.",
            "Delivered means it reached a specific device, which acknowledges on receipt. Because a user may have several devices, delivered is per device, and the product must decide what to show - most show delivered when any device has it. Read means a person actually saw it, reported by the client, and it is per device as well.",
            "These states are monotonic: something delivered never becomes undelivered, and something read never becomes unread, even if events arrive out of order. Implement the transition as a maximum rather than an assignment - take the furthest state seen - so a late-arriving delivered event cannot overwrite a read state that already arrived. This is the same reasoning as a watermark, and stating it as 'these transitions are monotonic, so I take the max' is a concise way to demonstrate you have thought about out-of-order events.",
          ],
        },
        {
          heading: "Multiple devices and catching up after offline",
          body: [
            "A user's devices each hold a partial view and must converge. The mechanism is a per-device cursor: each device records the highest sequence number it has for each conversation, and on reconnect asks for everything after it. The server returns the missing range, the device applies it, and the cursor advances. This is a pull-based sync, and it is robust precisely because it does not depend on the device having been online when anything happened.",
            "Client-generated message IDs make this safe. When a user sends a message, the client generates a unique ID before transmitting. If the network fails and the client retries, the server sees the same ID and recognises the duplicate instead of storing a second copy - this is idempotency applied at the message level. It also lets the client match the server's acknowledgement to the pending message it optimistically displayed, replacing it in place rather than showing the message twice.",
            "Catch-up must be bounded. A device offline for a month may have hundreds of thousands of messages waiting, and returning them all in one response is impossible. Page the catch-up, and above some threshold tell the client to resynchronise from a snapshot instead - fetching current state directly rather than replaying every intervening change. Snapshot-plus-tail is the general answer whenever a change log can outgrow the state it describes.",
            "Every device must also learn about deletions and edits, which is why they are represented as events in the same sequence rather than as silent mutations. A deletion is a record with its own sequence number saying 'message 41 is deleted', so a device syncing from cursor 40 receives it naturally. If deletion were a direct mutation, a device that never held message 41 would have no way to learn it should not be shown.",
          ],
        },
      ],
      workedExample: {
        title: "Sending a message from a phone with bad signal",
        setup:
          "A user types a message and presses send as their train enters a tunnel. The request may or may not have reached the server. The user also has a laptop open. Trace what each component does.",
        steps: [
          "The client acts first, locally. It generates a unique message ID, stores the message in a local pending queue, and displays it immediately with a 'sending' indicator. The user sees their message instantly regardless of the network - optimistic local display is what makes chat feel fast, and the pending queue is what makes it honest.",
          "The client retries the send with the same ID until acknowledged. On the server, the first request that arrives assigns the conversation's next sequence number - say 42 - stores the message durably, and returns that number. A retry carrying the same ID finds the existing record and returns 42 again rather than creating message 43. One logical message, one sequence number, however many retries.",
          "The sending client reconciles. On receiving the acknowledgement it matches the ID to its pending entry, replaces it with the confirmed message at sequence 42, and updates the indicator to 'sent'. Because the match is by client-generated ID, this works even if the acknowledgement arrives for a request the client had already given up on.",
          "The recipient's devices are notified in parallel with durable storage - real-time push is an optimisation, and the message is already safe. Each device that receives it acknowledges delivery, and the server records delivered per device. If a device is offline it is not notified, and nothing is lost, because it will catch up by cursor.",
          "The laptop catches up. It has cursor 40 for this conversation and asks for everything after 40, receiving 41 and 42. Its cursor advances to 42. No special handling was needed for having been offline; the same mechanism serves a device that was away for two seconds and one that was away for two days.",
          "Read receipts flow back monotonically. The recipient opens the conversation on their phone and it reports read up to 42. If a delayed delivered event for 42 arrives from the laptop afterwards, the server takes the maximum of the states rather than overwriting, so read is not downgraded to delivered by an out-of-order message.",
        ],
        takeaway:
          "Three separate mechanisms carried the weight: a client-generated ID made retries safe, a server-assigned sequence number made ordering independent of clocks, and a per-device cursor made offline catch-up identical to normal operation. None required the network to behave. That is the standard: build so the unreliable case and the normal case run the same code path, because the unreliable case is the one you cannot test into submission.",
      },
    },
    glossary: [
      { term: "Sequence number", definition: "A dense integer assigned per conversation by the server, giving a total order independent of device clocks and making gaps immediately detectable." },
      { term: "Clock drift", definition: "The tendency of independent clocks to disagree. Why device timestamps cannot be trusted to order events across devices." },
      { term: "Client-generated message ID", definition: "A unique identifier created by the sender before transmission, so retries are recognised as duplicates and acknowledgements can be matched to pending messages." },
      { term: "Delivery state", definition: "The distinct durable facts of accepted, delivered, and read. Separate, per-device where relevant, and never conflated." },
      { term: "Monotonic transition", definition: "State that only moves forward. Implemented by taking the maximum of observed states so out-of-order events cannot regress it." },
      { term: "Watermark", definition: "A marker meaning everything up to this point is accounted for. Read receipts and consumer progress are both watermarks." },
      { term: "Device cursor", definition: "The highest sequence number a specific device holds for a conversation, used to request exactly what it missed on reconnect." },
      { term: "Catch-up sync", definition: "Fetching everything after a cursor on reconnect. Must be paged, and replaced by a snapshot when the backlog grows too large." },
      { term: "Snapshot plus tail", definition: "Sending current state plus subsequent changes instead of replaying a long history. The general answer when a change log outgrows the state it describes." },
      { term: "Tombstone", definition: "A record marking something as deleted, carried through the sequence so devices that never held the original still learn it must not be shown." },
      { term: "Optimistic display", definition: "Showing a message locally before server confirmation, backed by a pending queue and reconciled by client-generated ID." },
    ],
  },

  "classic-presence-group-chat": {
    primer: {
      plainSummary:
        "Presence is the green dot showing who is online. It looks trivial and is one of the most expensive features in a messaging product, because status changes constantly and every change is potentially interesting to many people. Group chat has a related problem: a message to a 5,000-member group must not become 5,000 durable copies. This module is about bounding both kinds of fan-out.",
      analogy:
        "An office whiteboard listing who is in the building. Keeping it perfectly accurate means updating it every time anyone steps out for coffee, and everyone watching it constantly. Nobody does that. What actually works is people writing their name with a note saying 'until 5pm' - entries expire on their own, so someone who leaves without erasing their name disappears anyway. That is a lease, and it is the whole trick of presence: instead of reliably detecting departure, make presence something that must be actively renewed.",
      sections: [
        {
          heading: "Presence as a lease, not an event",
          body: [
            "The naive design treats presence as a pair of events - the client says 'I am online' on connect and 'I am offline' on disconnect. It breaks immediately, because the offline event is exactly the one that will not arrive. A phone that loses signal, a browser tab closed abruptly, a process killed - none send anything. The result is users shown as online for hours, which users notice and complain about.",
            "The fix is to invert it. Presence is a lease with a short expiry, perhaps 45 seconds, that the client renews by heartbeat every 15 or 20. Online means holding an unexpired lease; offline means the lease expired. Now going offline requires no message at all - it is the default state, reached by not renewing. A device that vanishes disappears from presence within one lease period without cooperating in any way.",
            "This gives bounded staleness rather than accuracy, and that is a feature. The system promises that presence is correct to within the lease period, and that promise holds under every failure mode rather than only when clients behave. Saying 'presence is accurate to within 45 seconds and that is a deliberate bound' is a much stronger interview answer than claiming real-time accuracy that cannot survive a dropped connection.",
            "Because a user has several devices, each device holds its own lease and the user is online if any device's lease is live. Last-seen is then the maximum expiry across devices, and it is derived rather than stored separately - a single value written on disconnect would have the same problem as the offline event.",
          ],
        },
        {
          heading: "Bounding who hears about it",
          body: [
            "Presence changes are frequent, and the naive fan-out - notify everyone who might care - is quadratic. If a user has 500 contacts and all are online, one status change is 500 notifications, and with a million users flipping status the notification volume dwarfs actual messages.",
            "Three bounds make this tractable. First, only notify subscribers who are currently watching. Presence matters only to a user with the relevant conversation on screen right now, so subscriptions are created when a conversation opens and dropped when it closes. This collapses the fan-out from 'all contacts' to 'the few people looking at you', which is smaller by orders of magnitude.",
            "Second, pull rather than push for bulk views. When a user opens their contact list, fetch presence for those contacts in one batched query rather than maintaining live subscriptions for every entry. Push is for the conversation you are in; pull is for the list you are scanning.",
            "Third, coalesce and rate-limit. A flaky connection can flip a user between online and offline repeatedly, and forwarding every flap is both expensive and useless to the viewer. Debounce the transition to offline - wait a few seconds before propagating - and batch presence updates into periodic digests rather than sending each one. Since presence is already explicitly approximate, batching costs nothing that was being promised.",
          ],
        },
        {
          heading: "Group messages without per-recipient copies",
          body: [
            "A message to a 5,000-member group must not create 5,000 durable copies. Store it once, in the group's message log, ordered by the group's sequence number. Each member's position is a cursor into that shared log rather than a private inbox. Storage becomes proportional to messages, not to messages multiplied by members, and the difference at scale is decisive.",
            "Delivery is then a fan-out of notifications rather than of data: for each member currently connected, send a pointer to the new message, and the client fetches or already has the content. Members who are offline are not notified at all and catch up by cursor when they return - the same catch-up mechanism used for direct messages, with no special case for groups.",
            "Very large groups still need care, because a broadcast channel with a million members means a million connected clients to notify for one message. At that size the model shifts: notify clients that something changed without pushing per-message data, and let them pull, which converts a huge push fan-out into pulls that spread naturally over time and are cacheable because everyone requests the same content.",
            "Membership is itself versioned state, and this matters for correctness. If someone is removed from a group, they must not receive later messages, and if they join, they must not see arbitrary history. Give membership a version, record the sequence number at which each member joined and left, and enforce it at read time - a member reads the shared log only between their join and leave points. Enforcing at read rather than at write is what makes removal instant and reliable, since there is no per-member state to go and clean up.",
          ],
        },
      ],
      workedExample: {
        title: "Presence and delivery for a 5,000-member group",
        setup:
          "A workplace chat product has groups of up to 5,000 people. Members expect to see who is online in a conversation, and messages to arrive quickly. At peak, 2 million users are connected.",
        steps: [
          "Model presence as leases. Each connected device writes a presence entry with a 45 second TTL and refreshes every 15 seconds. A user is online if any device entry is live. At 2 million connections and one refresh per 15 seconds, that is roughly 133,000 writes per second to the presence store - a real cost, and one worth stating, since it argues for an in-memory store with TTL support rather than a general-purpose database.",
          "Do not show presence for all 5,000 members. The product requirement is really 'see who is active in this conversation', so show presence for members who have been active recently, capped at a display limit, plus a count. This turns an unbounded requirement into a bounded query, and it is a product decision that a design interview expects you to propose rather than wait for.",
          "Subscribe only while viewing. When a user opens the group, subscribe to presence for the small displayed set. Close the conversation and the subscription is dropped. Without this, 5,000 members each watching 5,000 others would be 25 million live subscriptions for one group.",
          "Store the message once. A message to the group is appended to the group log with the next group sequence number - one durable write, not 5,000. Member read positions are cursors into this log.",
          "Fan out notifications, not data. Look up which of the 5,000 members currently have live connections - suppose 400 - and send those 400 gateways a small notification. The other 4,600 receive nothing and will catch up by cursor. Fan-out cost is proportional to online members, not group size.",
          "Enforce membership at read. Someone removed at sequence 10,000 has their leave point recorded, and their reads are bounded by it. No inbox needs cleaning, and a removal takes effect on their next read regardless of what is cached on their device. Similarly, a member who joined at 9,000 sees nothing before that point - so history visibility is a policy expressed as a number rather than as a data migration.",
        ],
        takeaway:
          "Every step replaced an unbounded quantity with a bounded one: leases bounded staleness, view-scoped subscriptions bounded who is notified, a shared log bounded storage, online-only fan-out bounded delivery, and join and leave points bounded visibility. When a feature seems impossibly expensive, the productive question is usually not 'how do we make this faster' but 'which unbounded quantity can be bounded'.",
      },
    },
    glossary: [
      { term: "Presence", definition: "Whether a user is currently online. Expensive because it changes constantly and is potentially interesting to many viewers." },
      { term: "Presence lease", definition: "A short-lived entry renewed by heartbeat. Online means holding an unexpired lease, so going offline requires no message and works under every failure." },
      { term: "Bounded staleness", definition: "A guarantee that data is correct to within a stated interval. Weaker than accuracy but achievable under all failure modes, which makes it the honest promise for presence." },
      { term: "Last-seen", definition: "The most recent time any of a user's devices held a live lease. Derived from lease expiry rather than written on disconnect, which would fail for the same reason offline events do." },
      { term: "Subscription fan-out", definition: "The number of watchers notified per status change. Bounded by subscribing only while a conversation is on screen." },
      { term: "Debouncing", definition: "Waiting before propagating a state change so rapid flapping produces one update instead of many." },
      { term: "Group message log", definition: "A single ordered log per group, read by all members via cursors, so storage is proportional to messages rather than to messages times members." },
      { term: "Membership version", definition: "A versioned record of who is in a group and from which sequence number, enforced at read time so joins and removals need no per-member cleanup." },
      { term: "Join and leave points", definition: "The sequence numbers bounding what history a member may read. Expresses history visibility as a comparison rather than as a data migration." },
      { term: "Broadcast channel", definition: "A group so large that push delivery is infeasible, handled by notifying that something changed and letting clients pull cacheable content." },
    ],
  },

  "classic-idempotent-workflows-outbox-sagas": {
    primer: {
      plainSummary:
        "A business operation such as placing an order touches several systems: charge the card, reserve inventory, create a shipment, send a confirmation. Any step can fail, and there is no database transaction spanning all of them. This module is about running multi-step operations reliably anyway - claiming work exactly once, getting events out of a database without losing or inventing them, and undoing partial progress when a later step fails.",
      analogy:
        "Booking a holiday through separate airline, hotel, and car companies. No single transaction covers all three, so if the car booking fails you cannot simply roll back - the flight is already booked. What you do instead is cancel it, which is not a rollback but a compensating action: a new, visible transaction that undoes the effect of an earlier one. Everything in this module follows from accepting that undo means compensate, not rewind.",
      sections: [
        {
          heading: "Claiming work exactly once",
          body: [
            "Every workflow starts with a request that may arrive several times, because clients retry ambiguous timeouts. Before doing anything with side effects, the workflow must establish whether this is new work or a repeat of work already in progress.",
            "The mechanism is an atomic claim: insert a row keyed by the idempotency key, relying on the database's uniqueness constraint to make the insert succeed for exactly one caller. Whoever inserts owns the work. Anyone whose insert fails knows the work already exists and reads the existing row instead. The uniqueness constraint is doing the concurrency control, which is why this is safe under simultaneous duplicates in a way that check-then-insert is not - between the check and the insert, another request can slip in.",
            "The claim row must record more than the key. Store a fingerprint of the request - a hash of the normalised payload - so a repeat with the same key but different content is rejected rather than silently treated as a duplicate. Store the current state, and store the eventual response so a later retry can be answered without redoing anything. And retain the row through the maximum plausible retry and dispute window; expiring it too early turns a late retry into a second execution.",
            "The claim and the first effect must commit together. If the claim is written and the process crashes before starting work, the row must indicate in-progress so recovery knows to continue rather than treating it as complete - which is why the state field exists and why the claim is not simply a marker.",
          ],
        },
        {
          heading: "The dual-write problem, and the outbox",
          body: [
            "Consider a service that must update its database and publish an event. The obvious code writes the database, then publishes. If it crashes in between, the state changed but no event was published, and downstream systems never learn. Reverse the order and a crash publishes an event for a change that never committed. There is no ordering that works, because two separate systems cannot be updated atomically without a distributed transaction. This is the dual-write problem, and it is one of the most common silent sources of data inconsistency in service architectures.",
            "The transactional outbox solves it by removing the second system from the critical moment. The event is written into an outbox table in the same database, in the same transaction as the business change. Now there is one atomic write, so either both the state change and the intent to publish exist, or neither does. A separate relay process reads unpublished outbox rows and sends them to the message broker, marking them published afterwards.",
            "The relay can crash after publishing and before marking, so an event may be published more than once - the outbox provides at-least-once, not exactly-once, and consumers must be idempotent. That is the honest description, and claiming otherwise is a common way to lose credibility in an interview.",
            "On the consuming side, the mirror-image pattern is the inbox: the consumer records processed message IDs in its own database, in the same transaction as the effect it applies. A redelivered message finds its ID already recorded and is skipped. Outbox and inbox together give end-to-end deduplication using only local transactions, which is why the pair is the standard answer.",
            "Change data capture is the alternative to a relay polling a table: read the database's replication log directly and turn committed changes into events. It removes the outbox table and the polling, and it guarantees you see exactly what committed. The trade-offs are that events now mirror your schema rather than your domain - so a refactor becomes a breaking change for consumers - and that you have coupled a pipeline to a database internal.",
          ],
        },
        {
          heading: "Sagas: multi-step work without atomicity",
          body: [
            "A saga is a sequence of local transactions, each in one service, where each step has a corresponding compensating action that semantically undoes it. If step four fails, the saga runs the compensations for steps three, two, and one in reverse.",
            "The crucial admission is that a saga is not atomic. Between step two and step three, the system is in a state where the payment is captured and inventory is not yet reserved, and that state is visible to anyone who looks. Sagas trade isolation for availability, and the correct way to present one is to say what intermediate states exist and why they are acceptable - typically because the operation is modelled as an order that is 'processing' rather than one that either exists or does not.",
            "Compensations are not rollbacks and cannot be. You cannot un-send an email; you send a correction. You cannot un-charge a card; you issue a refund, which appears on the customer's statement as a separate line. Compensating actions must themselves be idempotent and must be able to fail and be retried, since a compensation that fails leaves the system in exactly the state the saga existed to prevent.",
            "Some compensations are unacceptable - refunding a customer who was never meant to be charged is a bad experience, and some effects genuinely cannot be undone. Then use the try-confirm-cancel pattern: first reserve the resource without committing it, such as placing a hold on funds or holding a seat for ten minutes; then confirm all reservations once every step has succeeded; or cancel them if any fails. Cancelling a reservation is invisible to the customer in a way that a refund is not. The cost is that resources are held during the reservation window, so every reservation needs an expiry to prevent a crashed saga from holding inventory forever.",
            "Finally, sagas need an orchestrator that persists progress. If the process running the saga dies, something must know which steps completed and resume or compensate. Persist saga state after each step, and accept that some sagas end in a state that no automation can resolve - a compensation that keeps failing - which needs a manual review queue rather than infinite retries. Designing that terminal state explicitly, rather than pretending it cannot happen, is what makes the workflow operable.",
          ],
        },
      ],
      workedExample: {
        title: "Placing an order across four services",
        setup:
          "Placing an order requires charging a card, reserving inventory, creating a shipment, and sending a confirmation email. These are four separate services with four separate databases. The customer must never be charged for an order that cannot be fulfilled.",
        steps: [
          "Claim the request. The client sends an idempotency key. The order service inserts a claim row keyed by it, relying on the unique constraint so exactly one concurrent request wins. A duplicate finds the row and returns its stored state - so a customer double-tapping 'Place order' produces one order, decided by the database rather than by hope.",
          "Choose reservations over compensations for the two effects that hurt. Charging then refunding is visible and upsetting, and reserving stock that is then released is invisible. So use try-confirm-cancel for both: authorise the card without capturing, which places a hold, and reserve inventory with a 15 minute expiry. Both are cancellable without the customer ever seeing anything.",
          "Sequence the steps and persist progress. The orchestrator records each transition durably: authorised, reserved, shipment created. If the orchestrator crashes, a recovery process reads the persisted state and continues from the last completed step rather than restarting - which would double-charge without the idempotency keys carried into each downstream call.",
          "Confirm only when everything has succeeded. Once the shipment is created, capture the payment and commit the inventory reservation. The customer is charged only at the point the order is genuinely fulfillable, which satisfies the requirement in the prompt directly.",
          "Compensate on failure. If shipment creation fails permanently, cancel the inventory reservation and void the payment authorisation. Both are cancellations rather than refunds, so the customer sees a failed order rather than a charge followed by a refund. Each compensation is idempotent and retried on failure, and both are safe to run twice.",
          "Publish the confirmation via the outbox. The confirmation event is written to the outbox table in the same transaction that marks the order complete, so the email cannot be sent for an order that did not complete, nor silently skipped for one that did. The relay publishes at least once, and the email service keeps an inbox of processed IDs so a redelivery does not send a second email.",
        ],
        takeaway:
          "The design never needed a distributed transaction. What it needed was an atomic claim to decide ownership, reservations rather than compensations where compensation would be visible to the customer, persisted saga state so a crash resumes instead of restarting, and an outbox so the final event could not diverge from the final state. Each pattern solves one specific failure, and being able to say which failure each one addresses is the difference between naming patterns and designing with them.",
      },
    },
    glossary: [
      { term: "Atomic claim", definition: "Inserting a row keyed by the idempotency key so a uniqueness constraint decides which of several concurrent duplicates owns the work. Safe where check-then-insert is not." },
      { term: "Request fingerprint", definition: "A hash of the normalised request payload stored with the claim, so reusing a key with different content is rejected rather than silently aliased." },
      { term: "Dual-write problem", definition: "Updating a database and a message broker as two separate writes, where a crash between them leaves state and events permanently inconsistent. There is no ordering that avoids it." },
      { term: "Transactional outbox", definition: "Writing the event into a table in the same transaction as the business change, with a relay publishing it later. Converts two writes into one atomic write." },
      { term: "Consumer inbox", definition: "A record of processed message IDs written in the same transaction as the effect, so redelivered messages are skipped. The mirror of the outbox." },
      { term: "CDC", expansion: "change data capture", definition: "Deriving events by reading the database's replication log rather than an outbox table. Removes polling but couples event schemas to table schemas." },
      { term: "Saga", definition: "A sequence of local transactions, each with a compensating action, used when no transaction can span all the participants. Provides atomicity of outcome, not isolation." },
      { term: "Compensating action", definition: "A new transaction that semantically undoes an earlier one - a refund, a cancellation, a correction. Visible, unlike a rollback, and must itself be idempotent." },
      { term: "TCC", expansion: "try-confirm-cancel", definition: "Reserving a resource without committing, then confirming or cancelling once the outcome is known. Preferred where a compensation would be visible or unacceptable." },
      { term: "Semantic lock", definition: "Marking a record as in-progress so other operations know it is mid-workflow, which is how sagas expose their lack of isolation rather than hiding it." },
      { term: "Orchestrator", definition: "The component holding and persisting saga state, so a crash resumes from the last completed step rather than restarting the workflow." },
      { term: "Manual review state", definition: "The terminal state for a workflow no automation can resolve, such as a compensation that keeps failing. Designing it explicitly is what makes the system operable." },
    ],
  },

  "classic-payment-state-ledger": {
    primer: {
      plainSummary:
        "Money systems are unusual in that being fast matters much less than being correct and explainable. Every balance must be reconstructible, every change must be traceable to a cause, and no amount may ever be created or destroyed by a bug. This module covers the two structures that make that possible: a state machine that enumerates exactly which transitions are legal, and a double-entry ledger that makes imbalance arithmetically impossible to record.",
      analogy:
        "A hand-written accounting book. You do not erase entries - if you make a mistake you write a correcting entry, so the book shows both the error and the fix. Every transaction is written twice, once as a debit and once as a credit, and at the end of the day the two columns must total the same. That double entry is not bureaucracy; it is an error-detecting code invented in the fifteenth century, and it works because a single mistyped number breaks the totals immediately instead of silently producing a wrong balance.",
      sections: [
        {
          heading: "A payment is a state machine",
          body: [
            "A payment is not a boolean. It moves through defined states - created, authorised, captured, settled, refunded, failed - and the value of writing them down is that it makes the illegal transitions explicit. A captured payment cannot go back to authorised. A failed payment cannot become captured. Encoding this means an out-of-order webhook from a provider, which will happen, is rejected rather than corrupting the record.",
            "The states have real financial meaning worth knowing. Authorisation places a hold on the customer's funds, confirming they exist and reserving them without moving money; it expires after a period, typically days. Capture actually requests the money, and is usually done at fulfilment rather than at checkout, which is why a card statement often shows a pending amount that becomes real later. Settlement is when funds actually move between banks, hours or days after capture. A refund is a new transaction in the opposite direction, never a deletion of the original.",
            "The state that candidates forget is 'unknown'. A call to a payment provider can time out, leaving the outcome genuinely undetermined - the charge may have succeeded. This must be a real state in the machine, not an error. From it the only correct action is to query the provider about the idempotency key until it answers definitively; guessing in either direction produces either a double charge or lost revenue, and both are unacceptable.",
            "Transitions are guarded by optimistic concurrency: read the record with its version, and write the new state only if the version has not changed. Two concurrent webhooks then cannot both apply, and the loser re-reads and re-evaluates against the new state. This is the mechanism that keeps a state machine actually enforced under concurrency rather than only in a diagram.",
          ],
        },
        {
          heading: "Double-entry ledgers",
          body: [
            "A ledger is an immutable, append-only record of money movements. It is not a table of balances. Every entry names an account, an amount, and a direction, and every transaction posts entries that sum to zero: money always comes from somewhere and goes somewhere. Charging a customer 40 dollars debits their account and credits revenue, and the two entries are written in one database transaction so a partial posting is impossible.",
            "The zero-sum property is the point. If entries are constrained to balance, then no single write can create or destroy money, and a bug that would otherwise silently corrupt a balance instead fails to commit. This is why the structure has survived five centuries: it converts a class of silent errors into loud ones.",
            "Balances are derived by summing entries, not stored as a mutable field. That is what makes every balance explainable - you can always produce the list of entries that made it. Summing millions of entries on every read is impractical, so balances are cached as snapshots at points in time, and a current balance is the last snapshot plus the entries after it. The snapshot is an optimisation over an authoritative log, and can always be discarded and recomputed, which is the property that matters.",
            "Nothing is ever updated or deleted. A mistake is corrected by posting a reversing entry, so the ledger retains both the error and the correction. This is what makes the system auditable, and it is a hard constraint - the moment someone updates a ledger row in place, the history stops being trustworthy and no later audit can restore that trust.",
            "Currency needs one specific warning: never use floating-point numbers for money. Binary floating point cannot represent 0.10 exactly, so repeated arithmetic accumulates error that eventually shows up as balances that are wrong by a cent. Store integer minor units - cents - or a decimal type, and record the currency alongside every amount.",
          ],
        },
        {
          heading: "The provider boundary and reconciliation",
          body: [
            "Payments involve an external provider you do not control, which introduces every failure of a remote dependency plus the fact that it is authoritative for whether money moved. Three rules govern the boundary.",
            "First, every request to the provider carries an idempotency key, so a retry after a timeout cannot produce a second charge. This is the single most important detail in the whole module, and it is the provider's key, distinct from your internal one.",
            "Second, treat webhooks as hints rather than as truth. They arrive out of order, they are duplicated, they are occasionally lost, and they can be forged if not verified. So verify signatures, apply them idempotently, ignore transitions the state machine forbids, and never rely on a webhook arriving - poll for the outcomes that matter. A design that depends on a webhook arriving exactly once for correctness will be wrong regularly.",
            "Third, reconcile independently. Every day, fetch the provider's settlement report and compare it against your ledger. Discrepancies are found by matching on a shared identifier and looking for entries present in one and absent in the other, or with different amounts. This is not a fallback for bugs - it is a permanent control, because you are integrating with a system you do not control and drift is inevitable rather than exceptional.",
            "Reconciliation output is a discrepancy report, and it must never silently correct anything. Corrections are posted as new, attributed ledger entries, and anything that cannot be explained goes to a human queue. An automated correction that silently changes money is worse than the discrepancy it fixes, because it destroys the audit trail that would have let anyone understand what happened.",
          ],
        },
      ],
      workedExample: {
        title: "A charge whose response is lost",
        setup:
          "A customer checks out for 40 dollars. Your service calls the payment provider, which times out with no response. The order must not be double-charged, and finance must be able to explain the outcome later.",
        steps: [
          "Record intent before acting. Before calling the provider, write a payment record in state 'created' with a generated idempotency key. If everything after this fails, there is still a durable record that a charge was attempted, which is what makes the situation recoverable rather than invisible.",
          "Call with the key, and handle the timeout as a state. The request carries the idempotency key. On timeout, move the payment to 'unknown' rather than to 'failed'. Marking it failed would be a guess, and if the charge actually succeeded the customer is charged for an order the system believes did not happen - a discrepancy that will surface days later as a support complaint.",
          "Resolve by asking, not by assuming. A background process queries the provider by idempotency key. The provider is authoritative: it either reports a successful charge, in which case the payment moves to 'authorised', or reports nothing, in which case it can be safely retried with the same key. Retrying with the same key is safe precisely because the provider deduplicates on it.",
          "Post the ledger entries once the outcome is known. On confirmed authorisation, post a balanced pair - debit the customer's receivable account 4,000 cents, credit the pending-settlement account 4,000 cents - in one transaction, guarded by the payment's version so a concurrent webhook cannot post a duplicate pair. Amounts are integer cents, and the currency is stored with them.",
          "Absorb the late webhook. The provider's webhook for this charge arrives twenty minutes later, possibly twice. Verify the signature, look up the payment, and observe it is already authorised. The state machine forbids authorising an already-authorised payment, so it is a no-op. The webhook was useful but was never load-bearing.",
          "Reconcile the next day. The provider's settlement report lists the 40 dollar charge. Matching by provider transaction ID finds the corresponding ledger entries. If it did not - if the provider had charged and your ledger had nothing - the discrepancy report flags it for a human, and any correction is posted as a new attributed entry rather than by editing history.",
        ],
        takeaway:
          "The correctness came from three things: an explicit unknown state that prevented a guess, an idempotency key that made asking the provider repeatedly safe, and an append-only balanced ledger that made the eventual truth explainable. Notice that the webhook - which many designs treat as the mechanism - was purely an optimisation. Building so that the unreliable input is helpful but never necessary is the general lesson.",
      },
    },
    glossary: [
      { term: "Authorisation", definition: "A hold placed on a customer's funds confirming they exist and reserving them, without moving money. Expires after a period if not captured." },
      { term: "Capture", definition: "The request that actually collects previously authorised funds, usually at fulfilment rather than checkout." },
      { term: "Settlement", definition: "The actual movement of funds between banks, typically hours or days after capture." },
      { term: "Refund", definition: "A new transaction moving money back to the customer. Never a deletion or reversal of the original record." },
      { term: "Unknown state", definition: "The explicit state for a payment whose outcome is genuinely undetermined after a timeout. Resolved by asking the provider, never by guessing." },
      { term: "State machine", definition: "An enumeration of legal states and the permitted transitions between them, which makes out-of-order and duplicate events rejectable rather than corrupting." },
      { term: "Optimistic concurrency", definition: "Reading a record with its version and writing only if the version is unchanged, so concurrent updates cannot both apply." },
      { term: "Double-entry accounting", definition: "Recording every transaction as balanced debits and credits summing to zero, so no single write can create or destroy money. An error-detecting code, not bureaucracy." },
      { term: "Debit and credit", definition: "The two directions of a ledger entry. Every transaction posts both, in one database transaction, so a partial posting is impossible." },
      { term: "Immutable journal", definition: "An append-only ledger where nothing is updated or deleted; mistakes are corrected by posting reversing entries so history stays intact." },
      { term: "Derived balance", definition: "A balance computed by summing ledger entries rather than stored as a mutable field, which is what makes it explainable and reconstructible." },
      { term: "Balance snapshot", definition: "A cached balance at a point in time, with the current balance being the snapshot plus later entries. An optimisation that can always be discarded and recomputed." },
      { term: "Minor units", definition: "Storing money as integers of the smallest currency unit, such as cents. Avoids floating-point representation error, which accumulates into wrong balances." },
      { term: "Reconciliation", definition: "Independently comparing your ledger against the provider's settlement report on a schedule. A permanent control, not a fallback, because drift with an external system is inevitable." },
      { term: "Discrepancy report", definition: "The output of reconciliation, listing unmatched or mismatched records for human review. Corrections are posted as new entries, never as silent edits." },
    ],
  },

  "classic-retries-reconciliation": {
    primer: {
      plainSummary:
        "Retrying is the standard response to failure, and done carelessly it is how a small problem becomes an outage. This module is about retrying deliberately: classifying failures so you only retry the ones worth retrying, bounding retries so they cannot multiply load, quarantining work that will never succeed, and running an independent process that finds the inconsistencies retries did not fix.",
      analogy:
        "Calling someone whose phone is engaged. Trying again in a minute is sensible. Redialling continuously the instant it fails is not, and if a hundred people do it to the same number nobody ever gets through - the callers have become the reason the line is busy. And if you have dialled the wrong number, retrying will never work no matter how patiently you do it, which is why the first question is always what kind of failure this is.",
      sections: [
        {
          heading: "Classify before retrying",
          body: [
            "Not all failures deserve the same response, and retrying uniformly is the root of most retry damage. Four categories cover nearly everything, and deciding which one you are in must happen before any retry logic runs.",
            "Transient failures - a connection reset, a timeout, a temporarily unavailable dependency - will plausibly succeed on a later attempt. These are the only ones worth retrying automatically. Permanent failures - malformed input, a missing record, a failed authorisation check - will fail identically forever, so retrying wastes capacity and delays the error reaching someone who could fix it. As a rough guide over HTTP, 5xx and connection errors are candidates for retry; 4xx generally are not, since they indicate the request itself is wrong.",
            "Throttled failures are their own category. A 429 or 503 with a Retry-After header is the dependency explicitly telling you its capacity is exhausted. Retrying faster is exactly wrong; honour the stated delay. Ignoring backpressure that a dependency has taken the trouble to communicate is a reliable way to turn its degradation into its failure.",
            "Ambiguous failures - timeouts where the request may have been processed - are the dangerous ones. They should be retried, but only if the operation is idempotent. If it is not, a retry may duplicate a real effect, and the correct response is to query for the outcome rather than to repeat the action. This is why idempotency and retry policy are the same conversation: the retry policy you can safely adopt is determined by the idempotency you built.",
          ],
        },
        {
          heading: "Bounding the blast radius of retries",
          body: [
            "Three mechanisms keep retries from becoming the incident, and all three are needed rather than any one being sufficient.",
            "Exponential backoff with jitter spaces attempts out and desynchronises clients. Backoff alone is insufficient: a thousand clients that failed together and back off identically retry together, so the herd survives every doubling. Full jitter - waiting a random duration between zero and the current backoff ceiling - spreads them properly, and it is worth naming jitter specifically because its absence is a common real-world bug.",
            "Retry budgets cap retries as a proportion of total traffic, typically around ten percent. This is the mechanism that actually bounds the worst case. Per-request retry limits do not, because during a broad outage every request retries its maximum simultaneously and load multiplies exactly when capacity is lowest. A budget makes retries impossible in aggregate once failures are widespread, which is precisely the situation where they help least and hurt most.",
            "Deadline propagation stops work that is already pointless. If a request's deadline has passed, do not retry - the caller has stopped waiting and nobody will read the answer. Retrying with a hundred milliseconds of budget left is pure waste, and checking the remaining budget before each attempt is a cheap and frequently omitted guard.",
            "Add one architectural rule: retry at a single layer. If clients, gateway, and service all retry three times, one user request becomes twenty-seven backend calls. Choose the layer with the best context - usually the outermost, which knows the user's deadline - and make the inner layers fail fast.",
          ],
        },
        {
          heading: "Poison work, and reconciling what retries missed",
          body: [
            "Some work never succeeds. A malformed message, a record referencing something deleted, a bug triggered by one specific input - retried forever, it blocks its queue and starves everything behind it. So retries are bounded, and exhausted work moves to a dead letter queue where it stops consuming capacity but is not lost.",
            "A dead letter queue is only useful with an operational process around it: alert when items arrive, since a growing DLQ means something systematically broken; retain enough context to diagnose, meaning the original payload plus the error and attempt history; and provide a redrive path to replay items after a fix. Redrive must itself be safe, which it is only if consumers are idempotent - replaying ten thousand items must not produce ten thousand duplicate effects.",
            "Retries and DLQs still leave gaps. An effect can be applied downstream while the acknowledgement is lost, so your system believes it failed. A consumer can crash after acting and before committing its offset. Two systems can drift for reasons nobody anticipated. No retry policy detects these, because from the retrying system's point of view nothing is wrong.",
            "Reconciliation is the independent check that finds them. Periodically compare two systems that should agree - your order records against the payment provider's, your inventory against the warehouse's - and report differences. The essential property is independence: it must not use the same code path that created the data, or it will reproduce the same bug and report agreement. Reconciliation that shares a library with the pipeline it audits is checking that the bug is consistent.",
            "Use a watermark so each run is bounded and repeatable: reconcile a specific closed window, record that it is complete, and move on. This makes runs incremental rather than growing forever, and makes it possible to re-run one window after fixing a matching rule. Corrections are appended as new attributed records, never silent edits, and anything unexplained goes to a human queue.",
          ],
        },
      ],
      workedExample: {
        title: "A dependency slows down and takes the system with it",
        setup:
          "An inventory service normally responds in 20 milliseconds. During a sale it degrades to 2 seconds. Within minutes the checkout service is completely unavailable even though inventory is still serving some requests. Every client retries three times with a fixed 100 millisecond delay.",
        steps: [
          "Trace the amplification. Checkout's timeout is 1 second, so at 2 second latency every call times out. Each request then retries three times, so inventory receives four times its normal traffic - while already overloaded. The extra load pushes latency higher, causing more timeouts, causing more retries. The retry policy has created a feedback loop, and this is the mechanism to name explicitly.",
          "Note that the retries are wrong on their own terms. Each retry waits a fixed 100 milliseconds against a dependency taking 2 seconds, so all three attempts and the original are guaranteed to fail before the dependency could possibly have recovered. Four attempts, four timeouts, four seconds of held connections and zero chance of success.",
          "Fix the backoff. Replace fixed delay with exponential backoff and full jitter - a random wait between zero and 100 milliseconds, then zero and 200, then zero and 400. Attempts now spread over time and clients desynchronise, so the dependency sees a smooth curve rather than synchronised waves.",
          "Add a budget. Cap retries at ten percent of traffic. When inventory is broadly failing, the budget is exhausted almost immediately and retries stop entirely, so load returns to baseline instead of quadrupling. This is the change that actually breaks the feedback loop, and it works because it is global rather than per-request.",
          "Add a circuit breaker. Once the failure rate to inventory passes a threshold, fail calls immediately without attempting them. Checkout stops accumulating threads blocked on 2 second timeouts, and inventory gets the quiet it needs to recover. After 30 seconds the breaker admits a few probe requests to test recovery.",
          "Degrade rather than fail. Decide in advance what checkout does without inventory: block the sale, or accept the order and verify stock asynchronously. That is a product decision, not an engineering one, and having made it before the incident is what turns a total outage into reduced functionality. Then reconcile afterwards - compare accepted orders against actual stock movements to find any that were accepted and cannot be fulfilled.",
        ],
        takeaway:
          "The incident was not caused by the inventory service being slow. It was caused by the retry policy converting slowness into a load multiplier, then into total failure. That is why retry configuration is a design decision worth stating explicitly rather than a default to be inherited from a library - and why an interviewer asking 'what happens when this dependency gets slow?' is asking about your retry policy whether or not they say so.",
      },
    },
    glossary: [
      { term: "Transient failure", definition: "A failure likely to succeed on a later attempt - a reset connection, a timeout, a briefly unavailable dependency. The only category worth retrying automatically." },
      { term: "Permanent failure", definition: "A failure that will recur identically forever, such as malformed input or a failed authorisation. Retrying wastes capacity and delays the error reaching someone who can act." },
      { term: "Throttled failure", definition: "An explicit signal that a dependency is at capacity, often a 429 with Retry-After. The stated delay must be honoured rather than retried through." },
      { term: "Ambiguous failure", definition: "A timeout where the request may or may not have been processed. Safe to retry only if the operation is idempotent; otherwise query for the outcome instead." },
      { term: "Exponential backoff", definition: "Doubling the wait between successive attempts so a struggling dependency is not hammered at a constant rate." },
      { term: "Full jitter", definition: "Waiting a random duration between zero and the current backoff ceiling, which desynchronises clients that failed together. Backoff without jitter preserves the herd." },
      { term: "Retry budget", definition: "A cap on retries as a fraction of total traffic. The only mechanism that bounds aggregate retry load during a broad outage, which per-request limits do not." },
      { term: "Deadline propagation", definition: "Carrying the remaining time budget down the call chain, so no attempt is made for a request whose caller has already given up." },
      { term: "Poison message", definition: "Work that fails every time, blocking its queue and starving everything behind it until it is quarantined." },
      { term: "Dead letter queue (DLQ)", definition: "Where work goes after exhausting retries. Useful only with alerting, retained diagnostic context, and a safe redrive path." },
      { term: "Redrive", definition: "Replaying dead-lettered work after a fix. Safe only when consumers are idempotent, since replay may re-apply effects that partially succeeded." },
      { term: "Reconciliation", definition: "An independent periodic comparison of two systems that should agree, finding drift no retry policy can detect. Must not share the code path that produced the data." },
      { term: "Reconciliation watermark", definition: "A marker of which time window has been fully reconciled, making runs incremental, bounded, and individually re-runnable." },
      { term: "Compensating correction", definition: "A new attributed record that fixes a discrepancy, rather than a silent edit that would destroy the audit trail." },
    ],
  },

  "classic-notification-orchestration": {
    primer: {
      plainSummary:
        "Sending a notification looks like calling an email API. Running notifications for a real product means deciding whether to send at all, choosing channels per user, respecting preferences and quiet hours, avoiding duplicates, handling providers that fail or throttle, and making sure a burst of low-value alerts cannot delay a security code. This module is about that pipeline and where each policy belongs in it.",
      analogy:
        "A hospital paging system. The clinically important thing is not the pager hardware but the rules: who gets paged for what, what happens when they do not answer, which alerts may wait until morning, and how you stop a broken sensor from paging everyone all night. A paging system without those rules is not a simpler system - it is one that gets ignored, which is the same failure notifications have when users turn them off.",
      sections: [
        {
          heading: "Intent, planning, delivery: three separate stages",
          body: [
            "The single most useful structural decision is to separate what happened from who should hear about it and how it reaches them. A notification intent is a statement about the world - 'order 123 shipped' - produced by the service that owns that fact. It names no channel and no recipient address, and it is durable.",
            "Recipient planning turns an intent into concrete deliveries. It resolves who cares, applies their preferences and locale, chooses channels, and produces zero or more planned deliveries. Zero is an important and frequently forgotten outcome: a user who has muted this category should produce no deliveries at all, and the pipeline must handle that as a normal result rather than an error.",
            "Delivery executes one planned delivery through one provider, handling that provider's retries, throttling, and outcome callbacks. It knows about SMTP and push tokens; it knows nothing about business rules.",
            "This separation earns its keep in several ways. Each stage is independently testable and independently scalable. Adding a channel touches only delivery, adding a policy touches only planning, and a provider outage degrades one channel rather than the pipeline. It also makes the source of truth clear: the intent is durable and replayable, so if planning had a bug you can re-plan from intents rather than having lost the information.",
          ],
        },
        {
          heading: "Policy: preferences, deduplication, quiet hours, fairness",
          body: [
            "Preferences must be enforced in the pipeline, not in the calling service, or every new caller reimplements them and one of them gets it wrong. Users choose per category and per channel, and there is a legal dimension: a user who has unsubscribed from marketing must not receive marketing, and jurisdictions differ on what counts as transactional. Getting the transactional-versus-marketing distinction wrong is a compliance problem, not a bug.",
            "Deduplication needs a definition of sameness, and it is a product question rather than a technical one. Is 'someone liked your post' twice in ten minutes two notifications or one? Usually one, delivered as an aggregate. Define a deduplication key and a window per category, and where aggregation is right, hold briefly and collapse - 'three people liked your post' rather than three notifications. Batching is often the single biggest lever on whether users keep notifications enabled.",
            "Quiet hours must respect the recipient's timezone rather than the server's, which is the classic bug that wakes users at 3am. And they must be overridable: a security code or a fraud alert goes through regardless. That requires a priority attached to the intent, and the priority must come from the producer, since only it knows whether this is a password reset or a promotion.",
            "Priority also governs queueing, and this is where a naive design fails. If everything shares one queue, a marketing campaign of ten million messages sits in front of the next login code, which arrives forty minutes late and is useless. Separate queues per priority class with dedicated capacity fix it. Add per-tenant fairness so one heavy sender cannot consume the whole pipeline - a shared pipeline without fairness is one where every tenant's latency depends on the noisiest tenant's behaviour.",
          ],
        },
        {
          heading: "Providers, outcomes, and honest delivery state",
          body: [
            "External providers - email services, push gateways, SMS carriers - fail, throttle, and change behaviour without notice, so each sits behind an adapter that normalises its responses into your own vocabulary: accepted, throttled, permanently rejected, or unknown. Business logic should never branch on a provider's specific error codes, or swapping providers becomes a rewrite.",
            "Respect provider rate limits with a token bucket per provider, and treat throttling as backpressure rather than as failure - queue and slow down, do not retry harder. Where a channel has multiple providers, failover is possible, but it needs care: sending through a second provider after the first timed out ambiguously can deliver twice. Deduplicate at the provider boundary using a stable message ID, and accept that some duplicates will occur, because the alternative is silently sending nothing.",
            "Outcomes arrive asynchronously by webhook - delivered, bounced, opened, marked spam - out of order and sometimes duplicated. Delivery state is therefore monotonic in the same way message delivery state is: take the furthest state observed rather than the last event received, so a late 'sent' cannot overwrite a recorded 'bounced'.",
            "Bounces need real handling rather than logging. A hard bounce means the address is invalid and must be suppressed permanently, because continuing to send damages your sending reputation and eventually gets your domain blocked - which means one unhandled bounce list can degrade deliverability for every user. Spam complaints must suppress immediately. A suppression list is therefore a first-class piece of state consulted before every send, not a report someone reads later.",
          ],
        },
      ],
      workedExample: {
        title: "A marketing campaign delays login codes",
        setup:
          "A product sends transactional notifications - login codes, password resets, order updates - and marketing campaigns. Marketing launches a campaign to 10 million users. Login codes, normally delivered in seconds, start arriving 30 minutes late. Users cannot sign in.",
        steps: [
          "Find the mechanism. All notifications share one queue and one worker pool. Ten million campaign messages were enqueued at once, so a login code enqueued afterwards sits behind them. Delivery is working perfectly and processing in order - the ordering is the bug, and no amount of extra capacity fixes it while the queue is shared.",
          "Separate by priority class. Create distinct queues with dedicated workers: critical for login codes and fraud alerts, transactional for order updates, and bulk for marketing. A login code now waits behind at most a handful of other critical messages. Dedicated capacity is the point - shared workers with priority ordering still let a long-running bulk send occupy every worker.",
          "Make the producer declare priority. The intent carries its class, because only the producing service knows whether this is a password reset or a promotion. Inferring priority in the pipeline from templates or subject lines is guesswork that will misclassify exactly the message you most need delivered.",
          "Add per-tenant fairness within the bulk queue. One tenant's ten million message campaign should not starve another tenant's hundred thousand message campaign. Round-robin across tenants so the small campaign finishes in reasonable time rather than waiting behind the large one.",
          "Pace the campaign against provider limits. Ten million emails cannot go out instantly regardless of queue design, because the provider rate-limits and a sudden volume spike damages sending reputation. Use a token bucket to spread the send over hours, and treat the provider's throttling responses as a signal to slow down rather than to retry.",
          "Apply policy in planning, before anything is enqueued. Quiet hours in the recipient's timezone, marketing opt-outs, the suppression list for hard bounces and spam complaints, and a frequency cap so no user receives more than a set number of marketing messages per week. Filtering ten million down to the genuinely eligible set before it reaches a queue is both cheaper and the only place these rules can be applied consistently.",
        ],
        takeaway:
          "The fix was queue separation with dedicated capacity, not more capacity - adding workers to a shared queue would have made the campaign finish sooner while login codes still queued behind it. The general principle is that work with different urgency must not share a queue, because a queue is fundamentally first-in-first-out and no amount of scaling changes what is already in front of you.",
      },
    },
    glossary: [
      { term: "Notification intent", definition: "A durable statement that something happened, produced by the service owning that fact, naming no channel or address. Replayable, so planning bugs can be corrected." },
      { term: "Recipient planning", definition: "The stage turning an intent into concrete deliveries by applying preferences, locale, and channel selection. Producing zero deliveries is a normal outcome." },
      { term: "Channel", definition: "A delivery medium - email, SMS, push, in-app. Each has different latency, cost, reliability, and regulatory constraints." },
      { term: "Priority class", definition: "The urgency of an intent, declared by the producer and used to route it to a queue with dedicated capacity." },
      { term: "Deduplication window", definition: "The period within which two notifications count as the same and are collapsed. A product decision, defined per category." },
      { term: "Aggregation", definition: "Collapsing several notifications into one summary. Often the largest single factor in whether users keep notifications enabled." },
      { term: "Quiet hours", definition: "Periods when non-urgent notifications are withheld, evaluated in the recipient's timezone and overridable by priority." },
      { term: "Provider adapter", definition: "A wrapper normalising one provider's behaviour into a common vocabulary, so business logic never branches on provider-specific error codes." },
      { term: "Token bucket", definition: "A rate-limiting structure holding tokens replenished at a fixed rate, allowing controlled bursts while bounding sustained rate." },
      { term: "Hard bounce", definition: "Permanent delivery failure, typically an invalid address. Must trigger permanent suppression, since continuing to send damages sending reputation for every user." },
      { term: "Suppression list", definition: "Addresses that must never be contacted, from hard bounces, spam complaints, or unsubscribes. Consulted before every send, not reviewed later." },
      { term: "Per-tenant fairness", definition: "Sharing capacity across tenants so one large sender cannot starve others. Without it, every tenant's latency depends on the noisiest tenant." },
      { term: "Delivery state monotonicity", definition: "Taking the furthest observed delivery state rather than the most recently received event, so out-of-order webhooks cannot regress a recorded outcome." },
    ],
  },

  "classic-multipart-content-addressed-storage": {
    primer: {
      plainSummary:
        "Uploading a two-gigabyte file over a mobile connection will fail partway, and a system that starts over from zero is unusable. This module is about splitting uploads into independently retryable chunks with a single atomic moment where the file becomes real, and about naming data by the hash of its content - which makes deduplication and integrity verification fall out almost for free.",
      analogy:
        "Shipping a library in boxes. You number the boxes, ship them independently, and if box 47 is lost you resend only box 47. The shipment is not complete until the manifest is signed - before that, boxes may be sitting in the warehouse but the library has not arrived. Content addressing is the extra trick of labelling each box by a fingerprint of its contents, so two identical boxes are recognisably identical and only one needs to be stored at all.",
      sections: [
        {
          heading: "Resumable uploads and the atomic commit point",
          body: [
            "A multipart upload begins by creating an upload session, which returns an identifier and describes the expected chunks. The client uploads each chunk independently, in any order and with any parallelism, retrying individual chunks that fail. Each chunk carries a checksum so corruption is caught at upload rather than discovered on download.",
            "The essential property is that the file does not exist until the client explicitly completes the upload, presenting the full list of chunks and their checksums. The server verifies every chunk is present and intact, then atomically publishes the manifest - the record listing which chunks compose the file and in what order. Before that instant there is no file; after it, the whole file is there. There is no state in which a reader sees half a file, and this single-moment property is what makes the whole design safe.",
            "This is why the manifest is the unit of atomicity rather than the data. Chunks are written to storage progressively and are just bytes; publishing the manifest is one small write that makes them collectively meaningful. Making a small metadata write the commit point for a large data write is a broadly reusable technique.",
            "Sessions must expire, since clients abandon uploads constantly - closed tabs, dead batteries, changed minds. Abandoned chunks are storage nobody will ever read, so sessions carry a TTL and a background process reclaims chunks belonging to expired incomplete sessions. Without this, orphaned chunks accumulate forever and become a genuinely awkward cleanup problem later.",
            "One more practical point: clients should upload directly to object storage using a signed URL - a time-limited, permission-scoped URL - rather than streaming through your service. Proxying gigabytes through application servers wastes bandwidth and turns them into a bottleneck, and signed URLs let the storage system handle the transfer while your service retains control over who may upload what and for how long.",
          ],
        },
        {
          heading: "Content addressing and deduplication",
          body: [
            "Content addressing means identifying data by a cryptographic hash of its bytes rather than by a name or location. The hash is the address. Two files with identical content have identical hashes and are therefore the same object, automatically.",
            "This gives deduplication for free at whatever granularity you hash. Hash whole files and identical files are stored once - useful when a document is shared across an organisation. Hash chunks and files sharing parts are partially deduplicated, which matters for versioned documents and virtual machine images where successive versions differ slightly.",
            "How you cut chunks determines how well this works. Fixed-size chunking splits every 4 megabytes and is simple, but it fails badly on insertion: adding one byte at the start shifts every subsequent boundary, so every chunk hash changes and nothing deduplicates. Content-defined chunking sets boundaries where a rolling hash of a sliding window hits a pattern, so boundaries depend on content rather than offset. An insertion then changes only the chunk containing it, and everything after still deduplicates. It costs more CPU and is why backup and sync systems use it while simple upload systems do not.",
            "Content addressing also gives integrity verification for free: recompute the hash and compare. This is why it underpins Git, Docker images, and backup systems - a corrupted or tampered object is detectable by anyone holding the address, with no trusted metadata required.",
            "Two cautions. First, deduplication across users is a privacy consideration: if an upload completes suspiciously fast because the content already exists, that reveals someone else has the same file, which can be used to test whether a specific document exists in the system. Products that care either deduplicate only within a user's own data or accept the leak knowingly. Second, deduplication makes deletion non-trivial, because an object may be referenced by many files and cannot be removed when any one of them is deleted.",
          ],
        },
        {
          heading: "References, garbage collection, and delivery",
          body: [
            "With deduplication, deleting a file must not delete its chunks - other files may reference them. So chunks are removed only when nothing references them, which requires reference tracking. Reference counting is the obvious approach and is delicate under concurrency: a count decremented to zero while another upload is concurrently taking a reference can delete data that is about to be used.",
            "The safer pattern is mark-and-sweep with a grace period. Do not delete on the count reaching zero; instead mark the object unreferenced with a timestamp and delete only after it has been unreferenced for, say, 24 hours, re-checking at that point. New references clear the mark. This tolerates races and in-flight operations at the cost of retaining some garbage briefly, which is nearly always the right trade for a storage system where deleting live data is catastrophic and deleting late is merely inefficient.",
            "Delivery is the other half. Large files are served through a CDN so bytes travel from a location near the user, and access is granted with time-limited signed URLs so the CDN can serve content without your service being on the path. Range requests let clients fetch byte ranges, which is what makes video seeking and resumable downloads work.",
            "Content addressing helps here too: because an object's address is a hash of its content, the content at that address can never change, so it is safe to cache immutably and forever. Nothing needs invalidating, since a modified file is simply a different address. This is why content-addressed URLs are given effectively infinite cache lifetimes and mutable ones are not - the hardest problem in caching disappears when addresses cannot be reused.",
          ],
        },
      ],
      workedExample: {
        title: "Uploading a 2 GB video from a phone",
        setup:
          "A user uploads a 2 gigabyte video over a mobile connection that drops several times. The same video may already have been uploaded by someone else. The file must be viewable immediately after upload and must never be visible in a partial state.",
        steps: [
          "Create a session and let the client ask what is needed. The client requests an upload session declaring the file size and a hash of the whole content. If that hash already exists in storage, the server can complete the upload immediately without transferring a byte - though for a consumer product this cross-user shortcut may be deliberately disabled for the privacy reason noted above.",
          "Chunk and upload independently. The file is split into 8 megabyte chunks - 250 of them - each uploaded directly to object storage via a signed URL, with several in flight at once. Each carries a checksum verified on arrival. When the connection drops mid-chunk, only that chunk is retried, so a failure costs 8 megabytes rather than 2 gigabytes.",
          "Let the client resume after a long interruption. On reconnect the client asks which chunks the server already holds and uploads only the missing ones. This is what makes an upload survive a phone being locked, an app being backgrounded, or a train tunnel.",
          "Commit atomically. Once all 250 chunks are present the client calls complete. The server verifies every chunk and checksum, then writes the manifest in a single atomic operation. Before that write there is no video; after it, the whole video exists. No reader ever observes a partial file, and a crash before the write leaves only reclaimable chunks.",
          "Deduplicate at the chunk level. Chunks whose hashes already exist are not stored again; the manifest simply references the existing objects. If the same video was uploaded before, most chunks already exist and the effective transfer is far smaller - and the deduplication is automatic, because identical content produces identical addresses.",
          "Serve and eventually collect garbage. Playback is served through a CDN with signed URLs and range requests so the player can seek. If the user later deletes the video, the manifest is removed and its chunks are marked unreferenced; a sweep 24 hours later deletes only those still unreferenced, so a concurrent upload that took a reference in the meantime is not damaged.",
        ],
        takeaway:
          "Two ideas carried the design: the manifest as the single atomic commit point, so partial state is unobservable, and content addressing, which made deduplication, integrity checking, and cache-forever delivery all consequences of one decision. When one representational choice makes several problems disappear at once, that is usually the right choice, and being able to point that out is more convincing than listing features.",
      },
    },
    glossary: [
      { term: "Multipart upload", definition: "Splitting an upload into independently retryable chunks, so a failure costs one chunk rather than the whole transfer." },
      { term: "Upload session", definition: "Server-side state tracking an in-progress upload and which chunks have arrived. Carries a TTL so abandoned uploads can be reclaimed." },
      { term: "Manifest", definition: "The record listing which chunks compose a file and in what order. Publishing it atomically is the moment the file becomes real." },
      { term: "Atomic commit point", definition: "The single instant at which partial work becomes visible as a whole. Making a small metadata write the commit point for a large data write is broadly reusable." },
      { term: "Signed URL", definition: "A time-limited, permission-scoped URL letting a client transfer directly to or from object storage without proxying through your service." },
      { term: "Content addressing", definition: "Identifying data by a cryptographic hash of its bytes rather than by name or location, so identical content is automatically identical." },
      { term: "Fixed-size chunking", definition: "Splitting at fixed byte offsets. Simple, but an insertion shifts every later boundary and destroys deduplication." },
      { term: "Content-defined chunking", definition: "Setting boundaries where a rolling hash of a sliding window matches a pattern, so boundaries follow content and an insertion affects only one chunk." },
      { term: "Rolling hash", definition: "A hash over a sliding window that can be updated cheaply as the window advances, making content-defined chunking practical." },
      { term: "Deduplication", definition: "Storing identical content once. Automatic under content addressing, but it complicates deletion and can leak the existence of files across users." },
      { term: "Reference tracking", definition: "Knowing which files reference a shared object, so it is removed only when nothing points at it." },
      { term: "Mark-and-sweep with grace period", definition: "Marking unreferenced objects and deleting only after they have stayed unreferenced for a period, tolerating races at the cost of retaining garbage briefly." },
      { term: "Range request", definition: "An HTTP request for a byte range of an object, enabling video seeking and resumable downloads." },
      { term: "Immutable caching", definition: "Caching content-addressed objects indefinitely, safe because an address's content can never change - which removes cache invalidation entirely." },
    ],
  },

  "classic-file-sync-version-conflicts": {
    primer: {
      plainSummary:
        "File sync keeps a folder identical across several devices, some of which are offline while changes happen. The hard part is not transferring bytes; it is deciding what to do when two devices changed the same file independently and both changes are legitimate. This module covers the change journal that makes sync efficient, the version checks that detect concurrent edits, and the honest options for resolving them.",
      analogy:
        "Two people editing printed copies of the same document on separate trains. Neither is wrong, and when they meet there is no rule of physics that determines the correct merged document. Only three things can happen: keep both copies and let a human decide, merge them if the content has structure that permits merging, or throw one away. Software has exactly these three options, and any system claiming otherwise is silently doing the third.",
      sections: [
        {
          heading: "The change journal and sync cursors",
          body: [
            "Sync cannot work by comparing entire folder trees; that is far too slow once there are hundreds of thousands of files. Instead the server keeps an append-only journal of changes to the namespace - file created, modified, moved, deleted - each with a monotonically increasing sequence number.",
            "Each device holds a cursor: the highest journal position it has processed. Syncing means asking for everything after the cursor, applying it, and advancing. The cost is proportional to what changed rather than to the size of the folder, so syncing after an hour offline is fast whether the folder holds ten files or a million.",
            "A device offline long enough that its cursor falls outside retention cannot catch up incrementally. It must resynchronise from a snapshot of current state instead of replaying history. This is the same snapshot-plus-tail pattern that appears in message sync, and every log-based system needs the fallback, because retaining the journal forever is not an option.",
            "Deletions must be journal entries rather than absences, for a specific reason: a device syncing from an old cursor has to be told that a file was deleted. If deletion simply removed the record, that device would never learn - it would see a file it holds that the server does not mention, which is indistinguishable from a file the server has not yet told it about. So deletions leave a tombstone, and tombstones are retained long enough for every plausible offline device to see them.",
            "Moves deserve explicit representation too. A move recorded as a delete plus a create causes the device to delete the local file and download the same content again - correct but wasteful, and visibly wrong to a user watching a large file re-download because it was renamed.",
          ],
        },
        {
          heading: "Detecting concurrent edits",
          body: [
            "Every file version has an identifier - a hash of the content, or a version number. When a device uploads a change, it declares which version it edited: 'I am replacing version 7 with this new content'. The server accepts only if the current version is still 7. If it is 8, someone else changed the file since this device last synced, and the two edits are concurrent.",
            "This is optimistic concurrency, and it is the mechanism that makes conflicts detectable at all. Without it, an upload simply overwrites whatever is there, and the other device's change vanishes with nobody ever knowing - the sync system silently destroyed a user's work. Detecting the conflict is the necessary first step, and it must come before any policy about what to do.",
            "It is worth being clear about why timestamps cannot do this job. Comparing modification times and keeping the newer one - last-writer-wins - depends on device clocks, which disagree, and it discards a real edit whenever two are concurrent. It is a policy, and a lossy one, dressed up as a mechanism. If it is chosen, it should be chosen explicitly with an understanding of what it loses.",
            "Moves, deletes, and renames create conflicts that are not simply two edits to one file. One device edits a file while another deletes it. One device moves a folder while another adds a file inside it. Each needs a defined rule, and the usual choice favours preservation - an edit beats a delete, because restoring a deleted file is annoying while losing an edit is unacceptable. What matters is that the rules are enumerated rather than emerging by accident from whichever code path runs first.",
          ],
        },
        {
          heading: "What to do with a detected conflict",
          body: [
            "Once a conflict is detected there are three honest options, and the right one depends entirely on what the file means.",
            "Surface it. Keep both versions, naming one as a conflicted copy - 'report (conflicted copy from Ana's laptop).docx'. Nothing is lost, and the user resolves it with knowledge the system does not have. This is what consumer file sync does for opaque binary files, and it is the correct default precisely because the system cannot know which edit matters.",
            "Merge automatically, which requires structure. Two edits to different paragraphs of a text file can be merged; two edits to the same paragraph cannot be merged safely. Rich-text collaboration achieves it with operational transformation or with convergent replicated data types, where the data structure itself is designed so concurrent operations commute and every replica converges to the same result. This is how simultaneous editing in a document editor works, and it requires the file format to be an application-level structure rather than an opaque blob - which is why it is available in a collaborative editor and not in a folder sync product.",
            "Discard one, which is last-writer-wins. Acceptable when files are effectively caches or when losing an edit is genuinely harmless. Unacceptable for user documents, and the failure is silent, which is what makes it dangerous: the user never learns they lost work.",
            "Transfer efficiency is a separate concern that interacts with all three. Re-uploading a 500 megabyte file because one page changed is unacceptable, so sync systems transfer deltas by comparing chunk hashes and sending only differing chunks. Content-defined chunking matters here for the same reason as before: an insertion near the start must not shift every subsequent boundary. And version history - keeping previous versions for some window - is the safety net that makes any conflict policy survivable, because it means a wrong resolution is recoverable rather than final.",
          ],
        },
      ],
      workedExample: {
        title: "Two laptops edit the same document offline",
        setup:
          "Ana and Ben share a folder. Both are on flights. Ana edits report.docx; Ben edits the same file. Both land and reconnect within a minute of each other. The current server version is 7.",
        steps: [
          "Ana reconnects first. Her client uploads with a precondition that the current version is 7. It is, so the server accepts, creating version 8 and appending a journal entry. Nothing unusual has happened yet.",
          "Ben reconnects and is rejected. His client uploads with the same precondition of version 7. The server sees version 8 and rejects the write. This rejection is the entire point of the design - without the precondition, Ben's upload would overwrite Ana's edit and neither would ever know.",
          "Ben's client resolves. It fetches version 8 and now holds two versions descended from a common ancestor. For a .docx - an opaque binary - no safe automatic merge exists, so it creates 'report (conflicted copy from Ben's laptop).docx' and uploads that as a new file. Ana's version 8 remains the canonical report.docx.",
          "Both devices converge. The conflicted copy appears in the journal, so Ana's client downloads it too. Both users see the same two files and can resolve it as people, which is the correct outcome because only they know which edit matters.",
          "Transfer only the delta. When Ben's client downloads version 8, it compares chunk hashes against the version 7 it already has and fetches only the differing chunks. A 50 megabyte document with a small edit transfers a few hundred kilobytes.",
          "Handle the awkward variant. Suppose Ben had deleted the file while Ana edited it. Deleting and editing concurrently resolves in favour of the edit: the file survives as Ana's version 8, and Ben's client re-creates it locally. Restoring an unwanted file costs a user ten seconds; losing an edit costs them their work, and that asymmetry is what should decide the rule.",
        ],
        takeaway:
          "The version precondition did the essential work by turning a silent overwrite into a detected conflict. Everything after it was policy, and the policy was chosen from what the file means rather than from what was easiest to implement. If you can only say one thing about conflicts in an interview, say that detection and resolution are separate problems, and that a system without detection is not resolving conflicts - it is losing data quietly.",
      },
    },
    glossary: [
      { term: "Change journal", definition: "An append-only log of namespace changes with monotonically increasing sequence numbers, letting devices sync proportionally to what changed." },
      { term: "Sync cursor", definition: "A device's position in the journal. Syncing requests everything after it, so cost is independent of total folder size." },
      { term: "Snapshot resync", definition: "Fetching current state directly when a device's cursor has fallen outside journal retention. The required fallback for any log-based sync." },
      { term: "Tombstone", definition: "A record marking a deletion, retained so that devices syncing from an old cursor learn the file was deleted rather than merely unmentioned." },
      { term: "Base version", definition: "The version a client edited, declared on upload so the server can detect that something else changed in the meantime." },
      { term: "Optimistic concurrency", definition: "Accepting a write only if the current version matches the one the client based its edit on. The mechanism that makes conflicts detectable at all." },
      { term: "Concurrent update", definition: "Two changes derived from the same base version with neither aware of the other. Not an error - a normal outcome of offline editing." },
      { term: "Conflicted copy", definition: "Preserving both versions under distinct names so a human resolves the conflict. The correct default for opaque files." },
      { term: "Last-writer-wins", definition: "Keeping one version by timestamp and discarding the other. A lossy policy, dependent on device clocks, whose failure is silent." },
      { term: "Operational transformation", definition: "Transforming concurrent edit operations against each other so all replicas converge. Requires structured, application-level content." },
      { term: "CRDT", expansion: "conflict-free replicated data type", definition: "A data structure designed so concurrent operations commute and replicas converge without coordination. Powerful, but costs metadata and constrains the data model." },
      { term: "Delta synchronisation", definition: "Transferring only differing chunks by comparing hashes, so a small edit to a large file costs a small transfer." },
      { term: "Version history", definition: "Retaining previous versions for a window, which makes any conflict policy survivable by keeping a wrong resolution recoverable." },
    ],
  },

  "classic-geo-indexing-hot-regions-privacy": {
    primer: {
      plainSummary:
        "Finding everything within five kilometres of a point sounds easy and is not, because ordinary database indexes are one-dimensional and location is two-dimensional. This module is about the standard trick - converting two dimensions into one so a normal index works - and about the two problems that follow: cities are far denser than deserts, and location data is among the most sensitive data a system can hold.",
      analogy:
        "A paper map divided into lettered grid squares. To find restaurants near you, you look up your square and read what is listed there. Two refinements make it real. First, something just over the boundary is physically close but in a different square, so you must check neighbouring squares too. Second, the squares should not all be the same size: one square covering central London needs to be far smaller than one covering open ocean, or the London listing is unusably long.",
      sections: [
        {
          heading: "Turning two dimensions into one",
          body: [
            "A B-tree index sorts on one dimension. Indexing latitude and longitude separately does not help, because finding everything within a radius means intersecting two wide ranges, and the intersection contains enormous numbers of points that are nowhere near you - a band around the whole planet at your latitude, intersected with a band at your longitude.",
            "Geohashing solves it by interleaving the bits of latitude and longitude into a single value, then encoding it as a short string. The result has a property that makes everything work: nearby points usually share a common prefix. So 'find things near here' becomes 'find rows whose geohash starts with this prefix' - a prefix range scan, which is exactly what an ordinary index is good at. Longer prefixes mean smaller areas, so precision is chosen by prefix length.",
            "The word 'usually' hides the catch. Points on opposite sides of a cell boundary can be metres apart with completely different prefixes, because the interleaving has discontinuities. Querying one cell therefore misses close-by points just outside it. The standard fix is to query the cell plus its eight neighbours, which guarantees you cover everything within the cell's dimension. This is why you will always see neighbour expansion in a geohash implementation, and why omitting it produces a system that mysteriously misses results near boundaries.",
            "The alternative structure is a quadtree, which recursively divides space into four quadrants, subdividing only where points are dense. It adapts to density naturally, which is its main advantage over fixed-precision geohashing, at the cost of being a tree structure to maintain rather than a string in an ordinary column. Google's S2 library is a widely used refinement mapping the sphere onto cells with better distance properties than raw geohashing.",
            "Whichever you use, the index gives candidates, not answers. Cells are rectangles and the query is a circle, so results include points inside the cells but outside the radius. Always apply an exact distance filter to the candidate set. The index narrows a global search to a few hundred rows; precise geometry then does the final filtering, which is cheap on a small set. That two-stage shape - cheap approximate retrieval, then exact filtering - is the same pattern as candidate generation and ranking.",
          ],
        },
        {
          heading: "Moving objects and hot regions",
          body: [
            "Static points such as restaurants are easy: index once, query often. Moving objects such as delivery drivers are much harder, because every position update is an index write, and with a million drivers reporting every five seconds that is 200,000 index writes per second.",
            "Several things make it tractable. Do not write every update - if a driver has moved three metres, nothing meaningful changed, so update only on meaningful movement or on a slower schedule. Keep current positions in memory rather than in a durable index, since a live position is worthless in an hour and does not need the durability guarantees of a database. And separate the current-position index, which is small and hot, from any historical trail, which is large and cold and belongs in different storage entirely.",
            "Density is the other structural problem. Cells of uniform size mean a cell over Manhattan holds a hundred thousand drivers while one over farmland holds none. The dense cell is both a storage hotspot and a query hotspot, since it is also where the queries are. Adaptive partitioning is the answer: subdivide dense cells further so each cell holds a bounded number of objects. Quadtrees do this inherently; with geohashing you use longer prefixes in dense areas, which means precision varies by region and the query layer must know which precision applies where.",
            "Hot regions also concentrate reads. A city centre at rush hour receives an enormous share of all queries. Standard mitigations apply and are worth naming explicitly: cache query results for very short periods, since a nearby-drivers query is identical for many users within a few seconds; replicate hot cells across several nodes; and consider dedicated capacity for known-hot areas rather than hoping uniform hashing saves you, which it cannot when the imbalance is geographic and permanent.",
          ],
        },
        {
          heading: "Location privacy is a design constraint",
          body: [
            "Location history is among the most sensitive data a system can hold. It reveals home and workplace, medical appointments, religious attendance, and relationships. It is also, in most jurisdictions, legally regulated. This is not a compliance footnote to add later; it constrains the data model, and an interviewer raising it is testing whether you treat it as such.",
            "Precision should match purpose. A nearby-drivers feature needs metres; a weather feature needs kilometres; an analytics dashboard needs a city. Storing full precision because it is available is a liability. Truncating coordinates or storing only a coarse cell where that suffices reduces both storage and risk, and it is much easier to do at write time than to retrofit.",
            "Retention should be short by default and separate from operational state. Current position is operational and needed for minutes. Historical trails are a product feature that must be justified, given an explicit retention period, and deleted automatically when it expires. Systems that keep location indefinitely because deletion was never built are the ones that produce breaches with years of history in them.",
            "Aggregation deserves particular care because it feels safe and often is not. Location data is famously re-identifiable: a handful of coarse location points is usually enough to uniquely identify an individual, since almost nobody shares a home and workplace pair. So 'we only store aggregates' is not automatically a privacy control, and aggregates over small populations can be effectively individual.",
            "Finally, deletion must actually work. If a user deletes their history, it must disappear from the live index, the historical store, backups, caches, and analytics copies. Designing this in from the start - for instance by encrypting each user's location data under a per-user key so destroying the key destroys the data everywhere at once, including in backups you cannot rewrite - is far easier than adding it to a system where location has been copied into a dozen places.",
          ],
        },
      ],
      workedExample: {
        title: "Finding available drivers within 3 km",
        setup:
          "A ride-hailing product must find available drivers within 3 kilometres of a rider, in under 100 milliseconds. There are a million active drivers globally, reporting position every 4 seconds, and demand is heavily concentrated in a few dozen city centres.",
        steps: [
          "Choose the index and precision. Use geohash cells at a precision whose cells are roughly 1 kilometre across. A 3 kilometre radius then spans a small number of cells, and each cell holds a manageable number of drivers in typical areas. Precision is chosen from the query radius, not picked arbitrarily.",
          "Query with neighbour expansion, then filter exactly. Compute the rider's cell and the cells covering the 3 kilometre radius - the cell plus its neighbours - and fetch drivers in each. This returns perhaps a few hundred candidates including some just outside 3 kilometres. Apply an exact distance calculation to each and drop those beyond the radius. Skipping neighbour expansion would silently miss drivers 50 metres away across a boundary, which is the classic bug in this design.",
          "Keep positions in memory. A million drivers reporting every 4 seconds is 250,000 updates per second. These go to an in-memory geospatial store, not a durable database - a position 30 seconds old is worthless, so durability buys nothing and would cost everything. Suppress updates where a driver has barely moved, cutting write volume substantially.",
          "Subdivide dense cells. In central London a 1 kilometre cell might hold 5,000 drivers, making the query slow and the cell a write hotspot. Use finer precision in dense areas so no cell exceeds a bounded occupancy, and record the applicable precision per region so the query layer expands the right neighbours.",
          "Cache the hot path. In a busy district, many riders issue near-identical queries within seconds. Cache results keyed by cell with a 2 to 3 second TTL. Freshness loss is negligible against a 4 second reporting interval, and the load reduction in exactly the hottest areas is large.",
          "Constrain the data. Store only current position for matching, with historical trails kept separately, only where a product feature justifies them, with an explicit retention period and automatic deletion. Store the trail at coarser precision than the live index, since analytics does not need metres. Encrypt per-user so a deletion request is satisfiable everywhere, including in backups.",
        ],
        takeaway:
          "The index reduced a global search to a few hundred candidates, exact geometry produced the answer, and everything after that was handling the fact that geography is not uniform and location is sensitive. The steps most candidates omit are neighbour expansion, which causes a subtle correctness bug, and privacy, which is a design constraint on the data model rather than a policy document.",
      },
    },
    glossary: [
      { term: "Geohash", definition: "An encoding interleaving latitude and longitude bits into a single string, so nearby points usually share a prefix and proximity search becomes a prefix range scan." },
      { term: "Neighbour expansion", definition: "Querying a cell plus its adjacent cells, required because points just across a boundary are physically close but have different prefixes." },
      { term: "Quadtree", definition: "A structure recursively dividing space into four quadrants, subdividing only where dense - so it adapts to density naturally at the cost of maintaining a tree." },
      { term: "S2", expansion: "named after S-squared, the mathematical notation for a sphere - not an acronym", definition: "A spherical geometry library mapping the globe onto hierarchical cells with better distance and area properties than raw geohashing." },
      { term: "Exact distance filter", definition: "The precise geometric check applied to index candidates, needed because cells are rectangles and query areas are circles." },
      { term: "Candidate set", definition: "The approximate result from the spatial index, narrowed to an answer by exact filtering. The same cheap-then-exact pattern as candidate generation and ranking." },
      { term: "Adaptive partitioning", definition: "Varying cell size by density so each cell holds a bounded number of objects, since uniform cells make dense areas both storage and query hotspots." },
      { term: "Location freshness", definition: "How recently a moving object's position was reported. Determines update rate and whether positions need durable storage at all." },
      { term: "Hot region", definition: "A geographic area concentrating both data and queries. Cannot be fixed by uniform hashing, because the imbalance is geographic and persistent." },
      { term: "Precision reduction", definition: "Storing coordinates only as accurately as the purpose requires, cutting both storage and privacy risk. Far easier at write time than retrofitted." },
      { term: "Re-identification", definition: "Recovering an individual's identity from supposedly anonymous data. Location is highly re-identifiable, since few people share a home and workplace pair." },
      { term: "Crypto-shredding", definition: "Encrypting each user's data under a per-user key so destroying the key renders the data unreadable everywhere at once, including in backups that cannot be rewritten." },
    ],
  },

  "classic-crawler-frontier-politeness-dedupe": {
    primer: {
      plainSummary:
        "A web crawler downloads pages, extracts links, and downloads those too. Written naively it either crashes the sites it visits, gets trapped in infinitely generated URLs, or spends its life re-downloading the same content under different addresses. This module is about the queue that decides what to fetch next, the rules that make crawling polite enough to be tolerated, and the two distinct kinds of duplicate detection a crawler needs.",
      analogy:
        "A researcher working through a library's citations. They cannot read everything, so they prioritise. They cannot photocopy an entire collection in one afternoon without the library objecting, so they pace themselves per library rather than in total. They must notice when two references point to the same paper under different titles, and separately notice when two genuinely different references contain the same text. And they have to recognise when a catalogue is generating endless variations of the same entry and stop following it.",
      sections: [
        {
          heading: "The frontier: what to fetch next",
          body: [
            "The frontier is the crawler's queue of URLs to visit, and it is not a simple queue. It must answer 'what should I fetch right now?' subject to two constraints that pull in different directions: fetch the most valuable pages first, and do not hit any single host too often.",
            "The standard structure is two-level. The first level orders by priority - how valuable this URL is, based on estimated page importance, how often the page changes, and how long since it was last crawled. The second level groups by host and enforces a minimum delay between requests to each. Selecting a URL means taking the highest-priority one whose host is currently eligible, which is why a single priority queue is insufficient: the highest-priority URL is frequently on a host you must not contact yet.",
            "The frontier is large - billions of URLs - so it does not fit in memory and is backed by disk or a distributed store, with only the eligible working set held in memory. It must also be persistent, because a crawler that loses its frontier on restart loses all its scheduling state and effectively starts over.",
            "Recrawl scheduling shares the same structure. A news homepage changes hourly; an archived page may not change for years. Crawling both at the same rate wastes capacity on one and serves stale content for the other. So each page carries an estimated change rate, learned from observed changes, and its recrawl priority derives from that estimate together with its importance. Learning the rate from observation rather than assuming it is what keeps the crawl efficient over time.",
          ],
        },
        {
          heading: "Politeness is not optional",
          body: [
            "A crawler can trivially issue thousands of requests per second to one site, which is indistinguishable from a denial-of-service attack and will get you blocked, or worse. Politeness is what makes crawling sustainable, and it is a hard constraint rather than a courtesy.",
            "The first rule is robots.txt, a file at a site's root declaring which paths crawlers may visit and optionally a requested crawl delay. Fetch and cache it before crawling any host, honour it, and re-fetch periodically since it changes. Ignoring it is both a legal and reputational risk, and it is the first thing anyone investigating your crawler will check.",
            "The second is rate limiting per host, not globally. A global limit of a thousand requests per second says nothing about whether one small site is receiving all of them. Limits are per host, typically one request every one to several seconds, and adaptive - if a host starts responding slowly or returning 429 or 503, back off, because slow responses are a signal you are part of the problem.",
            "Note that per-host limits mean a large crawl must be wide rather than deep: to sustain throughput while contacting each host slowly, you must crawl many hosts concurrently. This shapes the whole architecture, since the frontier must always have eligible URLs across thousands of distinct hosts, and it is why the two-level structure exists.",
            "Two subtleties. Politeness is per host, but many hostnames can share one server, so a per-IP limit is a useful additional guard. And crawl traps - calendars generating infinite future dates, session IDs producing endless unique URLs, deliberately generated infinite link mazes - will consume a crawler indefinitely if unguarded. Defences are bounding crawl depth per host, capping URLs per host, detecting URL patterns that generate unbounded variation, and detecting when fetched pages are near-identical despite different URLs.",
          ],
        },
        {
          heading: "Two different duplicate problems",
          body: [
            "Crawlers need two distinct kinds of deduplication, and conflating them causes real bugs.",
            "URL deduplication asks whether this address has been seen before, and happens before fetching. The difficulty is that the same page has many addresses: with and without www, http and https, with tracking parameters, with a trailing slash, with query parameters in different orders. So URLs are canonicalised into a normal form first - lowercase the host, remove default ports and known tracking parameters, sort query parameters, resolve relative paths - and only then compared. Canonicalisation quality directly determines how much of your crawl budget is wasted on duplicates.",
            "Storing billions of seen URLs exactly is expensive, so crawlers use a Bloom filter: a compact probabilistic structure that answers 'definitely not seen' or 'possibly seen'. It can produce false positives, meaning a URL is occasionally skipped although it was never crawled. That is an acceptable loss for a crawler, since missing an occasional page is fine and the memory saving is enormous - but note the direction of the error, because a structure whose false positives caused duplicate crawling instead would be useless.",
            "Content deduplication asks whether this page's content has been seen before, and happens after fetching. Different URLs frequently serve identical or near-identical content - syndicated articles, printer-friendly versions, mirrors. An exact hash catches identical content. Near-duplicates need a similarity-preserving fingerprint such as SimHash or MinHash, where similar documents produce similar fingerprints so near-duplicates can be detected by comparing them, which an ordinary hash cannot do because it is designed to make similar inputs produce completely different outputs.",
            "Both matter for different reasons. URL deduplication saves the fetch entirely, which is bandwidth and politeness budget. Content deduplication saves storage and index space and prevents search results filled with the same article ten times. A crawler needs both, and each protects a different resource.",
          ],
        },
      ],
      workedExample: {
        title: "A crawler that stalls and gets blocked",
        setup:
          "A crawler is fetching 500 pages per second and needs to reach 5,000. Adding machines does not help - throughput barely moves. Meanwhile several large sites have blocked it, and storage is filling with what appears to be duplicate content.",
        steps: [
          "Diagnose the throughput ceiling. Fetch rate is limited by per-host politeness multiplied by the number of hosts currently eligible. At one request per second per host, 500 requests per second means only about 500 hosts are eligible at any moment. Adding machines cannot help, because the constraint is host diversity in the frontier, not fetch capacity - which is why the extra machines sat idle.",
          "Fix the frontier's host spread. The crawl had gone deep into a few large sites, so the frontier was full of URLs from a small number of hosts. Rebalance to keep many hosts eligible: cap the number of queued URLs per host, and prioritise breadth so newly discovered hosts enter the rotation quickly. Throughput becomes a function of host count, and reaching 5,000 per second needs roughly 5,000 eligible hosts.",
          "Find why sites blocked it. Two causes. Some hosts share IP addresses, so per-hostname limiting let one server receive several requests per second from what it saw as one crawler - add per-IP limiting. And the crawler ignored crawl-delay directives in robots.txt on sites that requested slower access. Honour them, and back off adaptively when a host's latency rises or it returns 429.",
          "Attack the duplicate storage. Sample the stored content and separate the two causes. Some duplicates are the same URL crawled twice, meaning canonicalisation is weak - tracking parameters and trailing slashes were producing distinct URLs for one page. Others are genuinely different URLs serving the same content, which canonicalisation cannot fix.",
          "Fix each with the right mechanism. Strengthen canonicalisation before the Bloom filter lookup, which prevents the fetch entirely. Add content fingerprinting after fetch, using SimHash to catch near-duplicates such as printer-friendly variants that differ only in boilerplate. The first saves bandwidth and politeness budget; the second saves storage and index quality.",
          "Guard against traps. One site's calendar was generating infinite future months, each a unique URL with unique content, which no duplicate detection catches because the pages genuinely differ. Add a per-host URL cap, a depth limit, and detection of URL patterns generating unbounded variation. Traps are a scheduling problem, not a deduplication problem, and must be solved in the frontier.",
        ],
        takeaway:
          "The throughput problem was not a capacity problem at all - it was frontier composition, which is why hardware did not help. That is the characteristic crawler lesson: the fetcher is trivial and every real constraint lives in the scheduling structure. Also note that the two duplicate problems needed two different mechanisms at two different pipeline stages, and that a trap needed a third, because it is a duplicate of nothing.",
      },
    },
    glossary: [
      { term: "Frontier", definition: "The crawler's queue of URLs to visit, ordered by priority and constrained by per-host eligibility. Large, persistent, and the source of most crawler complexity." },
      { term: "Two-level scheduling", definition: "Ordering by priority at one level and grouping by host at another, so the crawler can pick the best URL whose host is currently eligible." },
      { term: "robots.txt", definition: "A file at a site's root declaring which paths crawlers may access and optionally a requested delay. Must be fetched, cached, honoured, and periodically refreshed." },
      { term: "Crawl politeness", definition: "Limiting request rate per host, and per IP, so a crawl does not resemble an attack. A hard constraint that shapes the whole architecture toward breadth." },
      { term: "Adaptive backoff", definition: "Slowing requests to a host when its latency rises or it returns throttling responses, since those are signals the crawler is part of the problem." },
      { term: "Canonical URL", definition: "A normalised form of an address - consistent scheme and host, tracking parameters removed, query parameters sorted - so equivalent URLs compare equal." },
      { term: "URL deduplication", definition: "Checking before fetching whether an address has been seen, saving the request entirely. Depends on canonicalisation quality." },
      { term: "Bloom filter", definition: "A compact probabilistic set that reports definitely-absent or possibly-present. Its false positives cause an occasional skipped page, which a crawler can tolerate." },
      { term: "Content fingerprint", definition: "A hash of fetched content used to detect that different URLs served the same page. Complements URL deduplication, which cannot detect this." },
      { term: "SimHash / MinHash", definition: "Similarity-preserving fingerprints where near-duplicate documents produce near-identical values, enabling near-duplicate detection that ordinary hashing cannot provide." },
      { term: "Crawl trap", definition: "A site generating unbounded distinct URLs, such as an infinite calendar. Content differs genuinely, so it must be handled by frontier limits rather than by deduplication." },
      { term: "Recrawl priority", definition: "How soon a page should be revisited, derived from its importance and an observed estimate of how often it changes." },
    ],
  },

  "classic-inverted-index-incremental-serving": {
    primer: {
      plainSummary:
        "Searching billions of documents for a phrase cannot work by reading each document, so search engines invert the problem: instead of documents pointing to their words, words point to their documents. This module covers that structure, the trick of handling updates by writing new immutable files rather than modifying existing ones, and how a query is answered across a fleet of machines each holding part of the index.",
      analogy:
        "The index at the back of a textbook. Rather than reading every page to find 'photosynthesis', you look it up once and get a list of page numbers. Building that index took effort, and it must be redone when the book changes - which is why a publisher does not re-index for a single corrected sentence. They collect corrections and issue a new edition, and search engines do exactly the same thing with immutable segments.",
      sections: [
        {
          heading: "The inverted index",
          body: [
            "An inverted index has two parts. The term dictionary maps each distinct term to a pointer, and the postings list for a term is the list of document IDs containing it. Searching for a word is one dictionary lookup and one list read, with cost proportional to how many documents contain the word rather than to how many documents exist. That independence from corpus size is the whole point.",
            "Multi-word queries become set operations over postings lists. Documents containing both 'distributed' and 'systems' are the intersection of the two lists, which is efficient when both are kept sorted by document ID - you walk them together. Since the cost of an intersection is dominated by the longer list, engines start with the rarest term to eliminate candidates fastest.",
            "Postings lists are enormous and are compressed aggressively. Because IDs are sorted, storing the gaps between consecutive IDs instead of the IDs themselves yields small numbers that encode in few bits. This is delta encoding, and it is the reason a web-scale index is storable at all.",
            "Lists often carry more than IDs. Term frequency - how often the term appears in that document - feeds ranking. Positions, which record where in the document each occurrence sits, allow phrase queries by checking that the terms appear adjacently. Positions multiply index size substantially, so they are stored only when phrase search is required, which is a real design decision rather than a default.",
            "Before indexing, text is analysed: split into tokens, lowercased, and often reduced to root forms so that 'running' and 'runs' match 'run'. The critical rule is that the same analysis must be applied to queries as to documents. If documents are stemmed and queries are not, a search for 'running' will not match a document indexed under 'run', and the failure is silent - results are simply missing, with no error anywhere.",
          ],
        },
        {
          heading: "Updating an index without rewriting it",
          body: [
            "Postings lists are sorted and compressed, so inserting one document into the middle of a list would mean rewriting it. For a term appearing in a billion documents, that is impossible per update. Search engines therefore never modify an index in place.",
            "Instead new documents accumulate in memory and are periodically written out as a segment: a small, complete, immutable inverted index over just those documents. A query searches every segment and merges the results. Since segments are immutable, they need no locking, are trivially cacheable, and can be copied to other machines safely.",
            "Deletes and updates work by exception rather than by modification. A deleted document is recorded in a deletion list, and query results are filtered against it. An update is a delete plus an insert into a new segment. The document's old version is still physically present but is filtered out at query time. This is the same tombstone idea as in LSM trees, and search engines are essentially LSM structures over postings.",
            "Segments accumulate, and searching a hundred of them is slower than searching ten, so a background merge combines small segments into larger ones, physically dropping deleted documents in the process. Merging is expensive I/O competing with live queries, which is why search clusters show periodic latency variation and why merge scheduling is a tuning concern rather than an implementation detail.",
            "Publishing must be atomic: a query must see either the old set of segments or the new one, never a partial state where a segment is half-written. This is done by writing new segments, then atomically swapping a small commit point naming the current set. Once again a small metadata write is the commit point for a large data write, which is the same technique as the upload manifest.",
            "The consequence to state plainly is that search is near-real-time rather than real-time. A document becomes visible when the segment containing it is published, typically a second or so later. That is a genuine trade-off, not an implementation shortcoming, and the alternative - visible immediately - would require modifying the index in place, which is what makes the whole structure impossible.",
          ],
        },
        {
          heading: "Serving queries across a fleet",
          body: [
            "One machine cannot hold a web-scale index, so it is partitioned - and the choice of partitioning scheme is consequential. Document partitioning gives each machine a subset of documents and a complete index over them. Every query goes to every partition, each returns its best results, and a broker merges them. Term partitioning instead splits by term, so a machine holds complete postings for some terms; a query then contacts only the machines holding its terms, but multi-term queries must ship large postings lists between machines. Document partitioning wins in practice almost universally, because it keeps each query's work local even though it involves every machine.",
            "So a query broker fans out to all partitions, each searches its segments and returns its top candidates with scores, and the broker merges them into a final ranking. Latency is therefore set by the slowest partition, which is the defining property of scatter-gather: as fleet size grows, the chance that some partition is slow approaches certainty. Tail latency becomes the dominant concern, and the standard mitigations are hedged requests - sending a duplicate to a replica after a short delay and taking whichever answers first - and returning partial results from the partitions that answered in time rather than waiting for stragglers.",
            "Ranking is usually two-phase for cost reasons. Each partition scores candidates cheaply, often with a formula such as BM25 that rewards rare terms and penalises very long documents. The broker then re-ranks the merged top candidates with a much more expensive model. This is the same cheap-wide, expensive-narrow pattern as feed ranking and geospatial search, and recognising it as one pattern rather than three is worth doing aloud.",
            "Pagination has a specific trap here. Requesting results 1,000 to 1,010 requires every partition to return its top 1,010 so the broker can merge correctly, because any partition could contribute all of them. Deep pagination therefore costs the whole fleet proportionally more, which is why search products cap result depth - a limit that is an architectural consequence rather than a product whim.",
          ],
        },
      ],
      workedExample: {
        title: "Making newly published documents searchable within a second",
        setup:
          "A documentation site with 50 million documents must make an edit searchable within about a second, serve queries at p99 under 200 milliseconds, and handle 10,000 edits per minute.",
        steps: [
          "Rule out in-place updates immediately. Modifying postings lists per edit would mean rewriting compressed sorted lists thousands of times a minute, so accept the segment model: buffer edits in memory and flush a new segment on a schedule.",
          "Set the flush interval from the freshness requirement. A one second visibility target means flushing roughly every second, so a document is searchable within one flush interval plus the publish. This directly determines segment count growth: 60 segments per minute, which is precisely why merging is not optional.",
          "Handle edits as delete plus insert. An edited document gets a tombstone for its old version and a fresh entry in the new segment. Queries filter against the deletion list, so the stale version is never returned even though it is still physically present until a merge removes it.",
          "Merge on a tiered schedule. Combine small segments into progressively larger ones so segment count stays bounded - typically tens rather than thousands - while avoiding constant rewriting of large segments. Throttle merge I/O so it cannot starve queries, accepting slightly higher segment counts during peak traffic in exchange for stable latency.",
          "Publish atomically. Write the new segment fully, then swap the commit point naming the active segment set in one atomic operation. Queries see the old set or the new set. In-flight queries continue against the segments they started with, so those files are deleted only once no query references them.",
          "Serve with document partitioning and control the tail. Split 50 million documents across partitions, each holding a complete index over its subset, with replicas for both capacity and hedging. The broker fans out, and after 150 milliseconds sends hedged requests to replicas of partitions that have not answered, returning the best available results at the deadline rather than waiting. Cap result depth so deep pagination cannot force every partition to produce thousands of candidates.",
        ],
        takeaway:
          "Immutability was the decision everything followed from: it made concurrent search lock-free, made publishing atomic via a small commit point, made merging a background concern rather than a query-path concern, and made near-real-time the honest description of freshness. Being able to say why an index cannot simply be updated in place is what separates understanding the structure from having memorised its name.",
      },
    },
    glossary: [
      { term: "Inverted index", definition: "A mapping from each term to the documents containing it, making query cost proportional to how many documents contain the term rather than to corpus size." },
      { term: "Term dictionary", definition: "The structure mapping each distinct term to the location of its postings list." },
      { term: "Postings list", definition: "The sorted list of document IDs containing a term, optionally with frequencies and positions." },
      { term: "Delta encoding", definition: "Storing gaps between consecutive sorted IDs rather than the IDs themselves, yielding small numbers that compress well. What makes web-scale indexes storable." },
      { term: "Term frequency", definition: "How often a term appears in a document. A basic ranking signal." },
      { term: "Positions", definition: "Where in a document each term occurrence sits, required for phrase queries and a substantial addition to index size." },
      { term: "Analysis (tokenisation, stemming)", definition: "Converting text into indexed terms by splitting, lowercasing, and reducing to root forms. Must be applied identically to queries, or matches silently fail." },
      { term: "Segment", definition: "A small immutable inverted index over a batch of documents. Queries search all segments and merge results." },
      { term: "Immutability", definition: "The property that segments are never modified, which makes concurrent search lock-free, publishing atomic, and merging a background task." },
      { term: "Deletion list (tombstones)", definition: "A record of deleted documents used to filter query results, since the documents cannot be removed from an immutable segment." },
      { term: "Segment merge", definition: "Background combination of small segments into larger ones, physically dropping deleted documents. Competes with queries for I/O." },
      { term: "Commit point", definition: "A small atomically-swapped record naming the current set of segments, so queries never observe a partially published index." },
      { term: "Near-real-time search", definition: "Visibility delayed by one flush interval, the honest consequence of never modifying an index in place." },
      { term: "Document partitioning", definition: "Giving each machine a subset of documents with a complete index over them. Every query touches every partition, but each partition's work stays local." },
      { term: "Term partitioning", definition: "Splitting by term so each machine holds complete postings for some terms. Fewer machines per query, but multi-term queries must ship large lists between them." },
      { term: "Query broker", definition: "The component that fans a query out to partitions and merges their results. Its latency is set by the slowest partition." },
      { term: "Hedged request", definition: "Sending a duplicate request to a replica after a short delay and using whichever responds first, to cut tail latency in scatter-gather." },
      { term: "BM25", expansion: "Best Match 25", definition: "A standard ranking function scoring documents by term frequency and rarity, with a penalty for document length. Cheap enough to run per partition." },
    ],
  },

  "classic-observability-ingestion-cardinality-retention": {
    primer: {
      plainSummary:
        "Observability is how you find out what a system is doing when it misbehaves, and it is itself a large distributed system that must stay up precisely when everything else is failing. This module covers the three kinds of telemetry, the ingestion path that must not lose data during an incident, and the one property - cardinality - that quietly destroys monitoring systems more often than volume does.",
      analogy:
        "Instruments in an aircraft cockpit. Gauges give you continuously updated numbers you can watch at a glance - that is metrics. The flight recorder captures detailed sequences you consult after something happens - that is logs and traces. The essential design constraint is that instruments must keep working during the emergency, which is why they are on independent power. Monitoring that depends on the system it monitors is a gauge wired to the engine that just failed.",
      sections: [
        {
          heading: "Three telemetry types with different economics",
          body: [
            "Metrics are numeric measurements over time - request rate, error count, latency percentiles. They are pre-aggregated, so a counter incremented a million times still stores one number per interval. This makes them extremely cheap and makes them the right basis for dashboards and alerts. What they cannot do is tell you about one specific request, because that detail was aggregated away at collection.",
            "Logs are timestamped records of discrete events, carrying full detail. They answer 'what happened to this particular request' precisely, and they cost orders of magnitude more than metrics because nothing is aggregated. Structured logs - key-value fields rather than free text - are worth insisting on, because unstructured messages force expensive parsing at query time and cannot be filtered efficiently.",
            "Traces follow one request across services, recording each span with its timing and parent. They are the tool for 'where did the 2 seconds go in a call touching nine services', which neither metrics nor logs answer. Traces are usually sampled, since tracing every request at full detail costs more than the system being traced - typically a small percentage of normal traffic plus a much higher rate for errors and slow requests, which is where the information actually is.",
            "The practical division of labour: alert on metrics because they are cheap and stable; investigate with traces to find where the problem is; and read logs to find out exactly what happened. A system that alerts on log searches is expensive and slow at the moment it can least afford either.",
          ],
        },
        {
          heading: "Cardinality is the thing that kills you",
          body: [
            "Metrics carry labels - dimensions such as service, endpoint, region. A time series exists for every distinct combination of label values, and the number of series is the product of the cardinalities of the labels. This multiplication is the trap.",
            "Ten services times fifty endpoints times five status codes is 2,500 series - entirely fine. Add a user ID label with a million values and it becomes 2.5 billion series. Each series has its own storage, its own index entry, and its own in-memory state. The system does not degrade gracefully; it runs out of memory and stops, and it usually stops during an incident because that is when someone adds a debugging label.",
            "So the rule is that labels must be bounded and low-cardinality. Never label metrics with user IDs, request IDs, email addresses, full URLs containing identifiers, or raw error messages. Anything unbounded belongs in logs or traces, which are designed for high cardinality because they are not pre-aggregated per combination.",
            "Because a single team can take down shared monitoring with one bad label, the platform must enforce limits rather than rely on discipline: cap series per tenant, reject new series past a threshold, and alert on cardinality growth before the limit is reached. Multi-tenant observability without per-tenant quotas is a system where any team can break monitoring for everyone.",
            "Logs have the analogous problem in a different form: volume. A single debug statement in a hot loop can produce terabytes per day and drown everything else. Sampling, per-service rate limits, and per-tenant quotas are the equivalent controls, and they matter for the same reason - shared capacity with no isolation means one mistake is everyone's outage.",
          ],
        },
        {
          heading: "Ingestion that survives the incident, and retention that pays for itself",
          body: [
            "The ingestion path runs from an agent on each host, to collectors, to a durable stream, to storage. The most important property is that telemetry volume spikes exactly when the system is failing - errors multiply, retries multiply, and everyone opens dashboards at once. So the ingestion path must be sized for incident load, not for normal load, and it must degrade gracefully rather than collapse.",
            "Agents buffer locally so that a brief collector outage does not lose data, with a bounded buffer that drops the oldest data when full - a bound is essential, since an unbounded telemetry buffer will consume the memory of the application it is observing and turn a monitoring outage into an application outage. Collectors write to a durable partitioned stream, which decouples ingestion from storage so that slow storage causes lag rather than loss.",
            "The independence rule matters most here: monitoring must not depend on the systems it monitors. If dashboards run on the same cluster, the same database, or the same network path as production, you lose visibility exactly when you need it. This is why observability typically runs in separate infrastructure with separate credentials, and why an alerting path that requires the production network to deliver a page is not an alerting path.",
            "Retention is where cost is decided. Raw high-resolution data is valuable for hours, occasionally days, and rarely beyond. The standard answer is tiering with downsampling: keep full resolution for a short window, then progressively aggregate to coarser intervals - per-second for a day, per-minute for a month, per-hour for a year. Storage falls dramatically while long-term trends remain answerable, because nobody examines per-second data from eight months ago but everybody wants the yearly trend.",
            "Logs tier by moving from indexed hot storage to compressed cold object storage, where they remain queryable slowly and cheaply. Decide retention from what questions must be answerable and from regulatory requirements, and set it deliberately - an unset retention policy means keeping everything forever, which is the most expensive possible choice and is usually arrived at by accident.",
          ],
        },
      ],
      workedExample: {
        title: "The metrics system falls over during an incident",
        setup:
          "An API is degraded. An engineer adds a customer ID label to the request-latency metric to identify which customers are affected. Twenty minutes later the metrics system runs out of memory and stops ingesting. Nobody can see anything, and the original incident is still in progress.",
        steps: [
          "Identify the mechanism. The latency metric had 2,000 series across service, endpoint, and status. Adding customer ID with 200,000 active customers multiplied it to 400 million series. Each needs memory and an index entry, and the system exhausted memory within minutes. The volume of data points barely changed; it was the number of distinct series that mattered, which is why this is called a cardinality problem rather than a volume problem.",
          "Recover in the right order. Remove the offending label first, then drop the affected series, then restart ingestion. Restarting before removing the label simply reproduces the failure - and under incident pressure that mistake is common, which is why the order is worth stating.",
          "Prevent it structurally rather than by asking people to be careful. Enforce a per-metric series limit that rejects new series past a threshold and reports the rejection loudly. The metric loses new dimensions instead of the platform losing all metrics - a bounded local failure replacing an unbounded global one.",
          "Give the engineer what they actually wanted. The real question was 'which customers are affected', which is a high-cardinality question and therefore belongs in traces or logs, not metrics. Add customer ID as a trace attribute and log field, where high cardinality is expected. The question is answerable and the metrics system is unaffected.",
          "Add early warning. Alert on cardinality growth rate, not just on the absolute limit, so a new deployment introducing a bad label is caught within minutes rather than at the point of exhaustion. This is the difference between an alert that prevents an outage and one that describes it.",
          "Check the independence property. Confirm that dashboards and alerting do not depend on the production cluster, and that at least one alerting path can deliver a page without the production network. Losing observability during an incident is bad; losing the ability to be told about the next incident is worse.",
        ],
        takeaway:
          "The failure came from a well-intentioned change during an incident, which is exactly when changes are least reviewed and most dangerous. Two lessons generalise: cardinality is a multiplicative property that must be bounded by the platform rather than by discipline, and each telemetry type has a shape of question it fits - forcing a high-cardinality question into metrics is what broke this system.",
      },
    },
    glossary: [
      { term: "Metrics", definition: "Pre-aggregated numeric measurements over time. Cheap and stable, so they are the right basis for dashboards and alerts, but they cannot describe an individual request." },
      { term: "Logs", definition: "Timestamped records of discrete events with full detail. Answer what happened to a specific request, at far higher cost than metrics." },
      { term: "Structured logging", definition: "Emitting logs as key-value fields rather than free text, so they can be filtered and aggregated without expensive query-time parsing." },
      { term: "Traces and spans", definition: "A record of one request's path across services, each span carrying timing and parent. The tool for locating where latency was spent." },
      { term: "Sampling", definition: "Recording only a fraction of traces or logs, usually with a higher rate for errors and slow requests, since that is where the information is." },
      { term: "Cardinality", definition: "The number of distinct time series, equal to the product of label cardinalities. The multiplicative property that makes one unbounded label catastrophic." },
      { term: "Label (dimension)", definition: "A key-value pair attached to a metric. Must be bounded and low-cardinality; unbounded values belong in logs or traces." },
      { term: "Series limit / quota", definition: "A platform-enforced cap on series per metric or tenant, which converts an unbounded global failure into a bounded local one." },
      { term: "Agent and collector", definition: "The per-host process that gathers telemetry and the service that receives it. Agents buffer with a bounded buffer so monitoring cannot consume the application's memory." },
      { term: "Durable stream buffer", definition: "A partitioned log between collection and storage, so slow storage causes lag rather than data loss." },
      { term: "Monitoring independence", definition: "The requirement that observability not depend on the systems it observes, since shared dependencies fail together exactly when visibility is needed." },
      { term: "Downsampling", definition: "Aggregating older data to coarser time resolution, cutting storage while preserving the long-term trends anyone actually queries." },
      { term: "Retention tier", definition: "A storage class with a defined resolution and lifetime - hot indexed, warm compressed, cold object storage. Unset retention means keeping everything forever by accident." },
    ],
  },

  "classic-slos-backpressure-degradation": {
    primer: {
      plainSummary:
        "Reliability is not a feeling, and 'the system should be fast' is not a target anyone can act on. This module is about defining reliability as a number that reflects what users experience, using the gap between that number and perfection as a budget you may deliberately spend, and building systems that give users something useful when they cannot give them everything.",
      analogy:
        "A restaurant during an unexpected rush. The failing response is to accept every table, take every order, and serve everyone ninety minutes late with cold food - everybody has a bad evening and the kitchen achieves nothing. The professional response is to cap seating, tell people waiting how long it will be, and shorten the menu to what the kitchen can produce well. Fewer people are served, everyone served gets a real meal, and the restaurant is still standing tomorrow. That is admission control and graceful degradation.",
      sections: [
        {
          heading: "Defining reliability as a number users would recognise",
          body: [
            "A service level indicator, or SLI, is a measurement of some aspect of service quality, expressed as the proportion of good events out of valid events - for example, the fraction of requests returning successfully within 300 milliseconds. A service level objective, or SLO, is a target for that indicator, such as 99.9 percent over 30 days. A service level agreement, or SLA, is a contractual promise with consequences, and is normally set looser than the internal SLO so that you notice a problem before a customer can invoke a penalty.",
            "The subtlety that determines whether an SLO is worth anything is the definition of the event population. Averages hide the users having a bad time: a service can average 50 milliseconds while five percent of users wait four seconds, so measure percentiles rather than means. Count only events the service is responsible for, since requests rejected as malformed are not the service failing. And measure as close to the user as possible - server-side latency omits network time, queueing, and client rendering, all of which the user experiences and none of which appears in your server metrics.",
            "The population also needs weighting by what matters. A million cheap health checks succeeding can mask a thousand checkout failures if both count equally. Define SLIs per critical user journey rather than per endpoint, so the number moves when users are actually hurt.",
            "Finally, be deliberate about the target. Every extra nine costs disproportionately more, and 99.99 percent means about four minutes of error budget per month, which is less than one deployment gone wrong. If the product does not need it, choosing it anyway means spending engineering capacity on reliability nobody values and forbidding change that nobody objected to.",
          ],
        },
        {
          heading: "Error budgets and alerting on burn rate",
          body: [
            "The error budget is the complement of the SLO: a 99.9 percent target permits 0.1 percent failure, which over 30 days is roughly 43 minutes. This reframing is the useful part, because it turns reliability from a moral question into an accounting one. The budget is not a failure to be minimised to zero; it is a resource to be spent on shipping. Budget remaining means ship; budget exhausted means stop shipping features and fix reliability. That gives product and engineering a shared, pre-agreed decision rule instead of an argument during an incident.",
            "Alerting is where most teams go wrong, and the error budget fixes it. Alerting on a raw threshold - 'error rate above one percent' - produces constant noise from brief harmless blips and misses slow persistent degradation that quietly consumes the entire budget over a week.",
            "Burn-rate alerting solves both. Burn rate is how fast the budget is being consumed relative to the rate that would exactly exhaust it over the window. A burn rate of 1 exhausts the budget precisely at the end of the period; a burn rate of 14.4 exhausts it in about two days. So you alert on multiple windows at once: a high burn rate over a short window catches a sudden severe outage within minutes, while a lower burn rate over a longer window catches slow degradation that would never trip a threshold alert. Every alert is then proportional to actual user harm, which is what makes it worth waking someone for.",
            "This also gives a principled answer to which alerts should page. Page for burn rates that threaten the budget; use tickets for anything slower. An alert that does not correspond to budget consumption is not describing user impact, and paging on it is how on-call rotations become unsustainable.",
          ],
        },
        {
          heading: "Admission control and graceful degradation",
          body: [
            "Meeting an SLO under overload requires refusing work, and this is counter-intuitive enough to be worth stating plainly: past saturation, accepting more requests reduces the number of successful ones. Everything slows, more requests exceed their deadlines, and the system spends its entire capacity producing answers that are discarded. Serving 70 percent of traffic well beats serving 100 percent of it too slowly to be useful.",
            "Bounded queues are the foundation. An unbounded queue does not absorb overload; it converts a fast, cheap rejection into a slow timeout while consuming memory, and it destroys latency because every request waits behind a backlog. Bound every queue and reject when full - a rejection a client can retry elsewhere is far more useful than a timeout after thirty seconds.",
            "Load shedding decides who gets rejected, and it should not be random. Shed by priority: health checks and critical user journeys survive; batch jobs, prefetching, and analytics are dropped first. This requires requests to carry a priority, which means the concept must exist in your APIs before the incident. Retries should be shed before first attempts, since shedding retries reduces load without denying anyone their first try.",
            "Graceful degradation is the more valuable half. Instead of failing, return a reduced answer: unpersonalised results when the ranking service is down, cached data with a staleness note when the database is slow, the page without the recommendation carousel. Each dependency should be classified in advance as essential or optional, with a defined fallback for the optional ones. This classification is a product decision, and making it during an incident guarantees it is made badly.",
            "One warning: fallbacks are code paths that run rarely and therefore rot silently. A cached fallback whose cache was never populated, or a degraded path that throws because a field is null, fails exactly when needed. Exercise them deliberately - fault injection, game days, or routing a small share of traffic through the degraded path continuously - or you have the appearance of resilience without the substance.",
          ],
        },
      ],
      workedExample: {
        title: "Setting an SLO and surviving a traffic spike",
        setup:
          "A checkout service handles 5,000 requests per second normally and 20,000 during flash sales. The business cares that customers can complete purchases. There is currently a CPU alert that pages constantly and is routinely ignored.",
        steps: [
          "Define the SLI from the user journey, not the endpoint. The indicator is the proportion of checkout attempts that complete successfully within 2 seconds, measured at the edge so it includes network and queueing time. Requests rejected for invalid payment details are excluded, since those are not the service failing. Health checks are excluded entirely, or they would dilute the number until it stops moving.",
          "Set a target the business can justify. 99.9 percent over 30 days gives roughly 43 minutes of budget. Ask what a failed checkout costs, and whether 99.99 percent - about 4 minutes - is worth the engineering it demands. For most checkout flows 99.9 is the honest answer, and choosing it deliberately is better than defaulting to four nines nobody will fund.",
          "Replace the CPU alert. CPU is a cause, not a symptom, and high CPU with users unaffected is not an incident - which is why the existing alert is ignored, and an ignored alert is worse than none. Alert instead on burn rate: page on a 14.4x burn over one hour, catching severe outages within minutes; open a ticket on a 3x burn over six hours, catching slow degradation that would consume the budget invisibly.",
          "Size and bound the queues for the spike. At 20,000 requests per second against capacity for 12,000, queues will fill. Bound them so excess requests are rejected in milliseconds rather than timing out after 30 seconds - a fast rejection lets a client retry or show a clear message, while a timeout consumes a connection and a thread for the full duration and produces the same outcome.",
          "Shed by priority and classify dependencies. Reject retries before first attempts, and drop analytics and recommendation traffic before checkout traffic. Classify each dependency: the payment service is essential and its failure is a real error; the recommendation service is optional and its failure means rendering checkout without recommendations; the loyalty-points service is optional and its failure means applying points asynchronously afterwards.",
          "Verify the fallbacks actually work. Route one percent of production traffic through the degraded path continuously, so the code that runs during an incident is code that ran successfully an hour ago. A fallback exercised only during incidents is a fallback whose first real test happens under maximum pressure.",
        ],
        takeaway:
          "The SLO turned reliability into a number tied to user experience, which then produced everything else: which alerts deserve a page, how much unreliability may be spent on shipping, and what to shed when capacity runs out. Note especially that the ignored CPU alert was not a tuning problem - it was measuring the wrong thing, and no threshold adjustment would have fixed it.",
      },
    },
    glossary: [
      { term: "SLI", expansion: "service level indicator", definition: "A measurement of service quality as the proportion of good events out of valid events. Its value depends entirely on how the event population is defined." },
      { term: "SLO", expansion: "service level objective", definition: "A target for an SLI over a window, such as 99.9 percent over 30 days. The number engineering designs and alerts against." },
      { term: "SLA", expansion: "service level agreement", definition: "A contractual reliability promise with consequences, normally set looser than the internal SLO so problems are noticed before penalties apply." },
      { term: "Error budget", definition: "The permitted failure implied by an SLO - 0.1 percent is about 43 minutes per 30 days. A resource to spend on shipping, not a failure to drive to zero." },
      { term: "Burn rate", definition: "How fast the error budget is being consumed relative to the rate that would exactly exhaust it over the window. A burn rate of 1 exhausts it exactly on time." },
      { term: "Multi-window alerting", definition: "Alerting on a high burn rate over a short window and a lower burn rate over a long one, catching both sudden outages and slow degradation." },
      { term: "Critical user journey", definition: "An end-to-end flow that matters to users, such as completing checkout. SLIs defined per journey move when users are hurt; per-endpoint SLIs often do not." },
      { term: "Bounded queue", definition: "A queue with a maximum depth that rejects when full. Unbounded queues do not absorb overload; they convert cheap rejections into expensive timeouts." },
      { term: "Admission control", definition: "Deciding at entry whether to accept a request, so the system takes on only work it can complete within its deadline." },
      { term: "Load shedding", definition: "Rejecting requests by priority when overloaded, so critical journeys survive. Requires priority to exist in the API before the incident." },
      { term: "Graceful degradation", definition: "Returning a reduced but useful response when a dependency fails - unranked results, stale data, a page without an optional component." },
      { term: "Essential vs optional dependency", definition: "A pre-incident classification of which dependencies may fail without failing the request, and what the fallback is for each." },
      { term: "Fault injection / game day", definition: "Deliberately causing failures to verify fallbacks work, because rarely-executed degraded paths rot silently and fail exactly when needed." },
    ],
  },

  "classic-multi-region-disaster-recovery": {
    primer: {
      plainSummary:
        "Running in several geographic regions can serve users faster and survive the loss of an entire datacentre, but it forces a decision that cannot be avoided: when regions cannot talk to each other, do you keep accepting writes in both and risk divergence, or stop and stay correct? This module is about making that choice per kind of data, and about the recovery numbers that turn 'we have backups' into a plan.",
      analogy:
        "A company with offices in two cities keeping synchronised records. If the phone line between them fails, either both offices keep working and later discover they have booked the same meeting room to two people, or one office stops and waits. There is no third option, and pretending otherwise is what produces the double booking. What a good plan does is decide in advance which records may diverge and be merged later, and which must stop rather than risk it.",
      sections: [
        {
          heading: "Three topologies, chosen per data type",
          body: [
            "Active-passive runs everything in one region while a second stays warm, receiving replicated data and taking over on failure. It is by far the simplest, because exactly one region ever accepts writes so there is nothing to reconcile. The costs are that the standby is mostly idle, users far from the active region see high latency, and failover is a discrete event that can go wrong under pressure.",
            "Active-active accepts writes in every region. Users get local latency, capacity is used everywhere, and losing a region means routing traffic away rather than performing a failover. The cost is that concurrent writes to the same data in different regions must be reconciled, which reintroduces every conflict problem - and if the data has invariants such as uniqueness or a non-negative balance, no reconciliation strategy works, because the invariant was violated at the moment both writes were accepted.",
            "Home region, sometimes called partitioned ownership, is the pattern that usually wins in practice and is worth proposing by name. Each entity - a user, a tenant, an account - has one region that owns its writes. All regions serve reads locally from replicas, but a write is routed to the owning region. There are no concurrent conflicting writes anywhere, because each piece of data has exactly one writer, while most users still get local latency for the reads that dominate their traffic.",
            "The choice should be made per data type rather than for the system as a whole, and being able to make that distinction is the senior signal here. Account balances need single ownership. User profiles can be active-active with last-writer-wins, since a lost profile edit is recoverable and mild. Session data can be regional and simply lost on failover, forcing a re-login. Analytics can be written anywhere and merged, since it is aggregate and approximate by nature. Saying 'this system is active-active' is nearly always less accurate than saying which data is.",
          ],
        },
        {
          heading: "Replication, failover, and the danger of the recovery itself",
          body: [
            "Cross-region replication is asynchronous in nearly every real system, because a round trip between continents is 100 milliseconds or more and no interactive write can wait for it. Asynchronous replication means the remote region is always slightly behind, and that lag is precisely the data you lose in a sudden failover. Synchronous cross-region replication exists but you must be honest about its cost - every write pays the round trip, and an unreachable remote region makes writes fail.",
            "Failover has three parts that must all work: detecting the failure, promoting the standby, and redirecting traffic. Each has a failure mode. Detection can be wrong, since a network partition between your monitoring and the primary looks exactly like the primary being dead. Promotion may need to complete without full information about what the old primary committed. Redirection through DNS is slow because of cached TTLs, which is why global load balancers using anycast or health-checked routing are preferred - they redirect in seconds rather than in minutes.",
            "The most dangerous failure is split brain: the old primary is alive but unreachable, the standby is promoted, and now two regions accept writes. Both believe they are authoritative and the resulting divergence may be impossible to merge. The defence is fencing - a monotonically increasing epoch number attached to leadership, with storage rejecting writes from an older epoch, so the old primary's writes are refused even if it never learns it was deposed. Any design that includes failover needs an answer to 'what stops the old primary writing?', and 'it will notice' is not one.",
            "Failback deserves as much thought as failover and usually gets none. Returning to the original region means reconciling anything written in the standby, replicating it back, and switching again - a second risky transition, performed under less urgency but often with less care. Practise it, because an unpractised failback is how a resolved incident becomes a second incident.",
          ],
        },
        {
          heading: "RPO, RTO, and backups that have been restored",
          body: [
            "Two numbers turn vague intentions into a plan. The recovery point objective, or RPO, is how much data you can afford to lose, measured in time: an RPO of five minutes means a disaster may cost the last five minutes of writes. The recovery time objective, or RTO, is how long you can afford to be down. Both are business decisions, and both determine architecture directly - an RPO of zero requires synchronous replication and its latency cost, while an RTO of one minute rules out any process involving a human decision.",
            "Backups are not replication and do not substitute for it. Replication propagates everything faithfully, including a bad migration, a mistaken bulk delete, or ransomware - all of which arrive in the replica within milliseconds. Backups exist to recover from that class of problem, and this only works if they are independent: separate storage, separate credentials, and immutable or write-once retention so that a compromised production account cannot delete them. Point-in-time recovery, which allows restoring to any moment rather than to the last snapshot, is what makes 'restore to just before the bad migration' possible.",
            "The rule that matters more than any other in this module: a backup that has never been restored is not a backup, it is a hope. Restores fail for mundane reasons - missing schema, an incompatible version, an expired credential, a dependency nobody documented - and every one of those is discovered either during a scheduled test or during a disaster. Test restores on a schedule, measure how long they take, and compare that against your stated RTO. Most organisations discover their real RTO is many times what they claimed.",
            "Finally, exercise the whole thing. A disaster recovery plan written down and never executed is a document, not a capability. Regular game days that actually fail over reveal the dependencies nobody listed - the service that hardcodes a regional endpoint, the credential that only exists in one region, the runbook step that requires a person who is on holiday.",
          ],
        },
      ],
      workedExample: {
        title: "Taking a single-region product multi-region",
        setup:
          "A product runs entirely in one region. It holds user profiles, account balances, session state, and an analytics pipeline. The business wants European users served locally and wants to survive losing the primary region with at most 5 minutes of data loss and 15 minutes of downtime.",
        steps: [
          "Classify the data before choosing a topology, because one answer will not fit all of it. Balances have a hard invariant - never negative - so they need single ownership. Profiles tolerate a lost edit. Sessions can be regional and lost, costing a re-login. Analytics is aggregate and can be written anywhere and merged.",
          "Apply home-region ownership to balances. Each account is owned by one region; writes route there, reads are served locally from replicas everywhere. European users get local reads, which is most of their traffic, and pay a cross-region round trip on the rarer writes. No concurrent conflicting writes exist anywhere, so the invariant is preserved by construction rather than by reconciliation.",
          "Use active-active for profiles and analytics. Profiles replicate both ways with last-writer-wins, accepting that a simultaneous edit in both regions loses one - acceptable, because the data is low-stakes and the user can see and correct it. Analytics is written locally and merged centrally, since aggregates are commutative.",
          "Make sessions regional and disposable. Replicating session state cross-region is expensive and buys little; on failover users re-authenticate. This is a deliberate degradation, and naming it as one is better than discovering it during a failover.",
          "Meet the RPO and RTO with specific mechanisms. A 5 minute RPO requires replication lag to stay well under 5 minutes, so alert when lag exceeds 1 minute - the alert is what makes the objective real rather than aspirational. A 15 minute RTO rules out manual DNS changes with long TTLs, so use a global load balancer with health-checked routing that redirects in seconds, and automate promotion with a fencing epoch so the old primary cannot continue writing if it is merely unreachable.",
          "Prove it rather than assume it. Run a quarterly game day that actually fails over, measure the real RTO, and test a restore from backup to a clean environment to find the undocumented dependencies. Practise failback too, since returning to the original region is a second transition that is usually rehearsed even less than the first.",
        ],
        takeaway:
          "The design was not one topology but four, chosen per data type from the invariants each carries - and that per-data classification is the answer an interviewer is looking for, because 'we will go active-active' is not one. The RPO and RTO then converted intentions into concrete requirements: an alert threshold on replication lag, and an automated failover path with fencing.",
      },
    },
    glossary: [
      { term: "Active-passive", definition: "One region serves everything while another stands by. Simplest, since only one region ever writes, at the cost of idle capacity and a risky discrete failover." },
      { term: "Active-active", definition: "All regions accept writes. Best latency and utilisation, but concurrent writes must be reconciled - and reconciliation cannot restore an invariant that both writes violated." },
      { term: "Home region (partitioned ownership)", definition: "Each entity has one owning region for writes while all regions serve reads locally. Removes conflicts by construction and usually the right default." },
      { term: "Asynchronous replication", definition: "Acknowledging a write before it reaches the remote region. Necessary at continental distances, and the lag is exactly what a sudden failover loses." },
      { term: "Replication lag", definition: "How far behind a remote replica is. Directly determines achievable RPO, which is why it is the thing to alert on." },
      { term: "Failover", definition: "Detecting failure, promoting a standby, and redirecting traffic. Each of the three steps has its own failure mode." },
      { term: "Split brain", definition: "Two regions both accepting writes because the old primary is alive but unreachable. Prevented by fencing, not by the old primary noticing." },
      { term: "Fencing epoch", definition: "A monotonically increasing leadership number that storage checks, so writes from a deposed primary are rejected even if it never learns it was replaced." },
      { term: "Failback", definition: "Returning to the original region after recovery. A second risky transition, usually rehearsed far less than failover." },
      { term: "RPO", expansion: "recovery point objective", definition: "How much data may be lost, in time. An RPO of zero requires synchronous replication and its latency cost." },
      { term: "RTO", expansion: "recovery time objective", definition: "How long the system may be down. A tight RTO rules out any recovery step requiring a human decision or DNS propagation." },
      { term: "Point-in-time recovery", definition: "Restoring to any chosen moment rather than to the last snapshot, which is what makes recovering to just before a bad migration possible." },
      { term: "Backup independence", definition: "Keeping backups in separate storage with separate credentials and immutable retention, so a compromised production account cannot destroy them." },
      { term: "Restore testing", definition: "Actually performing restores on a schedule and timing them. A backup that has never been restored is a hope, and real RTO is usually far worse than claimed." },
    ],
  },

  "distributed-transactions-2pc-saga": {
    primer: {
      plainSummary:
        "A single database can make several changes atomically - all or nothing. Once the changes span two databases owned by two services, that guarantee disappears, and you must choose how to live without it. This module covers the protocol that tries to preserve atomicity across owners, the precise reason it stalls, and the two patterns that replace it by giving up isolation or by reserving resources in advance.",
      analogy:
        "A wedding ceremony. The officiant asks each party 'do you take...' and only after both have answered does anyone become married - that is the two-phase structure, with a vote followed by a commitment. Now suppose the officiant collapses immediately after both say yes but before pronouncing them married. Neither party knows whether the wedding happened, and neither can leave or proceed until someone with authority returns. That is exactly what a blocked two-phase commit looks like, and it explains why the protocol is avoided in systems that must stay available.",
      sections: [
        {
          heading: "Two-phase commit and why it blocks",
          body: [
            "Two-phase commit, abbreviated 2PC, is an atomic commitment protocol coordinating several participants that each hold part of a transaction. In the prepare phase, a coordinator asks every participant whether it can commit. A participant that answers yes is making a binding promise: it has durably written everything needed and will commit if told to, so it may not unilaterally abort afterwards. In the commit phase, if all voted yes the coordinator records the decision durably and tells everyone to commit; if any voted no it tells everyone to abort.",
            "This genuinely provides atomicity across independent databases, which is a real guarantee and the reason the protocol exists. It is used inside distributed databases and in systems where correctness across shards is worth the cost.",
            "The failure is specific and worth stating precisely, because a vague 'it is slow' answer does not demonstrate understanding. Between voting yes and receiving the decision, a participant is in doubt: it has promised to commit, so it cannot abort, and it has not been told to commit, so it cannot proceed. It must hold its locks and wait. If the coordinator crashes in that window, every participant that voted yes stays blocked, holding locks, until the coordinator recovers and reads its durable decision log. No timeout can safely resolve this - guessing commit could commit a transaction another participant vetoed, and guessing abort could abort one already committed elsewhere.",
            "So the honest characterisation is that 2PC is not fault-tolerant with respect to the coordinator: it converts a coordinator failure into an availability outage across every participant, with locks held throughout. Its practical costs follow from this - held locks limit throughput, latency includes multiple round trips plus durable writes, and every participant must be reachable for the transaction to proceed, so availability is the product of all participants' availability. Three-phase commit and Paxos-backed coordinators reduce the blocking window by making the coordinator itself fault-tolerant, at the cost of more messages.",
          ],
        },
        {
          heading: "Sagas: trading isolation for availability",
          body: [
            "A saga abandons atomicity-by-locking. It executes a sequence of local transactions, each committing immediately in its own service, and pairs each step with a compensating action that semantically undoes it. If step four fails, the saga runs compensations for steps three, two, and one.",
            "What you gain is availability and throughput: nothing holds a lock across services, each step commits independently, and a participant being briefly slow does not freeze everyone else. What you lose is isolation, and this must be said explicitly rather than glossed over. Between steps the system is in a state no single transaction would have permitted - payment taken, inventory not yet reserved - and that state is visible to anyone reading. Sagas provide eventual atomicity of outcome, never isolation.",
            "Because intermediate states are visible, they must be designed rather than merely tolerated. The usual approach is a semantic lock: mark the record as in-progress so other operations know it is mid-workflow and can refuse or wait. An order in 'processing' is the customer-facing expression of exactly this.",
            "Compensations have real constraints. They must be idempotent, since they will be retried. They must be able to fail and be retried without making things worse. And they must be possible at all - some effects cannot be undone, which is the limitation that motivates the next pattern. Sagas also need durable orchestration: if the process running the saga dies mid-flight, something must know which steps completed so it can resume or compensate, and some sagas will reach a state no automation can resolve, requiring a manual review queue rather than infinite retries.",
          ],
        },
        {
          heading: "Reservations when compensation is unacceptable",
          body: [
            "Compensation is visible. Refunding a customer who should never have been charged is a bad experience even though the money returns, and some effects - a sent email, a dispatched parcel - cannot be undone at all. When the compensation is worse than the problem, restructure the operation so nothing needs undoing.",
            "Try-confirm-cancel, or TCC, splits each step into two. Try reserves the resource without committing it: place a hold on funds rather than charging, hold a seat for ten minutes rather than selling it, reserve stock rather than decrementing it. Once every participant's try has succeeded, confirm them all; if any fails, cancel the reservations. Cancelling a reservation is invisible to the customer in a way a refund is not.",
            "This resembles 2PC in shape, and the difference is important. A reservation is ordinary application state committed by a local transaction, not a held database lock, so nothing blocks and no participant is left in doubt holding locks. And every reservation carries an expiry, so a coordinator crash costs a short delay before reservations lapse rather than an indefinite outage. Expiry is what makes the pattern safe: it is a lease, and the failure mode of a lease is that it ends.",
            "Choosing between the three is the actual skill. Use 2PC when participants share infrastructure, the transaction is short, and correctness genuinely requires atomicity - typically inside a distributed database rather than across service boundaries. Use TCC when compensation would be visible or impossible and resources can be held briefly. Use a saga when steps are long-running, participants are independently owned, or reservation is not meaningful. Answering 'it depends' is not enough; naming which failure behaviour you are buying is what an interviewer is listening for.",
          ],
        },
      ],
      workedExample: {
        title: "Booking a flight, a hotel, and a car",
        setup:
          "A travel product books all three as one purchase. If any fails, the customer must not be charged and must not hold a partial itinerary. The three providers are separate external systems, and bookings can take several seconds each.",
        steps: [
          "Rule out 2PC and say why. The providers are external systems that do not expose prepare and commit primitives, and even if they did, holding locks across three third-party services for several seconds per step would make throughput dreadful and leave every booking blocked whenever one provider was unreachable. This is the wrong shape for atomic commitment.",
          "Consider a plain saga and identify what it costs. Book the flight, then the hotel, then the car; if the car fails, cancel the hotel and the flight. It works, but the compensations are visible: the customer may see a charge and a refund, and airline cancellation fees may apply to a booking that existed for eight seconds. The compensation is worse than the problem, which is the signal to look at reservations.",
          "Use TCC where reservations exist. All three industries support holds - a fare hold, a room hold, a vehicle hold - each with a natural expiry. Try places all three holds and authorises the customer's card without capturing. Nothing has been sold and nobody has been charged.",
          "Confirm only when everything succeeded. With all three holds in place, confirm each booking and capture the payment. The customer is charged at the moment the itinerary becomes real, satisfying the requirement in the prompt directly.",
          "Cancel invisibly on failure. If the car hold fails, release the flight and hotel holds and void the card authorisation. The customer sees a failed booking rather than a charge followed by a refund, and no cancellation fee applies because nothing was ever booked.",
          "Handle the coordinator dying mid-flight. Because every hold carries an expiry, a crash after two holds and before the third simply lets those holds lapse in ten minutes - nothing is stuck and no lock is held. A recovery process reading persisted saga state can also release them sooner. Compare this with 2PC, where a coordinator crash would have left all three providers holding locks indefinitely.",
        ],
        takeaway:
          "The reservation expiry is what makes this safe, and it is the detail worth emphasising: it converts a coordinator failure from an indefinite outage into a bounded delay. The general rule is to choose the protocol from what failure behaviour you can tolerate - blocked-but-atomic, available-but-visibly-compensating, or available-with-bounded-holds - rather than from which one you have used before.",
      },
    },
    glossary: [
      { term: "Atomic commitment", definition: "The problem of getting several independent participants to either all commit or all abort a shared transaction." },
      { term: "2PC", expansion: "two-phase commit", definition: "A protocol with a prepare phase in which participants vote and bindingly promise, and a commit phase in which the coordinator's decision is applied." },
      { term: "Prepare phase", definition: "Where each participant durably prepares and votes. A yes vote is a binding promise, after which the participant may not unilaterally abort." },
      { term: "Coordinator log", definition: "The durable record of the commit decision. Recovery depends entirely on it, which is why coordinator failure is so damaging." },
      { term: "In-doubt transaction", definition: "A participant that voted yes and has not learned the outcome. It cannot abort or proceed, so it holds locks and waits - the precise reason 2PC blocks." },
      { term: "Blocking", definition: "The property that a coordinator failure leaves participants stuck holding locks, with no timeout able to resolve it safely in either direction." },
      { term: "Saga", definition: "A sequence of local transactions each with a compensating action, providing eventual atomicity of outcome but no isolation." },
      { term: "Compensating action", definition: "A new transaction semantically undoing an earlier one. Visible to users, must be idempotent, and must itself be retryable." },
      { term: "Isolation anomaly", definition: "An intermediate saga state visible to other readers that no single transaction would have permitted. Inherent to sagas, so it must be designed for." },
      { term: "Semantic lock", definition: "Marking a record as in-progress so other operations know it is mid-workflow. How sagas expose their lack of isolation rather than hiding it." },
      { term: "TCC", expansion: "try-confirm-cancel", definition: "Reserving resources without committing, then confirming or cancelling once all reservations succeed. Cancellation is invisible where compensation would not be." },
      { term: "Reservation expiry", definition: "The lease on a TCC hold. What makes the pattern safe, since a coordinator crash costs a bounded delay rather than an indefinite block." },
    ],
  },

  "membership-discovery-failure-detection": {
    primer: {
      plainSummary:
        "Every architecture diagram quietly assumes services can find each other and notice when a peer dies. Both assumptions need machinery. This module covers how a cluster agrees on who its members are without a central registry, why declaring a node dead is always a guess with a tunable cost, and how callers find healthy instances without sending traffic to machines that no longer exist.",
      analogy:
        "A large hiking group spread along a trail. Nobody can see everyone, so news travels by people telling whoever they meet - which is gossip, and it reaches the whole group quickly without anyone being in charge. Deciding someone is lost is the harder judgement: if you wait five minutes you will raise false alarms about people who stopped to tie a shoelace, and if you wait an hour someone genuinely in trouble goes unhelped. There is no setting that avoids both errors, only a choice about which one you would rather make.",
      sections: [
        {
          heading: "Gossip: spreading membership without a registry",
          body: [
            "A central registry that every node reports to is simple and becomes both a bottleneck and a single point of failure - and it fails at the worst time, since a registry outage means nobody can find anybody.",
            "Gossip protocols avoid it. Each node periodically picks a few random peers and exchanges what it knows about the cluster: who is alive, who is suspected, who has left. Information spreads exponentially, because each round roughly doubles the number of nodes that know something, so a fact reaches every node in a cluster of N in about log N rounds. A thousand-node cluster converges in around ten rounds, which at one round per second is ten seconds.",
            "The properties that matter are that it needs no central component, degrades gracefully since losing nodes only slows propagation, and has bounded per-node cost - each node talks to a few peers per round regardless of cluster size, so it scales to thousands of nodes without any node's workload growing.",
            "The trade-off is that gossip is eventually consistent about membership. Different nodes briefly hold different views, and there is no instant at which the cluster has one agreed membership list. That is acceptable for load balancing and routing, and unacceptable for anything requiring agreement - which is why systems typically use gossip for membership and a consensus protocol for decisions that must be unanimous, such as who owns a partition.",
            "SWIM is the widely used refinement worth naming. It separates failure detection from dissemination and adds indirect probing: if node A cannot reach node B, it asks a few other nodes to probe B on its behalf before declaring it suspect. This distinguishes 'B is down' from 'the path between A and B is broken', which is a common cause of false positives, and it is exactly the kind of detail that shows you have thought past the textbook description.",
          ],
        },
        {
          heading: "Detection is a guess, and the trade-off is unavoidable",
          body: [
            "Here is the fundamental limitation, and it is worth stating plainly because it explains every design in this area: in an asynchronous network you cannot distinguish a crashed node from a slow one. A node that has not responded for ten seconds may be dead, may be garbage collecting, may be behind a congested link. There is no observation that resolves this, so failure detection is always a guess.",
            "That means picking which error you prefer. Declaring a node dead too eagerly produces false positives - work is redistributed unnecessarily, and if the node is actually alive you may now have two nodes believing they own the same data. Waiting too long produces slow detection, during which requests are routed to a dead node and time out. Aggressive detection risks correctness; conservative detection costs availability.",
            "Simple heartbeat detectors use a fixed timeout, which is crude because it forces one threshold across conditions where network latency varies enormously. The phi accrual failure detector improves on this by outputting a continuously increasing suspicion level based on the statistical distribution of observed heartbeat intervals, rather than a boolean. Different components can then act at different thresholds: stop routing new requests at low suspicion, and trigger an expensive rebalance only at high suspicion. Making the confidence explicit lets each consumer choose its own trade-off instead of inheriting one global timeout.",
            "The most important consequence is architectural: because detection can be wrong, correctness must never depend on it being right. A node wrongly declared dead may still be running and writing. This is exactly why fencing tokens exist - the resource rejects writes carrying an old epoch, so a mistaken detection costs some unnecessary work rather than corrupting data. Systems that assume detection is accurate are the ones that produce split brain.",
          ],
        },
        {
          heading: "Discovery, health checking, and safe leadership",
          body: [
            "Service discovery lets a caller find instances of a service. Server-side discovery puts a load balancer in front, so callers use one stable address and the balancer knows the instances - simple, with the balancer as an extra hop and a dependency. Client-side discovery has callers query a registry and choose an instance themselves, removing the hop and allowing smarter load balancing, at the cost of logic in every client. Service meshes give the second while keeping clients simple by running a local proxy alongside each service.",
            "Registry entries must expire rather than being deleted on shutdown, for the same reason presence uses leases: a crashed instance deregisters nothing. Registrations are leases refreshed by heartbeat, so a dead instance disappears without cooperating.",
            "Health checks need a distinction that is frequently missed. A liveness check asks whether the process should be restarted. A readiness check asks whether it should receive traffic. They differ in an important case: an instance that has lost its database connection is not ready - send it no traffic - but restarting it will not help, so it is still live. Conflating them produces restart loops that destroy capacity during a dependency outage, turning a partial failure into a total one.",
            "Health checks should also be shallow rather than deep. A check that verifies every downstream dependency means one slow dependency marks every instance unhealthy at once, removing the entire fleet from rotation - so a degraded dependency becomes a total outage caused by the health check itself. Check that this instance can serve, and handle dependency failure with circuit breakers and degradation instead.",
            "Finally, leader election, since many systems need exactly one node performing a role. Use a consensus system to hold the leadership lease, refreshed by heartbeat and expiring automatically. And accept that the leader may not know it has been deposed - a long pause can outlast the lease - so the lease must be paired with a fencing epoch that the protected resource checks. A lease alone gives mutual exclusion only if processes never pause unexpectedly, which is not a property any real runtime provides.",
          ],
        },
      ],
      workedExample: {
        title: "A garbage collection pause causes a false failure",
        setup:
          "A 200-node cluster uses heartbeats with a 5 second timeout. One node experiences an 8 second garbage collection pause. It is declared dead, its partitions are reassigned, and then it resumes - unaware anything happened - and continues serving and writing to partitions it no longer owns.",
        steps: [
          "Name the fundamental issue. A paused node is indistinguishable from a crashed one, so this is not a bug in the detector - it did the correct thing with the information available. Any timeout short enough to detect real failures quickly will also fire on long pauses, and a longer timeout would only move the threshold, not remove the case.",
          "Fix the correctness problem first, because it is the serious one. When partitions were reassigned, the new owner should have received a higher epoch number, and the storage layer should reject any write carrying an older epoch. The revived node's writes are then refused and it learns it was deposed on its first attempt. Without fencing, two nodes wrote to the same partitions and the data may be unrecoverable - and no detector tuning would have prevented that.",
          "Reduce false positives with indirect probing. Under SWIM-style detection, before declaring the node dead its peers ask several other nodes to probe it independently. This does not help with a genuine 8 second pause, but it eliminates the far more common case of a single broken network path between two nodes being misread as a node failure.",
          "Replace the binary timeout with graded suspicion. A phi accrual detector produces a rising suspicion value from the observed heartbeat distribution. Stop routing new requests at moderate suspicion, which is cheap and reversible, and trigger partition reassignment only at high suspicion, which is expensive and disruptive. A brief pause then costs a short routing interruption rather than a full rebalance.",
          "Address the root cause too. An 8 second pause is itself a problem worth fixing - tune the collector, reduce heap pressure, or move to a lower-pause runtime. Failure detection tuning mitigates the symptom; it does not make an 8 second pause acceptable.",
          "Separate the health check semantics. Confirm that this node's readiness check reports not-ready during a long pause so traffic stops, while its liveness check does not trigger a restart, since restarting a node mid-pause loses its warm state and makes recovery slower rather than faster.",
        ],
        takeaway:
          "The detector was not wrong; the system was wrong to trust it. That is the durable lesson - failure detection is inherently a guess, so correctness must come from fencing rather than from accurate detection. Tuning helps you make fewer mistakes, and fencing is what makes the mistakes you inevitably make survivable.",
      },
    },
    glossary: [
      { term: "Gossip protocol", definition: "Nodes periodically exchanging state with a few random peers, spreading information in about log N rounds with bounded per-node cost and no central component." },
      { term: "SWIM", expansion: "Scalable Weakly-consistent Infection-style process group Membership", definition: "A gossip-based membership protocol separating detection from dissemination and using indirect probes, which distinguishes a dead node from a broken network path." },
      { term: "Indirect probing", definition: "Asking other nodes to probe a suspect on your behalf before declaring it dead, eliminating the common false positive caused by one broken path." },
      { term: "Heartbeat", definition: "A periodic liveness signal. With a fixed timeout it forces one threshold across widely varying network conditions." },
      { term: "Phi accrual failure detector", definition: "A detector emitting a continuously rising suspicion level derived from observed heartbeat statistics, letting different consumers act at different confidence thresholds." },
      { term: "False positive (in detection)", definition: "Declaring a live node dead. Causes unnecessary rebalancing and, without fencing, two nodes believing they own the same data." },
      { term: "Asynchronous network assumption", definition: "The premise that messages may be arbitrarily delayed, which is why a crashed node cannot be distinguished from a slow one by any observation." },
      { term: "Service registry", definition: "The store mapping service names to healthy instances. Entries are leases refreshed by heartbeat, since a crashed instance deregisters nothing." },
      { term: "Server-side vs client-side discovery", definition: "Routing through a load balancer that knows the instances, versus clients querying a registry and choosing themselves. Meshes provide the second while keeping clients simple." },
      { term: "Liveness check", definition: "Asks whether the process should be restarted. Distinct from readiness, and conflating them causes restart loops during dependency outages." },
      { term: "Readiness check", definition: "Asks whether an instance should receive traffic. An instance can be live but not ready, and restarting it would not help." },
      { term: "Shallow vs deep health check", definition: "Checking only local ability to serve, versus checking every dependency. Deep checks let one slow dependency remove the entire fleet from rotation at once." },
      { term: "Leader election", definition: "Choosing exactly one node for a role, using a consensus-backed lease refreshed by heartbeat." },
      { term: "Fencing epoch", definition: "A monotonically increasing number attached to ownership and checked by the resource, so a revived former owner's writes are rejected. What makes mistaken detection survivable." },
    ],
  },

  "conflict-resolution-crdts": {
    primer: {
      plainSummary:
        "When two replicas are updated independently and then meet, something must decide what the combined state is. Timestamps cannot do it reliably because clocks disagree. This module covers logical clocks, which order events by causality rather than by time, the honest options once a genuine conflict is detected, and data structures designed so that concurrent updates merge automatically without anything being lost.",
      analogy:
        "Two people annotating separate copies of the same document, then combining them. Sorting the annotations by the time written is unreliable because their watches disagree - but you can reason about causality: if one annotation replies to another, it definitely came second, regardless of what the watches say. Annotations with no such relationship are genuinely concurrent, and no ordering can be recovered because none existed. What you can do is design the document so that combining annotations never requires choosing between them.",
      sections: [
        {
          heading: "Why clocks fail and logical clocks work",
          body: [
            "Ordering distributed events by wall-clock timestamp fails for reasons that cannot be engineered away. Clocks drift, are adjusted by administrators and by time synchronisation, jump backwards during leap-second handling, and are set arbitrarily on user devices. Synchronisation reduces the error but never eliminates it - and even a few milliseconds of skew is more than enough to invert the order of two events that happened microseconds apart.",
            "The useful alternative is to abandon time and reason about causality. The happens-before relation says event A happened before event B if A occurred earlier in the same process, or if A was the sending of a message that B received, or by transitivity through those. Two events with no such chain between them are concurrent, and concurrency here is a structural fact rather than a statement about timing - it means neither could have influenced the other, so there is genuinely no correct order to recover.",
            "A Lamport clock implements this cheaply: each process keeps a counter, increments it on every event, and attaches it to messages; a receiver sets its counter to the maximum of its own and the received value, plus one. This guarantees that if A happens before B then A's timestamp is smaller. What it cannot do is the reverse - a smaller timestamp does not prove causality - so Lamport clocks give a consistent total order but cannot detect concurrency, which is precisely what conflict resolution needs.",
            "A vector clock can. Each process keeps a vector with one counter per process, incrementing its own entry on each event and taking the element-wise maximum on receipt. Comparing two vectors then gives three possible answers: A happened before B if every element of A is less than or equal to B's and at least one is strictly less; B before A by the same test reversed; or concurrent if neither dominates. That third outcome is the whole point - it detects the case that needs a decision. A version vector is the same idea keyed by replica rather than by process, which is what storage systems use.",
            "The cost is size: a vector grows with the number of participants, and for a system where every client device is a participant this becomes significant metadata attached to every value. Pruning entries for departed participants is possible but delicate, and this overhead is the standard practical objection to vector clocks.",
          ],
        },
        {
          heading: "What to do once a conflict is detected",
          body: [
            "Detection and resolution are separate problems, and the value of logical clocks is entirely in the first. Once a conflict is detected, there are three honest options and each loses something different.",
            "Last-writer-wins keeps one value by some deterministic rule, usually a timestamp with an identifier as a tie-break. It is trivial to implement, requires no extra storage, and silently discards one of the two updates. It is acceptable when values are naturally overwritten - a cached temperature reading, a status flag - and unacceptable for anything a user authored, because the loss is invisible and unrecoverable. The critical point for an interview is that last-writer-wins is a policy, not a mechanism, and saying it without naming what it discards is the single most common way to fail a file-sync or collaboration question.",
            "Surfacing the conflict keeps both values and lets the application or the user decide. Nothing is lost, and the cost is complexity - the data model must represent multiple concurrent values, and every reader must handle receiving a set rather than a value. Systems that expose sibling values do exactly this, and it is the right answer when the values are user data and the system genuinely cannot know which matters.",
            "Merging automatically is possible when the data type has structure that makes merging well-defined. Two additions to a set merge to a set containing both, with no choice required. This is the observation that CRDTs generalise.",
          ],
        },
        {
          heading: "CRDTs and their honest costs",
          body: [
            "A conflict-free replicated data type is a data structure whose merge operation is commutative, associative, and idempotent - meaning merges can happen in any order, any grouping, and repeatedly, always yielding the same result. Any two replicas that have seen the same set of updates converge to the same state without coordination, regardless of the order in which they arrived. This is called strong eventual consistency.",
            "There are two families. State-based CRDTs send their whole state and merge by a join function such as element-wise maximum; they are robust because merging is idempotent, so duplicated or reordered messages are harmless, but sending full state is expensive. Operation-based CRDTs send individual operations, which is far smaller, but require the delivery layer to deliver each operation exactly once in causal order.",
            "The standard examples build intuition. A grow-only counter keeps a per-replica count and reads as the sum, so increments never conflict. A grow-only set merges by union. A two-phase set adds a separate set of removals so elements can be deleted - and reveals the characteristic problem, since a removed element can never be re-added, because the removal record persists forever and always wins.",
            "That is the general shape of CRDT costs, and it is worth being precise about rather than presenting CRDTs as free. Deletion requires tombstones, and tombstones must be retained essentially forever, because you cannot safely discard the record of a deletion while any replica might still be carrying the original addition. Metadata therefore grows monotonically with the number of operations, not with the size of the visible data - a collaborative document can accumulate metadata far larger than its text. Garbage collection requires knowing that every replica has seen a deletion, which needs coordination, which is the thing CRDTs were adopted to avoid.",
            "There is also a semantic cost that is easy to miss: convergence is not the same as correctness. Two replicas converging on 'both users' concurrent edits applied' can produce interleaved text that neither user wrote and neither would accept. A CRDT guarantees that everyone sees the same thing, not that the thing is good. And CRDTs cannot enforce invariants that depend on global state, such as a non-negative balance or a uniqueness constraint, because enforcing those requires exactly the coordination that has been given up. State that clearly - it is the boundary of the technique.",
          ],
        },
      ],
      workedExample: {
        title: "A shopping cart synced across devices",
        setup:
          "A user has a cart on their phone and their laptop. Offline, they add a book on the phone and add a lamp and remove a previously-added pen on the laptop. Both reconnect. The cart must end up correct on both devices.",
        steps: [
          "Show why timestamps fail. If the whole cart is one value resolved by last-writer-wins on modification time, whichever device syncs with the later clock reading wins entirely and the other device's changes vanish - the book or the lamp, silently. The user added an item and it disappeared, with no error and no way to know.",
          "Detect concurrency instead. Give the cart a version vector with an entry per device. The phone's update and the laptop's update each advance only their own entry, so neither vector dominates the other and the system correctly identifies the two updates as concurrent rather than sequential. Now a real decision can be made.",
          "Choose the right granularity. Treating the cart as one opaque value forces a choice between two whole carts. Treating it as a set of items makes the operations independent: adding a book and adding a lamp do not conflict at all. Choosing the unit of conflict is often the entire design, and getting it wrong makes conflicts appear where none exist.",
          "Model it as a CRDT set. Additions merge by union, so the merged cart contains the book and the lamp with no choice required. This is why cart merging is the classic CRDT example - the dominant operation is genuinely commutative.",
          "Handle the removal honestly. A plain grow-only set cannot represent the removed pen, since union would resurrect it. Use an observed-remove set, where each addition carries a unique tag and a removal records the specific tags it observed. The pen's removal names the tag added earlier, so the merge removes it - while a concurrent re-addition of a pen would carry a new tag and survive, which is usually the behaviour a user expects.",
          "State the residual costs rather than declaring victory. Removal tags are tombstones that must be retained, so cart metadata grows with operation count and needs eventual garbage collection once every device has certainly seen each removal. And this structure cannot enforce a global invariant - if only one copy of an item remains in stock, two devices can both add it, because no coordination happened. Stock enforcement therefore belongs at checkout, in a system that does coordinate.",
        ],
        takeaway:
          "Two decisions did the work: using a version vector so concurrency was detected rather than silently resolved, and choosing item-level rather than cart-level granularity so most operations stopped conflicting at all. The CRDT then handled the rest automatically. Note the final step - naming what the structure cannot do is as much a part of the answer as what it can, because a CRDT that appears to enforce stock is a much worse outcome than one that visibly does not.",
      },
    },
    glossary: [
      { term: "Happens-before", definition: "The causal relation: A precedes B if it came earlier in the same process, or sent a message B received, or transitively. Events unrelated by it are genuinely concurrent." },
      { term: "Concurrent events", definition: "Events with no causal chain between them. Concurrency is structural, not a statement about timing, and means no correct order exists to recover." },
      { term: "Lamport clock", definition: "A single counter advanced on events and on message receipt. Guarantees causally ordered events have increasing values, but cannot detect concurrency." },
      { term: "Vector clock", definition: "One counter per participant, compared element-wise to yield before, after, or concurrent. Detecting the third case is its entire purpose." },
      { term: "Version vector", definition: "A vector clock keyed by replica rather than process, used by storage systems to detect concurrent updates to a value." },
      { term: "Clock skew", definition: "Disagreement between physical clocks. Small skew is enough to invert the true order of nearby events, which is why wall-clock ordering is unsound." },
      { term: "Last-writer-wins (LWW)", definition: "Keeping one concurrent value by a deterministic rule and discarding the other. A policy, not a mechanism, and its loss is silent and unrecoverable." },
      { term: "Sibling values", definition: "Keeping all concurrent values and returning them together so the application or user resolves them. Loses nothing, at the cost of every reader handling a set." },
      { term: "CRDT", expansion: "conflict-free replicated data type", definition: "A structure whose merge is commutative, associative, and idempotent, so replicas seeing the same updates converge without coordination." },
      { term: "Strong eventual consistency", definition: "The guarantee that replicas having received the same updates are in the same state, regardless of order or duplication." },
      { term: "State-based vs operation-based", definition: "Sending full state and merging by a join function, versus sending individual operations. The first tolerates duplication and reordering; the second is far smaller but needs exactly-once causal delivery." },
      { term: "Observed-remove set", definition: "A set where each addition carries a unique tag and removals name the tags they observed, so a concurrent re-addition survives a removal." },
      { term: "Tombstone", definition: "A retained record of a deletion. Required for correct merging, and the reason CRDT metadata grows with operation count rather than with visible data size." },
      { term: "Operational transformation", definition: "An alternative convergence technique that transforms concurrent operations against each other, used in collaborative editors. Requires a central server in most practical designs." },
      { term: "Invariant limitation", definition: "The boundary of CRDTs: they cannot enforce constraints requiring global knowledge, such as uniqueness or a non-negative balance, because that needs the coordination they avoid." },
    ],
  },
};
