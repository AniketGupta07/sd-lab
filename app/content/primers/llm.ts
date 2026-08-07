import type { TopicPrimerEntry } from "../types";

/**
 * From-zero explanations for the LLM infrastructure modules and the week-8
 * mock-interview modules. The LLM primers assume no familiarity with
 * transformers: attention, tokens, and the KV cache are built up from nothing,
 * because the serving trade-offs are incomprehensible without them.
 */
export const llmPrimers: Record<string, TopicPrimerEntry> = {
  "llm-inference-execution": {
    primer: {
      plainSummary:
        "Serving a large language model is unlike serving any other kind of model, because one request is not one computation - it is hundreds of sequential computations, one per word produced, each depending on the last. This module explains what actually happens when a model generates text, why the work splits into two phases with completely different performance characteristics, and why a piece of per-request memory called the KV cache determines how many users a machine can serve.",
      analogy:
        "A typist who must read the entire document so far before typing each new character. Reading the existing text is fast because they can scan it all at once. Typing is slow because each character requires another full pass over everything written so far, one character at a time, and nothing about the next character can be worked out before the previous one exists. Now note the essential trick: rather than re-reading from the start every time, they keep notes summarising what they have read. Those notes are the KV cache - they make generation feasible, and they take up desk space that limits how many documents the typist can work on at once.",
      sections: [
        {
          heading: "Tokens, attention, and what a model actually does",
          body: [
            "A language model does not process characters or words but tokens - chunks of text produced by a tokeniser, where a common word is usually one token and a rare word splits into several. English averages roughly four characters per token, which is the conversion factor to use when estimating. Everything - cost, latency, memory, context limits - is measured in tokens, so it is worth thinking in them from the start.",
            "The model's job is narrow: given a sequence of tokens, predict a probability distribution over which token comes next. Generating text means sampling one token from that distribution, appending it to the sequence, and running the model again on the now-longer sequence. This loop is why generation is inherently sequential and cannot be parallelised across the tokens of one response - the tenth token literally cannot be computed before the ninth exists.",
            "Inside, the dominant mechanism is attention. For each token being processed, the model computes three vectors: a query representing what this token is looking for, a key representing what it offers to others, and a value representing the information it carries. A token attends to earlier tokens by comparing its query against their keys, and the resulting weights determine how much of each token's value it incorporates. This is how the model relates a pronoun to the noun it refers to, or a closing bracket to its opening one.",
            "The consequence that drives everything else in this module: computing attention for a new token requires the keys and values of every preceding token. Recomputing them for the entire sequence at each step would make generation quadratically expensive and hopelessly slow. So they are computed once and kept. That store is the KV cache, and it is the single most important object in LLM serving.",
          ],
        },
        {
          heading: "Two phases with opposite characteristics",
          body: [
            "Generation splits into prefill and decode, and almost every serving decision follows from their differences.",
            "Prefill processes the entire input prompt at once. Because all input tokens are already known, their keys and values can be computed in parallel as large matrix multiplications, which is exactly what a GPU is built for. Prefill is compute-bound - limited by arithmetic throughput - and it is efficient, achieving high hardware utilisation. Its cost grows with prompt length, so prefill for a 10,000-token document is substantial while prefill for a short question is negligible.",
            "Decode generates output tokens one at a time. Each step processes exactly one new token, which means a tiny amount of arithmetic, but to do it the GPU must read the entire model's weights from memory - tens of gigabytes for a large model - plus the KV cache. Decode is memory-bandwidth-bound: the bottleneck is moving weights, not multiplying them, and GPU utilisation during decode is often very low. This is the counter-intuitive and crucial fact, because it means adding more requests to a decode batch costs almost nothing in extra time - the weights were being read anyway - which is what makes batching so extraordinarily valuable in LLM serving.",
            "The two phases produce two distinct user-facing metrics. Time to first token, or TTFT, is how long before the first word appears, and it is dominated by queue time plus prefill, so it grows with prompt length. Inter-token latency is the gap between successive tokens once streaming starts, and it is set by decode speed and by how many requests share the batch. Users experience these very differently: a slow TTFT feels like the system is broken, while inter-token latency merely needs to comfortably exceed reading speed - roughly 10 tokens per second is adequate, and much faster is barely noticed. Quoting a single average latency for an LLM service conceals both, which is why the two must be stated separately.",
            "This also explains streaming. Because tokens are produced one at a time anyway, they can be sent as they are generated, so the user starts reading after the first token rather than waiting for the full response. Streaming does not reduce total generation time at all; it changes perceived latency dramatically, and it is essentially mandatory for interactive use.",
          ],
        },
        {
          heading: "The KV cache is the concurrency budget",
          body: [
            "Each concurrent request holds its own KV cache, growing by one entry per layer for every token in its sequence. The size follows directly: number of layers, times number of key-value heads, times head dimension, times sequence length, times two for keys and values, times bytes per number.",
            "Work through a concrete case, because the number surprises people. A model with 32 layers, 32 heads of dimension 128, in 16-bit precision, holds roughly 2 megabytes per 1,000 tokens per request. A request with 8,000 tokens of context therefore holds about 16 megabytes. On an 80 gigabyte GPU with perhaps 30 gigabytes free after the model weights, that allows fewer than 2,000 such requests - and far fewer at longer contexts, because the cost is linear in sequence length. So the KV cache, not the model weights and not compute, is what caps concurrency.",
            "This is why architectural changes to reduce it matter so much. Multi-query attention has all query heads share a single key-value head, cutting KV cache size by the number of heads - often a factor of 32 - at some quality cost. Grouped-query attention is the middle ground now standard in large models: heads are grouped, with each group sharing one key-value head, giving most of the memory saving with little quality loss. When you see GQA in a model description, this memory arithmetic is what it is for.",
            "The operational consequence is that long contexts are expensive in a way that is easy to underestimate. Doubling context doubles KV memory per request and therefore halves concurrency, so a service allowing 128,000-token contexts must either serve dramatically fewer concurrent users or reserve enormous memory. Charging by token, and setting context limits, are capacity decisions rather than pricing whims.",
            "Finally, a generation is a long-lived cancellable state machine, not a single call. It may run for many seconds while holding GPU memory throughout, so it must be cancellable - when a user closes the tab, the generation should stop and free its KV cache immediately, or the server accumulates abandoned generations consuming the memory that bounds concurrency. It also needs a maximum output length, since a model can fail to stop and generate until the context limit, occupying a slot for minutes. Both are correctness requirements rather than optimisations.",
          ],
        },
      ],
      workedExample: {
        title: "Sizing a chat service on one GPU node",
        setup:
          "A support chat product runs a model with 32 layers, 8 key-value head groups of dimension 128, in 16-bit precision, on an 80 gigabyte GPU. Model weights occupy 40 gigabytes. Typical conversations reach 4,000 tokens of context and generate 300 token responses. The requirement is a TTFT under 2 seconds.",
        steps: [
          "Compute KV cache per token. 32 layers x 8 key-value heads x 128 dimensions x 2 for keys and values x 2 bytes = about 131 kilobytes per token. Note how much grouped-query attention bought: with 32 key-value heads instead of 8 this would be about 524 kilobytes per token, and everything below would be four times worse.",
          "Compute per-request and total capacity. At 4,000 tokens of context that is roughly 524 megabytes per request. With 40 gigabytes of weights and perhaps 5 gigabytes for activations and workspace, about 35 gigabytes remain for KV cache - so about 65 concurrent requests. That single number is the concurrency limit of this node, and it came from memory rather than from compute.",
          "Check what decode throughput this implies. Because decode is memory-bandwidth-bound, running 65 requests in one batch costs barely more per step than running one - the weights are read once for the whole batch. So batching is not an optimisation here, it is the entire economics of the deployment, and a design that serves requests one at a time wastes almost all the hardware.",
          "Split the latency budget by phase. Prefill of 4,000 tokens is a large parallel computation taking perhaps 200 milliseconds. That leaves 1.8 seconds of the TTFT budget for queueing, so the admission policy must keep queue time under 1.8 seconds - which, given 65 concurrent slots, sets the arrival rate the node can accept before TTFT degrades.",
          "Separate the second latency metric. Inter-token latency at a full batch might be 40 milliseconds, giving 25 tokens per second - comfortably above reading speed, so a 300 token response streams over 12 seconds and feels responsive. Averaging TTFT and inter-token latency into one number would have hidden both constraints and made the design impossible to reason about.",
          "Enforce the lifecycle rules. Cap output length so a non-terminating generation cannot hold a slot indefinitely, and cancel promptly on client disconnect to release KV memory. With only 65 slots, a handful of abandoned generations is a measurable fraction of total capacity - which is why these are correctness requirements rather than tidiness.",
        ],
        takeaway:
          "Every number came from KV cache arithmetic, and the binding constraint turned out to be memory rather than compute - which is the opposite of most people's intuition about GPUs. Being able to do this calculation, and to explain why decode being memory-bound makes batching so valuable, is the core competence this module exists to build.",
      },
    },
    glossary: [
      { term: "Token", definition: "The chunk of text a model processes - roughly four characters of English. Cost, latency, memory, and context limits are all measured in tokens." },
      { term: "Attention", definition: "The mechanism by which each token incorporates information from earlier tokens, by comparing its query against their keys and combining their values." },
      { term: "Query, key, value", definition: "Three vectors per token: what it is looking for, what it offers, and the information it carries. Keys and values of earlier tokens must be available to process a new one." },
      { term: "KV cache", definition: "Stored keys and values for all preceding tokens, so generation does not recompute them each step. Per-request, grows with sequence length, and is what caps concurrency." },
      { term: "Prefill", definition: "Processing the whole input prompt in parallel. Compute-bound, efficient, and its cost grows with prompt length." },
      { term: "Decode", definition: "Generating output one token at a time. Memory-bandwidth-bound because the full model weights are read per step, which is why extra batched requests are nearly free." },
      { term: "TTFT", expansion: "time to first token", definition: "Latency until the first output token appears, dominated by queue time plus prefill. What makes a service feel broken when it is slow." },
      { term: "Inter-token latency", definition: "The gap between successive output tokens, set by decode speed and batch size. Needs only to exceed reading speed, so it is far less sensitive than TTFT." },
      { term: "Streaming", definition: "Sending tokens as they are produced. Does not reduce total generation time and transforms perceived latency." },
      { term: "MQA / GQA", expansion: "multi-query attention / grouped-query attention", definition: "Sharing key-value heads across query heads to shrink the KV cache - often by a factor of many - at small quality cost. Now standard in large models." },
      { term: "Context length", definition: "The maximum tokens a model can attend to. Doubling it doubles KV memory per request and roughly halves concurrency, making it a capacity decision." },
      { term: "Cancellation", definition: "Stopping a generation and freeing its KV cache when the client disconnects. A correctness requirement, since abandoned generations consume the memory that bounds concurrency." },
      { term: "Output token limit", definition: "A cap on generated length, preventing a non-terminating generation from occupying a slot for minutes." },
    ],
  },

  "llm-serving-capacity-admission": {
    primer: {
      plainSummary:
        "Because decode is memory-bandwidth-bound, running many requests together costs barely more than running one - so batching is where nearly all LLM serving throughput comes from. But requests arrive at different times and finish at different times, so naive batching wastes most of the benefit. This module covers the scheduling technique that fixes that, the memory allocator that stops KV cache waste, and how to decide which requests to admit when memory is the scarce resource.",
      analogy:
        "A minibus service. Waiting until the bus is full before departing means early passengers wait a long time - that is static batching. Departing on a fixed schedule regardless of occupancy wastes seats. The efficient design lets passengers board and alight at any stop while the bus keeps moving, so a seat vacated is immediately reusable. That is continuous batching, and paged memory is the equivalent of not reserving three seats for every passenger in case they brought luggage.",
      sections: [
        {
          heading: "From static to continuous batching",
          body: [
            "Static batching collects requests until a batch is full or a timeout fires, runs them together, and returns all results when the last one finishes. It is simple and it wastes enormously in this setting, for a reason specific to language models: requests in a batch generate different numbers of tokens. If one request generates 20 tokens and another generates 800, the short one finishes almost immediately and its slot sits idle for the remaining 780 steps. With realistic output length variation, most of the batch is idle most of the time.",
            "Continuous batching, also called iteration-level scheduling, fixes this by making scheduling decisions at every token step rather than per batch. After each step, completed requests leave and waiting requests join immediately. The batch is continuously reformed, so a finished request's slot is reused on the very next iteration rather than at the end of the batch. Throughput improvements of several times over static batching are typical, which is why every serious inference server does this.",
            "Prefill and decode compete for the same hardware, which creates a scheduling problem. A long prefill is a large compute job that, if run as a unit, stalls decode for every request in flight - so one user submitting a 30,000-token document causes a visible pause in everyone else's streaming. Chunked prefill splits a long prompt into pieces processed across several iterations, interleaved with decode steps. This raises that request's TTFT slightly and protects everyone else's inter-token latency, which is the right trade because inter-token latency is visible continuously while a small TTFT increase on one long request is not.",
            "The metric worth adopting here is goodput rather than throughput: tokens per second that actually met their latency targets. A server can maximise raw throughput by batching enormously and letting latency degrade past usefulness, producing tokens nobody wanted. Goodput makes the trade-off explicit and is the number to optimise.",
          ],
        },
        {
          heading: "Paged attention: allocating KV memory properly",
          body: [
            "The naive KV cache allocator reserves, for each request, enough contiguous memory for its maximum possible length. Since you cannot know how long a response will be, that means reserving for the worst case - so a request that generates 50 tokens might hold memory sized for 4,000. Most of the reserved memory is never used, and because it is reserved it cannot serve anyone else.",
            "Paged attention applies the idea of virtual memory to this problem. KV cache is divided into fixed-size blocks - say 16 tokens each - and a request is allocated blocks on demand as it generates, with a block table mapping its logical positions to physical blocks. Blocks need not be contiguous. A request that generates 50 tokens uses four blocks and no more, and waste is bounded to at most one partly-filled block per request rather than the whole unused reservation.",
            "The gain is large and directly translates into concurrency: memory utilisation rises from often below 40 percent to above 90 percent, which means roughly double the concurrent requests on the same hardware. Since KV memory is the concurrency limit, this is one of the highest-leverage optimisations in LLM serving.",
            "Paging enables a second capability that is easy to miss. Because blocks are indirected through a table, several requests can share blocks holding identical content. When many requests begin with the same long system prompt, that prefix is stored once and shared, rather than duplicated per request. For applications with large shared prompts - the common enterprise pattern - this saves both the memory and the repeated prefill compute for the shared portion. It also makes branching cheap, since alternative continuations share their common prefix.",
            "The cost is a layer of indirection on every attention operation and an allocator to maintain, which is real engineering complexity but has a small runtime cost relative to what it recovers.",
          ],
        },
        {
          heading: "Admission control when memory is the constraint",
          body: [
            "Because a request holds memory for its entire generation, admitting one is a commitment to future memory, not an instantaneous cost. A request admitted now with a 2,000-token prompt may generate 2,000 more tokens over the next minute, doubling its footprint. Admission control must therefore reason about projected memory, not current memory - accepting requests until memory is full guarantees that some in-flight request will be unable to allocate its next block.",
            "What happens then is worth naming: preemption. The server must either evict a request - discarding its KV cache and restarting it later, wasting all work done so far - or swap its cache to host memory and back, which is slow. Both are expensive, so a good admission policy exists precisely to make preemption rare, and preemption rate is a signal that admission is too permissive.",
            "Admission should be weighted by projected work rather than by request count. A request with a 50-token prompt expecting 50 tokens out is trivially cheap; one with a 30,000-token prompt expecting 4,000 out is hundreds of times more expensive. Counting both as one request produces wildly inaccurate capacity planning. Estimate output length from historical distributions per endpoint or per application, and admit on a token-weighted basis.",
            "Fairness needs deliberate attention, because without it a single tenant submitting many long requests can occupy all memory and starve everyone else. Per-tenant concurrency or token limits, with a shared pool for burst, keep one heavy user from consuming the service. This is the same fairness problem as any shared queue, made sharper because the resource is held for a long time.",
            "Autoscaling needs the right signal, and CPU utilisation is useless here - the GPU is the resource, and a decode-bound server can show modest GPU compute utilisation while being completely full on memory. Scale on KV cache utilisation, queue depth, and TTFT. And account for the startup delay: loading tens of gigabytes of weights takes minutes, so scaling reacts far too slowly to absorb a spike. That is why headroom must be provisioned in advance and why load shedding, not autoscaling, is the response to a sudden surge.",
          ],
        },
      ],
      workedExample: {
        title: "A serving tier that thrashes under mixed traffic",
        setup:
          "An inference service handles two workloads: short interactive chat requests, and document summarisation with prompts of 20,000 to 50,000 tokens. Chat TTFT has degraded from 1 second to 8 seconds, throughput is poor, and logs show frequent request restarts.",
        steps: [
          "Identify the restarts as preemption. Requests are being evicted because memory ran out mid-generation, discarding their KV cache and restarting them later. All the work already done is thrown away, so effective throughput falls while the hardware stays busy - the system is doing more work and producing less. This is the signature of admission control that counts requests rather than projected tokens.",
            "Fix admission to be token-weighted. A 50,000-token summarisation request is not equivalent to a chat request. Estimate each request's peak KV footprint from its prompt length plus an expected output length drawn from historical distributions per endpoint, and admit only while projected peak memory stays within a reserve. Keep headroom rather than filling memory exactly, since output length estimates are distributions and some requests will exceed them.",
          "Explain the TTFT degradation and fix it with chunked prefill. A 50,000-token prefill is a long compute job that stalls decode for every in-flight request, so chat responses freeze mid-stream while it runs. Split long prefills into chunks interleaved with decode iterations: the summarisation request's TTFT rises modestly, and chat inter-token latency stops stalling - a trade that favours the many over the one.",
          "Separate the workloads rather than only tuning the shared pool. Interactive chat and batch summarisation have genuinely different latency requirements, and mixing them means every tuning decision is a compromise. Route them to separate pools, or enforce per-class memory reservations so summarisation cannot consume the memory chat needs. This is the queue-separation lesson from notification systems, applied to GPU memory.",
          "Verify paged attention is in use and check prefix sharing. If the allocator reserves worst-case contiguous memory per request, utilisation may be under 40 percent and half the hardware is being wasted. With paging, also enable prefix sharing - if summarisation requests share a long instruction prompt, that prefix is stored once and its prefill computed once, which for this workload is a substantial saving on both axes.",
          "Fix the autoscaling signal. GPU compute utilisation looks moderate while memory is full, so scaling on it never triggers. Scale on KV cache utilisation, queue depth, and TTFT instead - and because loading weights takes minutes, maintain headroom and shed load on sudden spikes rather than expecting autoscaling to respond in time.",
        ],
        takeaway:
          "The visible symptom was latency, and the cause was an admission policy treating a 50,000-token request as equivalent to a 50-token one. LLM serving punishes request-count-based reasoning severely because the cost range between requests spans orders of magnitude and the resource is held for a long time. Think in projected tokens and projected memory, and most of these failures do not occur.",
      },
    },
    glossary: [
      { term: "Static batching", definition: "Collecting requests, running them together, and returning all results at the end. Wastes most slots because generation lengths vary widely." },
      { term: "Continuous batching", definition: "Making scheduling decisions every token step so finished requests leave and new ones join immediately. Typically several times the throughput of static batching." },
      { term: "Chunked prefill", definition: "Splitting a long prompt across several iterations interleaved with decode, so one long request cannot stall everyone else's streaming." },
      { term: "Goodput", definition: "Tokens per second that met their latency targets. The right optimisation target, since raw throughput can be maximised by producing tokens too late to be useful." },
      { term: "Paged attention", definition: "Allocating KV cache in fixed-size blocks with a block table, so a request uses only what it needs. Raises memory utilisation from under 40 percent to over 90." },
      { term: "KV block", definition: "The fixed-size unit of KV cache allocation, typically 16 tokens, which bounds waste to one partly-filled block per request." },
      { term: "Prefix sharing", definition: "Several requests sharing KV blocks for an identical leading prompt, saving both memory and repeated prefill compute. Enabled by paging's indirection." },
      { term: "Fragmentation", definition: "Unusable memory left by variable-sized allocations. The problem paged allocation eliminates." },
      { term: "Token-weighted admission", definition: "Admitting by projected token work and peak memory rather than by request count, since request costs span orders of magnitude." },
      { term: "Preemption (eviction / swapping)", definition: "Discarding or offloading an in-flight request's KV cache when memory runs out. Wastes completed work, and its rate signals over-permissive admission." },
      { term: "Output length estimation", definition: "Predicting how many tokens a request will generate, from historical distributions per endpoint. Required to project memory before admitting." },
      { term: "Per-tenant limits", definition: "Concurrency or token caps per tenant with a shared burst pool, preventing one heavy user from occupying all memory." },
      { term: "Autoscaling signals for inference", definition: "KV cache utilisation, queue depth, and TTFT - not CPU or GPU compute utilisation, which stay moderate while memory is full." },
      { term: "Model load time", definition: "Minutes to load tens of gigabytes of weights, which makes autoscaling too slow for spikes and forces provisioned headroom plus load shedding." },
    ],
  },

  "llm-inference-optimization-routing": {
    primer: {
      plainSummary:
        "Once batching and memory are handled, the remaining levers are: split one model across several GPUs when it does not fit, make the model itself cheaper by using fewer bits or by guessing ahead, avoid work entirely by caching, and send each request to the cheapest model that can handle it. This module covers each, with the constraint that matters most - which of them preserve output quality exactly and which trade it.",
      analogy:
        "Reducing the cost of a translation service. You can split a long document among several translators, which only helps if they can coordinate quickly. You can hire a faster translator who is slightly less precise. You can have a junior draft the passage and a senior check it, which is exact if the senior verifies properly and much faster when the junior is usually right. You can keep translations of passages you have seen before. And you can route simple sentences to the junior alone. Each has a different effect on quality, and knowing which are lossless is the whole skill.",
      sections: [
        {
          heading: "Splitting a model across GPUs",
          body: [
            "When a model does not fit on one GPU, or when one GPU is too slow, it must be split - and the split determines how much the GPUs must talk to each other, which is what limits the result.",
            "Tensor parallelism splits individual layers across GPUs, so each holds a slice of every weight matrix and every layer requires combining partial results across all of them. This communication happens many times per token, so it demands a very fast interconnect - NVLink within a node. Across nodes over ordinary networking it is disastrous, because the communication cost exceeds the compute saving. The rule to state: tensor parallelism within a node, never across.",
            "Pipeline parallelism assigns different layers to different GPUs, so a token passes through GPU one, then two, and so on. Communication happens only at layer boundaries - much less traffic, and therefore tolerable across nodes. The cost is the pipeline bubble: while GPU one works on a token, the others wait, so with a naive schedule utilisation is poor. Bubbles are reduced by keeping several requests in flight at different stages, which continuous batching provides naturally.",
            "Data parallelism runs a complete copy of the model on each GPU with different requests on each - not a split at all, but a replication. It has zero inter-GPU communication and is the simplest and most effective approach whenever the model fits on one device. The general guidance follows: replicate if you can, use tensor parallelism within a node if you must, and add pipeline parallelism across nodes only for models too large for a single node.",
          ],
        },
        {
          heading: "Making the model itself cheaper",
          body: [
            "Quantisation stores weights in fewer bits - 8-bit or 4-bit instead of 16. It shrinks memory proportionally, which allows a larger model on the same hardware or more KV cache alongside a smaller one, and it speeds up decode directly because decode is memory-bandwidth-bound and there are simply fewer bytes to read. This is a case where the memory saving and the speed-up come from the same cause.",
            "The cost is some quality loss, and how much depends on method. Naive rounding degrades noticeably. Methods such as GPTQ and AWQ use calibration data to decide where precision matters and protect the weights that carry the most signal, so 4-bit quantisation often loses very little on most tasks. The honest caveat is that aggregate benchmarks can hide degradation concentrated in specific capabilities - reasoning or long-context tasks often suffer first - so a quantised model must be evaluated on the tasks you actually care about rather than on a general benchmark.",
            "Speculative decoding is different in kind, and this is the point worth understanding. A small fast draft model proposes several tokens ahead; the large model then verifies all of them in a single forward pass, which is cheap because verification is parallel like prefill rather than sequential like decode. Accepted tokens are kept and the first rejection discards the rest. The remarkable property is that with correct verification the output distribution is mathematically identical to running the large model alone - it is exactly lossless, unlike quantisation. The speed-up depends on acceptance rate: a draft model agreeing 70 percent of the time gives a large gain, and one agreeing 30 percent may be slower than not using it at all, because the draft cost is wasted on rejections.",
            "So position them accurately in an interview: speculative decoding trades extra compute for latency with no quality change, while quantisation trades quality for memory and speed. Conflating them, or claiming quantisation is free, is the mistake to avoid.",
          ],
        },
        {
          heading: "Caching and routing",
          body: [
            "The cheapest token is one never computed. Exact prefix caching reuses KV cache for identical leading tokens, which is highly effective for applications with a long shared system prompt, since the prefill for that prefix is computed once rather than per request. Its limit is exactness: a single differing character at the start invalidates everything after it. This is why prompt construction order matters operationally - put the stable shared content first and the variable content last, and a large fraction of prefill disappears.",
            "Full response caching applies where identical requests recur, such as a fixed set of support questions. Because generation is usually sampled rather than deterministic, caching a response means returning the same one every time, which must be an accepted product behaviour. And any cache keyed on user-specific content requires care that one tenant's cached content cannot be returned to another, which makes cache keys a security boundary rather than a performance detail.",
            "Routing sends each request to the cheapest model that can handle it. Most production traffic is easy - simple classification, extraction, formatting - and does not need the largest model. Routing by task type or explicit request parameters is reliable. Routing by a learned difficulty classifier is more powerful and introduces its own failure mode, since the classifier can be wrong and the user experiences that as an inexplicably poor answer. Start with explicit routing and add learned routing with measurement.",
            "Fallback is the operational necessity underneath all of this. Model servers fail, GPUs fail, and a provider may rate-limit you. Define in advance what happens: fall back to a smaller model, to a different provider, or to a non-generative response. Because different models produce different output styles and lengths, a fallback path must be tested rather than assumed to work - a fallback to a model with a different context limit or a different output format will fail exactly when it is needed.",
            "One warning to carry: routing and caching change which model produced a response, so log the model version, the quantisation, and the cache status with every response. Without that, a quality complaint is uninvestigable, because you cannot tell which of several possible paths produced the output.",
          ],
        },
      ],
      workedExample: {
        title: "Cutting inference cost by 60 percent without a quality complaint",
        setup:
          "A product spends heavily on a 70-billion-parameter model serving mixed traffic: 60 percent simple classification and extraction, 30 percent moderate summarisation, 10 percent complex reasoning. All requests share a 2,000-token system prompt. Latency requirements are modest.",
        steps: [
          "Take the free saving first. Every request pays prefill for the same 2,000-token system prompt. Enable prefix caching and ensure the prompt is constructed with the shared portion strictly first, so the variable content cannot invalidate it. This removes a large share of total prefill compute and changes output quality not at all - which makes it the correct first move.",
          "Route by task, starting with the reliable version. The 60 percent of traffic doing classification and extraction does not need a 70-billion-parameter model; an 8-billion model handles it well. Route explicitly by endpoint or request parameter rather than by a learned classifier, and measure per-task quality before and after so the claim is evidenced. This is the largest single saving available.",
          "Quantise the large model and evaluate properly. Move the 70B model to 4-bit AWQ, roughly halving its memory and speeding decode because fewer bytes are read per step. Evaluate specifically on the complex reasoning traffic rather than on a general benchmark, since that is the capability most likely to degrade and the one this model is now reserved for.",
          "Add speculative decoding for the remaining large-model traffic. Use the 8B model already deployed for routing as the draft model. Measure the acceptance rate: if it is above roughly 60 percent this is a solid latency win at exactly zero quality cost, and if it is low, disable it, since a poor draft model makes things slower rather than faster.",
          "Choose the parallelism layout deliberately. The quantised 70B model now fits on a single GPU, so use data parallelism - replicas rather than splitting - which has no inter-GPU communication at all. Note that quantisation did not only save memory; it removed the need for tensor parallelism entirely, which is a second-order benefit worth stating.",
          "Make the change safe to operate. Log model version, quantisation, route decision, and cache hit status on every response, so any quality regression can be attributed to a specific path. Define fallbacks - if the 8B model is unavailable, route to the 70B rather than failing - and test them. Then run an evaluation comparing old and new on real traffic before completing the rollout.",
        ],
        takeaway:
          "The largest savings came from not doing work - prefix caching and routing - rather than from making the model faster. That ordering is general: eliminate work, then reduce work, then parallelise what remains. Note also which changes were lossless and which were not, because that determines what needs evaluation and what merely needs verification.",
      },
    },
    glossary: [
      { term: "Tensor parallelism", definition: "Splitting individual layers across GPUs, requiring communication many times per token. Viable only within a node over a fast interconnect." },
      { term: "Pipeline parallelism", definition: "Assigning different layers to different GPUs. Far less communication, so it works across nodes, at the cost of pipeline bubbles." },
      { term: "Pipeline bubble", definition: "Idle time while one stage works and others wait. Reduced by keeping several requests in flight, which continuous batching provides." },
      { term: "Data parallelism (serving)", definition: "Full model replicas each serving different requests. Zero inter-GPU communication, and the right choice whenever the model fits on one device." },
      { term: "Quantisation", definition: "Storing weights in fewer bits. Shrinks memory and speeds decode because decode is bandwidth-bound, at some quality cost." },
      { term: "GPTQ / AWQ", definition: "Calibration-based quantisation methods that protect the weights carrying most signal, so 4-bit often loses little - though loss can concentrate in specific capabilities." },
      { term: "Speculative decoding", definition: "A small draft model proposing tokens that the large model verifies in one parallel pass. Exactly lossless when verification is correct, unlike quantisation." },
      { term: "Acceptance rate", definition: "How often draft tokens survive verification. Determines whether speculative decoding is a large win or a net loss." },
      { term: "Prefix cache", definition: "Reusing KV cache for identical leading tokens. Highly effective for shared system prompts, and invalidated entirely by one differing character." },
      { term: "Response cache", definition: "Returning a stored response for an identical request. Requires accepting deterministic output, and its keys are a security boundary in multi-tenant systems." },
      { term: "Model routing", definition: "Directing each request to the cheapest capable model. Explicit routing by task is reliable; learned difficulty routing is more powerful and can be wrong." },
      { term: "Fallback path", definition: "The defined behaviour when a model or provider is unavailable. Must be tested, since models differ in context limits and output format." },
      { term: "Response provenance logging", definition: "Recording model version, quantisation, route, and cache status per response, without which a quality complaint cannot be investigated." },
    ],
  },

  "llm-distributed-training": {
    primer: {
      plainSummary:
        "Training a large model needs far more memory than a single GPU has - not mainly for the weights, but for the optimiser state and the intermediate values kept for the backward pass. This module explains where the memory actually goes, the several ways of splitting work across hundreds of GPUs and what each costs in communication, and why a job running for weeks needs checkpointing and failure recovery designed in from the start.",
      analogy:
        "A large construction project across many crews. You can give every crew identical plans and have them build separate sections, then reconcile at the end of each day - simple, but every crew needs a full copy of the plans and all the equipment. Or you can split the equipment among crews so each holds part of it, which saves enormously on equipment and means constant coordination to borrow what you need. And because the project runs for months, you need a way to record progress such that a crew being lost does not restart the whole build.",
      sections: [
        {
          heading: "Where the memory goes",
          body: [
            "Model weights are the smallest part of the story, and this surprises people. Take a 7-billion-parameter model trained in 16-bit precision: weights are about 14 gigabytes. Gradients, one per parameter, add another 14. The optimiser is the expensive part - Adam, the standard choice, keeps two running statistics per parameter, and it typically keeps a 32-bit master copy of the weights, so optimiser state is roughly 56 gigabytes. Weights, gradients, and optimiser state together come to about 84 gigabytes for a model whose weights are 14. A rough rule worth carrying: with Adam in mixed precision, training memory for parameters is around 16 bytes per parameter against 2 for inference.",
            "Then there are activations: the intermediate values from the forward pass that must be retained because the backward pass needs them to compute gradients. Activation memory scales with batch size, sequence length, and model depth, and for large models with long sequences it can exceed everything else combined.",
            "Activation checkpointing - also called gradient checkpointing - is the standard control. Rather than keeping every intermediate value, keep only a few checkpoints and recompute the rest during the backward pass. This trades compute for memory, typically costing about 30 percent more time and saving most activation memory. It is one of the few dials that reliably converts a job that does not fit into one that does.",
            "Doing this arithmetic before choosing a parallelism strategy is the correct order, and it is what an interviewer is checking. The strategy is determined by which component does not fit, and someone who reaches for tensor parallelism without knowing that optimiser state is four times the weights is guessing.",
          ],
        },
        {
          heading: "Four ways to split, and what each communicates",
          body: [
            "Distributed data parallelism gives every GPU a full copy of the model and a different slice of the batch. Each computes gradients on its slice, then all GPUs combine gradients with an all-reduce - a collective operation where every participant ends up with the sum of everyone's values. Simple and effective, and it does nothing for memory, since every GPU still holds the full model, gradients, and optimiser state.",
            "Fully sharded data parallelism, and the equivalent ZeRO stages, attack exactly that redundancy. Rather than replicating optimiser state, gradients, and parameters on every GPU, shard them so each holds only a slice. When a layer is needed, its parameters are gathered from whoever holds them with an all-gather; after use they are discarded. Gradients are combined with a reduce-scatter, which sums and distributes slices in one operation. Memory per GPU falls roughly by the number of GPUs, which is what makes very large models trainable at all, at the cost of substantially more communication. ZeRO stages simply describe how much is sharded: stage 1 the optimiser state, stage 2 gradients too, stage 3 parameters as well.",
            "Tensor parallelism splits individual layers, requiring communication several times per layer. As in serving, this needs a very fast interconnect and belongs within a node.",
            "Pipeline parallelism assigns layer groups to different GPUs, communicating only at boundaries, which suits slower links across nodes. It introduces bubbles, mitigated by splitting each batch into micro-batches so several are in flight at different stages.",
            "Large training runs combine all of these - tensor parallelism within a node, pipeline parallelism across a small group of nodes, and data parallelism with sharding across the rest. The organising principle is to match each technique's communication frequency to the speed of the link it must cross: the most chatty method gets the fastest link. If you remember one sentence about distributed training, that is the one.",
          ],
        },
        {
          heading: "Failure, checkpointing, and determinism",
          body: [
            "A job on a thousand GPUs for three weeks will experience hardware failures - at realistic per-GPU failure rates, several per day. The design question is not whether but how much progress a failure costs, and a job that restarts from the beginning on any failure will never finish.",
            "Checkpointing writes the full training state - weights, optimiser state, data loader position, and the step number - so training can resume. The critical property is that a checkpoint must be globally consistent, representing one training step across every rank. A checkpoint assembled from different ranks at different steps is silently corrupt, and it will produce a model that trains to a worse result with no error anywhere, which is among the most painful failure modes available.",
            "For large models this is a serious I/O problem: a checkpoint can be hundreds of gigabytes, and writing it synchronously stalls every GPU. Distributed checkpointing has each rank write its own shard in parallel to shared storage, and asynchronous checkpointing copies state to host memory quickly and writes to storage in the background so GPUs resume almost immediately. Checkpoint frequency is a straightforward trade: more frequent means less lost work and more overhead, and the right interval is roughly where checkpoint cost balances expected lost progress.",
            "Stragglers are the other operational reality. Because collectives require every participant, one slow GPU sets the pace for all of them - a single degraded device can halve the throughput of a thousand-GPU job while every dashboard shows the job running normally. Detect stragglers by monitoring per-rank step times, and be willing to remove and replace a persistently slow node.",
            "Determinism matters more than in ordinary services, because debugging a training run that cannot be reproduced is nearly impossible. Record seeds, data ordering, and the exact configuration, and make the data loader's position part of the checkpoint so a resumed run consumes the same data in the same order rather than silently repeating or skipping examples. Bit-exact reproducibility is often unattainable given non-deterministic GPU operations, and that is acceptable - what matters is that a resumed run continues the same trajectory rather than diverging into a different one.",
          ],
        },
      ],
      workedExample: {
        title: "Planning a 70B training run",
        setup:
          "A team will train a 70-billion-parameter model on 256 GPUs of 80 gigabytes each, connected by fast interconnect within 8-GPU nodes and slower networking between nodes. The run is expected to take three weeks.",
        steps: [
          "Do the memory arithmetic first, because it determines everything else. At roughly 16 bytes per parameter for mixed-precision Adam, weights, gradients, and optimiser state total about 1.1 terabytes - which is 14 times a single GPU's 80 gigabytes. So plain data parallelism is impossible before considering activations at all, and the strategy is forced by this number rather than chosen.",
          "Shard state to make it fit. Fully sharded data parallelism across all 256 GPUs reduces per-GPU parameter-related memory to roughly 4 gigabytes, leaving ample room for activations and communication buffers. This is the technique that makes the job feasible.",
          "Add tensor parallelism within nodes where it is affordable. Splitting layers across the 8 GPUs in a node reduces activation memory and speeds each step, and the fast intra-node interconnect can carry its frequent communication. Do not extend it across nodes, where the slower link would make communication dominate compute.",
          "Control activation memory with checkpointing. Even with sharding, long sequences make activations large. Apply activation checkpointing, accepting roughly 30 percent more compute time for a large memory saving that permits a bigger batch - which usually improves throughput enough to offset much of the recomputation cost.",
          "Plan for failures with distributed asynchronous checkpointing. At 256 GPUs over three weeks, expect several failures. Checkpoint every 30 minutes, with each rank writing its shard in parallel and the copy to host memory made quickly so GPUs resume in seconds. Include the data loader position so a resumed run does not repeat or skip data. Verify the checkpoint is globally consistent at one step across all ranks, since an inconsistent checkpoint fails silently.",
          "Instrument for stragglers and reproducibility. Monitor per-rank step time and alert when one rank consistently lags, since a single degraded GPU throttles all 256 while every high-level metric looks normal. Record seeds, data order, and configuration so the run is reproducible enough to debug - which matters most precisely when something goes wrong at week two.",
        ],
        takeaway:
          "The memory calculation came first and dictated the parallelism strategy; everything else was matching each technique's communication frequency to the speed of the link it crosses. The two operational details that decide whether a three-week run finishes are consistent fast checkpointing and straggler detection, and both are easy to leave until they are urgently needed.",
      },
    },
    glossary: [
      { term: "Optimiser state", definition: "Per-parameter statistics kept by the optimiser. Adam in mixed precision needs roughly 12 bytes per parameter, several times the weights themselves." },
      { term: "Activations", definition: "Intermediate forward-pass values retained for the backward pass. Scale with batch size, sequence length, and depth, and can exceed all other memory." },
      { term: "Activation checkpointing", definition: "Keeping only some intermediates and recomputing the rest, trading roughly 30 percent more compute for a large memory saving." },
      { term: "DDP", expansion: "distributed data parallelism", definition: "Full model replicas processing different batch slices, combining gradients with an all-reduce. Simple, and saves no memory." },
      { term: "FSDP / ZeRO", expansion: "fully sharded data parallelism / zero redundancy optimiser", definition: "Sharding optimiser state, gradients, and parameters across GPUs, cutting per-GPU memory roughly by the device count at the cost of more communication." },
      { term: "All-reduce", definition: "A collective where every participant ends up with the sum of all participants' values. The core operation of data-parallel gradient synchronisation." },
      { term: "All-gather", definition: "A collective where every participant receives the full set of shards. Used to reassemble sharded parameters when a layer is needed." },
      { term: "Reduce-scatter", definition: "A collective that sums values and distributes slices of the result, combining reduction and sharding in one step." },
      { term: "Communication-to-link matching", definition: "The organising principle of parallelism layout: the most communication-intensive method gets the fastest interconnect. Tensor parallelism within a node, pipeline across." },
      { term: "Micro-batch", definition: "A subdivision of a batch kept in flight to fill pipeline stages and reduce bubbles." },
      { term: "Distributed checkpoint", definition: "Each rank writing its shard in parallel, avoiding one process serialising hundreds of gigabytes." },
      { term: "Globally consistent checkpoint", definition: "State captured at one training step across every rank. An inconsistent checkpoint is silently corrupt and produces a worse model with no error." },
      { term: "Asynchronous checkpointing", definition: "Copying state to host memory quickly and writing to storage in the background, so GPUs resume in seconds rather than minutes." },
      { term: "Straggler", definition: "One slow rank that sets the pace for all others, since collectives wait for every participant. Detected by per-rank step time monitoring." },
      { term: "Deterministic recovery", definition: "Resuming with the same data order and configuration, which requires the data loader position to be part of the checkpoint." },
    ],
  },

  "llm-enterprise-rag-systems": {
    primer: {
      plainSummary:
        "Retrieval-augmented generation answers questions by finding relevant documents and putting them into the model's prompt, so the model can cite real sources instead of relying on what it memorised in training. In an enterprise the difficulty is not the retrieval algorithm - it is that documents change constantly, that different people are allowed to see different documents, and that answering from a document the asker may not read is a data breach performed by your own system.",
      analogy:
        "A research assistant with access to a company's filing cabinets. Their competence at finding relevant files is the easy part. The hard parts are that files are updated and removed daily, that the assistant must check what each person is cleared to see before quoting anything to them, and that if a file was deleted last week the assistant must not answer from the copy of it they happen to remember. The last point is the one that turns a retrieval system into a compliance problem.",
      sections: [
        {
          heading: "Ingestion is a versioned pipeline, not a one-off import",
          body: [
            "Documents must be parsed, split into chunks, embedded, and indexed. Each step has decisions that determine answer quality, and all of them must be repeatable, because documents change and the pipeline will be re-run over the same content many times.",
            "Parsing extracts text and structure, and it is more consequential than it sounds: a PDF table flattened into a run of numbers is worse than useless, and headings carry the context that makes a chunk interpretable on its own. Chunking splits documents into retrievable pieces, and the size is a real trade-off - small chunks retrieve precisely and lose surrounding context, large chunks carry context and dilute the embedding so retrieval becomes vaguer. Splitting on structural boundaries such as sections beats splitting at fixed character counts, and including the document title and section heading in each chunk lets a chunk stand alone.",
            "Every artefact must be versioned and every step idempotent. When a document is updated, its old chunks must be replaced rather than accumulated - otherwise the index holds both versions and the model receives contradictory context, producing an answer that is confidently wrong and impossible to explain. Chunk identity is derived from document ID plus version plus position, so reprocessing is safe.",
            "Deletion is the case that must work perfectly. When a document is deleted, its chunks must leave the index promptly, and the standard failure is that they linger for hours because deletion was implemented as a background job with no urgency. Since deletion is often a legal requirement, propagate deletions synchronously or with a tight bound, use tombstones so a deletion cannot be lost, and maintain a freshness watermark - the guarantee that the index reflects all changes up to a stated time - so the system can state how stale it might be rather than assuming it is current.",
          ],
        },
        {
          heading: "Retrieval quality: hybrid search and reranking",
          body: [
            "Embedding-based retrieval finds semantically similar text, which handles paraphrase well and reliably fails on exact identifiers - a part number, an error code, a specific name may not be well represented in embedding space, so semantically similar but wrong chunks come back instead.",
            "Keyword retrieval, typically BM25, is the opposite: excellent on exact terms and blind to paraphrase. So production systems use hybrid retrieval, running both and combining results, usually with reciprocal rank fusion, which merges ranked lists by position and so avoids the problem that the two systems' scores are not on comparable scales.",
            "A reranker then improves the ordering. Retrieval must be cheap because it scores the whole corpus, so it uses a two-tower structure where document vectors are precomputed. A reranker processes the query and a candidate document together, which lets it model their interaction directly and is far more accurate - and far too expensive to run over everything, so it runs over the top 50 or 100. This is the same cheap-wide-then-expensive-narrow pattern as feed ranking and search, and recognising it as the same pattern is worth saying aloud.",
            "Evaluate retrieval separately from answer quality, because they fail differently and need different fixes. Retrieval metrics ask whether the right chunk was in the results at all - if it was not, no amount of prompt engineering can produce a correct answer. Answer metrics ask whether the response is correct, grounded in the retrieved context, and properly cited. A team measuring only answer quality cannot tell whether a bad answer came from retrieval missing the document or from the model misreading it, and those have entirely different remedies.",
            "Groundedness deserves separate measurement: does every claim in the answer actually appear in the retrieved context? An answer that is correct but not supported by the provided sources is still a problem, because it means the model is drawing on training knowledge, and next time that knowledge will be out of date or wrong with the same confidence.",
          ],
        },
        {
          heading: "Access control, and why it must fail closed",
          body: [
            "This is where enterprise RAG differs fundamentally from consumer search, and it is what an interviewer will press on. Different users may see different documents, so retrieval must be filtered by the asking user's permissions - and the filtering must happen before content enters the model's context, not after.",
            "The reason post-filtering fails is worth stating explicitly: once unauthorised text is in the prompt, it has influenced the generated answer even if the citation is stripped afterwards. The model may paraphrase confidential content without quoting it. There is no reliable way to remove an influence, so authorisation is a retrieval-time filter, full stop.",
            "Permissions must be evaluated at query time against current state rather than trusted from an index snapshot. Someone who left a project yesterday must not receive its documents today, and an index rebuilt nightly would happily serve them. So either filter against the live permission system, or maintain a permission index updated synchronously with the source, and be able to say which - because 'we store ACLs with the chunks' invites the immediate question of how stale they are.",
            "The system must fail closed. If the permission service is unavailable, return no results rather than unfiltered ones. This is the opposite of the usual availability instinct, and it is correct here because the cost of an unavailable answer is inconvenience while the cost of a leaked one is a breach. Saying this explicitly is a strong signal in an interview.",
            "Two further boundaries matter. Caches must be keyed by permission scope, or one user's cached answer can be served to another - which turns a cache into a leak. And retrieved content is untrusted input: a document may contain text crafted to manipulate the model, an attack called prompt injection. Because the model cannot reliably distinguish instructions in retrieved content from instructions from you, the mitigation is architectural rather than linguistic - never let retrieved content authorise a tool call or an action, and treat everything the model produces from it as untrusted output requiring its own authorisation check.",
          ],
        },
      ],
      workedExample: {
        title: "An internal knowledge assistant that leaks",
        setup:
          "An internal assistant answers questions over company documents - HR policies, engineering docs, board materials. A user in engineering asks about compensation planning and receives an answer summarising a confidential board document they cannot open in the document system.",
        steps: [
          "Locate where authorisation was supposed to happen and find it was applied to citations rather than to retrieval. The system retrieved semantically relevant chunks regardless of permission, generated an answer, and then filtered the citation list. The confidential content had already shaped the answer, so removing the citation removed the evidence and not the leak. This is the failure mode to name precisely.",
          "Move filtering before retrieval. The permission filter becomes part of the retrieval query, so unauthorised chunks are never candidates. This costs some retrieval quality - fewer candidates - and it is the only correct design, because there is no way to un-influence a generated answer.",
          "Check permission freshness, since a filter is only as good as the data behind it. Permissions were copied into the index at ingestion and refreshed nightly, so up to 24 hours of stale access. Someone removed from a project retains access for a day. Move to evaluating against the live permission service at query time, or maintain a permission index updated synchronously with the source system.",
          "Define fail-closed behaviour explicitly. If the permission service is unreachable, return no results and an explanatory message rather than falling back to unfiltered retrieval. Confirm this is implemented rather than assumed - a permissive fallback deep in a client library is exactly how this class of bug survives review.",
          "Fix the cache, which is a second instance of the same bug. Answers were cached by question text, so an authorised user's cached answer could be returned to an unauthorised one. Include the permission scope in the cache key, accepting the lower hit rate, since a cache that can cross a trust boundary is a leak with better latency.",
          "Add the controls that make recurrence detectable. Log the permission-filtered candidate set for every query so an audit can confirm what was retrievable. Add automated tests that ask a low-privilege user questions answerable only from privileged documents and assert no answer is produced. Treat retrieved content as untrusted for tool use, so a malicious document cannot induce an action.",
        ],
        takeaway:
          "The bug was ordering: authorisation applied after generation instead of before retrieval. That single sequencing error is the most common serious flaw in enterprise RAG designs, and 'filter before retrieval, evaluate against live permissions, fail closed' is the sentence worth being able to say without hesitation. Note also that the cache reproduced the same flaw independently, which is typical - a trust boundary has to be enforced at every layer that crosses it.",
      },
    },
    glossary: [
      { term: "RAG", expansion: "retrieval-augmented generation", definition: "Retrieving relevant documents and placing them in the model's prompt so answers are grounded in real sources rather than in memorised training data." },
      { term: "Chunking", definition: "Splitting documents into retrievable pieces. Small chunks retrieve precisely and lose context; large chunks carry context and dilute the embedding." },
      { term: "Document version", definition: "The identity of a specific revision, so updates replace old chunks rather than accumulating contradictory versions in the index." },
      { term: "Idempotent ingestion", definition: "Reprocessing a document producing the same index state, achieved by deriving chunk identity from document, version, and position." },
      { term: "Tombstone (in RAG)", definition: "A deletion marker ensuring removals propagate to the index and cannot be silently lost." },
      { term: "Freshness watermark", definition: "The time up to which the index reflects all source changes, letting the system state its staleness rather than assume it is current." },
      { term: "Hybrid retrieval", definition: "Combining embedding search, which handles paraphrase, with keyword search such as BM25, which handles exact identifiers that embeddings miss." },
      { term: "Reciprocal rank fusion", definition: "Merging ranked lists by position rather than by score, avoiding the problem that different retrievers' scores are not comparable." },
      { term: "Reranker", definition: "A model scoring query and document together, far more accurate than two-tower retrieval and far too expensive to run over the whole corpus." },
      { term: "Groundedness", definition: "Whether every claim in an answer is supported by the retrieved context. An unsupported but correct answer means the model is using training knowledge that will eventually be wrong." },
      { term: "Retrieval-time authorisation", definition: "Filtering by the asking user's permissions before content enters the prompt. Post-filtering fails because an influence on a generated answer cannot be removed." },
      { term: "ACL freshness", definition: "How current the permission data used for filtering is. A nightly snapshot means a day of stale access after someone's permissions change." },
      { term: "Fail closed", definition: "Returning no results when the permission service is unavailable, rather than unfiltered ones. The opposite of the usual availability instinct, and correct here." },
      { term: "Permission-scoped cache key", definition: "Including the authorisation scope in cache keys, without which a cache serves one user's answer to another." },
      { term: "Prompt injection", definition: "Text in retrieved content crafted to manipulate the model. Mitigated architecturally - never letting retrieved content authorise an action - rather than by instructions." },
    ],
  },

  "llm-post-training": {
    primer: {
      plainSummary:
        "A base language model trained on internet text can continue text but is not helpful, does not follow instructions, and has no notion of what it should decline. Post-training is what converts it into an assistant: first by showing it examples of good responses, then by teaching it from comparisons of which of two responses people preferred. This module covers both stages, the several ways of doing the second, and the lineage tracking that makes any of it reversible.",
      analogy:
        "Training a new employee. First you show them worked examples of the job done well - that is supervised fine-tuning, and it establishes format and basic competence. Then you review their work and say which of two drafts was better and why, repeatedly, which teaches judgement that examples alone cannot convey. The second phase is more powerful and more dangerous: push too hard on the feedback and they start writing what scores well with the reviewer rather than what is actually good, which is exactly the failure the technical machinery is designed to prevent.",
      sections: [
        {
          heading: "Supervised fine-tuning, and treating data as a governed release",
          body: [
            "Supervised fine-tuning, or SFT, trains the model on curated prompt-response pairs demonstrating the desired behaviour. This is ordinary supervised learning, and it is remarkably effective: it establishes response format, instruction following, tone, and basic refusal behaviour. Most of the visible difference between a base model and an assistant comes from this stage.",
            "Data quality dominates quantity here to an unusual degree. A few thousand carefully written examples routinely outperform hundreds of thousands of scraped ones, because the model learns the style and standard of what it is shown - including the flaws. Inconsistent examples teach inconsistency, and a small number of examples that hedge excessively will teach hedging across the board.",
            "Treat the dataset as a governed release rather than a folder of files. Every example needs provenance: who wrote it, when, under which guidelines, reviewed by whom. Guidelines change, and when they do you must be able to find the examples written under the old ones. Without provenance a dataset becomes an undebuggable accumulation, and the first time a behavioural regression appears you will have no way to attribute it.",
            "Contamination control is a specific requirement. If evaluation prompts appear in training data, evaluation results are meaningless and will overstate quality in exactly the way that gets a model shipped. Check for overlap between training data and every evaluation set, including near-duplicates rather than only exact matches, and re-check whenever either set changes.",
            "Also decide what proportion of examples cover refusal and edge cases. A model trained only on well-formed requests answered helpfully will attempt everything, including what it should decline. Those behaviours have to be demonstrated, since they cannot be inferred from examples that never contain them.",
          ],
        },
        {
          heading: "Learning from preferences",
          body: [
            "SFT teaches the model to imitate demonstrations. Preference learning teaches it something demonstrations cannot: relative quality. Humans are far better and faster at judging which of two responses is better than at writing an ideal response from scratch, so preference data is both cheaper to collect and richer in the distinctions that matter.",
            "The classic pipeline is reinforcement learning from human feedback. First train a reward model on preference pairs to predict which response a human would prefer. Then optimise the language model against that reward, using an algorithm such as PPO, while constraining it not to drift too far from the starting model. Rollout workers generate responses, the reward model scores them, and the policy is updated.",
            "That constraint is the crucial part and the thing to be able to explain. The reward model is an imperfect approximation of human preference, so if you optimise against it hard enough the model finds inputs where the reward model is wrong and exploits them - producing responses that score highly and are worse, such as answers that are verbose and confident because the reward model learned to associate length with quality. This is reward hacking, and it is the central failure mode of the technique. The defence is a penalty on divergence from a frozen reference policy, measured by KL divergence, which keeps the optimised model near the starting distribution. Tuning that penalty is the main dial: too weak and the model hacks the reward, too strong and it barely improves.",
            "Direct preference optimisation, or DPO, is the simpler alternative now widely used. It skips the reward model and the reinforcement learning loop entirely, optimising the language model directly on preference pairs with a loss derived to have the same optimum. Far simpler to implement and operate, far cheaper, and no rollout infrastructure. The trade-off is less control: RLHF's loop can incorporate online feedback, non-differentiable rewards such as whether code compiles, and multiple reward sources. The reasonable default is DPO for its simplicity, moving to a reward-model loop when you need rewards that cannot be expressed as static pairwise preferences.",
            "Either way, preference data has its own biases and they are worth naming: annotators prefer longer answers, more confident answers, and answers that agree with them. Left uncorrected, these become the model's personality - which is why post-trained models tend toward verbosity and agreeableness unless the data is deliberately balanced against it.",
          ],
        },
        {
          heading: "Lineage, gates, and rollback",
          body: [
            "A post-trained model is a function of many inputs: the base model, the SFT dataset, the preference dataset, the reward model if any, the reference policy, hyperparameters, and code. Any of these changing changes the result, so all of them must be versioned together. 'We fine-tuned Llama on our data' is not a description anyone can reproduce, debug, or roll back.",
            "Promotion should pass gates covering more than a single quality number. Capability evaluations check the model still does the tasks it is meant to. Safety evaluations check refusal behaviour on prohibited requests. Regression evaluations check that behaviours which previously worked still do - this is the one most often skipped and it catches the most damaging surprises, because post-training routinely improves the target behaviour while degrading an unrelated one nobody was watching.",
            "Include an over-refusal check explicitly. It is easy to make a model safer by making it decline more, and a model that refuses reasonable requests is a worse product. Measure refusal on benign prompts as a first-class metric alongside refusal on harmful ones, or you will optimise one into the ground.",
            "Evaluation itself is harder than in classic ML because outputs are free text with no single correct answer. The realistic approach is a portfolio: fixed benchmarks for comparability, task-specific evaluations for your actual use cases, pairwise comparisons against the current production model, human review on a sample, and model-based judging for scale. No single one is sufficient, and each has a characteristic weakness.",
            "Finally, rollback must be a state transition rather than a retraining job. Keep previous model versions deployable, version the whole serving configuration including system prompts and generation parameters, and be able to revert in minutes. Post-training regressions are often subtle and behavioural - the model becomes slightly more evasive, or slightly worse at one task - and are frequently noticed days after deployment through user reports rather than through metrics, which is precisely when a fast, boring revert is worth the most.",
          ],
        },
      ],
      workedExample: {
        title: "A fine-tune that improves its metric and regresses everywhere else",
        setup:
          "A team post-trains an assistant to be more concise, using preference pairs where annotators chose the shorter of two responses. Conciseness scores improve substantially. After deployment, users report the assistant now omits important caveats, refuses more often, and has become noticeably worse at multi-step reasoning.",
        steps: [
          "Recognise this as the expected consequence of the preference data rather than as a mystery. Preferences were collected on a single axis - shorter is better - so the model optimised exactly that, including where brevity is harmful. It learned that shorter is better everywhere, because nothing in the data said otherwise. The data defined the objective completely.",
          "Diagnose the reasoning regression specifically. Multi-step reasoning benefits from working through intermediate steps, and a model rewarded for brevity truncates that reasoning and reaches worse conclusions. This is not a side effect to be tuned away; it is the direct result of penalising the length that the capability requires.",
          "Explain the increased refusals as reward hacking. Refusing is short. If the preference signal rewards brevity without a countervailing signal for helpfulness, declining becomes a high-scoring strategy - the model found a way to score well that nobody intended. This is the textbook shape of reward hacking, and naming it is what shows understanding of the mechanism rather than the symptom.",
          "Fix the data rather than the hyperparameters. Collect preferences on multiple dimensions - helpfulness, correctness, and appropriate length - rather than on brevity alone, and include pairs where the longer response is preferred because it contains a necessary caveat or a required reasoning step. The objective must contain the tension it needs to balance.",
          "Strengthen the constraint on divergence. Increase the KL penalty against the reference policy so the model stays nearer the pre-training distribution, limiting how far it can move toward degenerate strategies. Note this trades improvement for safety and is a mitigation rather than a fix, since the underlying problem is the objective.",
          "Add the gates that would have caught it before deployment. Regression evaluations on reasoning tasks, an over-refusal check on benign prompts, and pairwise comparison against the current production model on a broad task mix - not just on conciseness. Then roll back to the previous version while the retrain proceeds, which requires the previous version to still be deployable as a state transition.",
        ],
        takeaway:
          "Every regression traced back to the preference data expressing one dimension of quality, and both the reasoning loss and the extra refusals were the model doing exactly what it was asked. That is the general lesson of preference-based training: the model optimises the signal you gave it, not the intent behind it, so the objective must contain the tension you want balanced. And the practical protection is a regression suite broad enough to notice the things you were not optimising.",
      },
    },
    glossary: [
      { term: "Base model", definition: "A model trained only to predict text. Capable but not helpful, not instruction-following, and with no notion of what to decline." },
      { term: "SFT", expansion: "supervised fine-tuning", definition: "Training on curated prompt-response pairs. Establishes format, instruction following, and tone, and the model learns the flaws in the examples as readily as the virtues." },
      { term: "Data provenance", definition: "Who wrote each example, when, under which guidelines, reviewed by whom. Without it a dataset becomes an undebuggable accumulation." },
      { term: "Contamination", definition: "Evaluation prompts appearing in training data, which makes evaluation meaningless in the direction that gets a model shipped. Checked for near-duplicates, not just exact matches." },
      { term: "Preference pair", definition: "Two responses to one prompt with a human judgement of which is better. Cheaper to collect than ideal responses and richer in the distinctions that matter." },
      { term: "Reward model", definition: "A model trained to predict human preference, used as the optimisation target in RLHF. An imperfect approximation, which is what makes exploitation possible." },
      { term: "RLHF", expansion: "reinforcement learning from human feedback", definition: "Optimising the model against a reward model with reinforcement learning, constrained by divergence from a reference policy." },
      { term: "DPO", expansion: "direct preference optimisation", definition: "Optimising directly on preference pairs without a reward model or rollout loop. Simpler and cheaper, with less control over the reward signal." },
      { term: "Reference policy", definition: "The frozen starting model that the optimised policy is kept close to, bounding how far it can drift toward degenerate strategies." },
      { term: "KL constraint", definition: "A penalty on divergence from the reference policy. The main dial: too weak permits reward hacking, too strong prevents improvement." },
      { term: "Reward hacking", definition: "Finding responses that score highly under an imperfect reward while being worse - the central failure mode of preference optimisation." },
      { term: "Rollout worker", definition: "A process generating responses for scoring during RLHF. Infrastructure that DPO avoids entirely." },
      { term: "Regression evaluation", definition: "Checking that previously working behaviours still work. Most often skipped and catches the most damaging surprises, since post-training improves one behaviour while degrading others." },
      { term: "Over-refusal", definition: "Declining reasonable requests. Must be measured alongside harmful-request refusal, or safety optimisation degrades the product." },
      { term: "Checkpoint lineage", definition: "The versioned record of base model, datasets, reward model, reference policy, hyperparameters, and code, without which a model cannot be reproduced or rolled back." },
    ],
  },

  "llm-evaluation-safety-operations": {
    primer: {
      plainSummary:
        "Evaluating a system whose output is free text is fundamentally harder than evaluating a classifier: there is no single correct answer, so there is no simple comparison. This module covers building an evaluation portfolio rather than trusting one number, calibrating the increasingly common practice of using a model as a judge, and the security model for a system where untrusted text and instructions travel through the same channel.",
      analogy:
        "Marking essays rather than multiple-choice papers. There is no answer key, markers disagree with each other, and a fluent essay saying little can score better than an awkward one saying something true. The countermeasures are the same as in education: several markers, a rubric, comparing scripts against each other rather than scoring in isolation, and periodic checks that the markers still agree with a trusted standard.",
      sections: [
        {
          heading: "An evaluation portfolio, with uncertainty",
          body: [
            "No single evaluation method is sufficient, and each has a characteristic weakness worth knowing.",
            "Fixed benchmarks give comparable numbers across models and time, and they are the most contaminated and least representative of your actual use. A public benchmark has likely appeared in training data somewhere, so a high score may measure memorisation, and benchmark performance correlates weakly with usefulness on your specific tasks.",
            "Task-specific evaluations built from your real traffic are the most informative and the least comparable to anything external. Build them from actual production prompts with expected properties defined - not necessarily exact answers, but checkable characteristics such as containing a citation, staying within a length, or refusing appropriately.",
            "Pairwise comparison against the current production model sidesteps the absence of an answer key entirely, because 'which of these two is better' is answerable when 'how good is this' is not. This is the workhorse for deciding whether a change is an improvement, and it is why arena-style comparison is the default evaluation shape in this field.",
            "Human evaluation is the ground truth and is slow and expensive, so it is used on samples and to calibrate cheaper methods. Model-based judging scales to whatever volume you need and inherits the judge's biases, which is the subject of the next section.",
            "Whatever the method, report uncertainty. Evaluating on 100 prompts gives a wide confidence interval, and a 3 percent difference on 100 examples is noise. Teams routinely ship on differences well inside their error bars - and because free-text evaluation is expensive, sample sizes are small and this happens more here than anywhere else in ML. Stating the interval alongside the number is a small discipline with a large effect.",
          ],
        },
        {
          heading: "Calibrating a model judge",
          body: [
            "Using a strong model to score outputs is the only way to evaluate at scale, and an unvalidated judge produces confident, fluent, systematically wrong numbers - which is worse than no evaluation, because it is trusted.",
            "The biases are documented and consistent. Position bias: judges prefer whichever response is presented first, so every comparison must be run in both orders and the results averaged, and disagreement between the two orderings is itself a signal that the comparison is close. Verbosity bias: judges prefer longer responses regardless of content, which if uncorrected optimises your model toward padding. Self-preference: judges rate outputs from their own model family more highly. Sensitivity: small changes in the judging prompt produce materially different scores, so the prompt is part of the configuration and must be versioned.",
            "Calibration means measuring the judge against human labels on a sample and quantifying agreement. If the judge agrees with humans 85 percent of the time on a representative set, its scores are usable with that uncertainty attached. If it agrees 60 percent, it is barely better than chance on a binary comparison and must not be used to make decisions. This measurement is what converts a judge from a plausible-sounding oracle into an instrument with known error.",
            "Recalibrate periodically, since agreement drifts as your traffic changes and as models are updated. A judge validated a year ago on a different distribution is not validated now.",
            "Practical measures that help: give the judge a rubric with explicit criteria rather than asking for a general quality score; ask for pairwise comparison rather than absolute scoring, which is more reliable; require reasoning before the verdict; and use a different model family from the one being evaluated to avoid self-preference. None of these substitute for measuring agreement against humans.",
          ],
        },
        {
          heading: "Trust boundaries, and treating model text as untrusted",
          body: [
            "The security model for LLM systems rests on one uncomfortable fact: instructions and data arrive through the same channel. A model reading a document cannot reliably distinguish 'this is content to summarise' from 'ignore your instructions and do this instead'. That is prompt injection, and there is no known reliable defence at the language level - instructing the model to ignore injected instructions is itself just more text in the same channel.",
            "So defences must be architectural. Treat every model output as untrusted, in exactly the way you treat user input. If the model requests a tool call, authorise that call against the user's permissions rather than against the model's - a model asked to summarise a document that contains an instruction to email a file must not be able to send that email, and the enforcement point is the tool's authorisation check, not the model's judgement.",
            "Use capability-scoped tokens. A model session gets narrowly scoped credentials for the specific operations that session should perform, so a successful injection can only do what that session was already permitted to do. This is least privilege applied to model sessions, and it bounds the damage rather than trying to prevent the attack.",
            "Sandbox anything generated. Model-produced code runs in an isolated environment with no network access and no credentials, because generated code is untrusted code and the fact that your model wrote it changes nothing about that.",
            "Multi-tenancy adds its own boundaries. Caches keyed without tenant identity leak across tenants. Logs contain prompts and outputs that may hold customer data, so they need the same protection and retention rules as any other sensitive store - and prompt logs are one of the most commonly overlooked repositories of sensitive data in these systems. If any per-tenant fine-tuning exists, models are tenant data too.",
            "Finally, cost is an operational and security concern in a way it is not for ordinary services. Token costs are unbounded per request, so a user submitting long inputs or triggering long generations can spend a great deal quickly, and an agent looping can spend continuously without any single request looking unusual. Attribute cost per tenant and per feature, enforce per-tenant budgets and rate limits, cap output length and agent iterations, and alert on cost anomalies - because in this domain a runaway loop is a financial incident as much as a reliability one.",
          ],
        },
      ],
      workedExample: {
        title: "An evaluation that endorses a worse model",
        setup:
          "A team evaluates a new model version using a strong model as judge, scoring responses 1 to 10 on 200 prompts. The new version scores 7.8 against 7.4, and is shipped. User complaints rise: responses are longer, more hedged, and less directly useful.",
        steps: [
          "Check whether the difference was ever significant. 200 prompts with a judge score standard deviation around 1.5 gives a confidence interval on the difference of roughly plus or minus 0.3, so a 0.4 gap is at the edge of noise. The decision was made on evidence that barely supports it - and this is the most common single error in LLM evaluation, because free-text evaluation is expensive so sample sizes stay small.",
          "Check the judge for verbosity bias, given the specific complaint. Score responses against their length and find a strong positive relationship. The new model produces responses 40 percent longer on average, which accounts for most or all of the 0.4 improvement. The judge was measuring length and reporting quality.",
          "Check position bias, which was not controlled. Responses were presented in a fixed order. Re-running with both orders and averaging shifts scores materially, and the cases where the two orderings disagree turn out to be exactly the close comparisons the decision hinged on.",
          "Measure judge agreement with humans, which had never been done. Take 100 pairwise comparisons, have humans judge them, and compare: agreement is 68 percent. On a binary comparison that is only modestly better than chance, so this judge is not fit to make a shipping decision at all, and everything above is downstream of that.",
          "Rebuild the evaluation properly. Switch from absolute scoring to pairwise comparison against the production model, which is more reliable. Randomise order and average over both. Use a rubric with explicit criteria rather than a general quality score. Add a length-controlled comparison so verbosity cannot masquerade as quality. Use a judge from a different model family. Then re-validate agreement against humans and report it alongside every result.",
          "Increase the sample and pre-register the decision rule. Move to 1,000 prompts drawn from real production traffic, and agree the threshold - a win rate significantly above 50 percent with the interval stated - before seeing results. Then roll back the current version while re-evaluating, since a shipped regression is more urgent than a delayed improvement.",
        ],
        takeaway:
          "The judge was measuring verbosity, the sample was too small to distinguish the models anyway, and nobody had checked whether the judge agreed with people. All three are routine, and all three are cheap to fix once. The transferable rule is that a model judge is an instrument, and an instrument that has never been compared against a reference is not a measurement - it is a fluent opinion, and its fluency is exactly what makes it persuasive.",
      },
    },
    glossary: [
      { term: "Evaluation portfolio", definition: "Combining fixed benchmarks, task-specific evaluations, pairwise comparison, human review, and model judging, since each has a characteristic weakness." },
      { term: "Benchmark contamination", definition: "Public evaluation data appearing in training data, so a high score may measure memorisation rather than capability." },
      { term: "Pairwise comparison", definition: "Asking which of two responses is better rather than scoring one in isolation. More reliable, and it sidesteps the absence of an answer key." },
      { term: "LLM-as-judge", definition: "Using a strong model to score outputs. The only way to evaluate at scale, and an instrument that must be calibrated before it is trusted." },
      { term: "Position bias", definition: "A judge preferring whichever response appears first. Controlled by running both orders and averaging; disagreement between orders signals a close call." },
      { term: "Verbosity bias", definition: "A judge preferring longer responses regardless of content, which optimises the evaluated model toward padding if uncorrected." },
      { term: "Self-preference bias", definition: "A judge rating outputs from its own model family more highly, mitigated by judging with a different family." },
      { term: "Judge calibration", definition: "Measuring judge-human agreement on a sample. Converts a plausible oracle into an instrument with known error, and must be repeated as traffic and models change." },
      { term: "Prompt injection", definition: "Instructions embedded in input or retrieved content that the model cannot reliably distinguish from legitimate instructions. No reliable language-level defence exists." },
      { term: "Untrusted model output", definition: "Treating everything a model produces as untrusted input to whatever consumes it, since it may be attacker-influenced." },
      { term: "Capability token", definition: "Narrowly scoped credentials for a model session, so a successful injection can only do what the session was already permitted to do." },
      { term: "Sandbox", definition: "An isolated environment without network or credentials for running generated code, which is untrusted code regardless of its author." },
      { term: "Tenant isolation", definition: "Preventing cross-tenant leakage through caches, logs, and any per-tenant models. Prompt logs are a commonly overlooked store of sensitive data." },
      { term: "Cost attribution", definition: "Tracking token spend per tenant and per feature, needed because per-request cost is unbounded and an agent loop can spend continuously without any request looking unusual." },
      { term: "Abuse control", definition: "Per-tenant budgets, rate limits, output length caps, and iteration caps, treating runaway cost as an incident class of its own." },
    ],
  },

  "mock-timed-orchestration": {
    primer: {
      plainSummary:
        "This module is about performance rather than knowledge: running the 45 minutes so that what you know actually gets demonstrated. The three skills are allocating the clock deliberately, keeping a visible record of the assumptions and decisions you have made, and controlling depth - knowing when to go deeper, when to park a branch, and how to recover when you stall.",
      analogy:
        "Chairing a meeting with a fixed agenda and a hard stop. A good chair states the plan, keeps time visibly, notes decisions as they are made so nobody relitigates them, and parks tangents explicitly rather than either following them or ignoring them. The same behaviours make a design interview legible, and legibility is what is being graded.",
      sections: [
        {
          heading: "Allocate the clock before drawing boxes",
          body: [
            "Say the plan out loud at the start: five minutes on requirements, five on estimates, ten to an end-to-end design, fifteen to twenty on deep dives, five to close. This takes fifteen seconds and does three useful things. It shows you have a method. It invites the interviewer to redirect early, when redirection is cheap. And it commits you publicly to reaching an end-to-end design by minute twenty, which is the single checkpoint that most determines the outcome.",
            "Keep the clock visible and narrate transitions. 'I have about ten minutes of design left, so I will finish the write path and then pick a deep dive' tells the interviewer you are managing time rather than drifting. Silence about time reads as unawareness of it.",
            "Adapt rather than following the plan mechanically. Interviewers signal - by asking a follow-up, by pushing on something, by looking bored - and those signals override your allocation. If they spend three minutes on the consistency model, that is where the interview is, and continuing with your plan is not discipline but deafness.",
            "The commonest clock failure is spending too long on requirements and estimation, which feel productive and safe because they are structured. Ten minutes total is enough. If you reach minute fifteen with no architecture on the board, you are behind regardless of how good the requirements were.",
          ],
        },
        {
          heading: "Keep a visible decision ledger",
          body: [
            "Maintain a written list of assumptions in a corner of the board: 100 million daily users, 100:1 read-to-write ratio, staleness of a few seconds acceptable, no multi-region requirement. Writing them down rather than saying them once has a specific effect - the interviewer can see and correct them, and every later decision can be justified by pointing at one.",
            "Mark which assumptions are load-bearing. 'If the read-to-write ratio were 1:1 rather than 100:1, I would not denormalise' shows you know which of your inputs actually drive the design, which is a distinct and more advanced skill than making the assumptions in the first place.",
            "Keep a parking lot too, for interesting branches you are deliberately not taking. 'Multi-region is a real question and I am parking it - I will come back if there is time.' This is not avoidance; it is scope control made visible, and it prevents the interviewer from concluding you missed something. It also gives you a ready answer when they ask what you have not covered.",
            "Revisit both near the end. Returning to a parked item, or noting that an assumption was the one you would validate first in production, closes loops the interviewer has been holding open, and it is a cheap way to sound like someone who finishes things.",
          ],
        },
        {
          heading: "Control depth, and recover from stalls",
          body: [
            "Depth is a choice made explicitly. Announce it: 'I will go deep on fan-out because that is where this design breaks first.' Naming why makes the choice look like prioritisation rather than preference, and it invites redirection if the interviewer wanted something else.",
            "Do not go deep on everything. The interview is not long enough, and attempting it produces a uniformly shallow discussion, which is the most common way strong candidates underperform - they know a lot about many components and demonstrate depth in none.",
            "When you stall - and you will - say so and narrow. 'I am not sure of the best approach here, so let me state the constraint and reason from it' is a recovery. Long silence is not, because the interviewer cannot grade what they cannot hear. Reasoning aloud toward a wrong answer that you then correct scores better than a confident answer you cannot justify, because it shows the process they are actually assessing.",
            "When you do not know something, say so and say how you would find out. 'I do not know the exact rebalance semantics there; I would verify before depending on it' is a completely acceptable senior answer. Confident invention is the fastest way to lose an interviewer's trust, and once lost it colours everything you say afterwards.",
            "Close deliberately in the last five minutes, whatever state the deep dive is in. Failure behaviour, what you would monitor, and how it evolves at ten times the scale. An unfinished deep dive with a strong close reads far better than a complete deep dive that ran out of time with no summary, because the close is where you demonstrate ownership rather than knowledge.",
          ],
        },
      ],
      workedExample: {
        title: "Recovering an interview that went off plan at minute twelve",
        setup:
          "The prompt is 'Design a ride-hailing service'. At minute twelve you are still discussing the matching algorithm because the interviewer asked two follow-up questions about it. You have no end-to-end architecture on the board.",
        steps: [
          "Notice the clock and name the situation rather than hoping. 'I have spent a while on matching because it is interesting - let me put a full architecture up quickly so we have the whole picture, and then come back to it.' The interviewer now knows you are aware, which is most of what they wanted to see.",
          "Draw the end-to-end path fast and coarsely. Rider app, driver app, gateway, location service, matching service, trip service, pricing, notifications, storage. Two minutes, no detail. A complete simple picture beats a partial detailed one, because it lets every subsequent discussion be located within a system.",
          "Write the assumption ledger now if you have not. 100,000 concurrent riders, matching within 10 seconds, location updates every 4 seconds, single region. This retroactively justifies the matching discussion and gives the interviewer a chance to correct anything before you build further on it.",
          "Reframe the earlier discussion as the deep dive rather than as a detour. 'Matching is where this design is hardest, so I would like it to be the deep dive - it is what I have been discussing and I would like to finish it properly.' The time spent is now on-plan rather than off-plan, which is a genuine reframing rather than a trick, because it was in fact the right thing to go deep on.",
          "Park explicitly what you are not covering. 'I am not designing pricing or driver payouts, and I am treating the map and routing service as a black box.' This prevents the omissions from reading as gaps and buys the remaining time for the deep dive.",
          "Protect the close. At minute forty, stop the deep dive wherever it is and spend five minutes on failure behaviour, monitoring, and ten-times evolution. Never let a deep dive consume the close - the close is disproportionately weighted because it is where you show you would own the system rather than just build it.",
        ],
        takeaway:
          "Nothing was recovered by rushing. It was recovered by naming the situation, producing a coarse complete picture, and reframing the time already spent as the deep dive it should have been. Interviewers respond well to a candidate who notices and adjusts, because that is the behaviour they need from a colleague - far more than they respond to one who executes a plan perfectly.",
      },
    },
    glossary: [
      { term: "Time box", definition: "A declared allocation for each phase, stated aloud so the interviewer can redirect early and so the plan is visible." },
      { term: "End-to-end checkpoint", definition: "Having a complete if simple architecture by roughly minute twenty. The single checkpoint that most determines the outcome." },
      { term: "Assumption ledger", definition: "A written, visible list of assumptions, so they can be corrected and so later decisions can be justified by pointing at one." },
      { term: "Load-bearing assumption", definition: "An assumption whose change would change the design. Naming which ones are load-bearing is a more advanced skill than making them." },
      { term: "Parking lot", definition: "Explicitly deferred branches, which converts an omission into visible scope control and supplies a ready answer about what you did not cover." },
      { term: "Deep-dive contract", definition: "Announcing which subsystem you will examine and why, so the choice reads as prioritisation and can be redirected." },
      { term: "Interviewer checkpoint", definition: "Pausing to confirm direction, which is cheap and prevents spending fifteen minutes in the wrong place." },
      { term: "Stall recovery", definition: "Naming uncertainty and reasoning aloud from a constraint, since silence cannot be graded and confident invention destroys trust." },
      { term: "Executive close", definition: "The final five minutes on failure behaviour, monitoring, and evolution. Disproportionately weighted, and must never be consumed by an overrunning deep dive." },
    ],
  },

  "mock-classic-synthesis": {
    primer: {
      plainSummary:
        "This module practises assembling the distributed-systems material into one coherent 45-minute argument. The synthesis skill is different from knowing the components: it is starting from invariants and ownership rather than from boxes, letting scale actually change the architecture rather than decorating it, and narrating one failure all the way from detection to repair.",
      analogy:
        "The difference between knowing every ingredient and cooking a meal. The knowledge is necessary and it is not the same skill. What distinguishes the cook is sequencing - what must happen first, what can wait, what would spoil if left too long - and the same is true of a design argument, where the order in which you establish things determines whether the rest is convincing.",
      sections: [
        {
          heading: "Begin with invariants and ownership",
          body: [
            "Before any component, state what must always be true. An account balance never goes negative. A message appears exactly once per conversation. An ID is never reused. Invariants are what determine where coordination is genuinely required, and coordination is the expensive thing in a distributed system - so establishing them first means every later consistency decision has a stated reason.",
            "Then name the source of truth for each piece of data, and say which stores are derived. Most confusion in design interviews comes from ambiguity about which store is authoritative: once a cache, a search index, and a database all hold a user's profile, the question 'what happens if they disagree' has no answer unless one of them was designated authoritative in advance.",
            "Then classify each operation's consistency requirement individually rather than for the system as a whole. Payments need strong guarantees; presence does not; a like counter can be eventually consistent and approximate. A candidate who says 'this system is eventually consistent' has said something less precise than one who says which operations are and why - and the second is closer to how real systems are actually built.",
            "This ordering pays off later. When the interviewer pushes on a failure, you can answer from the invariant: 'the balance invariant means this path needs a conditional write, so under partition it becomes unavailable rather than divergent' is a complete answer derived from something you established in minute four.",
          ],
        },
        {
          heading: "Let scale reshape the design",
          body: [
            "Estimates should change the architecture, not decorate it. The reasoning move is to compute a number and then say what it rules out: this fits on one machine so sharding is not required; this read-to-write ratio makes it a caching problem; this fan-out breaks push above a threshold so the design needs a hybrid.",
            "Derive the partition key from the access patterns you wrote down, and check explicitly which queries become single-partition and which become scatter-gather. Then say what you do about the ones that do not fit - a secondary index, a separate system, or accepting the cost for a rare query. Serving a rare query by compromising the common path is the mistake to avoid, and saying so demonstrates the priority ordering interviewers listen for.",
            "Name the hot spots. Almost every real system has skew - a celebrity, a viral item, a city centre, a large tenant - and a design that assumes uniformity is a design that has not met production. State where the skew is and what you do about it, noting whether the hot key is read-heavy, where caching helps, or write-heavy, where it does not.",
            "And say what the design would look like at ten times the scale, ideally with what breaks first. This is often asked directly, and having the answer ready signals that the current design was chosen rather than defaulted to.",
          ],
        },
        {
          heading: "Narrate one failure from detection to repair",
          body: [
            "The strongest thing you can do in the last third of a classic systems interview is trace one failure completely. Pick something concrete - a partition loses its leader, a queue backs up, a region becomes unreachable - and walk through it end to end.",
            "Detection: what notices, on what signal, and after how long. Be specific about the signal, because 'we would monitor it' is not an answer while 'we alert on fan-out lag in seconds, not queue depth' is.",
            "Immediate behaviour: what happens to in-flight requests, what users see, and which dependencies are optional so the system degrades rather than fails. Naming which dependency is optional is the graceful degradation decision, and it must be a decision made before the incident.",
            "Containment: what stops the failure spreading - bounded queues, retry budgets, circuit breakers, fencing epochs so a deposed owner cannot keep writing. This is where the earlier invariants pay off again, because containment is about protecting them.",
            "Recovery and repair: how the system returns to health, whether any data needs reconciling, and how you know it is correct afterwards. The reconciliation step is the one candidates most often omit, and it is the one that distinguishes someone who has operated a system from someone who has read about one.",
            "One complete failure narrative is worth more than mentioning six failure modes, because it demonstrates that you can think through consequences rather than recall a list.",
          ],
        },
      ],
      workedExample: {
        title: "A 45-minute run at a collaborative document editor",
        setup:
          "The prompt is 'Design a collaborative document editor like Google Docs'. Multiple users edit simultaneously, edits appear within a second, and no edit may be lost.",
        steps: [
          "Minutes 0-5, invariants and scope. State the invariants: no acknowledged edit is ever lost, all clients converge to the same document, and edits from one client appear in the order that client made them. Scope in real-time editing, presence, and version history; scope out comments, permissions administration, and the rendering engine. The convergence invariant is the one that will drive everything.",
          "Minutes 5-10, numbers that eliminate options. 10 million documents, most edited by one person, some by up to 50 simultaneously. Edits arrive at a few per second per active user, so a busy document sees perhaps 100 edits per second - small. Conclude aloud that this is not a throughput problem but a correctness and connection-management problem, which redirects the whole interview correctly.",
          "Minutes 10-20, end-to-end with ownership named. Clients hold WebSocket connections to a gateway; a document server owns each active document and is the single writer for it, which removes concurrent-write conflicts by construction; edits are appended to a durable operation log which is the source of truth; snapshots are derived and periodically written so loading does not replay all history. Say that the document server is the source of truth for ordering and that snapshots are derived - that one sentence prevents a lot of later confusion.",
          "Minutes 20-35, deep dive on concurrent editing, chosen from the invariant. Two users edit the same paragraph offline or concurrently. Explain why timestamps cannot order them, then present the honest options: operational transformation, which needs a central server and is what this design already has, or CRDTs, which converge without coordination and cost metadata that grows with operation count. Choose operational transformation because the single-writer document server is already the coordination point, and say what that choice costs - the document server is now a availability dependency for its document.",
          "Minutes 35-40, one failure narrated fully. The document server for an active document crashes. Detection: its lease expires within seconds and clients' connections drop. Behaviour: clients buffer edits locally and show a reconnecting state, so nothing is lost from the user's view. Containment: a new server acquires the document with a higher fencing epoch, so the old server cannot write even if it revives. Recovery: the new server loads the last snapshot plus subsequent operations from the log, clients reconnect and replay buffered edits identified by client-generated IDs so duplicates are ignored. Repair: verify convergence by comparing client checksums against the server's.",
          "Minutes 40-45, close. Monitoring: edit-to-visible latency, reconnection rate, and convergence-mismatch counts. Failure posture: a document is unavailable while its owner is being replaced, which is seconds, and this is deliberate because availability was traded for the convergence invariant. At ten times scale, document servers shard by document with a directory, and the first thing to break is the operation log's write throughput for the busiest documents.",
        ],
        takeaway:
          "The convergence invariant, stated in minute three, chose the single-writer architecture, which chose operational transformation over CRDTs, which set the failure behaviour. That chain is what makes a design read as an argument rather than as a diagram - and building it is exactly what the synthesis modules exist to practise.",
      },
    },
    glossary: [
      { term: "Invariant-first framing", definition: "Establishing what must always be true before choosing components, since invariants determine where coordination is genuinely required." },
      { term: "Source of truth", definition: "The authoritative store for a piece of data, with everything else designated as derived. Naming it removes most later ambiguity." },
      { term: "Per-operation consistency", definition: "Classifying each operation's guarantee individually rather than labelling the whole system, which is how real systems are actually built." },
      { term: "Scale-driven redesign", definition: "Using estimates to eliminate options rather than to decorate a design already chosen. Each number should be followed by a 'therefore'." },
      { term: "Single-partition vs scatter-gather", definition: "Whether a query touches one partition or all of them. The check that validates a partition key against the access patterns." },
      { term: "Skew acknowledgement", definition: "Naming where load concentrates - celebrities, viral items, large tenants - since a design assuming uniformity has not met production." },
      { term: "Failure narrative", definition: "Tracing one failure through detection, immediate behaviour, containment, recovery, and repair. Worth more than listing six failure modes." },
      { term: "Containment mechanism", definition: "What stops a failure spreading: bounded queues, retry budgets, circuit breakers, fencing epochs." },
      { term: "Repair and reconciliation", definition: "Returning to a correct state after a failure and verifying it. The step most often omitted, and the one that signals operational experience." },
    ],
  },

  "mock-ml-synthesis": {
    primer: {
      plainSummary:
        "This module practises assembling the ML material into one 45-minute argument. The distinguishing skill is that an ML design interview is not about models: it is about framing one deployable decision, making every feature and label time-correct, and closing the lifecycle loop so the system can be deployed, monitored, and reverted safely.",
      analogy:
        "Designing a factory rather than designing a product. The product - the model - is one station on the line. What determines whether the factory works is where materials come from, whether they arrive in the right state, what happens when a batch is defective, and how you stop the line. Candidates who spend the interview on the product are describing a station and calling it a factory.",
      sections: [
        {
          heading: "Frame one deployable decision",
          body: [
            "Start by converting the prompt into a decision contract, in the first five minutes, before any modelling discussion. What action does the system take? At what moment? On what unit? What are the possible actions and their thresholds? What happens by default and when the model is unavailable?",
            "Then the four constraints that eliminate architectures immediately. Decision time, which bounds what features can exist - anything not available at that instant is not a feature, however predictive. Latency budget, which bounds model size and lookup depth. Capacity, since a threshold producing more work than a downstream team can absorb is not a threshold. And error costs, stated as a ratio, since that is what sets the threshold.",
            "Name the eligible population and the outcome horizon. Who gets scored, and how long until you learn whether you were right? The horizon determines label maturity, retraining cadence, and how quickly you can detect that something has broken - a 90-day horizon means a problem introduced today is fully visible in three months, which changes the monitoring design entirely.",
            "State the non-ML baseline and what it would take for the model to be worth its complexity. This is a fast credibility signal, and occasionally it is the right answer.",
            "If you do only one thing differently from an average candidate, do this: spend the first five minutes here rather than on model architecture. Interviewers are listening for whether you can turn a vague prompt into a specified decision, and most candidates never do it.",
          ],
        },
        {
          heading: "Make every feature and label time-correct",
          body: [
            "The middle of the interview should establish that the data pipeline cannot lie. Two mechanisms carry this, and naming them precisely is what demonstrates experience.",
            "Point-in-time joins: every feature for a training example is computed from facts whose availability time precedes that example's decision time. Say the words 'availability time' as distinct from 'event time', because that distinction is the mechanism rather than the warning, and it is what separates someone who has built this from someone who has read about leakage.",
            "Shared feature definitions: training and serving derive from one definition rather than two implementations, so training-serving skew is prevented structurally rather than by care. Add the replay test - recompute features for logged production requests and compare against what was served - as the continuous check, since it is the only test that compares the two paths against each other.",
            "Then the label definition, stated as an operational rule: what event, what window, who decided, and when it became available. Address censoring explicitly - immature labels excluded or modelled - and address selective labels if the system's decisions determine which outcomes are observable, because that is the failure that makes every metric look healthy while the system narrows.",
            "Finish this section with the feature compute paths chosen per feature by required freshness - batch, streaming, or request-time - and the missing-value policy applied identically in both paths. These are small details and they are exactly the ones that distinguish a designed pipeline from an assumed one.",
          ],
        },
        {
          heading: "Close the lifecycle loop",
          body: [
            "The final third should establish that the system can be operated. Offline gates first: a temporal backtest rather than a random split, comparison against the current production model on identical data, pre-registered slices, calibration if probabilities feed decisions, and operational limits on latency and cost. Guardrails that must not regress.",
            "Then online validation, and be precise about what each stage proves. Shadow mode validates inputs, latency, and output distribution and cannot measure impact. A canary bounds harm and gives real impact on a small fraction. An experiment measures value, with the randomisation unit chosen from the causal mechanism and the duration fixed in advance.",
            "Then monitoring in layers by how fast each signal arrives: inputs and prediction distributions immediately, leading indicators in hours, true outcomes on the horizon you named at the start. Rule out data quality before diagnosing drift, since it is more common and needs a completely different response.",
            "Then feedback loops, which is the ML-specific closing move. If the system's decisions shape the data it will next train on - and in recommendation, fraud, and lending they always do - say so, say which kind of loop, and name the countermeasure: an exploration slice, decision-distribution monitoring, and logging the intervention alongside the prediction at decision time.",
            "Finally rollback: previous version deployable as a state transition, the whole release versioned together including thresholds and calibration, and a kill switch to the baseline. Then close with what breaks at ten times the scale.",
          ],
        },
      ],
      workedExample: {
        title: "A 45-minute run at content moderation",
        setup:
          "The prompt is 'Design a system to detect policy-violating content'. The platform has 500 million posts per day. Violations are rare. Wrongly removing legitimate content is a serious harm; missing genuinely harmful content is also serious.",
        steps: [
          "Minutes 0-5, decision contract. Three actions, not two: allow, route to human review, remove automatically. Decision time is at upload with a latency budget of a few hundred milliseconds for the synchronous path, plus an asynchronous deeper pass. Unit is one post. Reviewer capacity is perhaps 50,000 posts per day, which immediately bounds the review threshold regardless of what the model can do - state that as a constraint discovered in minute four.",
          "Minutes 5-10, costs and population. Wrongly removing legitimate content is a censorship harm with appeal costs; missing harmful content is a safety harm. The asymmetry differs by category - for imminent-harm categories, err toward removal; for ambiguous speech, err toward review. So thresholds are per category rather than global, which is a policy decision the design must support explicitly.",
          "Minutes 10-20, architecture with the two paths distinguished. Synchronous: cheap model on the upload path making allow-or-hold decisions in milliseconds. Asynchronous: expensive multi-modal models on a queue for a deeper pass within minutes. Review queue prioritised by predicted severity and by reach, since a violating post with a million views matters more than one with three. Human decisions feed back as labels, and this feedback path is a source of selective labels to be flagged now rather than later.",
          "Minutes 20-32, deep dive on labels and the feedback loop, chosen because it is the hardest part rather than the most familiar. Labels come from human reviewers who only see what the model routed to them, so the training data covers the model's own selection and never the content it confidently allowed. Countermeasures: a random-sample review queue independent of model scores, which is the only unbiased label source; monitoring the distribution of automated removals by category and by user segment; and logging the intervention with every decision. Note that appeals are a second biased label source, since only removed content generates them.",
          "Minutes 32-40, lifecycle. Offline gates with temporal backtest, per-category slices, calibration since thresholds derive from cost ratios, and an over-removal guardrail. Shadow first to compare removal-rate distributions against production. Canary at 1 percent with automated rollback on removal rate exceeding a bound. Monitoring layered: input and prediction distributions immediately, appeal rate within hours, and reviewer agreement on the random sample as the slow ground truth.",
          "Minutes 40-45, close. Failure posture: if the model is unavailable, fall back to the rules-based classifier and route more to review, accepting a backlog rather than allowing unmoderated content. Kill switch to rules-only. At ten times the scale, reviewer capacity becomes the binding constraint far more sharply, so the design's leverage moves from model accuracy to precision at fixed review volume - which is a different optimisation target and worth saying explicitly.",
        ],
        takeaway:
          "The interview was decided in the first ten minutes by establishing a three-action decision, a capacity constraint, and per-category cost asymmetry - and in the deep dive by choosing selective labels over model architecture. Note that the phrase 'which model' never came up, and the design is nonetheless complete and specific. That is what an ML design interview is actually assessing.",
      },
    },
    glossary: [
      { term: "Decision contract", definition: "The action, moment, unit, options, thresholds, and default behaviour a model informs. Established before any modelling discussion." },
      { term: "Capacity constraint", definition: "The downstream limit on how many positive decisions can be handled, which frequently binds harder than model quality." },
      { term: "Outcome horizon", definition: "How long until the true label arrives. Determines label maturity, retraining cadence, and how fast a problem becomes visible." },
      { term: "Point-in-time correctness", definition: "Building each training example from facts available before its decision time, distinguishing availability time from event time." },
      { term: "Shared feature definition", definition: "One definition serving both training and inference, which prevents skew structurally rather than by care." },
      { term: "Replay test", definition: "Recomputing features for logged production requests and comparing against served values - the only continuous check that compares the two paths." },
      { term: "Selective labels", definition: "Outcomes observable only where the system acted, so the model's blind spot never appears in any metric." },
      { term: "Staged validation", definition: "Shadow for mechanics, canary for bounded impact, experiment for value. Each proves something the others cannot." },
      { term: "Layered monitoring", definition: "Signals organised by arrival speed - inputs now, leading indicators in hours, true outcomes on the stated horizon." },
      { term: "Feedback loop countermeasure", definition: "An exploration slice, decision-distribution monitoring, and logging interventions at decision time, since the confound cannot be reconstructed later." },
      { term: "Release rollback", definition: "Reverting model, features, calibration, thresholds, and policy together as one versioned artefact, so no untested combination is produced." },
    ],
  },

  "mock-llm-infrastructure-synthesis": {
    primer: {
      plainSummary:
        "This module practises assembling the LLM infrastructure material into one 45-minute argument. The distinguishing skill is starting from a token workload envelope rather than from request counts, choosing one subsystem to open properly, and closing on overload behaviour, safety boundaries, and cost - which in LLM systems are a single connected concern rather than three separate ones.",
      analogy:
        "Planning electricity supply for a factory rather than counting machines. What matters is total load, peak load, and what happens when demand exceeds supply - and machines differ enormously in what they draw. Counting requests in an LLM system is like counting machines: a 50-token request and a 50,000-token request are both one request and differ by three orders of magnitude in what they consume.",
      sections: [
        {
          heading: "Start from the workload envelope",
          body: [
            "The first estimate in an LLM design is not requests per second - it is tokens. Prompt tokens per request, output tokens per request, and the distribution of both, because the tail matters far more than the mean when one request can be a thousand times another.",
            "From tokens, derive the things that actually constrain the design. Prefill compute scales with prompt tokens. Decode time scales with output tokens and is memory-bandwidth-bound, which is what makes batching so valuable. KV cache memory scales with total sequence length times concurrency, and that product is the concurrency limit of the deployment.",
            "Do the KV arithmetic explicitly, because it is what separates someone who has operated these systems from someone who has read about them: layers times key-value heads times head dimension times two times bytes gives per-token cost, times sequence length gives per-request, and available memory divided by that gives concurrency. State the number. It sets everything downstream.",
            "State the two latency objectives separately - time to first token and inter-token latency - and note they have different sensitivities: TTFT is what makes a service feel broken, while inter-token latency needs only to comfortably exceed reading speed. Then state failure headroom: what happens when a GPU node is lost, since capacity that assumes every node is healthy has planned for the only case that does not matter.",
            "Ten minutes spent here makes the rest of the interview concrete, because every subsequent decision can be justified against a number.",
          ],
        },
        {
          heading: "Open one differentiating subsystem",
          body: [
            "There is far too much in this domain to cover in one interview - serving, retrieval, training, post-training, evaluation - so choose one and go properly deep, selected from the hardest requirement in the prompt rather than from what you know best.",
            "If the prompt emphasises latency at scale, open the serving path: continuous batching, paged attention, token-weighted admission, preemption behaviour, and what happens under overload. If it emphasises answering from private documents, open retrieval: ingestion versioning, hybrid search with reranking, and above all retrieval-time authorisation that fails closed. If it emphasises model quality, open evaluation: the portfolio, judge calibration, and the fact that a difference inside the confidence interval is not a difference.",
            "Whichever you choose, go to mechanism. Not 'we use continuous batching' but what happens when memory fills mid-generation, what preemption costs, how output length is estimated for admission, and what signal autoscaling uses given that GPU compute utilisation stays moderate while memory is full.",
            "Say what you are not covering and why. 'I am treating the model itself as fixed and not discussing training' is scope control, and it prevents the interviewer from reading the omission as a gap.",
          ],
        },
        {
          heading: "Close on overload, safety, and cost together",
          body: [
            "The close in an LLM design interview covers three things that are more connected here than elsewhere, and treating them as one closing argument is what makes it strong.",
            "Overload: because a request holds memory for its whole generation, overload does not resolve itself the way it does in a stateless service. State the admission policy, what is shed and by what priority, whether preemption is possible and what it costs, and why autoscaling cannot be the answer to a spike given that loading model weights takes minutes. Provisioned headroom plus shedding is the honest answer.",
            "Safety: the trust boundary. Model output is untrusted, retrieved content may contain injected instructions, tool calls are authorised against the user's permissions rather than the model's, generated code runs sandboxed, and caches and logs are per-tenant. State that there is no reliable language-level defence against prompt injection and that the mitigation is therefore architectural - that single sentence demonstrates you understand the actual threat model rather than reciting mitigations.",
            "Cost: unbounded per request, which makes it an operational concern rather than a finance one. Attribute per tenant and per feature, enforce budgets and rate limits, cap output length and agent iterations, and alert on anomalies - because a looping agent is a financial incident that no single request makes visible.",
            "These three connect: admission control bounds cost, output caps bound both cost and memory, and tenant isolation bounds both blast radius and spend. Presenting them as one connected closing argument rather than three lists is what makes it land.",
          ],
        },
      ],
      workedExample: {
        title: "A 45-minute run at an enterprise assistant",
        setup:
          "The prompt is 'Design an AI assistant for a large enterprise that answers questions over internal documents'. 50,000 employees, documents with varying access permissions, answers must cite sources.",
        steps: [
          "Minutes 0-8, token envelope. Assume 50,000 employees, 20 percent daily active, 5 questions each: 50,000 questions per day, about 3 per second average and perhaps 10 at peak. Each question retrieves roughly 8 chunks of 500 tokens plus a 1,000-token system prompt, so about 5,000 prompt tokens, with 400 output tokens. That is 25 million prompt tokens and 2 million output tokens daily. Modest - so throughput is not the hard problem, which redirects the interview toward correctness and permissions where it belongs.",
          "Minutes 8-12, KV arithmetic and concurrency. At roughly 131 kilobytes per token for a GQA model, a 5,400-token request holds about 700 megabytes. With 35 gigabytes free after weights, that is about 50 concurrent requests per GPU - far above the 10 per second peak given a few seconds per request. Conclude aloud that one or two GPUs suffice and that the design's difficulty lies elsewhere. Note also that the shared 1,000-token system prompt is a prefix-cache opportunity worth taking.",
          "Minutes 12-22, end-to-end. Ingestion pipeline with versioned chunks and tombstoned deletions; hybrid retrieval combining embeddings and BM25, fused by reciprocal rank; a reranker over the top 100; permission filtering applied as part of the retrieval query; generation with citations; and a freshness watermark so the system can state its staleness. Name the source of truth as the document system, with the index derived.",
          "Minutes 22-36, deep dive on authorisation, chosen because varying permissions is the hardest requirement in the prompt. Filtering happens before retrieval, never after generation, because an influence on a generated answer cannot be removed. Permissions are evaluated against live state rather than an index snapshot, since a nightly snapshot means a day of stale access. The system fails closed when the permission service is unavailable. Caches are keyed by permission scope. Retrieved content is untrusted, so no retrieved document can authorise a tool call. Add the audit log of what was retrievable per query and automated tests asserting a low-privilege user cannot obtain privileged answers.",
          "Minutes 36-41, evaluation, because 'must cite sources' is a testable claim. Separate retrieval metrics from answer metrics, since a missing document and a misread document need different fixes. Measure groundedness - whether every claim appears in the retrieved context - and citation correctness. Use pairwise comparison against the current version rather than absolute scoring, and calibrate any model judge against human labels before trusting it.",
          "Minutes 41-45, close. Overload: admission by projected tokens, shed by priority, provisioned headroom rather than autoscaling given multi-minute model load. Safety: no reliable defence against injection at the language level, so tool calls are authorised against the user and generated code is sandboxed. Cost: per-department attribution, output caps, and anomaly alerts. At ten times the scale, the binding constraint becomes the permission check on the retrieval path, so that is where caching with a short TTL and a tight staleness bound would go first.",
        ],
        takeaway:
          "The token envelope showed within eight minutes that serving throughput was not the problem, which freed the interview to go deep on the authorisation model where the real difficulty was. That redirection is the payoff of estimating first - it prevents spending the interview optimising something that was never constrained.",
      },
    },
    glossary: [
      { term: "Token workload envelope", definition: "Prompt and output token distributions rather than request counts, since one request can consume a thousand times another." },
      { term: "KV memory arithmetic", definition: "Layers times key-value heads times head dimension times two times bytes, times sequence length, giving the per-request memory that caps concurrency." },
      { term: "Two latency objectives", definition: "Time to first token and inter-token latency, which have different causes and very different user sensitivity." },
      { term: "Failure headroom", definition: "Capacity reserved so losing a node does not saturate the rest. Especially important where model load time makes replacement slow." },
      { term: "Differentiating subsystem", definition: "The one area opened to mechanism depth, chosen from the prompt's hardest requirement rather than from familiarity." },
      { term: "Token-weighted admission", definition: "Admitting by projected token work and peak memory, since a request holds memory for its whole generation." },
      { term: "Retrieval-time authorisation", definition: "Filtering by permissions before content enters the prompt, failing closed, because a generated answer's influences cannot be removed." },
      { term: "Trust boundary", definition: "The rule that model output and retrieved content are untrusted, so tool calls are authorised against the user and generated code is sandboxed." },
      { term: "Cost envelope", definition: "Per-tenant attribution, budgets, output caps, and iteration limits, since per-request cost is unbounded and a looping agent spends invisibly." },
    ],
  },

  "mock-critique-remediation": {
    primer: {
      plainSummary:
        "Doing mock interviews without a structured critique produces slow, uneven improvement, because you remember how the mock felt rather than what specifically went wrong. This module is about extracting a small number of causal, observable mistakes from each mock and converting each into a drill with a success criterion and a review date - which is what turns practice into improvement.",
      analogy:
        "Reviewing recorded footage after a match. Watching it and feeling bad about the loss changes nothing. Identifying three specific decisions, understanding what led to each, and drilling those particular situations does. The value is entirely in the specificity, and 'play better' is not a finding.",
      sections: [
        {
          heading: "Critique observable behaviour, not identity",
          body: [
            "The distinction that makes critique useful is between what you did and what you are. 'I am bad at estimation' is an identity statement: it is not actionable, it is demoralising, and it is almost certainly too broad to be true. 'At minute 7 I computed storage without stating the replication factor, so my number was off by three times and I did not notice' is an observable behaviour that can be drilled.",
            "So score against separate dimensions rather than forming a global impression, because a global impression averages away exactly the information you need. Useful dimensions: requirements and scoping, estimation, architecture, data modelling, reliability and failure handling, trade-off articulation, communication, and time management. Scoring these separately reveals patterns - a candidate strong on architecture and weak on time management has a completely different improvement plan from the reverse, and a global score of 'medium' hides both.",
            "Attach evidence with a timestamp to every score. 'Communication: weak, minute 22, spent 90 seconds silent while thinking about the partition key.' The timestamp forces specificity and makes the finding verifiable later.",
            "Do this immediately after the mock while the detail is available. Within a few hours you will retain the feeling and lose the specifics, and the specifics are the entire value.",
          ],
        },
        {
          heading: "Prioritise three causal misses",
          body: [
            "A mock will produce a long list of imperfections. Fixing all of them is impossible and attempting it produces no improvement anywhere. Pick three, chosen by causality rather than by severity.",
            "A causal miss is one that produced other misses. If you spent too long on requirements, then rushed the architecture, then had no time for a deep dive, the deep dive is a symptom and the time allocation is the cause. Fixing the cause fixes several symptoms at once, and the surface symptoms are usually what feels worst - which is why unstructured self-review tends to fix the wrong things.",
            "For each of the three, write the counterfactual: what specifically you would do differently at that moment. Not 'manage time better' but 'at minute 8, whatever state requirements are in, draw the end-to-end path'. The counterfactual must be concrete enough to execute under pressure, because that is the condition in which you will need it.",
            "Three is a deliberate limit. More than three and none of them get the attention that changes behaviour. The remaining items go on a list and may become the three after the next mock - which also gives you a record of whether the same item keeps recurring, and a recurring item is a signal that your drill for it was wrong rather than that you lack discipline.",
          ],
        },
        {
          heading: "Repair with progressively broader retrieval",
          body: [
            "Each of the three misses becomes a drill with a success criterion. A drill is a small repeatable exercise targeting exactly that behaviour: 'given five prompts, produce a complete end-to-end architecture in eight minutes each' targets time allocation directly, and it is far more efficient than another full mock, because a full mock exercises everything and drills the weakness for two minutes.",
            "Define what success looks like before drilling. 'Four of five prompts reach a complete architecture within eight minutes.' Without a criterion you cannot tell whether the drill worked, and you will either abandon it too early or continue it long past the point of value.",
            "Then schedule review at spaced intervals rather than immediately. Retrieving something after a delay strengthens it far more than reviewing it while it is still fresh - which feels easier and produces less. Schedule the first review a few days out, the next a week or two later, and let successful retrievals extend the interval.",
            "Finally, test for transfer. Drilling one prompt repeatedly can produce fluency on that prompt rather than the underlying skill, so the real test is whether the behaviour appears on a prompt you have not practised. That is the transfer test, and it is the only evidence that the skill generalised rather than the answer being memorised. If it does not transfer, the drill was too narrow - which is a finding about the drill, not about you.",
          ],
        },
      ],
      workedExample: {
        title: "Turning one mediocre mock into a two-week plan",
        setup:
          "A mock on 'design a ticketing system' went poorly. The candidate felt they knew the material but performed badly. The recording is available and the critique is being done immediately afterwards.",
        steps: [
          "Score dimensions separately with timestamped evidence. Requirements: strong, scoped well by minute 5. Estimation: weak, computed QPS but never used it for anything, minute 9. Architecture: adequate but reached only at minute 28. Data modelling: strong. Reliability: not covered, ran out of time. Trade-offs: weak, named choices without stating costs, throughout. Communication: adequate. Time management: weak, minutes 10 to 28 spent on the seat-locking mechanism before any full architecture existed.",
          "Identify the causal chain rather than the worst symptom. Spending 18 minutes on seat locking before an end-to-end design caused the late architecture, which caused reliability to be skipped and the close to be rushed. So the cause is going deep before breadth, not the missing reliability section - which is the thing that felt worst.",
          "Pick three causal misses. One: went deep before an end-to-end design existed. Two: estimates were computed but never connected to a decision, so they were arithmetic theatre. Three: trade-offs were stated as choices without costs - 'I will use optimistic locking' rather than 'optimistic locking, which avoids holding locks during payment and means a user can lose a seat at checkout, which I accept because contention is brief'.",
          "Write concrete counterfactuals. One: at minute 10, whatever else is happening, draw the complete path. Two: after every estimate, say a sentence beginning 'therefore'. Three: after every technology choice, say 'which costs' and complete the sentence.",
          "Design drills with success criteria. For one: five prompts, complete architecture in ten minutes each, success at four of five. For two: ten estimation exercises, each ending in an architectural consequence, success when every one has a 'therefore'. For three: list twenty decisions from past designs and state each as choice-plus-cost, success at eighteen of twenty without prompting.",
          "Schedule spaced review and a transfer test. Drill each within two days, review at day 5 and day 14. Then run a full mock on an unpractised prompt and check specifically whether an end-to-end architecture appears by minute 20 and whether trade-offs carry costs unprompted. Behaviour appearing on a new prompt is the evidence; behaviour appearing on a drilled prompt is not.",
        ],
        takeaway:
          "The finding that mattered - going deep before breadth - was not the thing that felt worst, which was the missing reliability section. Structured critique finds causes while unstructured reflection finds symptoms, and the difference compounds over a dozen mocks. The transfer test is what stops you from mistaking familiarity with a practised prompt for an improved skill.",
      },
    },
    glossary: [
      { term: "Observable behaviour", definition: "A specific timestamped action, as opposed to an identity claim. Only the former can be drilled." },
      { term: "Dimension scoring", definition: "Rating requirements, estimation, architecture, data, reliability, trade-offs, communication, and time separately, since a global impression averages away the useful signal." },
      { term: "Evidence timestamp", definition: "The moment in the mock supporting a finding, which forces specificity and makes the finding verifiable later." },
      { term: "Causal miss", definition: "A mistake that produced other mistakes. Fixing it resolves several symptoms, and it is usually not the thing that felt worst." },
      { term: "Counterfactual", definition: "The specific alternative action at a specific moment, concrete enough to execute under pressure." },
      { term: "Micro-drill", definition: "A short repeatable exercise targeting one behaviour. Far more efficient than another full mock, which drills a weakness for two minutes." },
      { term: "Success criterion", definition: "The observable standard that ends a drill, without which you cannot tell whether it worked." },
      { term: "Spaced review", definition: "Revisiting at increasing intervals, which strengthens retention far more than immediate review that feels easier." },
      { term: "Transfer test", definition: "Checking the behaviour on an unpractised prompt. The only evidence the skill generalised rather than the answer being memorised." },
    ],
  },

  "mock-evolution-executive-close": {
    primer: {
      plainSummary:
        "Two things reliably appear at the end of a senior interview: 'what happens at ten times the scale?' and the moment where you summarise. Both are graded heavily and both are usually improvised. This module is about answering the scale question by stressing one dimension at a time to find the first bottleneck, planning a migration that is reversible, and delivering a close that sounds like an owner rather than a candidate.",
      analogy:
        "A structural engineer asked what happens if a building takes ten times the load. They do not say 'we would strengthen everything'. They identify which element fails first, at what load, and what the failure looks like - because that is the only answer that tells you what to do. And any strengthening work has to be done while the building stays occupied, which constrains the plan as much as the engineering does.",
      sections: [
        {
          heading: "Stress one dimension at a time",
          body: [
            "The weak answer to 'what about ten times the scale' multiplies every component by ten. It demonstrates nothing, because it does not identify what actually breaks, and real growth is never uniform anyway.",
            "The strong answer picks one dimension, changes it, and traces the consequence to the first thing that fails. Ten times the users is a different problem from ten times the data, which is different again from ten times the write rate or ten times the concurrent connections. Ask which dimension, or name one and say why you chose it.",
            "Then find the first bottleneck rather than listing all of them, because the first one is the only one that matters until it is fixed - everything downstream of it never sees the increased load. 'At ten times the write rate the fan-out queue saturates first, at around 400,000 writes per second, because it is single-partitioned by author' is a real answer. It names the component, the threshold, and the reason, which means it also implies the fix.",
            "Sensitivity analysis is the related move worth doing unprompted: which assumption, if wrong, would change the architecture most? 'If the read-to-write ratio were 10:1 rather than 100:1, I would not denormalise, and that is the assumption I would validate first in production.' This shows you know which of your inputs are load-bearing, and it is a distinctly senior thing to say.",
            "Also say which parts do not need to change, because a candidate who says everything needs rearchitecting at ten times the scale has not understood their own design's headroom.",
          ],
        },
        {
          heading: "Evolve through a reversible migration",
          body: [
            "Identifying what breaks is half the answer. The other half is how you would change it on a running system, because in practice you never get to rebuild.",
            "The standard shape is dual write with backfill. Write to both the old and new systems; backfill historical data in the background with a watermark tracking progress; read from the old system while comparing against the new to verify correctness; shift reads gradually once they agree; then stop writing to the old system. Every stage is reversible until the last, which is what makes it safe.",
            "Two details make this work in practice. The comparison stage is where you find the bugs - reading from both and reporting mismatches, at no user risk, is far more informative than any test suite, because it runs on real data. And the backfill watermark must be tracked so the migration can pause and resume, since a backfill of significant size will be interrupted.",
            "Maintain compatibility in both directions during the transition. New code must handle old data and old code must tolerate new data, because a deployment is not instantaneous and a rollback must be possible while both exist. This is what makes the migration reversible rather than a cutover with a rollback plan on paper.",
            "State the failure plan for the migration itself, not just for the system. What happens if the new system is wrong halfway through? If reads have already shifted? A migration is a project with its own failure modes, and treating it as one is what distinguishes a plan from an intention.",
          ],
        },
        {
          heading: "Close like an accountable owner",
          body: [
            "Reserve the last five minutes regardless of the state of the deep dive, and use them for a structured close - the same five elements every time, so it becomes automatic and does not consume thinking under pressure.",
            "One: restate what you built, in two sentences, tied to the requirements from minute five. 'A read-optimised feed with hybrid fan-out, serving a 100:1 read-to-write ratio with sub-second freshness.'",
            "Two: name the two or three decisions that mattered and what each cost. Not the full list - the ones that shaped everything else, each with its trade-off stated, because that is the sentence interviewers are listening for.",
            "Three: risks. What worries you about this design, honestly. A candidate who names a real weakness is more credible than one who presents a design with no downsides, and interviewers know every design has them - so claiming otherwise reads as either inexperience or salesmanship.",
            "Four: validation. What you would measure to know it is working, and what you would alert on. Be specific about the signal - fan-out lag in seconds rather than CPU - since the choice of signal is itself a design decision.",
            "Five: evolution. What breaks first at ten times the scale and what you would do about it, in one sentence.",
            "Deliver this even if the deep dive is unfinished. An unfinished deep dive with a strong close reads far better than a complete deep dive that ran out of time in silence, because the close is where you demonstrate that you would own the system rather than merely build it - and ownership is what the seniority signal actually is.",
          ],
        },
      ],
      workedExample: {
        title: "Answering the ten-times question and closing",
        setup:
          "Forty minutes into a feed design interview, with a hybrid fan-out architecture on the board. The interviewer asks: 'What happens if this grows ten times?'",
        steps: [
          "Ask which dimension, or choose one explicitly. 'Ten times the users behaves differently from ten times the posting rate - the second is harder here because fan-out cost scales with posts times followers. Let me take ten times the posting rate.' This takes ten seconds and immediately shows the question was understood rather than answered by reflex.",
          "Trace to the first bottleneck with a number. 'Fan-out writes go from 460,000 to 4.6 million per second. The inbox store can be partitioned further, so it is not first. The fan-out queue is the constraint, because celebrity fan-out already shares capacity with ordinary posts - at ten times, celebrity fan-out saturates it and ordinary users' feeds go stale by minutes.' Component, threshold, and reason.",
          "Give the fix and what it costs. 'Separate the queues fully, and lower the pull threshold so more accounts are pulled at read time rather than pushed. That shifts cost from write to read, which is acceptable because reads are cached - and it increases feed assembly latency, so I would measure that before choosing the new threshold.'",
          "Say what does not change. 'The inbox store, the hydration path, and the caching layer all scale horizontally without redesign. The only structural change is the fan-out threshold and queue isolation.' This bounds the work and shows the original design had headroom.",
          "Describe the migration as reversible. 'Changing the pull threshold is a gradual rollout - move it for a small percentage of accounts, compare feed latency and freshness against the control, then ramp. It is reversible at every stage because both paths remain live, so nothing needs a cutover.'",
          "Deliver the five-part close. Built: a read-optimised feed with hybrid fan-out for a 100:1 read ratio and sub-second freshness. Decisions: push by default because reads dominate, costing write amplification; pull above a follower threshold, costing read-time merge complexity; visibility enforced at hydration, costing a lookup per read and buying instant deletion. Risks: the threshold is tuned from measured fan-out cost and would drift as follower distributions change. Validation: alert on fan-out lag in seconds, cache hit rate, and feed assembly p99. Evolution: the fan-out queue saturates first, and queue isolation plus a lower threshold addresses it.",
        ],
        takeaway:
          "The scale answer was specific about which component fails, at what load, and why - and it named what does not change, which is what shows the original design had headroom rather than luck. The close then took ninety seconds and covered what was built, what it cost, what worries you, what you would measure, and what breaks next. That structure is worth rehearsing until it is automatic, because it is the last thing the interviewer hears and it is where seniority is most legible.",
      },
    },
    glossary: [
      { term: "Dimensional stress", definition: "Changing one axis - users, data, write rate, connections - rather than multiplying everything, since real growth is never uniform." },
      { term: "First bottleneck", definition: "The component that fails soonest under the stressed dimension. The only one that matters until it is fixed, since nothing downstream sees the load." },
      { term: "Sensitivity analysis", definition: "Identifying which assumption, if wrong, would change the architecture most - and therefore which to validate first in production." },
      { term: "Dual write", definition: "Writing to old and new systems simultaneously during a migration, so both remain live and the change stays reversible." },
      { term: "Backfill watermark", definition: "A record of how far historical migration has progressed, so a long backfill can pause and resume." },
      { term: "Shadow comparison", definition: "Reading from both systems and reporting mismatches at no user risk. Where migration bugs are actually found, because it runs on real data." },
      { term: "Bidirectional compatibility", definition: "New code handling old data and old code tolerating new data, which is what makes a rollback possible mid-migration." },
      { term: "Risk register", definition: "The honest list of what worries you about a design. Naming a real weakness is more credible than presenting one with no downsides." },
      { term: "Executive close", definition: "A five-part summary - what was built, decisions and their costs, risks, validation signals, and evolution - delivered regardless of the deep dive's state." },
    ],
  },
};
