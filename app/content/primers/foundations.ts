import type { TopicPrimerEntry } from "../types";

/**
 * From-zero explanations for the tier-0 modules. Written for a CS
 * undergraduate who has seen a database and a web server but has never sized
 * one. Every acronym and named theorem is defined in the glossary, and the
 * prose never uses a term the glossary does not carry.
 */
export const foundationPrimers: Record<string, TopicPrimerEntry> = {
  estimation: {
    primer: {
      plainSummary:
        "Before you can choose a database or decide how many machines to run, you need a rough idea of how much work the system does: requests per second, bytes stored, bytes moved across the network. This module is about producing those numbers with arithmetic you can do on a whiteboard, and then doing the part most people skip - using each number to rule a design option in or out.",
      analogy:
        "Planning a wedding. You do not start by touring venues and picking the prettiest one; you start with the guest count. One hundred and twenty guests immediately eliminates the hall that seats sixty, sets the catering order, and tells you how much parking you need. Tour first and you will fall in love with a room that cannot hold your guests. Systems work the same way: the count comes before the components.",
      sections: [
        {
          heading: "Where the numbers come from",
          body: [
            "Almost every capacity estimate starts from one product fact - how many people use the thing, and how often. A day has 86,400 seconds, a number worth memorising because it turns any 'per day' figure into a 'per second' figure by division. If a product serves 100 million actions per day, that is 100,000,000 / 86,400, or roughly 1,160 actions per second.",
            "Round aggressively. Say 'about a thousand per second' and move on. The goal is not accuracy, it is deciding whether you are in the world of tens, thousands, or millions - because those three worlds have genuinely different architectures, and no decision you make next depends on the difference between 1,160 and 1,200.",
            "Model reads and writes separately, always. They travel different paths through a system: a read can be served by a cache or a stale copy, while a write usually has to reach the authoritative store, be replicated, and update indexes. A system doing 1,000 reads and 10 writes per second is a completely different design from one doing 10 reads and 1,000 writes, even though both average about 1,000 operations per second.",
          ],
        },
        {
          heading: "Why the daily average is a lie",
          body: [
            "Traffic is never spread evenly. Consumer products follow waking hours, so the busiest hour carries far more than one twenty-fourth of the day's load. The ratio of peak traffic to average traffic is called the peak factor, and for a consumer app somewhere between 2x and 5x is a reasonable opening assumption. Say which number you assumed out loud, because it is an assumption an interviewer may want to challenge, and a design sized for the average will fall over every evening.",
            "Load is also uneven across keys, not just across time. If one celebrity has ten million followers and the median user has two hundred, then the 'average user' does not exist in any useful sense. This unevenness is called skew, and it is why a system that comfortably handles its total load can still melt down on a single partition. Popularity in real systems usually follows a long-tailed distribution, often approximated by a Zipf distribution, in which a small number of items take a large share of all traffic.",
            "Finally, failures create load. When a machine dies its traffic moves to its neighbours; when a region fails its traffic moves to another region; when a service is briefly unavailable, every client retries at once and the reconnect surge is far larger than steady-state traffic. Capacity planning that assumes everything is healthy has planned for the only case that does not matter.",
          ],
        },
        {
          heading: "Little's Law, and what a boundary means",
          body: [
            "Little's Law is the one formula worth knowing by heart. It says that for any system in a stable state, the average number of items inside a boundary equals the arrival rate multiplied by the average time each item spends inside that boundary: L = lambda x W. It is remarkably general - it holds for a queue, a service, a whole datacentre, or a supermarket checkout, and it needs no assumption about how arrivals are distributed.",
            "The word doing the work in that sentence is boundary. The law only tells you about the boundary you actually measured. If you multiply arrival rate by the total time a request spends in your service including time waiting in a queue, you get the number of requests in flight - which is what determines how many connections, sockets, and buffers you need. If you multiply by the service time alone, excluding queueing, you get the number of requests actively being worked on - which is what determines how many threads or cores you need. Mixing the two produces a number that describes nothing.",
            "A concrete use: if a service handles 20,000 requests per second and each request spends 80 milliseconds inside it, then 20,000 x 0.08 = 1,600 requests are in flight at any moment. If each of those holds a database connection, you need a pool of 1,600 connections, which is almost certainly more than your database will accept. That single multiplication just found an architectural problem before a single box was drawn.",
          ],
        },
        {
          heading: "Latency numbers, and turning estimates into decisions",
          body: [
            "You need a rough ladder of how long things take, because it tells you what is free and what is expensive. Reading from main memory takes about 100 nanoseconds. Reading from a solid-state drive takes about 100 microseconds - a thousand times slower. A network round trip inside one datacentre is roughly half a millisecond, a round trip across a continent is around 50 to 100 milliseconds, and around the world can be 200 milliseconds or more, because the speed of light in fibre is a hard physical floor that no amount of engineering removes. The practical consequence: a design that makes ten sequential cross-region calls cannot meet a 200 millisecond budget, and no optimisation will save it - only removing round trips will.",
            "Storage estimates need one more step, called amplification. The bytes your users create are not the bytes your disks hold. Multiply by the replication factor, because you keep several copies for durability; add secondary indexes, which are extra data structures that let you query by fields other than the primary key; add slack for compaction, the background process storage engines use to reclaim space; and add backups and their retention. Logical data of 180 gigabytes can easily be 700 gigabytes on disk. Keep the logical and physical numbers on separate lines so the multiplier stays visible and arguable.",
            "Every estimate should end in a sentence beginning 'therefore'. Therefore one machine suffices and sharding is unnecessary. Therefore the working set - the subset of data actually being accessed in a given window - does not fit in memory, so a cache miss path must be designed. Therefore the read-to-write ratio is a hundred to one, so this is a caching problem, not a database problem. An estimate that does not change or confirm a decision was arithmetic theatre.",
          ],
        },
      ],
      workedExample: {
        title: "Sizing a link shortener end to end",
        setup:
          "A link shortening service serves 100 million redirects per day. Links are followed far more often than they are created - assume one creation per hundred redirects. Each stored record is about 500 bytes once you count the short code, the destination URL, the owner, and timestamps.",
        steps: [
          "Average read rate: 100,000,000 / 86,400 = about 1,160 redirects per second. Call it 1,000 per second.",
          "Peak read rate: assume a 3x peak factor for a consumer product with a daily cycle, giving about 3,500 redirects per second at the busy hour. State the 3x explicitly - it is an assumption, not a fact.",
          "Write rate: one creation per hundred redirects gives about 12 creations per second on average, 35 at peak. The read-to-write ratio is 100:1. This is the single most informative number so far, because it says the system is read-dominated and therefore a cache will do most of the work.",
          "Storage: 1 million new links per day x 500 bytes = 500 megabytes per day, or about 180 gigabytes of logical data per year. Apply amplification - three replicas plus an index on the short code - and call it roughly 700 gigabytes to 1 terabyte per year physically. That fits comfortably on a single modern machine, so capacity alone does not force sharding.",
          "Working set: link popularity is heavily skewed, so most traffic goes to a small fraction of links. If the hot one percent of a year of links is about 1.8 gigabytes of logical data, the entire hot set fits in memory with room to spare, which makes a 90-percent-plus cache hit rate a credible assumption rather than wishful thinking.",
          "Therefore: 3,500 reads per second, with 95 percent served from cache, leaves about 175 reads per second reaching the database. Any ordinary database absorbs that without effort.",
        ],
        takeaway:
          "Six lines of arithmetic moved the conversation from 'which database should we use?' to 'the database is not the interesting part - generating short codes without collisions and keeping redirect latency low are'. That reframing is the entire point of estimation. If your numbers do not change what you build next, you did not need them.",
      },
    },
    glossary: [
      { term: "QPS", expansion: "queries per second", definition: "How many requests a system handles each second. Often split into read QPS and write QPS because the two follow different paths and cost different amounts." },
      { term: "Little's Law", definition: "For any stable system, the average number of items inside a boundary equals the arrival rate multiplied by the average time each item spends inside it (L = lambda x W). It holds regardless of how arrivals are distributed, but only describes the boundary you actually measured." },
      { term: "Peak factor", definition: "The ratio of busiest-moment traffic to average traffic. A product with a 1,000 QPS daily average and a 3x peak factor must survive 3,000 QPS." },
      { term: "Skew", definition: "Uneven distribution of load across keys, users, or partitions. Skew is why a system with plenty of total capacity can still fail on one shard." },
      { term: "Zipf distribution", definition: "A long-tailed popularity curve in which the nth most popular item gets roughly 1/n of the traffic of the most popular one. A useful default model for views, searches, and link clicks." },
      { term: "Working set", definition: "The portion of the data actually being accessed during a given window, as opposed to everything ever stored. Cache sizing is driven by the working set, never by total data size." },
      { term: "Tail latency", definition: "The slow end of the response-time distribution, quoted as percentiles. p99 latency of 800 milliseconds means 99 percent of requests finished faster and the slowest 1 percent did not." },
      { term: "Amplification", definition: "The multiplier between logical work and physical work. Writing one logical record may mean writing several replicas, several index entries, and later rewriting all of it during compaction." },
      { term: "Replication factor", definition: "How many copies of each piece of data are kept on different machines, so that losing a machine does not lose the data. Three is the common default." },
      { term: "Headroom", definition: "Deliberately unused capacity, reserved so that a failure or a traffic spike does not immediately saturate the system. Running at 95 percent utilisation leaves no headroom." },
      { term: "Throughput vs latency", definition: "Throughput is how much work completes per unit time; latency is how long one unit of work takes. Batching usually improves throughput and worsens latency, which is why the two must be stated separately." },
      { term: "Order of magnitude", definition: "A factor of ten. Estimating to the nearest order of magnitude means caring whether the answer is closer to 100 or 1,000, and not caring about anything finer." },
    ],
  },

  "consistency-idempotency": {
    primer: {
      plainSummary:
        "You tap Pay and the screen freezes. Did the payment go through? Neither you nor the app can tell. This module covers the two ideas that follow from that moment: consistency, which is the promise a system makes about what a reader will see after a write, and idempotency, which is what makes it safe to retry an operation when you cannot tell whether the first attempt succeeded.",
      analogy:
        "Posting a letter with no delivery confirmation. If no reply arrives, you cannot tell whether your letter was lost or the reply was lost. Sending a second copy is only safe if the recipient can recognise it as the same letter rather than a new request - for example because you numbered it. That number is an idempotency key, and the whole discipline is built on that one trick.",
      sections: [
        {
          heading: "Why consistency is a problem at all",
          body: [
            "On a single computer with one copy of the data, there is nothing to discuss: you write, then you read, and you see what you wrote. The problem appears the moment there is more than one copy. Real systems keep several copies of data - each copy is called a replica - because a single machine will eventually fail, and because reads can be spread across copies to handle more traffic.",
            "The instant there are two replicas, a write has to reach both, and there is a window in which one has the new value and the other still has the old one. If your read lands on the second replica, you see stale data. This is not a bug to be fixed; it is a consequence of physics and of the network being slow and unreliable. What a system designer chooses is not whether this window exists but how it behaves and what the system promises about it.",
            "That promise is the consistency model. Strong models promise more and cost more in latency and availability; weak models promise less and are cheaper and more available. The senior move is to notice that different operations in the same product deserve different promises. Your bank balance and your 'last seen online' timestamp do not need the same guarantee, and paying for the strong one everywhere is how designs become slow and fragile.",
          ],
        },
        {
          heading: "Naming the guarantee precisely",
          body: [
            "Linearizability is a guarantee about single operations and real time. It says that every operation appears to take effect instantaneously at some point between when it was invoked and when it returned, and that this ordering respects wall-clock order. The practical consequence: once a write completes, every subsequent read - by anyone, anywhere - must see it or something newer. This is the model people usually mean when they say 'strongly consistent'.",
            "Serializability is a different guarantee, about groups of operations. A transaction is a group of reads and writes that should take effect as a unit. Serializability says the result of running several transactions concurrently is the same as if they had run one after another in some order. Note what it does not say: it says nothing about which order, and nothing about real time. A database can be perfectly serializable and still let a read issued after your write miss it, because the serial order it chose put your transaction later.",
            "These two are independent, which surprises people. Having both is called strict serializability. Weaker isolation levels trade correctness for speed. The most common is snapshot isolation, where each transaction reads from a consistent frozen picture of the database taken when it began. This is fast and prevents most anomalies, but it permits one specific failure called write skew: two transactions each read the same data, each independently decide their change is fine, and each write different rows - so no write conflicts, yet a rule spanning those rows is broken. The classic example is two on-call doctors each checking that at least one other doctor is on duty and both signing off simultaneously.",
          ],
        },
        {
          heading: "CAP and PACELC, stated carefully",
          body: [
            "A network partition is what happens when messages between two groups of machines stop getting through, while the machines themselves keep running. Neither side can tell whether the other side is dead or merely unreachable - this is the fundamental difficulty, and no protocol removes it.",
            "The CAP theorem - the letters stand for Consistency, Availability, and Partition tolerance - says that during a partition, a system must choose between remaining consistent and remaining available. If the two halves keep accepting writes they will diverge, breaking consistency; if one half refuses to serve requests to stay consistent, it is not available. Since partitions cannot be prevented, the real choice is only between C and A, and only while a partition is happening.",
            "CAP is widely misquoted as 'pick two of three', which suggests you could build a CA system by giving up partition tolerance. You cannot: partitions happen whether or not your design acknowledges them. It is also misapplied to whole databases - a single system can be strongly consistent for account balances and eventually consistent for view counts. PACELC extends the statement to the normal case: if there is a Partition, choose Availability or Consistency; Else, in healthy operation, choose between Latency and Consistency. That second half matters more day to day, because consistency costs round trips even when nothing is broken.",
          ],
        },
        {
          heading: "Making retries harmless",
          body: [
            "When a request times out, the caller has learned nothing about whether the server acted. The request may never have arrived, may have been processed with the response lost on the way back, or may still be executing. Since the caller must do something, and doing nothing risks a lost payment, the caller retries - which means every externally visible effect must be safe to attempt more than once.",
            "An operation is idempotent if performing it repeatedly has the same result as performing it once. Setting a value to 5 is naturally idempotent; adding 5 is not. Most business operations - charge a card, send an email, create an order - are not naturally idempotent, so you make them idempotent artificially with an idempotency key: a unique identifier the caller generates and attaches to the request. The server records that key alongside the work it did, in the same atomic transaction as the business change. If a request arrives with a key it has seen, the server skips the work and returns the original stored response.",
            "Two details make this real rather than decorative. First, the key must be stored in the same transaction as the effect - if they can be written separately, a crash between them recreates exactly the duplicate you were preventing. Second, reusing a key with a different payload must be rejected rather than silently treated as a duplicate, or a client bug will alias two genuinely different operations into one.",
            "The same reasoning applies to message queues. Nearly all queues offer at-least-once delivery, meaning a message may be delivered more than once but will not be silently dropped. Some advertise exactly-once, but that guarantee only covers the broker's own bookkeeping. If your consumer sends an email, no broker can make that email arrive exactly once. Deduplication has to live at the boundary where the effect actually happens.",
          ],
        },
      ],
      workedExample: {
        title: "A card charge that times out",
        setup:
          "A mobile app charges a customer 40 dollars. The app sends the request, and 30 seconds later the connection times out with no response. The user is staring at a spinner and the app must decide what to do.",
        steps: [
          "Establish what is unknown. Three worlds are consistent with what the app observed: the request never reached the server; it was processed and the response was lost; it is still being processed right now. The app cannot distinguish them, and neither can the user.",
          "Make the operation retryable before this ever happens. When the app first built the request it generated a unique idempotency key - say a random UUID - and sent it in a header. That key identifies this logical charge attempt for its entire life, across every retry.",
          "On the server, handle the first attempt atomically. In one database transaction: insert a row keyed by the idempotency key holding the caller's identity, a hash of the request payload, and a status of in-progress; and perform the charge. Commit both or neither. If these were two separate writes, a crash in between would leave a charge with no record that it happened.",
          "Handle the retry. The app resends with the same key. The server finds the existing row. If the row is complete, it returns the stored response verbatim - the customer is charged once and the app finally learns the outcome. If the row is still in-progress, the server does not start a second charge; it waits briefly or returns a 409 telling the client to retry shortly.",
          "Reject aliasing. If a request arrives with the same key but a payload hash for 60 dollars instead of 40, the server rejects it outright. The key names one specific operation; letting it stand for a different one would turn a client bug into a silent financial error.",
          "Set retention. Keep idempotency records at least as long as clients may retry plus the window in which a customer could dispute the charge. Expiring them after an hour would make a retry the next day create a second charge.",
        ],
        takeaway:
          "Nothing here made the network reliable - that is not achievable. What changed is that ambiguity stopped being dangerous. The system cannot tell a lost request from a lost response, and no longer needs to, because both paths converge on exactly one charge. That is the shape of nearly every correct distributed-systems answer: not preventing the bad case, but making it indistinguishable from the good one.",
      },
    },
    glossary: [
      { term: "Replica", definition: "One of several copies of the same data held on different machines, kept for durability and for spreading read load." },
      { term: "Consistency model", definition: "The promise a system makes about what a reader may observe after a write. Ranges from strong (everyone sees the newest value immediately) to eventual (everyone converges eventually)." },
      { term: "Linearizability", definition: "A guarantee on single operations: each appears to take effect at one instant between its start and end, consistent with real-time order. Once a write returns, all later reads see it." },
      { term: "Serializability", definition: "A guarantee on transactions: the outcome equals that of running them one at a time in some order. It says nothing about which order, or about real time." },
      { term: "Strict serializability", definition: "Serializability plus linearizability - transactions behave as if run one at a time, in an order matching real time. The strongest common guarantee, and the most expensive." },
      { term: "Transaction", definition: "A group of reads and writes treated as a single unit that either fully happens or does not happen at all." },
      { term: "ACID", expansion: "Atomicity, Consistency, Isolation, Durability", definition: "The classic transaction properties: all-or-nothing, preserves declared rules, concurrent transactions do not corrupt each other, and committed data survives a crash. Note that the C in ACID is unrelated to the C in CAP." },
      { term: "Snapshot isolation", definition: "An isolation level where a transaction reads from a frozen consistent picture of the database taken at its start. Fast and widely used, but permits write skew." },
      { term: "Write skew", definition: "An anomaly under snapshot isolation where two transactions read overlapping data, write to different rows, and together break a rule that spans those rows - with no write-write conflict for the database to detect." },
      { term: "Network partition", definition: "A failure in which two groups of machines cannot exchange messages while both keep running. Neither side can tell whether the other has failed or is merely unreachable." },
      { term: "CAP theorem", expansion: "Consistency, Availability, Partition tolerance", definition: "During a network partition a system must sacrifice either consistency or availability. Since partitions cannot be avoided, the choice is only between the other two, and only while partitioned." },
      { term: "PACELC", expansion: "if Partition then Availability or Consistency, Else Latency or Consistency", definition: "An extension of CAP covering healthy operation: even with no partition, stronger consistency costs latency because it requires more coordination." },
      { term: "Eventual consistency", definition: "A weak guarantee: if writes stop, all replicas eventually agree. It says nothing about how long that takes or what you may observe meanwhile." },
      { term: "Idempotency", definition: "The property that performing an operation many times has the same effect as performing it once. Assignment is idempotent; incrementing is not." },
      { term: "Idempotency key", definition: "A unique identifier a client attaches to a request so a server can recognise retries of the same logical operation and return the original result instead of repeating the work." },
      { term: "At-least-once delivery", definition: "A messaging guarantee that a message will be delivered, possibly more than once. It requires consumers to be idempotent." },
      { term: "At-most-once delivery", definition: "A messaging guarantee that a message is never duplicated, but may be lost entirely." },
      { term: "Exactly-once processing", definition: "The appearance of each message affecting state precisely once, achieved by combining at-least-once delivery with deduplication at the point of effect. It is a property of the whole pipeline, not something a broker can grant on its own." },
      { term: "Fencing token", definition: "A number that increases every time ownership of a resource changes hands. The resource rejects any write carrying an old token, which stops a paused former owner from corrupting state after its lease expired." },
      { term: "Lease", definition: "A lock with an expiry time, so a crashed holder does not block the resource forever. A lease alone is unsafe without fencing, because a paused process can wake after expiry believing it still holds the lock." },
      { term: "Transactional outbox", definition: "A pattern where an event to be published is written into a table in the same transaction as the business change, then relayed to a message broker by a separate process. It removes the dual-write problem of updating a database and a queue separately." },
    ],
  },

  "replication-partitioning": {
    primer: {
      plainSummary:
        "Two different problems get solved by making more copies of things, and confusing them causes a lot of bad designs. Replication means keeping the same data on several machines so that losing one does not lose the data. Partitioning, also called sharding, means splitting different data across several machines so that no single machine has to hold or serve it all. This module is about doing both without losing track of who is allowed to change what.",
      analogy:
        "A library system. Replication is stocking the same popular novel at every branch: any branch can lend it, and a fire at one branch does not destroy the title. Partitioning is putting authors A through M at the north branch and N through Z at the south: nothing is duplicated, but each branch holds half as much. Real systems do both - each half of the collection is stocked at three branches - and the hard questions are the same ones a librarian faces. Who decides when a book's record changes? What happens when two branches disagree? What do you do when one author becomes so popular that one branch is overwhelmed?",
      sections: [
        {
          heading: "Replication: copies, and who is in charge",
          body: [
            "Keeping several copies buys durability and read capacity, but it creates a governance question: when a value changes, who decides the new value? The commonest answer is leader-follower replication, sometimes called primary-replica. One replica is designated the leader and all writes go to it; the leader applies the write and streams the change to the followers, which apply it in the same order. Reads may be served by any replica.",
            "That last freedom is where staleness enters. A follower is always slightly behind the leader, and the gap is called replication lag. Reading from a follower right after writing to the leader can show you the old value - which is why a user who edits their profile and is immediately shown the old version is experiencing a correct system behaving exactly as designed. If that is unacceptable, you either read from the leader for that path, or route the user's reads to a replica known to have caught up.",
            "The alternative shape is leaderless replication, where a client writes to several replicas directly and reads from several. Correctness comes from arithmetic: with N replicas, if every write is acknowledged by W of them and every read consults R of them, then choosing W + R > N guarantees that any read overlaps with any completed write by at least one replica, so the newest value is always among those returned. Common settings are N=3, W=2, R=2. The catch is that the read must then reconcile disagreeing answers, which the next module on conflict resolution takes up.",
          ],
        },
        {
          heading: "What happens when the leader dies",
          body: [
            "If all writes go to the leader, the leader is a single point of failure, so the system must elect a new one. This is the problem consensus algorithms solve. A consensus algorithm lets a group of machines agree on a value - here, on who the leader is and what the sequence of committed writes is - even though machines may crash and messages may be delayed or lost. Raft and Paxos are the two families you should be able to name; Raft is the one usually taught because it was explicitly designed to be understandable, and Multi-Paxos is the variant used when a single leader commits a long stream of decisions rather than one value.",
            "Consensus requires a majority - more than half of the members - to agree. That majority requirement is the safety mechanism, because two different majorities of the same group must overlap in at least one member, and that member will refuse to vote twice for the same slot. This is what prevents split brain, the situation where a network partition leaves two machines both believing they are the leader and both accepting writes that then conflict irreconcilably.",
            "Majority voting alone is not quite enough, because an old leader may not know it has been deposed. A leader that was paused by a long garbage collection can wake up still believing it leads. Every consensus system therefore attaches a monotonically increasing number to each leadership period, called a term in Raft or an epoch elsewhere, and followers and storage reject any message carrying an old term. This is the same fencing idea that protects locks, applied to leadership.",
            "One warning worth carrying into interviews: a quorum in the consensus sense and a quorum in the leaderless W + R > N sense are different things that share a word. Consensus quorums establish a single agreed order of operations. Dynamo-style quorums only guarantee overlap between reads and writes, and can still produce two concurrent values that must be merged by the application.",
          ],
        },
        {
          heading: "Partitioning: choosing how to split",
          body: [
            "When the data or the traffic exceeds one machine, you split it. Every row is assigned to a partition by a partition key - a field, or a function of some fields, that determines where the data lives. This is the single most consequential decision in a data design, because it fixes which queries are cheap and which are impossible.",
            "The rule is that queries served by one partition are fast and queries that must consult every partition are slow and get slower as you grow. If chat messages are partitioned by conversation ID, loading a conversation touches exactly one partition - excellent. Searching for a phrase across all your conversations now touches every partition - poor, and that is a signal you need a separate search index rather than a different key.",
            "There are two common schemes. Range partitioning assigns contiguous key ranges to partitions, which makes range scans efficient but creates hotspots when writes cluster at one end - partitioning by timestamp means every new write lands on the same partition, a mistake common enough to have a name. Hash partitioning applies a hash function to the key and spreads writes evenly, at the cost of destroying range scans.",
            "Naive hashing has its own flaw: with the partition chosen as hash(key) mod N, changing N remaps almost every key at once. Consistent hashing fixes this by mapping both keys and servers onto a circle, with each key owned by the next server clockwise, so adding or removing a server moves only the keys in its immediate neighbourhood. Because a few large servers would land unevenly on that circle, each physical machine is registered at many points, called virtual nodes, which smooths the distribution and lets machines of different sizes carry proportional shares.",
          ],
        },
        {
          heading: "Hot partitions and moving data while running",
          body: [
            "Even a perfectly even hash cannot save you from a single key that is too popular. If one product goes viral, every request for it hashes to the same partition, and that partition saturates while the rest of the fleet idles. This is a hot partition, and no amount of resharding fixes it, because the unit of distribution is the key and the problem is inside one key.",
            "The fixes work by breaking the key apart or by not going to it. You can add a random suffix to spread one logical key across a set of physical keys and read them all back together, which trades read cost for write spread. You can put a cache in front so most requests never reach the partition. You can maintain a small dedicated tier for known-hot items. Which one applies depends on whether the hot key is read-heavy or write-heavy - caching solves the first and does nothing for the second.",
            "Finally, partitioning is not decided once. Data grows and access patterns move, so you will need to reshard - change how many partitions exist and which data lives where - on a system that is serving live traffic and cannot stop. The workable procedure is incremental: copy the data for the moving range in the background while the old owner still serves it; catch up on changes made during the copy; then flip ownership atomically, ideally with a fencing epoch so the old owner cannot keep accepting writes it no longer owns. Systems that support this well tend to over-partition from the start, creating many more logical partitions than machines, so that rebalancing is a matter of moving whole partitions rather than splitting them.",
          ],
        },
      ],
      workedExample: {
        title: "Choosing a partition key for a chat product",
        setup:
          "A messaging product stores messages. The dominant read is 'load the most recent 50 messages in this conversation'. Writes are 'append a message to a conversation'. There is also a rarer query: 'find all messages sent by this user'.",
        steps: [
          "List the access patterns before proposing any key. Here: read by conversation, write by conversation, and occasionally read by sender. Two of the three are conversation-shaped and one is user-shaped, and no single key serves both cheaply.",
          "Test the obvious candidate. Partitioning by conversation ID puts an entire conversation on one partition, so the dominant read touches exactly one partition and can be served by a single range scan. Writes for a conversation also land on one partition, which additionally makes per-conversation ordering easy since one partition can assign sequence numbers.",
          "Test a rejected candidate. Partitioning by message timestamp would spread one conversation across every partition, turning the dominant read into a scatter-gather across the whole fleet - and every new write would land on whichever partition owns 'now', making one partition absorb all write traffic while the rest sit idle.",
          "Choose the sort key, not just the partition key. Within the conversation partition, storing messages ordered by descending sequence number means 'most recent 50' is a prefix scan that stops after 50 rows, rather than a scan of the entire conversation history.",
          "Handle the query the key does not serve. 'All messages by this user' now touches every partition. Do not change the partition key to fix it - that would break the dominant path. Instead maintain a separate index keyed by user ID, updated asynchronously, and accept that it is slightly stale. Rare queries get their own structure; they do not get to dictate the primary layout.",
          "Plan for skew. A 5,000-member group chat is far busier than a two-person one, and a single hot conversation can saturate its partition. Mitigations: cache the recent-messages window for hot conversations, and be ready to give the largest conversations a dedicated partition. Note that the hot key here is write-heavy, so caching helps the reads and the write path still needs the dedicated capacity.",
        ],
        takeaway:
          "The partition key was chosen by writing down access patterns and checking which ones become single-partition operations - not by reasoning about the data model in the abstract. Notice also what was not done: the rare query was given a secondary structure rather than being allowed to compromise the common path. That ordering of priorities is what an interviewer is listening for.",
      },
    },
    glossary: [
      { term: "Replication", definition: "Keeping copies of the same data on multiple machines, for durability and for spreading read load." },
      { term: "Partitioning (sharding)", definition: "Splitting different data across multiple machines so no single machine holds it all. Distinct from replication, which copies the same data." },
      { term: "Leader-follower replication", definition: "A scheme where one replica accepts all writes and streams changes to the others. Also called primary-replica or, historically, master-slave." },
      { term: "Replication lag", definition: "The delay between a write committing on the leader and appearing on a follower. It is why reading your own write from a follower can show stale data." },
      { term: "Leaderless replication", definition: "A scheme with no designated leader, where clients write to and read from several replicas directly and correctness comes from read and write sets overlapping." },
      { term: "Quorum (N, W, R)", definition: "In leaderless replication, N is the number of replicas, W how many must acknowledge a write, R how many are consulted on a read. W + R > N forces every read to overlap every completed write by at least one replica." },
      { term: "Consensus", definition: "The problem of getting a group of machines to agree on a value despite crashes and unreliable networks. Used to agree on who leads and on the order of committed operations." },
      { term: "Raft", definition: "A consensus algorithm designed for understandability, built around leader election, an append-only replicated log, and majority commitment." },
      { term: "Paxos / Multi-Paxos", definition: "The original consensus family. Multi-Paxos is the practical variant where one elected leader commits a continuous stream of decisions rather than agreeing on a single value." },
      { term: "Majority (quorum)", definition: "More than half the members of a group. Any two majorities of the same group share at least one member, which is what makes conflicting decisions impossible." },
      { term: "Split brain", definition: "A failure where a partition leaves two nodes each believing they are the leader, both accepting writes, producing divergent state that cannot be cleanly merged." },
      { term: "Term / epoch", definition: "A monotonically increasing number identifying a leadership period. Messages carrying an old term are rejected, so a revived former leader cannot corrupt state." },
      { term: "Partition key (shard key)", definition: "The field or function that determines which partition a piece of data lives on. It fixes which queries are single-partition and cheap, and which must fan out." },
      { term: "Range partitioning", definition: "Assigning contiguous key ranges to partitions. Good for range scans, prone to hotspots when writes cluster - as they do when partitioning by time." },
      { term: "Hash partitioning", definition: "Assigning keys to partitions by a hash of the key. Spreads writes evenly but makes range scans require touching every partition." },
      { term: "Consistent hashing", definition: "Mapping keys and servers onto a circle so each key belongs to the next server clockwise. Adding or removing a server relocates only a small neighbourhood of keys instead of nearly all of them." },
      { term: "Virtual node", definition: "One physical machine registered at many points on the consistent-hashing circle, which evens out the distribution and lets machines of different capacities carry proportional load." },
      { term: "Hot partition (hot key)", definition: "A single partition or key receiving disproportionate traffic. Resharding does not help when the imbalance is inside one key." },
      { term: "Resharding / rebalancing", definition: "Changing the number of partitions or which data each holds, on a system that must keep serving traffic throughout." },
      { term: "Scatter-gather", definition: "A query that must be sent to every partition and have its results merged. Cost grows with fleet size and tail latency is set by the slowest partition." },
    ],
  },

  networking: {
    primer: {
      plainSummary:
        "A request from a phone to your database passes through a surprising number of machines: name resolution, a content delivery network, a load balancer, a gateway, your service, and only then the data. This module is about knowing every hop by name and understanding what each can do to your request - because production outages are far more often caused by connection pools, mismatched timeouts, and retry storms than by servers running out of CPU.",
      analogy:
        "A relay race where each runner has a deadline. If the first runner takes too long, later runners cannot make up the time no matter how fast they are - and if nobody told the last runner that the race was already lost, they will run a leg that no longer matters, burning energy the team needs for the next race. Distributed request paths behave exactly like this, which is why deadlines have to be passed along the chain rather than set independently at each hop.",
      sections: [
        {
          heading: "The path of a single request",
          body: [
            "It starts with a name. The client has a hostname and needs an address, so it asks the Domain Name System, or DNS - a global directory that maps names to IP addresses. The answer is cached at several levels for a duration called the TTL, which is why DNS is a poor tool for fast failover: clients keep using a cached address long after you change it.",
            "Next the connection is established. TCP, the Transmission Control Protocol, provides an ordered, reliable byte stream, but it costs a round trip to set up before any data moves. TLS, which encrypts the connection, costs at least one more. A round trip within a datacentre is under a millisecond, but from a phone in another country it can be 150 milliseconds - so on a slow link, connection setup alone can cost half a second before your service has seen a single byte. This is why connections are pooled and reused rather than opened per request, and why moving the connection endpoint physically closer to users - which is what a content delivery network does - helps even for content that cannot be cached.",
            "Then the request meets a load balancer, which spreads traffic across your servers. Load balancers come in two flavours, named after layers of the network model. A layer 4 balancer works at the TCP level: it forwards packets based on addresses and ports without understanding what is inside, which makes it fast and protocol-agnostic. A layer 7 balancer understands HTTP, so it can route by URL path, retry idempotent requests, enforce timeouts, and terminate TLS - at the cost of doing more work per request. Most architectures use both.",
            "Finally the request reaches your service, which almost certainly calls other services, each of which repeats this whole story. The end-to-end latency your user sees is the sum along the critical path, and the failure probability is roughly the sum of the failure probabilities of every hop. Both facts argue for fewer hops.",
          ],
        },
        {
          heading: "Protocols, and why the version matters",
          body: [
            "HTTP/1.1 allows one outstanding request per connection. If a page needs thirty resources, the browser opens six connections and queues the rest, and a single slow response blocks everything behind it on its connection - a problem called head-of-line blocking. HTTP/2 fixes this at the application layer with multiplexing: many logically independent streams share one TCP connection, so a slow response no longer blocks its neighbours. This is why HTTP/2 dramatically reduces the number of connections a server must hold.",
            "HTTP/2 does not remove head-of-line blocking entirely, because TCP itself guarantees ordered delivery - one lost packet stalls every stream sharing that connection until it is retransmitted. HTTP/3 addresses this by running over QUIC, which is built on UDP and tracks streams independently, so a lost packet only stalls the stream it belonged to. On a lossy mobile network the difference is significant.",
            "For service-to-service calls, gRPC is the common choice: it runs over HTTP/2, uses a compact binary encoding rather than JSON, generates client and server code from a schema, and has first-class support for deadlines and streaming. Choose by the interaction shape rather than by fashion - request/response for ordinary calls, server streaming when the server pushes a sequence, and a persistent bidirectional connection such as a WebSocket when both sides send messages at unpredictable times.",
          ],
        },
        {
          heading: "Deadlines, retries, and how they amplify",
          body: [
            "Every call needs a deadline - a point in time after which the result is worthless. The critical rule is that deadlines propagate: if the user-facing request has a 200 millisecond budget and has already spent 60, the downstream call gets 140, not a fresh 200. When each hop instead sets its own independent timeout, the tail hop keeps working long after the caller has given up, burning capacity to produce answers nobody will read. gRPC builds this in; over plain HTTP you pass the remaining budget in a header yourself.",
            "Retries are the other half, and they are genuinely dangerous. Consider a service already struggling under load: requests slow down, callers time out and retry, which adds load, which makes it slower. If each of three layers retries three times, one user request can become twenty-seven backend requests - and this multiplication happens precisely when the system has least capacity to spare. A dependency that is merely slow gets converted into one that is completely dead. That is retry amplification.",
            "Three mechanisms keep retries safe. Exponential backoff waits progressively longer between attempts rather than hammering. Jitter adds randomness to those waits, which matters because without it every client that failed at the same moment retries at the same moment, producing a synchronised thundering herd. A retry budget caps retries as a fraction of total traffic - for instance, allowing retries to add at most 10 percent - so that a widespread failure cannot multiply load at all. Add one rule: retry only at one layer, usually the outermost, since retrying at every layer is what produces the multiplication.",
            "When a dependency is genuinely down, stop calling it. A circuit breaker tracks the recent failure rate and, past a threshold, fails calls immediately without attempting them. This protects the caller from piling up threads waiting on something that will not answer, and gives the failing service room to recover instead of being held down by traffic. After a cooling period the breaker lets a trickle through to test whether recovery happened.",
          ],
        },
        {
          heading: "Overload, backpressure, and connection accounting",
          body: [
            "There is a counter-intuitive fact about saturated systems: past a certain load, accepting more work makes total useful throughput go down. Every extra request consumes memory and scheduler attention, so all requests slow down, so more of them exceed their deadline and are discarded after being fully processed. The system converts all its capacity into producing answers nobody wants. This is congestion collapse, and the only defence is to refuse work rather than accept it.",
            "Backpressure is the general name for pushing that refusal back towards the source. Bound every queue, because an unbounded queue does not prevent overload - it just converts a fast rejection into a slow timeout while consuming memory. Shed load by rejecting requests early and cheaply, ideally shedding lower-priority traffic first so that health checks and paying customers survive while background jobs do not.",
            "Connections deserve explicit accounting because they are the resource that most often runs out first. Little's Law does the arithmetic: a service handling 5,000 requests per second, each holding a connection for 100 milliseconds, needs 500 concurrent connections. If every one of your 200 application servers keeps a pool of 100 connections to the same database, that is 20,000 connections - far beyond what most databases tolerate, and it will fail regardless of how much CPU is idle. This is the arithmetic that motivates connection pooling proxies, and it is a calculation worth doing out loud in an interview because most candidates never do it.",
          ],
        },
      ],
      workedExample: {
        title: "Budgeting a 200 millisecond request",
        setup:
          "A product requirement says the search page must respond within 200 milliseconds at the 99th percentile. The path is: client, load balancer, API gateway, search service, and the search service calls both a ranking service and a user-profile service.",
        steps: [
          "Write down the fixed costs first. The network round trip from client to your edge is roughly 30 milliseconds and cannot be optimised away. Internal hops cost around 1 millisecond each. That leaves roughly 165 milliseconds of real work to allocate.",
          "Identify what runs in parallel. The ranking call and profile call are independent, so they can be issued concurrently and the cost is the slower of the two, not the sum. Making them sequential would need 165 milliseconds split between them; making them parallel gives each the full budget. This is usually the single largest latency win available.",
          "Allocate and propagate. The gateway gets 190 milliseconds, passes 185 to the search service, which passes 150 to each of its two parallel calls, keeping 35 for merging and serialisation. Each deadline is derived from the parent's remaining time, so nothing downstream outlives the request it serves.",
          "Decide what happens when a call misses its deadline. The profile service is used for personalisation, so if it does not answer in 150 milliseconds, return unpersonalised results rather than failing the page. The ranking service is essential, so its failure is a real error. Deciding which dependencies are optional, before an incident, is what makes graceful degradation possible.",
          "Size the retry policy. Allow one retry of the ranking call, but only if enough budget remains - retrying with 10 milliseconds left is pure waste. Add jitter, retry only at this layer, and cap retries at 10 percent of traffic so a ranking-wide outage cannot double the load on an already failing service.",
          "Check connections with Little's Law. At 5,000 requests per second with a 185 millisecond internal hold time, roughly 925 requests are in flight. Each holds one connection to ranking and one to profiles, so those services need to accept about 1,000 concurrent connections each - a number to verify against their configured limits now, rather than discovering it during a launch.",
        ],
        takeaway:
          "The budget did three things beyond arithmetic: it forced the parallel-versus-sequential decision, it forced a decision about which dependency is optional, and it turned an abstract latency target into a concrete connection count that can be checked against real limits. Interviewers ask about latency because it is where a candidate either reasons about the whole path or only about their own box.",
      },
    },
    glossary: [
      { term: "DNS", expansion: "Domain Name System", definition: "The distributed directory that translates hostnames into IP addresses. Answers are cached for a TTL, which makes DNS unsuitable for rapid failover." },
      { term: "TTL", expansion: "time to live", definition: "How long a cached value may be used before it must be refreshed. Appears in DNS records, HTTP caching, and application caches alike." },
      { term: "TCP", expansion: "Transmission Control Protocol", definition: "A protocol providing a reliable, ordered byte stream. Costs a round trip to establish and guarantees ordering, which is why one lost packet can stall everything behind it." },
      { term: "UDP", expansion: "User Datagram Protocol", definition: "A connectionless protocol with no ordering or delivery guarantee. Lower overhead than TCP, and the foundation QUIC builds on." },
      { term: "TLS", expansion: "Transport Layer Security", definition: "The encryption layer beneath HTTPS. Adds at least one round trip to connection setup, which is why connection reuse matters on high-latency links." },
      { term: "RTT", expansion: "round-trip time", definition: "How long a signal takes to reach the far end and return. Under a millisecond inside a datacentre, tens to hundreds of milliseconds across continents, and bounded below by the speed of light." },
      { term: "CDN", expansion: "content delivery network", definition: "A network of geographically distributed servers that cache content near users and terminate connections close to them, cutting round-trip time even for content that cannot be cached." },
      { term: "Load balancer", definition: "A component that spreads incoming requests across a pool of servers and removes unhealthy ones from rotation." },
      { term: "Layer 4 vs layer 7", definition: "A layer 4 balancer routes by IP address and port without inspecting content - fast and protocol-agnostic. A layer 7 balancer understands HTTP and can route by path, retry, and enforce timeouts, at higher per-request cost." },
      { term: "HTTP/2 multiplexing", definition: "Carrying many independent request streams over one TCP connection, so a slow response no longer blocks others behind it at the application layer." },
      { term: "Head-of-line blocking", definition: "When one delayed item stalls everything queued behind it. HTTP/1.1 has it per connection; HTTP/2 removes it at the application layer but not at the TCP layer; HTTP/3 over QUIC removes it at both." },
      { term: "QUIC", expansion: "not an acronym - originally Quick UDP Internet Connections, now just a name", definition: "A transport protocol built on UDP that tracks streams independently, so a lost packet stalls only its own stream. The basis of HTTP/3." },
      { term: "gRPC", definition: "A service-to-service framework over HTTP/2 using a compact binary encoding and generated code from a schema, with built-in deadline propagation and streaming." },
      { term: "WebSocket", definition: "A persistent bidirectional connection over a single TCP connection, used when both client and server need to send messages at unpredictable times." },
      { term: "Connection pool", definition: "A reusable set of open connections held by a client so each request avoids paying connection setup. Pool size multiplied by client count is the number the server must actually tolerate." },
      { term: "Deadline", definition: "The absolute time after which a result is worthless. Deadlines must be propagated down the call chain so downstream work stops when the caller has given up." },
      { term: "Retry amplification", definition: "The multiplication of load caused by retries at several layers at once. Three layers each retrying three times turns one request into twenty-seven, exactly when capacity is scarcest." },
      { term: "Exponential backoff", definition: "Waiting progressively longer between retry attempts, so a struggling dependency is not hammered at full rate." },
      { term: "Jitter", definition: "Randomness added to retry delays so that clients which failed together do not retry together. Without it, backoff produces synchronised waves." },
      { term: "Retry budget", definition: "A cap on retries as a fraction of total traffic, which bounds the worst case so a broad failure cannot multiply load." },
      { term: "Thundering herd", definition: "Many clients simultaneously performing the same action - reconnecting, retrying, or recomputing an expired cache entry - and overwhelming the target." },
      { term: "Circuit breaker", definition: "A component that tracks failures to a dependency and, past a threshold, fails calls immediately without attempting them, protecting the caller and letting the dependency recover." },
      { term: "Backpressure", definition: "Signalling upstream to slow down or stop, rather than accepting work that cannot be completed. Requires bounded queues to be meaningful." },
      { term: "Load shedding", definition: "Deliberately rejecting requests, cheaply and early, when overloaded - ideally dropping low-priority traffic first." },
      { term: "Congestion collapse", definition: "The state where accepting more work reduces useful throughput, because everything slows enough that requests exceed their deadlines and are discarded after consuming full cost." },
    ],
  },

  "caching-queues": {
    primer: {
      plainSummary:
        "Two of the cheapest ways to make a system faster are refusing to do the same work twice, and refusing to do work right now that could be done later. A cache handles the first: keep the answer near the caller so the expensive computation is skipped. A queue or log handles the second: write down that work is needed, answer the user immediately, and process it in the background. Both are enormously effective and both introduce new ways to be wrong, which is what this module is really about.",
      analogy:
        "A busy restaurant kitchen. Prepping ingredients in advance is caching - the work is done once and reused across many orders, and the only risk is that something prepped this morning is no longer fresh. The rail of order tickets is a queue - the waiter does not stand at the pass waiting for each dish, they hang the ticket and move on. Note the two failure modes a real kitchen has: serving something stale, and a rail so full that tickets fall off. Software caches and queues fail in exactly those two ways.",
      sections: [
        {
          heading: "What a cache buys, and the arithmetic behind it",
          body: [
            "A cache stores the result of an expensive operation so that later requests for the same thing can be answered from fast storage instead. The fraction of requests answered from the cache is the hit rate, and it is the number that determines everything else.",
            "The arithmetic is worth internalising because it is counter-intuitive. Suppose a cache hit takes 1 millisecond and a miss takes 50. At a 90 percent hit rate, average latency is 0.9 x 1 + 0.1 x 50 = 5.9 milliseconds. Improving the hit rate to 95 percent gives 3.45 milliseconds - a 40 percent improvement from a 5-point change. The reason is that the misses dominate the average: at a 90 percent hit rate, misses contribute 85 percent of the total time. The same effect governs the load behind the cache. At 10,000 requests per second and a 90 percent hit rate, the database sees 1,000 per second; at 99 percent it sees 100. A single extra nine in the hit rate is a tenfold reduction in backend load, which is why caching is often the difference between one database and a sharded fleet.",
            "The flip side is that this leverage runs backwards during failure. A system sized on the assumption that the database only ever sees 100 requests per second will be hit with 10,000 the moment the cache is emptied - by a restart, a deployment, or an eviction wave. The backend must either be able to survive the full unmitigated load, or the design must include something that prevents the stampede.",
          ],
        },
        {
          heading: "Where the cache sits and who invalidates it",
          body: [
            "The commonest pattern is cache-aside, also called lazy loading: the application looks in the cache, and on a miss reads the database, writes the result into the cache, and returns it. It is simple and only caches what is actually requested, but every miss pays the full cost and there is a window where the cache holds a value the database has already changed.",
            "The alternatives change who does the writing. In write-through, the application writes to the cache and the cache synchronously writes to the database, so the two never disagree - at the cost of latency on every write and of caching data that may never be read. In write-back, the cache acknowledges immediately and writes to the database later, which is fast but can lose data if the cache dies before flushing.",
            "Invalidation is the hard part. There is a well-worn joke that the two hard problems in computer science are cache invalidation and naming things, and it endures because deciding when a cached value is wrong requires knowing about every path that could change it. Three approaches, in increasing order of both accuracy and effort: expire entries after a TTL and tolerate staleness up to that bound; explicitly delete entries when the underlying data is written; or subscribe to a change stream from the database and invalidate on real events. TTL is the honest default because it fails safely - staleness is bounded and predictable. Explicit invalidation is more precise but is only as good as your ability to find every write path, and the one you forget becomes a bug that appears at random.",
            "Two specific failure modes are worth naming. A cache stampede, also called a dogpile, happens when a popular key expires and hundreds of concurrent requests all miss and all recompute the same value simultaneously. The fix is request coalescing: let the first miss do the work while the others wait for its result. The other is that when many keys are given identical TTLs they expire together, producing a synchronised wave - the same problem jitter solves for retries, and the same fix applies, which is to randomise expiry times slightly.",
          ],
        },
        {
          heading: "Queues and logs are not the same thing",
          body: [
            "Both let a producer hand off work without waiting, but they have different shapes and get chosen for different reasons. A task queue holds items of work to be done. A consumer takes an item, does it, and acknowledges it, at which point the item is gone. Work is distributed across consumers, and adding consumers straightforwardly adds throughput. This is the right model for sending emails, resizing images, generating reports - independent units with no required order.",
            "A partitioned log is an append-only sequence of records that consumers read by position. Reading does not remove anything: records stay for a retention period, and each consumer tracks its own offset - its position in the log. This is what Kafka provides. Because records persist, several independent consumers can read the same stream for different purposes, and a consumer that had a bug can rewind and reprocess history. That replay ability is often the real reason to choose a log.",
            "Ordering is the sharpest distinction. A log guarantees order within a partition, and nothing across partitions. Since the partition is chosen by a key, all events for one key are ordered relative to each other. This is exactly the guarantee you want for per-entity ordering - all events for one user, or one account, in order - without paying for a global order that would limit you to one consumer. A task queue with several consumers gives essentially no ordering guarantee at all, which is fine until someone assumes otherwise.",
            "Because delivery is at-least-once in both models, consumers must be idempotent. A consumer that crashes after doing its work but before acknowledging will see the same message again, and this is normal operation rather than an exceptional case.",
          ],
        },
        {
          heading: "When the queue backs up",
          body: [
            "The number that tells you a queue's health is lag: how far behind the consumers are, measured either in unprocessed messages or, more usefully, in time. Lag of a hundred thousand messages means nothing on its own; lag of forty minutes is immediately meaningful to everyone, including non-engineers.",
            "Lag grows whenever the arrival rate exceeds the processing rate, and the crucial property is that a queue does not fix an under-provisioned consumer - it only hides the problem for a while, converting an immediate failure into a delayed one. If consumers are permanently too slow, lag grows without bound until retention expires and data is silently dropped. The diagnostic question is whether the backlog is a spike, which will drain once the burst passes, or a rate mismatch, which will not drain and needs more consumers, faster processing, or less input.",
            "There is a subtlety about adding consumers: in a partitioned log, parallelism is capped by the partition count, because a partition is consumed by exactly one member of a consumer group at a time. Ten partitions means at most ten useful consumers, and the eleventh sits idle. This is why partition count is a capacity decision made early and awkward to change later.",
            "Finally, handle the message that can never succeed. A malformed record that crashes the consumer will be redelivered forever, blocking its partition and stopping everything behind it - a poison message. The standard remedy is to retry a bounded number of times and then move the message to a dead letter queue, a separate destination for records that could not be processed, where they can be inspected and replayed after a fix. Without one, a single bad record halts an entire pipeline.",
          ],
        },
      ],
      workedExample: {
        title: "Adding a cache to a product page, and surviving its loss",
        setup:
          "A product page is read 10,000 times per second. Each render requires a database query taking 50 milliseconds. The database can sustain about 2,000 queries per second before latency degrades - so the current design is already over capacity.",
        steps: [
          "Confirm the cache is viable. Product data is read far more often than written and tolerates a few seconds of staleness. Both conditions hold, so caching is appropriate. If the data had to be exact at all times, the answer would be a read replica or a redesign, not a cache.",
          "Size it from the working set, not the corpus. There may be 10 million products, but if 100,000 of them take most of the traffic and each cached entry is 2 kilobytes, the hot set is roughly 200 megabytes - trivially memory-resident. Sizing from the full catalogue would have suggested 20 gigabytes and made the design look far more expensive than it is.",
          "Compute the resulting backend load. At a 95 percent hit rate the database sees 500 queries per second, comfortably inside its 2,000 limit. Note the sensitivity: at 90 percent it sees 1,000, and at 80 percent it sees 2,000 and the design is at its limit. Hit rate is not a detail here, it is the whole safety margin.",
          "Choose the invalidation strategy. Use a 60 second TTL as the baseline, and additionally delete the entry when a product is updated. The TTL is the guarantee, since it holds even if an invalidation is missed; the explicit delete is an optimisation that makes the common case fast. Designing it in this order means a forgotten write path degrades freshness for at most 60 seconds rather than forever.",
          "Prevent the stampede. Add request coalescing so that when a hot key expires, one request recomputes and the rest wait for its answer instead of 500 concurrent identical queries hitting the database. Add random jitter of a few seconds to TTLs so that entries populated together do not expire together.",
          "Plan for total cache loss. If the cache restarts, the database faces the full 10,000 queries per second - five times its capacity - and will collapse, and because it collapses the cache cannot refill, so the outage is self-sustaining. Mitigations: warm the cache before returning an instance to service, cap concurrent database queries so excess requests are shed quickly rather than queueing, and be willing to serve stale entries while a refresh is in flight.",
        ],
        takeaway:
          "The cache was the easy part; the failure analysis was the design. The step most candidates skip is the last one, and it is the one that matters most in practice, because a cache with a 95 percent hit rate has quietly become a load-bearing dependency. Any component whose absence takes the system down is part of the availability story whether or not it was introduced as an optimisation.",
      },
    },
    glossary: [
      { term: "Cache", definition: "Fast storage holding the result of an expensive operation so later requests for the same thing skip that work." },
      { term: "Hit rate", definition: "The fraction of requests served from cache. Because misses dominate average latency and backend load, small changes in hit rate have outsized effects." },
      { term: "Cache-aside (lazy loading)", definition: "The application checks the cache, and on a miss reads the source, populates the cache, and returns. Simple and common; every miss pays full cost." },
      { term: "Write-through", definition: "Writes go to the cache, which synchronously writes to the underlying store, keeping the two in agreement at the cost of write latency." },
      { term: "Write-back (write-behind)", definition: "The cache acknowledges a write immediately and persists it later. Fast, but data can be lost if the cache fails before flushing." },
      { term: "Invalidation", definition: "Removing or refreshing a cached entry that no longer matches the source of truth. Hard because it requires knowing every path that could change the underlying data." },
      { term: "Eviction policy", definition: "The rule for what to discard when a cache is full. LRU discards the least recently used entry; LFU discards the least frequently used." },
      { term: "Cache stampede (dogpile)", definition: "Many concurrent requests missing on the same expired key and all recomputing the same value at once." },
      { term: "Request coalescing", definition: "Letting a single request recompute a missing value while other requests for the same key wait for its result, instead of duplicating the work." },
      { term: "Task queue", definition: "A structure holding units of work. A consumer takes an item, processes it, and acknowledges it, after which the item is gone. Little or no ordering guarantee." },
      { term: "Partitioned log", definition: "An append-only sequence of records split across partitions and retained for a period. Consumers read by position, so records can be re-read and multiple consumers can read the same stream independently." },
      { term: "Offset", definition: "A consumer's position in a log partition. Because it is tracked per consumer, rewinding to reprocess history is possible." },
      { term: "Consumer group", definition: "A set of consumers that divide a log's partitions among themselves, each partition going to exactly one member - which caps parallelism at the partition count." },
      { term: "Retention", definition: "How long a log keeps records before deleting them. A consumer lagging beyond retention loses data permanently." },
      { term: "Lag", definition: "How far behind consumers are, in messages or in time. Time-based lag is the more useful form because it is meaningful to everyone." },
      { term: "Poison message", definition: "A record that always fails processing, causing endless redelivery that blocks its partition and everything queued behind it." },
      { term: "Dead letter queue (DLQ)", definition: "A separate destination for messages that failed processing repeatedly, so the main pipeline can proceed while failures are inspected and replayed later." },
      { term: "Backpressure", definition: "Slowing or refusing producers when consumers cannot keep up, rather than letting an unbounded queue absorb the imbalance until memory or retention runs out." },
      { term: "Replay", definition: "Reprocessing historical records from a log, used to rebuild derived state after a bug or to populate a new consumer. A capability logs have and task queues do not." },
    ],
  },

  "storage-indexing": {
    primer: {
      plainSummary:
        "Choosing a database is not a matter of picking a well-known product name. It is a matter of writing down how the data will be read and written, and then choosing a storage engine and a key design whose physical behaviour matches. This module covers what actually happens on disk when you query, why some databases are fast at writes and others at reads, and how to choose a primary key and indexes so the queries you run most often are cheap.",
      analogy:
        "A textbook. The pages are the data, in one fixed order. The table of contents is a clustered index - it matches the physical order of the book, so finding chapter 7 also tells you that chapters 8 and 9 are right after it. The index at the back is a secondary index: it lets you find every mention of a term in whatever order you like, but it costs extra pages, must be rebuilt when the book changes, and sends you jumping around. Every trade-off in database indexing is visible in that one object, including the decisive one - the back index makes lookups faster and makes the book slower to revise.",
      sections: [
        {
          heading: "What happens when you run a query",
          body: [
            "Data lives on disk in fixed-size blocks called pages, typically 4 to 16 kilobytes. Databases read and write whole pages, never individual rows, which means fetching one 200-byte row costs a full page read. This single fact explains an enormous amount of database behaviour, including why storing related data adjacently is so valuable: if the rows you need share a page, you paid for one read instead of fifty.",
            "Without an index, finding rows matching a condition requires reading every page - a full table scan, with cost proportional to the size of the table. An index is a separate structure mapping values to row locations, allowing the engine to find matching rows without reading everything. The classic index is a B+ tree, a balanced tree whose nodes are pages. Because it is shallow and wide - a three-level tree can index millions of rows - a lookup costs only three or four page reads, and because the leaves are linked in order, range queries such as 'all orders between two dates' walk the leaves sequentially instead of jumping around.",
            "Indexes are not free, and this is the trade-off to state explicitly in an interview. Each index consumes storage, and every insert, update, or delete must update every affected index, so a table with six indexes makes writes several times more expensive. Indexes also become useless if the query does not match their leading columns: an index on (country, city) helps a query filtering by country, and helps one filtering by country and city, but does nothing for one filtering only by city - the same way the alphabetical phone book is useless for finding a name by phone number.",
            "One optimisation worth knowing by name: a covering index is one that contains every column a query needs, so the engine answers entirely from the index without ever visiting the table. Turning two page reads into one, on a query run a billion times a day, is a real result.",
          ],
        },
        {
          heading: "B-trees versus LSM trees",
          body: [
            "Storage engines fall into two broad families, and the difference determines whether a database is naturally read-optimised or write-optimised. Knowing which one you are talking to explains most of its performance characteristics.",
            "A B-tree engine updates data in place: to change a row, find its page, modify it, write it back. Reads are excellent, because the row is exactly where the index says. Writes are more expensive, because a small change forces a whole-page write, and because the write lands wherever the page happens to live, producing random writes across the disk. Crash safety comes from a write-ahead log, or WAL: every change is first appended to a sequential log, and only then applied to the pages, so that after a crash the log can be replayed to recover anything not yet written. PostgreSQL, MySQL's InnoDB, and most relational databases work this way.",
            "A log-structured merge tree, or LSM tree, never updates in place. Writes go into an in-memory table called a memtable, plus a WAL for durability. When the memtable fills, it is written out as a sorted immutable file called an SSTable, or sorted string table. Writes are therefore always sequential appends, which is dramatically faster on both spinning disks and SSDs. The cost lands on reads: a given key may live in the memtable or in any of several SSTables, so a read may consult many files. Two mechanisms limit that. A Bloom filter is a compact probabilistic structure that answers 'is this key definitely absent from this file?' - it can produce false positives but never false negatives, which is exactly enough to skip most files without reading them. And compaction runs in the background, merging SSTables and discarding superseded values.",
            "The trade-off is best expressed as three kinds of amplification. Write amplification is how many bytes hit the disk per byte you logically wrote - high in LSM trees because compaction rewrites data repeatedly. Read amplification is how many reads one logical read causes - high in LSM trees because of multiple files. Space amplification is how much extra storage is used for superseded and not-yet-collected data. B-trees have low read amplification and higher write cost; LSM trees invert that. So a write-heavy workload such as time-series ingestion or event logging suits Cassandra or RocksDB, while a read-heavy transactional workload suits PostgreSQL. One caution: compaction is background work that competes with live traffic, so an LSM database can show sudden latency spikes when a large compaction runs.",
          ],
        },
        {
          heading: "Picking the family of store",
          body: [
            "The families exist because access patterns differ, and the right way to choose is to name the dominant read and let it select. A relational database gives flexible queries, joins, and transactions across multiple tables, and is the correct default for data with real relationships and invariants - orders, accounts, inventory. The frequent claim that relational databases 'do not scale' is misleading: a single well-tuned instance handles very large workloads, and the genuine limit is that transactions across shards are expensive, not that the model is slow.",
            "A key-value store handles one access pattern - fetch by exact key - extremely fast. A document store keeps semi-structured records and lets you query inside them, suiting data whose shape varies by record. A wide-column store organises data by partition key and clustering key and is built for enormous write volumes with predictable per-partition reads.",
            "Then the specialised ones. A search index inverts the data - mapping each term to the documents containing it - which is what makes full-text search fast, and is a structure a relational database cannot efficiently imitate. A vector database indexes high-dimensional embeddings for similarity search. Object storage holds large immutable blobs cheaply, with metadata kept in a real database. A columnar store keeps each column contiguously rather than each row, so an analytical query touching three columns of a two-hundred-column table reads only those three, and the uniformity of a column compresses far better than a mixed row.",
            "That last distinction has a name worth using precisely. OLTP - online transaction processing - describes many small reads and writes of individual records, which is what an application does. OLAP - online analytical processing - describes scanning and aggregating huge numbers of rows across few columns, which is what a dashboard does. Running analytical queries against your transactional database is a common and painful mistake, because one such query can evict the entire cache the application depends on. The standard answer is to replicate into a separate analytical system and let each engine do what its physical layout is good at.",
          ],
        },
        {
          heading: "Designing keys, and the cost of getting them wrong",
          body: [
            "The primary key does more than identify a row; in most engines it also determines physical layout, so it decides which queries are cheap. The rule follows directly from the page discussion: choose the key so that rows read together are stored together.",
            "This is why a compound key is usually right. For an order-history screen, a key of (customer_id, order_date descending) stores each customer's orders contiguously, newest first, so 'this customer's last twenty orders' is one short sequential read. A key of (order_id) alone scatters a customer's orders randomly across the whole table, turning the same screen into twenty separate page reads.",
            "Beware of sequential keys under write load. An auto-incrementing integer or a plain timestamp means every insert targets the same place - the end - so one page, one partition, or one machine absorbs all writes while the rest idle. This is the hotspotting problem, and it is why UUIDs are often preferred, and why time-ordered identifiers such as UUIDv7 exist: they keep enough time ordering to be useful for range scans while spreading writes better than a strict counter.",
            "Two more choices to make deliberately. Normalisation stores each fact once and joins to assemble a view, which keeps writes cheap and consistent but makes reads do work; denormalisation stores pre-assembled copies, making reads fast at the cost of updating several places on write and risking disagreement between them. Read-heavy systems denormalise, and the price they pay is the update fan-out. And decide retention at design time: data that is never deleted grows without bound, and the cost of adding a deletion path to a system full of undeletable data is far higher than designing partitions you can drop whole. Regulations such as the EU's GDPR can also require erasing a specific person's data, which is close to impossible if that data is smeared across immutable append-only files - one reason systems encrypt per-user data with a per-user key, so destroying the key destroys the data.",
          ],
        },
      ],
      workedExample: {
        title: "Designing storage for an order history screen",
        setup:
          "An e-commerce product needs a screen showing a customer's recent orders, newest first, twenty per page. There are 50 million customers and 500 million orders. Support also needs to look up an order by its ID, and finance needs monthly revenue totals by product category.",
        steps: [
          "Write down the access patterns before choosing anything. One: orders for a customer, newest first, paginated - this is the high-volume path. Two: one order by ID - low volume, latency-sensitive. Three: aggregate revenue by category over a month - low volume, scans enormous numbers of rows. These have genuinely different shapes, and pattern three does not belong in the same system as the other two.",
          "Let the dominant pattern choose the primary key. Pattern one is the high-volume read, so the key is (customer_id, order_date descending, order_id). Now a customer's orders are physically contiguous and already in display order, and one page is a single short sequential read. Pagination is a range scan continuing from the last row seen, which stays constant-cost at any page depth - unlike OFFSET, whose cost grows linearly because the engine must skip every preceding row.",
          "Serve the secondary pattern with a secondary index. Looking up by order_id needs an index mapping order_id to the primary key. This costs storage and slows writes slightly, and that is the correct trade: it is one index serving a genuine need, not a speculative one.",
          "Move the analytical pattern out. Monthly revenue by category scans hundreds of millions of rows across a few columns - a columnar OLAP workload. Running it against the transactional store would flood the buffer pool and evict the pages the order screen depends on, so a slow finance report becomes a slow storefront. Replicate into a data warehouse and let it answer.",
          "Choose the engine from the write pattern. Orders are append-heavy, immutable once placed, and read by recency. That suits an LSM engine well. But orders also need transactional guarantees at creation time - reserve inventory and record payment atomically - so a relational database is the safer primary choice, with its LSM-like advantages coming from the append-only access pattern rather than the engine.",
          "Plan retention now. Orders older than seven years may be legally deletable, and hot data is almost entirely recent. Partition by month so old partitions can be dropped as whole units, which is nearly free, rather than deleting hundreds of millions of individual rows later, which is slow and generates enormous write amplification.",
        ],
        takeaway:
          "Every decision traced back to a written-down access pattern, and the choices were made in priority order - the highest-volume read got to choose the physical layout, and everything else was served by an additional structure or moved to a different system. The instinct to fix, if you have it, is starting from 'we will use Postgres' and then bending the access patterns to fit. Start from the reads.",
      },
    },
    glossary: [
      { term: "Page (block)", definition: "The fixed-size unit databases read and write, typically 4 to 16 kilobytes. Fetching a single row costs a whole page read, which is why storing related rows together matters." },
      { term: "Full table scan", definition: "Reading every page of a table to find matching rows. Cost grows with table size, which is what indexes exist to avoid." },
      { term: "Primary key", definition: "The unique identifier for a row. In most engines it also determines physical storage order, so it decides which queries are cheap." },
      { term: "Clustered index", definition: "An index whose order is the table's physical order, so finding a row also locates its neighbours. There can be only one per table." },
      { term: "Secondary index", definition: "An additional structure mapping some column's values to rows, enabling lookups by that column at the cost of storage and slower writes." },
      { term: "Covering index", definition: "An index containing every column a query needs, so the query is answered from the index alone without reading the table." },
      { term: "Compound key", definition: "A key made of several columns in a specific order. Useful only for queries that filter on a prefix of that order." },
      { term: "B+ tree", definition: "A balanced, shallow, wide tree used for most relational indexes. Lookups cost a few page reads, and linked leaves make range scans efficient." },
      { term: "WAL", expansion: "write-ahead log", definition: "A sequential log of changes written before they are applied to data pages, so a crash can be recovered by replaying it." },
      { term: "LSM tree", expansion: "log-structured merge tree", definition: "An engine that buffers writes in memory and flushes them as sorted immutable files, making writes sequential and fast at the cost of reads consulting multiple files." },
      { term: "Memtable", definition: "The in-memory sorted buffer in an LSM engine that absorbs recent writes before being flushed to disk." },
      { term: "SSTable", expansion: "sorted string table", definition: "An immutable file of sorted key-value pairs produced by flushing a memtable." },
      { term: "Compaction", definition: "Background merging of SSTables to discard superseded values and reduce the number of files a read must consult. Competes with live traffic for I/O." },
      { term: "Bloom filter", definition: "A compact probabilistic structure that reports whether a key is definitely absent or possibly present. False positives are possible, false negatives are not, which is enough to skip most files." },
      { term: "Write amplification", definition: "Bytes physically written per byte logically written. High in LSM engines because compaction rewrites data repeatedly." },
      { term: "Read amplification", definition: "Physical reads per logical read. High in LSM engines because a key may live in any of several files." },
      { term: "Space amplification", definition: "Storage consumed beyond the logical data size, from superseded values not yet compacted away." },
      { term: "OLTP", expansion: "online transaction processing", definition: "Workloads of many small reads and writes of individual records - what an application does." },
      { term: "OLAP", expansion: "online analytical processing", definition: "Workloads scanning and aggregating vast numbers of rows over few columns - what a dashboard does. Best served by a separate columnar system." },
      { term: "Columnar storage", definition: "Storing each column contiguously rather than each row, so analytical queries read only the columns they need and compression works far better." },
      { term: "Inverted index", definition: "A structure mapping each term to the documents containing it - the basis of full-text search." },
      { term: "Normalisation", definition: "Storing each fact exactly once and joining to assemble views. Cheap consistent writes, more work per read." },
      { term: "Denormalisation", definition: "Storing pre-assembled or duplicated data so reads are fast, at the cost of updating multiple copies and risking disagreement." },
      { term: "Hotspotting", definition: "Concentration of writes on one page, partition, or machine, typically caused by a sequential key such as an auto-increment or a timestamp." },
      { term: "GDPR", expansion: "General Data Protection Regulation", definition: "EU law granting rights over personal data, including erasure. Hard to satisfy on immutable append-only storage, which motivates encrypting per-user data with a per-user key so deleting the key destroys the data." },
    ],
  },

  "timed-designs": {
    primer: {
      plainSummary:
        "Knowing the material and performing well in a 45-minute interview are different skills. The interview is an exercise in prioritisation under time pressure: you cannot cover everything, so you must reach a working end-to-end design quickly, then spend your remaining time going deep on the part that actually matters. This module is about the clock, the structure, and the specific habits that separate a candidate who knows things from one who is convincing.",
      analogy:
        "Sitting an exam where marks are spread across five questions. The way to fail is to write a beautiful answer to question one and leave four blank. The way to pass is to answer all five adequately, then return and deepen the ones worth the most. Design interviews are marked the same way: breadth first to prove you can see the whole system, then depth on one thing to prove you can actually build it.",
      sections: [
        {
          heading: "The clock is the structure",
          body: [
            "A workable allocation for a 45-minute interview: five minutes on requirements and scope, five on estimation, ten reaching a complete end-to-end architecture, fifteen to twenty on one or two deep dives, and five to close. The single most important checkpoint is that a complete, if simple, design exists on the board by minute twenty. Everything after that is improvement of something that already works.",
            "The commonest failure is the opposite order: starting with a detailed discussion of the database schema at minute three, and reaching minute forty with an exquisite storage layer and no idea how a request arrives. From the interviewer's seat that reads as someone who cannot judge what matters, which is precisely the skill being tested for at senior level.",
            "Because the clock is doing this much work, keep it visible and narrate it. Saying 'I have a complete path now, so I will spend the next fifteen minutes on the fan-out problem because that is where this design will break first' shows exactly the prioritisation being assessed. It also invites correction - if the interviewer wanted a different area, they will say so, and you have lost ten seconds instead of fifteen minutes.",
          ],
        },
        {
          heading: "Requirements before boxes",
          body: [
            "Every design starts by deciding what is being built, because the prompt is deliberately underspecified and the scoping is part of the test. 'Design Twitter' could mean posting and reading a timeline, or it could include search, ads, direct messages, and trends. Choosing a scope and saying it aloud is not stalling; it is establishing the contract you will be judged against.",
            "Separate the two kinds of requirement. Functional requirements are what the system does - post a message, read a timeline. Non-functional requirements are the properties it must have - how many users, what latency, how available, how consistent, how durable. Non-functional requirements are what actually drive architecture. 'Users can post' tells you almost nothing; '100 million daily users, timeline loads under 200 milliseconds, brief staleness acceptable' tells you the whole shape.",
            "Get numbers early because they eliminate options. A system with a thousand users and one with a hundred million are different designs, and until you know which, every decision is unfounded. State assumptions explicitly rather than waiting to be told - 'I will assume 100 million daily active users and a 100:1 read-to-write ratio; tell me if that is wrong' - which is faster and demonstrates that you know which numbers matter.",
            "Finally, write down the non-goals. Saying 'I am not designing search, and I am treating the media pipeline as a black box' prevents the interviewer from thinking you forgot them, and buys you the time to do the core well. This is scope control, and it is a job skill, not an interview trick.",
          ],
        },
        {
          heading: "Getting to end-to-end, then choosing where to dig",
          body: [
            "Build the first architecture by following a single request from the user to storage and back. Client, edge, load balancer, service, data store, and whatever must happen asynchronously. Keep it simple and correct rather than clever - the first version should be one that obviously works, even if it obviously will not scale. You will then improve it deliberately, and 'here is why the simple version breaks' is a far more convincing narrative than a complicated diagram presented without motivation.",
            "Say what your data model is and where the source of truth lives. Most confusion in design interviews comes from ambiguity about which store is authoritative and which components hold derived copies. Naming the source of truth once removes a whole category of muddled conversation later.",
            "Then pick the deep dive, and pick it from the hardest requirement rather than from what you know best. If the requirement is a 100-million-follower fan-out, the deep dive is fan-out. If it is exactly-once payment processing, it is idempotency and reconciliation. Candidates often steer toward their comfortable topic, and interviewers notice, because the requirement that will actually break the system is usually visible in the prompt.",
            "In the deep dive, go all the way down to mechanism. Not 'we would use a cache' but which keys, what TTL, how invalidation happens, what occurs on a miss storm, and what breaks when the cache is empty. The difference between mid-level and senior is almost entirely here: naming components versus explaining what they do under failure.",
          ],
        },
        {
          heading: "Closing, and the habits that carry",
          body: [
            "Reserve the last five minutes and use them for three things: how the system fails, what you would monitor, and how it evolves at ten times the scale. A close of 'the ranking service is the weakest link; if it fails we serve chronological results, which is degraded but useful; I would alert on fan-out lag rather than CPU; and at ten times this size I would revisit the fan-out threshold' does more for your evaluation than another five minutes of the deep dive.",
            "Two habits matter throughout. First, state trade-offs as trade-offs. Every real decision has a cost, and a candidate who says 'I will denormalise, which makes reads a single lookup and means an update touches many rows, which I accept because reads outnumber writes a hundred to one' is demonstrating judgement. A candidate who says only 'I will denormalise' is demonstrating recall. Interviewers are listening specifically for the second half of that sentence.",
            "Second, think aloud, and be willing to be wrong in public. Interviewers cannot grade silence, and a wrong idea you notice and correct yourself scores better than a long pause followed by a safe answer. When you do not know something, say so and say how you would find out - 'I do not know Kafka's exact rebalance behaviour here; I would verify it before relying on it' is a completely acceptable senior answer, and far better than confident invention, which is the single fastest way to lose an interviewer's trust.",
          ],
        },
      ],
      workedExample: {
        title: "A minute-by-minute run through a 45-minute interview",
        setup:
          "The prompt is 'Design a URL shortener'. It sounds simple, which is exactly the trap - simple prompts leave more room to demonstrate depth, and interviewers use them for that reason.",
        steps: [
          "Minutes 0-5, scope. Confirm what is in: create a short link, redirect, custom aliases, expiry, and basic click analytics. Confirm what is out: user accounts, spam detection, and a full analytics product. Establish the non-functional shape: reads vastly outnumber writes, redirects must be fast because they sit in front of a page load, and links must never resolve to the wrong destination even if analytics are briefly lost.",
          "Minutes 5-10, numbers. 100 million redirects per day is about 1,200 per second average and roughly 3,500 at peak. One creation per hundred redirects gives about 12 writes per second. A year of links is a few hundred gigabytes physically. Conclude out loud: this is read-dominated, fits on modest hardware, and the interesting problems are code generation and redirect latency - not scale.",
          "Minutes 10-20, end-to-end. Client to CDN to load balancer to a stateless service; the service reads a key-value store mapping short code to destination; a cache in front absorbs most reads; click events go to a queue so analytics never sit on the redirect path. State the source of truth: the key-value store, with the cache and analytics both derived from it. A complete design now exists.",
          "Minutes 20-35, deep dive on code generation. Compare the options honestly: a random code needs a uniqueness check on collision; a counter encoded in base62 is collision-free but sequential and therefore both guessable and a write hotspot; a per-server counter with an ID prefix avoids the hotspot at the cost of longer codes. Choose one, and explain the failure case - what happens when two servers claim the same range, and how a fencing epoch or a pre-allocated block prevents it. This is where the interview is actually won.",
          "Minutes 35-40, second dive on the redirect path. A 301 permanent redirect is cached by the browser, which is fast and free but destroys click analytics and makes a destination change unenforceable; a 302 keeps control and analytics at the cost of a request every time. Name the trade-off and pick 302 for a product that needs analytics and revocability - and note that this decision came from the requirements set in minute two, which is the payoff for scoping properly.",
          "Minutes 40-45, close. Failure: if the cache is lost, the store faces the full 3,500 reads per second, so cap concurrency and warm on startup. Monitoring: redirect p99, cache hit rate, and code-generation collision rate. Evolution at ten times scale: shard by short code, move analytics fully off the request path, and consider serving redirects from the edge.",
        ],
        takeaway:
          "Notice what the structure produced. A complete design existed by minute twenty, so everything after was optional improvement rather than a race to finish. The deep dive was chosen from the genuinely hard part rather than the most familiar. And the redirect decision was justified by a requirement established in the first five minutes - which is what makes a design read as a coherent argument rather than a collection of components.",
      },
    },
    glossary: [
      { term: "Functional requirement", definition: "What the system does - the features. 'Users can post a message.' Necessary to state, but rarely what determines the architecture." },
      { term: "Non-functional requirement", definition: "The properties the system must have: scale, latency, availability, consistency, durability, cost. These are what actually drive design decisions." },
      { term: "Scope / non-goals", definition: "What you are and are not designing. Stating non-goals explicitly prevents the interviewer from reading an omission as an oversight." },
      { term: "Back-of-the-envelope estimate", definition: "A quick order-of-magnitude calculation used to eliminate options, done to one significant digit." },
      { term: "SLA", expansion: "service level agreement", definition: "A contractual promise about service quality, usually with consequences for breaching it." },
      { term: "SLO", expansion: "service level objective", definition: "An internal target for a metric, such as 99.9 percent of requests succeeding within 200 milliseconds. The number engineering actually designs and alerts against." },
      { term: "SLI", expansion: "service level indicator", definition: "The measurement an SLO is defined over - for example, the observed fraction of successful requests." },
      { term: "Critical path", definition: "The sequence of steps that determines end-to-end latency. Work not on the critical path can be made asynchronous, which is the most common latency win available." },
      { term: "Source of truth", definition: "The authoritative store for a piece of data. Everything else is a derived copy that may be rebuilt from it. Naming it removes most ambiguity in a design discussion." },
      { term: "Invariant", definition: "A statement that must always hold - an account balance never goes negative, an ID is never reused. Invariants determine where coordination is genuinely required." },
      { term: "Happy path", definition: "The flow when everything works. Necessary but insufficient - interviews are decided on what happens when it does not." },
      { term: "Blast radius", definition: "How much of the system is affected when one component fails. Reducing it is why systems are partitioned into cells, zones, and regions." },
      { term: "Graceful degradation", definition: "Continuing to provide reduced service when a dependency fails - for example, serving unranked results when the ranking service is down - instead of failing entirely." },
      { term: "Deep dive", definition: "The extended examination of one subsystem, chosen from the hardest requirement. Where senior interviews are usually decided." },
    ],
  },

  "auth-identity-access": {
    primer: {
      plainSummary:
        "Nearly every design interview reaches the question 'how do you know who this request is from, and whether they are allowed to do this?' Those are two separate questions with two separate answers. Authentication establishes who you are; authorization decides what you may do. This module covers both, plus the third thing they get confused with - delegation, which is how you let another application act on your behalf without handing it your password.",
      analogy:
        "An airport. Your passport proves who you are: that is authentication, and it happens once at check-in. Your boarding pass says which flight and which seat you may take: that is authorization, and it is checked repeatedly by people who never re-examine your passport. Handing your bag to a porter with a claim tag is delegation - they can retrieve that one bag, not open your suitcase or board your flight. Three different documents, three different jobs, and confusing them is how security designs go wrong.",
      sections: [
        {
          heading: "Three different problems",
          body: [
            "Authentication - often shortened to authn - answers 'who is making this request?' It happens by checking something you know such as a password, something you have such as a phone or hardware key, or something you are such as a fingerprint. Combining categories is multi-factor authentication, and it works because compromising two different categories at once is much harder than compromising one.",
            "Authorization - authz - answers 'is this identity permitted to perform this action on this resource?' It happens on every request, not once at login, and it is the question that actually protects data. A system with excellent authentication and careless authorization lets a correctly identified user read someone else's records. The most common real-world web vulnerability is precisely this: an endpoint that verifies you are logged in and then fetches whatever record ID you asked for without checking it belongs to you.",
            "Delegation is the third and least understood. It is how a third-party application gets to act on your behalf with a subset of your permissions, without ever seeing your credentials. Before delegation protocols existed, applications genuinely asked for your email password so they could read your contacts - which meant unlimited, unrevocable access. This is the specific problem OAuth was invented to solve, and understanding that history is what makes the protocol make sense.",
          ],
        },
        {
          heading: "Sessions versus tokens: the revocation trade-off",
          body: [
            "Once someone has authenticated, subsequent requests must carry proof. There are two architectures, and the choice between them is almost entirely a question about revocation.",
            "A stateful session works like a coat check: on login the server generates a random opaque identifier, stores the associated user and expiry in its own storage, and gives the client the identifier, usually in a cookie. Each request looks it up. The token itself means nothing - all meaning lives server-side. The great advantage is instant revocation: delete the row and the session is dead on the next request. The cost is a lookup on every request against shared storage, which must then be fast and highly available.",
            "A self-contained token inverts this. The commonest form is the JWT, or JSON Web Token, which is three base64-encoded parts - a header, a payload of claims such as user ID and expiry, and a cryptographic signature over the first two. Any service holding the public key can verify the signature and trust the contents without contacting anything. That is the appeal: stateless verification that scales horizontally with no shared session store.",
            "The catch is the whole point of the module. Because verification is local, there is no way to un-issue a token. If an account is compromised or an employee is dismissed, their token remains valid until it expires. Every real mitigation is a compromise on the original promise: keep access tokens short-lived, typically 5 to 15 minutes, and pair them with a long-lived refresh token that is checked against server state when exchanged for a new access token - which reintroduces server state, but only on refresh rather than on every request. Or maintain a revocation list of invalidated tokens, which is again server state consulted on every request, at which point you have rebuilt sessions with extra steps. It is also worth stating plainly that base64 is encoding, not encryption: anyone holding a JWT can read its payload, so a JWT is not a place for secrets.",
            "A useful rule for interviews: use sessions when immediate revocation matters and you have a fast shared store, and self-contained tokens when many independent services must verify identity without a common dependency. Then say the sentence that shows you understand the trade-off: 'this means revocation is delayed by up to the token lifetime, and here is why that is acceptable here.'",
          ],
        },
        {
          heading: "OAuth 2.0 and OpenID Connect, actually explained",
          body: [
            "OAuth 2.0 is a delegation framework. It is not an authentication protocol, and the number of systems that have used it as one - incorrectly - is large enough that the industry built a second protocol on top to fix the mistake.",
            "The flow has four parties: the resource owner, which is you; the client, which is the application wanting access; the authorization server, which authenticates you and issues tokens; and the resource server, which holds the data. In the standard authorization code flow, the client redirects you to the authorization server; you authenticate there and approve a specific scope such as 'read your contacts'; the authorization server redirects back with a short-lived authorization code; and the client exchanges that code, together with its own client secret, for an access token. The code goes through the browser, but the token exchange happens server to server - which is precisely why the code exists as a separate step, since anything travelling through a browser redirect can be seen or logged.",
            "The critical observation is what the access token means. It says 'the bearer may perform these actions on these resources'. It does not say who you are. A client that receives one and concludes 'this user is logged in' is making an unsound inference, because a token obtained for a different application could be replayed to it - the confused deputy problem.",
            "OpenID Connect, or OIDC, is a thin layer on top that adds authentication properly. It introduces the ID token: a JWT with standard claims about the user, explicitly audience-bound to the client that requested it, so a token issued for another application fails validation. The rule to remember and to state: OAuth 2.0 for authorization and delegation, OIDC for authentication. If you need to know who the user is, you need OIDC, and 'sign in with Google' is OIDC even when people call it OAuth.",
            "Two practical details worth naming: an access token is typically a bearer token, meaning whoever holds it can use it - so it must travel only over TLS and never be logged or placed in a URL. And PKCE, Proof Key for Code Exchange, closes an attack where a malicious app on the same device intercepts the authorization code; it is now recommended for all clients, not only mobile ones.",
          ],
        },
        {
          heading: "Modelling permissions, and identity between services",
          body: [
            "Once you know who someone is, you must decide what they may do, and the model you choose determines which questions are easy to answer. Role-based access control, or RBAC, assigns users roles and roles permissions - admin, editor, viewer. It is simple, easy to audit, and the right default. Its limitation shows when permissions depend on the specific resource rather than a global role: 'editor of this one document' is not expressible without inventing a role per document, which does not scale.",
            "Attribute-based access control, or ABAC, decides from attributes of user, resource, and context - department, classification, time of day, network location. It is far more expressive and correspondingly harder to reason about and audit, because answering 'who can see this file?' may require evaluating policies against every user.",
            "Relationship-based access control, or ReBAC, models permission as a graph of relationships: this user is an editor of this document, which lives in this folder, which is owned by this team. Permission checks become graph reachability questions, and it handles hierarchical and shared resources naturally - which is why Google built Zanzibar on this model for Drive and YouTube. The design problem it creates is latency, since a permission check now traverses a graph on the request path, which is why such systems cache aggressively and need a way to reason about the staleness of a cached decision.",
            "There is also machine identity, which candidates routinely forget. Services calling services need to authenticate too, and the weak answer is a shared API key in a config file - it never rotates, it appears in logs, and it grants the same access to every holder. The strong answer is mutual TLS, or mTLS, where both sides present certificates and each verifies the other, so identity is cryptographic and certificates are short-lived and automatically rotated. Service meshes provide this transparently. The principle underneath all of it is least privilege: every identity, human or machine, gets the narrowest permissions that let it do its job, so that a compromise is contained rather than total.",
          ],
        },
      ],
      workedExample: {
        title: "Letting a scheduling app read a user's calendar",
        setup:
          "A third-party scheduling application wants to read a user's calendar to find free slots. It must never be able to read email, and the user must be able to revoke access at any time without changing their password.",
        steps: [
          "Rule out the naive approach first, and say why. Asking for the user's password would give the app total account access forever, would defeat multi-factor authentication, and would leave no way to revoke short of a password change. Every requirement in the prompt is violated. This is the historical problem OAuth exists to solve.",
          "Run the authorization code flow. The scheduling app redirects the user to the calendar provider's authorization server with a requested scope of calendar.read. The user authenticates there - the app never sees those credentials - and is shown exactly what is being requested. On approval, the provider redirects back with a short-lived authorization code.",
          "Exchange the code server to server. The app's backend sends the code plus its client secret to the authorization server and receives an access token scoped to calendar.read, valid for perhaps an hour, plus a long-lived refresh token. The code went through the browser; the token did not - which is the point of the two-step exchange. Use PKCE so a malicious app that intercepts the code cannot redeem it.",
          "Call the resource server. The app calls the calendar API with the access token as a bearer token over TLS. The resource server validates the signature, checks the scope includes calendar.read, and checks it has not expired. A request to the mail API with this token fails on scope - which is what makes 'never read email' an enforced property rather than a promise.",
          "Handle expiry and revocation. When the access token expires the app exchanges the refresh token for a new one. Because refresh happens against the authorization server, which holds state, revocation works here: when the user clicks 'remove this app', the refresh token is deleted, and access ends within at most one access-token lifetime. That residual window is the concrete cost of stateless access tokens, and quantifying it - 'access ends within an hour' - is the answer an interviewer wants.",
          "Add authentication only if needed. If the app also wants to display the user's name, it should request the openid scope and use OIDC to receive an ID token audience-bound to itself. Inferring identity from the access token instead would be the confused deputy mistake: a token minted for another application could be replayed to log in as that user.",
        ],
        takeaway:
          "Every requirement in the prompt maps to a specific mechanism: scopes enforce 'calendar only', the code exchange keeps the token off the browser, refresh-token deletion provides revocation, and OIDC supplies identity that the access token cannot. That mapping is the answer. The failure mode to avoid is naming JWT and OAuth as though they were the design - they are building blocks, and the design is which one carries which requirement.",
      },
    },
    glossary: [
      { term: "Authentication (authn)", definition: "Establishing who is making a request, by verifying something known, held, or inherent. Happens at login." },
      { term: "Authorization (authz)", definition: "Deciding whether an identity may perform a specific action on a specific resource. Happens on every request, and is where most real breaches occur." },
      { term: "Delegation", definition: "Granting an application a subset of your permissions to act on your behalf, without giving it your credentials." },
      { term: "MFA", expansion: "multi-factor authentication", definition: "Requiring evidence from two or more different categories - knowledge, possession, inherence - so compromising one is insufficient." },
      { term: "Session (stateful)", definition: "An opaque random identifier stored server-side and given to the client, usually in a cookie. The token carries no meaning; all state is on the server, which makes revocation immediate." },
      { term: "JWT", expansion: "JSON Web Token", definition: "A signed, self-contained token of three base64 parts - header, claims, signature - that any holder of the key can verify without contacting a server. Encoded, not encrypted: the payload is readable by anyone holding it." },
      { term: "Bearer token", definition: "A credential where possession alone grants access, with no proof the holder is the intended party. Must travel only over TLS and never be logged or put in a URL." },
      { term: "Access token", definition: "A short-lived token authorising specific actions on specific resources. Says what the bearer may do, not who they are." },
      { term: "Refresh token", definition: "A long-lived credential exchanged for new access tokens. Because the exchange is checked against server state, deleting it is how revocation is achieved." },
      { term: "OAuth 2.0", definition: "A delegation framework letting an application obtain scoped access to a user's resources without their credentials. It is not an authentication protocol." },
      { term: "OIDC", expansion: "OpenID Connect", definition: "An authentication layer on top of OAuth 2.0 that adds an ID token with standard claims about the user, audience-bound to the requesting client." },
      { term: "ID token", definition: "An OIDC token asserting who the user is, bound to the client that requested it so it cannot be replayed to a different application." },
      { term: "Authorization code flow", definition: "The OAuth flow where the browser receives a short-lived code and the client exchanges it server-to-server for a token, keeping the token out of the browser." },
      { term: "PKCE", expansion: "Proof Key for Code Exchange", definition: "An extension binding an authorization code to the client that requested it, preventing a malicious app from redeeming an intercepted code. Now recommended for all clients." },
      { term: "Scope", definition: "The named subset of access a token grants, such as calendar.read. What makes 'this app can never read email' enforceable rather than a promise." },
      { term: "Confused deputy", definition: "An attack where a component with authority is tricked into using it for someone else - such as accepting an access token minted for a different application as proof of identity." },
      { term: "RBAC", expansion: "role-based access control", definition: "Permissions granted via roles such as admin or viewer. Simple and auditable; awkward when permission depends on the individual resource." },
      { term: "ABAC", expansion: "attribute-based access control", definition: "Decisions computed from attributes of user, resource, and context. Highly expressive, harder to audit." },
      { term: "ReBAC", expansion: "relationship-based access control", definition: "Permission modelled as a graph of relationships, so checks become reachability questions. Handles hierarchy and sharing naturally; adds graph traversal to the request path." },
      { term: "mTLS", expansion: "mutual TLS", definition: "Both client and server present and verify certificates, giving cryptographic machine identity with short-lived automatically rotated credentials, replacing shared static API keys." },
      { term: "Least privilege", definition: "Granting every identity the narrowest permissions sufficient for its job, so that any single compromise is contained." },
      { term: "SSO", expansion: "single sign-on", definition: "Authenticating once with a central identity provider and gaining access to many applications, typically via OIDC or SAML." },
    ],
  },
};
