import type { DesignPrompt, StudyTopic } from "./types";

export const mlTopics: StudyTopic[] = [
  {
    id: "ml-problem-framing",
    week: 8,
    day: 1,
    tier: 2,
    title: "Frame the ML problem before choosing a model",
    eyebrow: "Week 5 · Day 1",
    estimatedMinutes: 55,
    summary:
      "Translate a product goal into a decision, prediction unit, horizon, objective, constraints, and a baseline that can prove ML is worth operating.",
    whyItMatters:
      "Senior candidates are judged on whether they design the right decision system. A sophisticated model attached to the wrong label, horizon, or intervention cannot create reliable product value.",
    objectives: [
      "Separate the user outcome, business outcome, model output, and downstream decision.",
      "Define the unit of prediction, decision time, prediction horizon, and eligible population.",
      "State asymmetric error costs and hard safety, latency, privacy, and capacity constraints.",
      "Choose rule-based and simple statistical baselines plus an explicit launch criterion.",
    ],
    concepts: [
      "decision policy",
      "unit of prediction",
      "prediction horizon",
      "proxy objective",
      "cost matrix",
      "Bayes decision rule",
      "non-ML baseline",
      "fallback path",
    ],
    deepDive: [
      {
        title: "From product goal to a decision contract",
        summary:
          "A model estimates a quantity; a policy converts that estimate and current constraints into an action.",
        points: [
          "Write the contract as context x observed at time t, model output s(x), action a, outcome y measured by t + horizon, and who or what receives the action.",
          "Keep prediction and intervention distinct: estimated click probability does not say how many notifications to send or whether the send is permissible.",
          "Name exclusions and abstention behavior. A score without an eligible population, owner, and fallback is not a deployable requirement.",
        ],
      },
      {
        title: "Objectives, proxies, and error economics",
        summary:
          "Optimize expected product utility under constraints, not an isolated offline score.",
        points: [
          "Express a first-order policy objective as expected utility E[U(a,y)] minus serving, review, and harm costs; document which terms are measured only through online experiments.",
          "Use a cost matrix to expose asymmetric mistakes. If false negatives cost C_FN and false positives cost C_FP, a calibrated probability can be thresholded near C_FP / (C_FP + C_FN) before operational constraints.",
          "Audit proxy gaps: engagement can reward outrage, approval rate can hide risk selection, and average ETA error can hide severe tail misses.",
        ],
      },
      {
        title: "Baselines and staged value proof",
        summary:
          "A baseline anchors complexity, feasibility, and the minimum evidence required to launch.",
        points: [
          "Start with current policy, random or popularity ranking, rules, and a simple interpretable model evaluated on the same point-in-time split.",
          "Decompose value into data lift, model lift, and policy lift so gains are not incorrectly attributed to architecture.",
          "Predeclare offline gates, online success and guardrails, a latency budget, and rollback conditions before expensive training or infrastructure work.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Optimize a direct outcome or a fast proxy",
        preferA: "Use the direct outcome when it arrives reliably inside the iteration window.",
        preferB: "Use a validated proxy when the true outcome is sparse or delayed, then monitor proxy alignment.",
        watch: "Goodhart effects and policies that move the proxy while harming the actual user outcome.",
      },
      {
        decision: "Predict a continuous score or a discrete action",
        preferA: "Predict a calibrated score when several policies or thresholds will consume it.",
        preferB: "Learn the action directly when treatment effects and action-specific utility are modeled.",
        watch: "Conflating correlation with the causal effect of taking an action.",
      },
      {
        decision: "Add ML or strengthen a deterministic baseline",
        preferA: "Add ML when heterogeneity is learnable and expected lift exceeds lifecycle cost.",
        preferB: "Use rules when policy is stable, auditable, low-dimensional, or data is insufficient.",
        watch: "Operational complexity, cold start, and a model whose measured lift is within noise.",
      },
    ],
    failureModes: [
      {
        mode: "The label measures a convenient proxy instead of the desired outcome",
        symptom: "Offline metrics rise while complaints, retention, or task success deteriorate.",
        mitigation: "Map the causal chain, add outcome guardrails, and validate the proxy with a controlled experiment.",
      },
      {
        mode: "The prediction unit or horizon is ambiguous",
        symptom: "Training rows, serving requests, and metric denominators describe different populations.",
        mitigation: "Write and test a versioned decision contract with entity, timestamp, horizon, eligibility, and action.",
      },
      {
        mode: "No credible non-ML comparison exists",
        symptom: "The team cannot tell whether lift comes from fresh data, a new policy, or the model.",
        mitigation: "Replay current policy and simple baselines on identical splits and retain one as a production fallback.",
      },
    ],
    interviewQuestions: [
      "What is the exact decision this score changes, and at what time is that decision made?",
      "Which false outcome is most harmful, and how does that change the objective or threshold?",
      "What would you ship in two weeks without ML?",
      "How will you prove value when the true outcome arrives months later?",
    ],
    decisionChecklist: [
      "Name user value, business value, and non-negotiable guardrails.",
      "Define entity, eligible population, decision timestamp, and prediction horizon.",
      "Specify model output, policy action, and abstention or fallback separately.",
      "Quantify error costs and capacity or latency constraints.",
      "Choose current-policy, rules, and simple-model baselines.",
      "State offline gates, online success metrics, and rollback triggers.",
    ],
    exercise:
      "Write the decision contract for a notification send: include eligible user-event pairs, score semantics, send-cap policy, outcome horizon, error costs, baseline, and a no-model fallback. Draw the boundary between model and policy components.",
    prerequisites: ["ml-design-overview"],
    relatedDesigns: ["personalized-notifications", "fraud-detection", "credit-risk"],
    quiz: [
      {
        prompt: "A calibrated model predicts loss probability p. A false approval costs 90 and a false decline costs 10. Ignoring other constraints, which decline threshold is the correct starting point?",
        options: ["0.10", "0.50", "0.90", "It cannot be derived from costs"],
        answerIndex: 0,
        explanation:
          "Decline when p times 90 exceeds (1-p) times 10, which gives p > 10/(90+10) = 0.10.",
      },
      {
        prompt: "Why should an ML design specify a non-ML baseline?",
        options: [
          "It eliminates the need for online experiments.",
          "It proves whether incremental ML complexity creates measurable lift and supplies a fallback.",
          "It guarantees calibrated probabilities.",
          "It makes feature freshness irrelevant.",
        ],
        answerIndex: 1,
        explanation:
          "A comparable baseline separates genuine model value from data or policy changes and provides graceful degradation.",
      },
    ],
    recallCards: [
      { id: "mlf-decision", prompt: "State the questions that convert a vague product ask into a machine-learning problem specification.", answer: "What single decision does the system make, who or what consumes it, and what action follows automatically? What is the prediction target, expressed as something observable in logged data? What is the unit of prediction and the latency budget at serving time? What is the baseline the model must beat, including the trivial heuristic? And what would make the model harmful enough to roll back? If the answer is not one deployable decision with a measurable consequence, the framing is not finished." },
      { id: "mlf-baseline", prompt: "Explain why a non-model baseline is mandatory before proposing an architecture.", answer: "A simple heuristic - most popular, most recent, last value, or a small logistic regression on a few features - establishes whether the problem needs learning at all and sets the bar every later comparison is measured against. It also exposes the data plumbing, latency budget, and evaluation harness at low cost, so the expensive model is built against infrastructure already proven. Skipping it is how teams ship a model that a two-line rule would have matched." },
    ],
  },
  {
    id: "ml-metrics-slices",
    week: 8,
    day: 2,
    tier: 2,
    title: "Select metrics and evaluate the slices that matter",
    eyebrow: "Week 5 · Day 2",
    estimatedMinutes: 65,
    summary:
      "Build an offline and online metric stack that reflects prevalence, ranking position, probability quality, product utility, and performance on consequential slices.",
    whyItMatters:
      "Aggregate AUC can hide an unusable operating point or a broken cohort. Interviewers expect candidates to connect model metrics to decisions and product guardrails.",
    objectives: [
      "Choose discrimination, ranking, calibration, and decision metrics for the actual serving policy.",
      "Explain why ROC-AUC can look strong on rare-event problems while precision is poor.",
      "Evaluate stable, sufficiently powered slices without turning dashboards into a multiple-testing trap.",
      "Connect offline metrics to online success, guardrails, latency, and availability.",
    ],
    concepts: [
      "precision and recall",
      "ROC-AUC",
      "PR-AUC",
      "log loss",
      "Brier score",
      "NDCG",
      "slice evaluation",
      "confidence intervals",
    ],
    deepDive: [
      {
        title: "Discrimination under class imbalance",
        summary:
          "ROC and precision-recall answer different questions and have different baselines.",
        points: [
          "ROC plots TPR = TP/(TP+FN) against FPR = FP/(FP+TN). ROC-AUC is the probability a random positive outranks a random negative and can remain high despite many false positives when negatives dominate.",
          "PR plots precision = TP/(TP+FP) against recall = TPR. Its no-skill precision baseline equals positive prevalence, so PR-AUC exposes whether alerts remain useful on rare events.",
          "Compare models at the feasible operating region: precision at review capacity, recall at a false-positive budget, or expected utility—not only whole-curve area.",
        ],
      },
      {
        title: "Probability, ranking, and product metrics",
        summary:
          "Use a metric family matching the artifact consumed by the product.",
        points: [
          "Log loss averages -[y log p + (1-y) log(1-p)] and strongly penalizes confident mistakes; Brier score averages (p-y)^2 and measures probabilistic accuracy.",
          "For ordered lists, DCG@k sums gain_i/log2(i+1); NDCG divides by the ideal DCG. Add recall@k for candidate coverage and task-specific diversity or safety constraints.",
          "Offline metrics are gates, not causal product estimates. Online metrics measure behavior, while complaint rate, latency, cost, fairness, and safety protect against local optimization.",
        ],
      },
      {
        title: "Slice-based evaluation with statistical discipline",
        summary:
          "Slices turn aggregate performance into a deployability assessment.",
        points: [
          "Predeclare slices tied to product mechanics: cold start, geography, device, traffic source, label delay, long-tail items, and operational severity.",
          "Report denominator, prevalence, confidence interval, calibration, and the chosen operating-point metric per slice; tiny slices need pooling or uncertainty, not confident rankings.",
          "Gate on critical slice regressions and monitor the worst supported slice, but control repeated comparisons and avoid discovering a bespoke slice only after seeing outcomes.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "ROC-AUC or PR-AUC for model selection",
        preferA: "Use ROC-AUC to summarize pairwise ranking across classes when both error axes are relevant.",
        preferB: "Use PR-AUC when positives are rare and positive-prediction quality drives operations.",
        watch: "Both average over thresholds and can obscure the only operating region the product can afford.",
      },
      {
        decision: "Global metric or per-slice gates",
        preferA: "Use a global metric for stable comparison and overall capacity planning.",
        preferB: "Use slice gates where harm, prevalence, or data-generating processes differ.",
        watch: "Small samples, overlapping slices, and false discoveries from many comparisons.",
      },
      {
        decision: "Threshold metric or proper scoring rule",
        preferA: "Use threshold metrics when one fixed action policy dominates.",
        preferB: "Use log loss or Brier score when calibrated probabilities support multiple policies.",
        watch: "A model can rank well but be miscalibrated, or calibrate globally while ranking poorly.",
      },
    ],
    failureModes: [
      {
        mode: "A rare-event model is selected by ROC-AUC alone",
        symptom: "Offline AUC is high but the alert queue is dominated by false positives.",
        mitigation: "Report prevalence-aware PR curves and precision/recall at the actual review capacity.",
      },
      {
        mode: "Aggregate performance hides a broken cohort",
        symptom: "Complaints or misses concentrate in cold-start, regional, or high-severity slices.",
        mitigation: "Predefine slice gates with uncertainty and add representative coverage to data collection.",
      },
      {
        mode: "Offline lift does not translate online",
        symptom: "NDCG improves while retention or task completion is flat or negative.",
        mitigation: "Check replay validity and metric alignment, then run a powered experiment with guardrails.",
      },
    ],
    interviewQuestions: [
      "At what operating point will this model run, and why is that point affordable?",
      "When can ROC-AUC be misleading even if it is mathematically correct?",
      "Which slices deserve launch gates rather than dashboard-only monitoring?",
      "What evidence would convince you that the offline metric is causally connected to user value?",
    ],
    decisionChecklist: [
      "Measure prevalence and define the evaluation population.",
      "Choose metrics for ranking, probability quality, and the deployed threshold.",
      "Tie the operating point to cost, capacity, or a product constraint.",
      "Predeclare consequential slices and minimum support.",
      "Report uncertainty and compare against a shared baseline.",
      "Specify online success, guardrails, and an offline-to-online validation plan.",
    ],
    exercise:
      "Design a metric component that ingests scored examples and slice keys, then outputs ROC-AUC, PR-AUC, log loss, calibration error, and precision/recall at a review budget with bootstrap intervals. Explain how you prevent tiny or overlapping slices from creating false alarms.",
    prerequisites: ["ml-problem-framing"],
    relatedDesigns: ["fraud-detection", "content-moderation", "ads-ctr"],
    quiz: [
      {
        prompt: "Why can a 1% prevalence classifier have a strong ROC-AUC but unusable precision?",
        options: [
          "ROC-AUC always assumes balanced training data.",
          "Even a small false-positive rate applied to the 99% negative class can outnumber true positives.",
          "Precision is independent of prevalence.",
          "ROC-AUC measures calibration rather than ranking.",
        ],
        answerIndex: 1,
        explanation:
          "The large negative population can generate many false positives even at low FPR; precision includes those false positives and depends on prevalence.",
      },
      {
        prompt: "Which metric directly assesses the quality of probabilities used by several downstream thresholds?",
        options: ["Recall@k", "MRR", "Log loss", "Coverage"],
        answerIndex: 2,
        explanation:
          "Log loss is a proper scoring rule for predicted probabilities; ranking-only metrics do not establish probability quality.",
      },
    ],
    recallCards: [
      { id: "mlm-roc-pr", prompt: "Explain why ROC-AUC can look strong while a rare-event model is unusable, and what to use instead.", answer: "ROC plots true-positive rate against false-positive rate, and the false-positive rate divides by the large negative population, so even a large absolute number of false positives barely moves it. On a rare-event problem a model can therefore hold a high ROC-AUC while nearly every alert it produces is wrong. Precision-recall exposes this because its no-skill baseline equals the positive prevalence, and precision directly measures the fraction of flagged cases that are real. Evaluate at the operating region the product can actually afford: precision at review capacity, or recall at a fixed false-positive budget." },
      { id: "mlm-slices", prompt: "Describe how to evaluate slices without turning the dashboard into a multiple-comparisons trap.", answer: "Predeclare the slices that matter from product mechanics - cold start, geography, device, traffic source, long-tail items, high-severity cases - rather than discovering an interesting cut after seeing results. Report the denominator, prevalence, confidence interval, and calibration per slice, so small slices show as uncertain instead of producing confident spurious rankings. Gate releases on regressions in critical slices, pool or hierarchically shrink tiny slices, and treat post-hoc slice discovery as hypothesis generation requiring separate confirmation." },
    ],
    furtherReading: [
      {
        label: "Davis and Goadrich: The Relationship Between Precision-Recall and ROC Curves",
        url: "https://dl.acm.org/doi/10.1145/1143844.1143874",
      },
    ],
  },
  {
    id: "ml-data-labels-leakage",
    week: 8,
    day: 3,
    tier: 2,
    title: "Build labels and datasets with point-in-time correctness",
    eyebrow: "Week 5 · Day 3",
    estimatedMinutes: 70,
    summary:
      "Design event, annotation, and dataset pipelines whose labels mean what the decision needs and whose features contain only information available at prediction time.",
    whyItMatters:
      "Most spectacular offline failures are data failures: label ambiguity, selection bias, leakage, late events, or silent schema changes. Senior MLEs make data semantics testable.",
    objectives: [
      "Specify observable label rules, attribution windows, censoring, and negative eligibility.",
      "Detect target, temporal, group, and train-test contamination.",
      "Implement point-in-time joins with event time, availability time, and immutable versions.",
      "Version datasets and validate freshness, completeness, distributions, and lineage.",
    ],
    concepts: [
      "event time",
      "availability time",
      "label window",
      "censoring",
      "selection bias",
      "target leakage",
      "point-in-time join",
      "dataset lineage",
    ],
    deepDive: [
      {
        title: "Labels are operational definitions",
        summary:
          "A label requires an event rule, attribution rule, observation horizon, and mature-negative policy.",
        points: [
          "For an example anchored at decision time t, define positive events in (t, t+h], exclusions, duplicate handling, and when the row becomes label-complete.",
          "Do not mark an unlabeled, still-maturing example negative. Store label_status and mature_at; account for right censoring when observation windows differ.",
          "Human labels need a rubric, adjudication, annotator quality checks, and agreement measures; observed enforcement actions may reflect reviewer selection rather than ground truth.",
        ],
      },
      {
        title: "Leakage and contamination",
        summary:
          "Leakage is any information path unavailable at the real decision time or shared improperly across splits.",
        points: [
          "Target leakage includes post-outcome fields, aggregates updated after the label event, and operational actions caused by an earlier model.",
          "Temporal leakage comes from random splits in evolving systems; group leakage comes from the same user, case, or item appearing across train and validation.",
          "Fit normalization, vocabulary, imputation, feature selection, and resampling only on training partitions; dataset transforms can leak even when raw columns do not.",
        ],
      },
      {
        title: "Point-in-time joins and quality contracts",
        summary:
          "Historical training rows must reproduce what online serving could have known.",
        points: [
          "For each prediction row at t, join the latest feature event whose event_time <= t and availability_time <= simulated execution time; use versioned as-of semantics.",
          "Late corrections require bitemporal records or immutable versions so a backfill does not rewrite history with newly known values.",
          "Validate keys, schema, nulls, volume, freshness, uniqueness, label prevalence, and distribution by source; quarantine failures and preserve dataset manifests and lineage.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Wait for mature labels or train on recent partial labels",
        preferA: "Wait when label correctness dominates and the environment changes slowly.",
        preferB: "Use censoring-aware or positive-unlabeled methods when freshness is critical and assumptions are tested.",
        watch: "Recent examples mislabeled as negatives and evaluation that favors older cohorts.",
      },
      {
        decision: "Random, group, or temporal split",
        preferA: "Use group splits for leakage through repeated entities in a stationary setting.",
        preferB: "Use temporal backtests for future deployment under evolving distributions.",
        watch: "A deployment may require both: group isolation inside chronological folds.",
      },
      {
        decision: "Correct source data or filter suspect rows",
        preferA: "Correct upstream contracts when defects recur or affect serving.",
        preferB: "Filter and annotate rows for a time-bounded recovery when the defect is isolated.",
        watch: "Silent selection bias and training-serving mismatch introduced by filtering only offline.",
      },
    ],
    failureModes: [
      {
        mode: "Post-outcome data leaks into training features",
        symptom: "Offline performance is implausibly high and collapses in shadow traffic.",
        mitigation: "Audit feature availability timestamps, replay rows as of decision time, and block noncompliant lineage.",
      },
      {
        mode: "Immature examples are treated as negatives",
        symptom: "Recent cohorts show lower positive rates and calibration changes with row age.",
        mitigation: "Track label maturity, exclude censored rows, or use a tested delayed-feedback estimator.",
      },
      {
        mode: "Late backfills rewrite historical reality",
        symptom: "The same dataset version produces different values or cannot be reproduced.",
        mitigation: "Use immutable snapshots or bitemporal records with manifests, checksums, and as-of joins.",
      },
    ],
    interviewQuestions: [
      "Exactly when is a negative label mature?",
      "Which timestamp says when a feature became knowable to serving?",
      "How would you test a point-in-time join for leakage?",
      "What selection process determines which examples receive human labels?",
    ],
    decisionChecklist: [
      "Define anchor event, label event, attribution window, and maturity timestamp.",
      "Record event time and availability time for every time-varying feature.",
      "Choose temporal and entity-aware split rules.",
      "Fit every learned transform on training data only.",
      "Version code, source snapshots, label rules, and dataset manifests.",
      "Gate schema, completeness, freshness, uniqueness, prevalence, and lineage.",
    ],
    exercise:
      "Design an as-of joiner for transaction risk examples. Specify keys, event and availability timestamps, late corrections, label maturity, temporal split, lineage manifest, and unit tests that plant deliberate future values.",
    prerequisites: ["ml-problem-framing", "ml-metrics-slices"],
    relatedDesigns: ["ads-ctr", "fraud-detection", "eta-prediction"],
    quiz: [
      {
        prompt: "A feature event occurred before prediction time but reached the online store two hours afterward. May the historical row use it?",
        options: [
          "Yes, because event time is before prediction time.",
          "Yes, if it improves recall.",
          "No, point-in-time correctness also requires it to have been available by the simulated serving time.",
          "No, historical joins may use only daily aggregates.",
        ],
        answerIndex: 2,
        explanation:
          "The training row must reproduce knowable information, so both event time and actual availability time matter.",
      },
      {
        prompt: "Which split best tests a model that retrains monthly and predicts future behavior in a changing market?",
        options: ["Random row split", "Chronological backtest", "Alphabetical entity split", "Duplicate each row across folds"],
        answerIndex: 1,
        explanation:
          "A chronological backtest respects causality and exposes changes between training and future serving periods.",
      },
    ],
    recallCards: [
      { id: "mld-pit", prompt: "Explain what a point-in-time join is and the two timestamps it requires.", answer: "For a training row anchored at decision time t, a point-in-time join attaches only feature values the serving system could actually have known at t. That requires two timestamps per feature event: event time, when the fact became true in the world, and availability time, when it landed in the store and became readable. Joining on event time alone leaks, because a value that occurred before t but only arrived in the pipeline afterwards would not have been available online. Late corrections need bitemporal or immutable versioned records so a backfill cannot rewrite history with knowledge acquired later." },
      { id: "mld-maturity", prompt: "Explain why an unlabeled recent example must not be treated as a negative.", answer: "With an outcome window, a recent example may simply not have had time to convert, charge back, or be reported, so labeling it negative systematically mislabels exactly the freshest data and teaches the model that recent means negative. Record label_status and mature_at, exclude immature rows from training and evaluation, or use censoring-aware or positive-unlabeled methods that model the incomplete observation explicitly. Otherwise offline metrics look fine while the model degrades on precisely the traffic it will serve." },
    ],
  },
  {
    id: "ml-feature-platforms",
    week: 8,
    day: 4,
    tier: 2,
    title: "Design feature platforms with training-serving parity",
    eyebrow: "Week 5 · Day 4",
    estimatedMinutes: 65,
    summary:
      "Unify feature definitions, historical materialization, low-latency serving, freshness, lineage, and backfills without pretending offline and online storage are identical.",
    whyItMatters:
      "Models fail when a feature has different semantics, windows, defaults, or freshness in training and production. A feature platform makes those contracts reproducible and observable.",
    objectives: [
      "Separate feature definitions, offline history, online materialization, metadata, and retrieval.",
      "Guarantee semantic parity through shared transformations and request-time replay tests.",
      "Choose batch, streaming, and request-time computation based on freshness and latency.",
      "Handle backfills, embeddings, cache behavior, defaults, and feature lineage safely.",
    ],
    concepts: [
      "feature view",
      "offline store",
      "online store",
      "materialization",
      "feature freshness",
      "training-serving skew",
      "feature lineage",
      "embedding version",
    ],
    deepDive: [
      {
        title: "A feature contract, not merely a key-value store",
        summary:
          "The platform owns semantic definitions and reproducible reads across time.",
        points: [
          "A feature view declares entity keys, value type, transformation, event-time semantics, window, freshness SLA, default policy, owner, and version.",
          "Offline reads produce point-in-time-correct training matrices; online reads return the latest eligible materialization under a bounded latency budget.",
          "A registry links feature version to source, transformation code, datasets, and models so impact analysis and rollback are possible.",
        ],
      },
      {
        title: "Compute paths and parity",
        summary:
          "Parity means equivalent semantics, not necessarily identical infrastructure.",
        points: [
          "Batch features suit long windows and stable aggregates; streaming features suit continuously changing state; request-time features suit context known only at inference.",
          "Share transformation libraries or compile one declarative definition into batch and streaming plans, then compare online vectors with historical replay samples.",
          "Preserve windows, time zones, null handling, vocabulary, normalization statistics, and feature order in a signed schema bundled with the model.",
        ],
      },
      {
        title: "Freshness, backfills, and resilience",
        summary:
          "Every online read needs an explicit age, version, and degradation policy.",
        points: [
          "Materializers write idempotently by entity, feature version, and effective timestamp; watermarks and freshness metrics expose late pipelines.",
          "Backfills write a new immutable version and are validated before promotion; they must not overwrite values used by an active model without compatibility checks.",
          "Serve bounded-staleness values, documented defaults, or a fallback model on misses; never silently substitute a semantically different feature.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Precompute or calculate at request time",
        preferA: "Precompute expensive aggregates with reusable keys and tolerable staleness.",
        preferB: "Calculate request context when it cannot be known earlier and the latency budget permits.",
        watch: "Hot keys, stale values, duplicated computation, and unavailable dependencies.",
      },
      {
        decision: "Batch or streaming materialization",
        preferA: "Use batch for simple operations, backfills, and hour-scale freshness.",
        preferB: "Use streaming when decisions depend on seconds-to-minutes changes.",
        watch: "Out-of-order events, watermarks, retractions, state cost, and operational complexity.",
      },
      {
        decision: "Fail closed or use stale/default features",
        preferA: "Fail closed when an incorrect decision creates unacceptable harm.",
        preferB: "Degrade to validated defaults or a fallback when continuity is more valuable.",
        watch: "Default-rate shifts that change calibration and hidden dependence on stale values.",
      },
    ],
    failureModes: [
      {
        mode: "Offline and online transformations diverge",
        symptom: "Prediction distributions differ between replay and live requests with identical inputs.",
        mitigation: "Generate both paths from one definition and continuously diff sampled feature vectors.",
      },
      {
        mode: "A feature silently exceeds its freshness SLA",
        symptom: "Feature age and default rate rise before outcome metrics degrade.",
        mitigation: "Attach event timestamps, alert on age by feature, and invoke an explicit fallback policy.",
      },
      {
        mode: "A backfill breaks an active model",
        symptom: "A feature distribution shifts immediately after recomputation despite unchanged traffic.",
        mitigation: "Write versioned backfills, run compatibility gates, shadow consumers, and promote atomically.",
      },
    ],
    interviewQuestions: [
      "What exactly does training-serving parity guarantee?",
      "How does the online path behave when one feature is late or missing?",
      "How can you backfill a year of history without rewriting the inputs of an active model?",
      "Which features truly require streaming rather than frequent micro-batches?",
    ],
    decisionChecklist: [
      "Declare keys, semantics, timestamps, windows, owner, version, and freshness SLA.",
      "Choose batch, stream, and request-time paths per feature.",
      "Guarantee point-in-time offline reads and bounded-latency online reads.",
      "Bundle feature schema and transform versions with each model.",
      "Define missing, stale, hot-key, and dependency failure behavior.",
      "Monitor parity, age, default rate, latency, and materialization lag.",
    ],
    exercise:
      "Design the feature retrieval service for an online ranker: request schema, vector assembly, per-feature deadlines, cache keys, version pinning, stale/default behavior, parity sampling, and a safe backfill promotion protocol.",
    prerequisites: ["ml-data-labels-leakage"],
    relatedDesigns: ["recommendation-feed", "search-ranking", "ads-ctr"],
    quiz: [
      {
        prompt: "What is the strongest definition of training-serving parity?",
        options: [
          "Training and serving use the same database.",
          "Equivalent inputs at the same as-of time produce semantically equivalent feature vectors.",
          "All features are computed in real time.",
          "Online features never expire.",
        ],
        answerIndex: 1,
        explanation:
          "Infrastructure can differ; parity is about equivalent definitions, time semantics, transforms, ordering, and defaults.",
      },
      {
        prompt: "How should a large historical backfill reach an active model?",
        options: [
          "Overwrite online values in place.",
          "Skip validation because source data is trusted.",
          "Write a new version, validate and shadow it, then atomically promote compatible consumers.",
          "Retrain every model automatically before the backfill.",
        ],
        answerIndex: 2,
        explanation:
          "Versioned, gated promotion preserves reproducibility and allows rollback if recomputation changes semantics.",
      },
    ],
    recallCards: [
      { id: "mlfp-skew", prompt: "Define training-serving skew and name its most common causes.", answer: "Training-serving skew is any difference between the feature values a model learned from and the values it receives online, and it degrades production quality while offline metrics stay healthy. Common causes are separate implementations of the same transformation in batch and serving code, different default and null handling, aggregation windows computed over different boundaries, feature freshness differing between the two paths, and training rows built with data unavailable at serve time. The structural fix is a single transformation definition executed by both paths, plus continuous comparison of logged serving values against training values." },
      { id: "mlfp-online-offline", prompt: "Explain the roles of the offline and online feature stores and what must stay consistent.", answer: "The offline store holds full history for building training sets and supports point-in-time correct joins; the online store holds only current values keyed for low-latency lookup at serving. Both must be produced by the same transformation logic from the same source events, and the online value for an entity must be reproducible from the offline history at the same timestamp. Logging the exact feature vector used for each online prediction is what makes this verifiable rather than assumed." },
    ],
  },
  {
    id: "ml-retrieval-ann",
    week: 9,
    day: 1,
    tier: 2,
    title: "Retrieve candidates with two-tower models and ANN indexes",
    eyebrow: "Week 5 · Day 5",
    estimatedMinutes: 75,
    summary:
      "Generate a high-recall, low-latency candidate set with blended sources, learned embeddings, and an ANN index chosen for memory, freshness, and recall constraints.",
    whyItMatters:
      "A ranker cannot recover items that retrieval omitted. Strong ML designs allocate latency and measurement to candidate coverage before debating the final model.",
    objectives: [
      "Design multiple candidate sources with quotas, deduplication, and source attribution.",
      "Train two-tower embeddings using meaningful positives and debiased negative sampling.",
      "Explain graph-based HNSW and partitioned, compressed IVF-PQ search accurately.",
      "Tune recall, latency, memory, index freshness, and cold-start fallbacks.",
    ],
    concepts: [
      "candidate coverage",
      "two-tower model",
      "in-batch negatives",
      "hard-negative mining",
      "HNSW",
      "IVF-PQ",
      "embedding versioning",
      "hybrid retrieval",
    ],
    deepDive: [
      {
        title: "Two-tower retrieval",
        summary:
          "Encode request context and items separately so item vectors can be precomputed and searched.",
        points: [
          "Train query encoder q(x) and item encoder v(i) so observed compatible pairs have high dot product or cosine similarity; retrieve top-k item vectors for the live query.",
          "In-batch negatives are efficient but reflect the batch sampler; add exposed-but-skipped and hard near-neighbor negatives while correcting accidental positives and popularity bias.",
          "Version encoders and embeddings together. During migration, dual-write or rebuild the index and prevent mixed-version similarity comparisons.",
        ],
      },
      {
        title: "HNSW mechanics",
        summary:
          "HNSW is a navigable multi-layer proximity graph with high recall and fast search at a memory cost.",
        points: [
          "Upper sparse layers make long jumps; search descends greedily, then explores a candidate frontier in the dense base layer.",
          "M bounds stored neighbors and primarily raises index memory plus build/search work; efConstruction widens construction search and trades build time for graph quality; efSearch widens query exploration and trades query latency for recall without increasing persistent index memory.",
          "Incremental inserts are practical, but deletions, compaction, filter selectivity, and memory overhead require explicit operations and recall measurement.",
        ],
      },
      {
        title: "IVF-PQ mechanics and source blending",
        summary:
          "IVF narrows search to coarse clusters; product quantization compresses residual vectors for memory-efficient distance estimates.",
        points: [
          "Train coarse centroids, assign each item to an inverted list, probe nprobe nearby lists, and approximate distances with lookup tables over quantized subvectors.",
          "More probes and finer codes improve recall but increase compute or memory; coarse quantizer quality and distribution shift determine which candidates are never visited.",
          "Blend ANN with lexical, trending, subscription, geographic, and rule-based sources using per-source quotas; deduplicate and log source plus retrieval score for evaluation.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "HNSW or IVF-PQ",
        preferA: "Use HNSW for high recall, low query latency, and incremental updates when RAM is available.",
        preferB: "Use IVF-PQ for very large, memory-constrained corpora where compression and batch rebuilds are acceptable.",
        watch: "Filter behavior, delete support, build cost, distribution shift, and recall at the exact latency budget.",
      },
      {
        decision: "Random or hard negatives",
        preferA: "Use random or in-batch negatives for broad coverage and stable early training.",
        preferB: "Use hard negatives to resolve confusing neighbors near the decision boundary.",
        watch: "False negatives, sampler-induced bias, and a train distribution unlike candidate exposure.",
      },
      {
        decision: "One learned retriever or blended sources",
        preferA: "Use one retriever when the corpus and intent are homogeneous and operations must stay simple.",
        preferB: "Blend sources for cold start, exact intent, freshness, and resilience.",
        watch: "Quota tuning, duplicate candidates, score comparability, and missing source attribution.",
      },
    ],
    failureModes: [
      {
        mode: "Retrieval recall is never measured independently",
        symptom: "Ranker changes cannot improve end-to-end quality because relevant items are absent.",
        mitigation: "Track positive coverage and recall@k by source and slice before ranking evaluation.",
      },
      {
        mode: "Query and item embeddings use different model versions",
        symptom: "Similarity distributions and recall collapse during an index migration.",
        mitigation: "Pin compatible encoder-index versions and use dual indexes with gated atomic cutover.",
      },
      {
        mode: "ANN tuning ignores live filters and freshness",
        symptom: "Lab recall is high but filtered live queries return too few or stale items.",
        mitigation: "Benchmark with production filters and update rates; overretrieve, partition, or apply filter-aware indexing.",
      },
    ],
    interviewQuestions: [
      "How will you know whether retrieval or ranking limits product quality?",
      "What do efSearch and nprobe buy, and what do they cost?",
      "How are negatives sampled, and which bias does that create?",
      "How do you migrate to a new embedding space without mixed-version queries?",
    ],
    decisionChecklist: [
      "Set candidate coverage, p95 latency, memory, and freshness targets.",
      "Define positive, negative, and hard-negative sampling.",
      "Compare exact search and ANN on representative filtered traffic.",
      "Tune HNSW or IVF-PQ against recall-latency-memory curves.",
      "Version encoders, embeddings, index shards, and metadata filters.",
      "Blend fallback sources and log source attribution through ranking.",
    ],
    exercise:
      "Design an ANN retrieval component for 500 million items. Provide an HNSW and IVF-PQ option, index build/update paths, sharding, version migration, filter strategy, source blending, and a benchmark harness measuring recall@k, p95 latency, RAM, and freshness.",
    prerequisites: ["ml-feature-platforms"],
    relatedDesigns: ["recommendation-feed", "search-ranking", "personalized-notifications"],
    quiz: [
      {
        prompt: "What does increasing efSearch in HNSW usually do?",
        options: [
          "Explores more candidates, usually increasing recall and latency.",
          "Compresses each vector into fewer bytes.",
          "Retrains the two-tower encoders.",
          "Guarantees exact nearest neighbors at constant cost.",
        ],
        answerIndex: 0,
        explanation:
          "efSearch enlarges the search frontier, improving the chance of finding true neighbors at extra query work.",
      },
      {
        prompt: "What is product quantization doing in IVF-PQ?",
        options: [
          "Replicating every vector across partitions.",
          "Encoding vector subvectors with compact codebook entries for approximate distance lookup.",
          "Building graph edges between all item pairs.",
          "Calibrating retrieval scores as probabilities.",
        ],
        answerIndex: 1,
        explanation:
          "PQ splits vectors into subvectors and stores codebook indices, reducing memory while approximating distances.",
      },
    ],
    recallCards: [
      { id: "mlr-two-stage", prompt: "Explain why retrieval and ranking are separate stages.", answer: "Scoring every candidate with an expensive model is impossible when the corpus is millions of items and the latency budget is tens of milliseconds. Retrieval cheaply reduces the corpus to hundreds or low thousands of plausible candidates, optimizing recall because anything it drops can never be recovered; ranking then applies a costly, feature-rich model to that small set, optimizing precision at the top. The separation lets each stage use the appropriate model class and makes candidate recall a first-class metric distinct from final ranking quality." },
      { id: "mlr-hnsw", prompt: "Describe HNSW's structure and the trade-off its parameters control.", answer: "HNSW builds a multi-layer navigable small-world graph: sparse upper layers provide long-range links for fast coarse navigation, and progressively denser lower layers refine locally, so search descends greedily from an entry point instead of scanning. It gives approximate results with high recall at low latency, and the parameters trade directly - larger construction degree and search breadth raise recall and latency and memory, smaller values lower all three. Its practical costs are memory-resident graph links and awkward incremental deletion, which is usually handled with tombstones and periodic rebuilds." },
    ],
    furtherReading: [
      {
        label: "Malkov and Yashunin: Efficient and Robust Approximate Nearest Neighbor Search Using HNSW",
        url: "https://arxiv.org/abs/1603.09320",
      },
      {
        label: "Jégou, Douze, and Schmid: Product Quantization for Nearest Neighbor Search",
        url: "https://doi.org/10.1109/TPAMI.2010.57",
      },
    ],
  },
  {
    id: "ml-ranking-policy",
    week: 9,
    day: 2,
    tier: 2,
    title: "Rank in stages and enforce product constraints",
    eyebrow: "Week 5 · Day 6",
    estimatedMinutes: 75,
    summary:
      "Turn retrieved candidates into a useful slate through progressively expensive scoring, debiased learning, calibrated objectives, and deterministic policy constraints.",
    whyItMatters:
      "Ranking is both an ML problem and a constrained decision problem. Logged interactions are shaped by the prior ranker, and unconstrained relevance can violate diversity, safety, inventory, or latency needs.",
    objectives: [
      "Allocate candidate counts, model cost, and latency across pre-rank, rank, and re-rank stages.",
      "Choose pointwise, pairwise, or listwise objectives and evaluate top-of-list quality.",
      "Explain exposure and position bias plus limits of inverse-propensity correction.",
      "Apply eligibility, diversity, pacing, and safety constraints without hiding them inside labels.",
    ],
    concepts: [
      "multi-stage ranking",
      "learning to rank",
      "NDCG",
      "position bias",
      "propensity score",
      "counterfactual evaluation",
      "re-ranking",
      "constrained optimization",
    ],
    deepDive: [
      {
        title: "Latency-aware ranking stages",
        summary:
          "Spend compute only as the candidate set shrinks.",
        points: [
          "Pre-rank thousands with cheap features, rank hundreds with richer cross features, and re-rank tens for slate-level constraints; track recall loss after every stage.",
          "Give each stage a deadline and fallback. Cache item features, batch scoring, and shed expensive features before missing the response SLO.",
          "Train stage-aware models on the population they will score; a final ranker trained on random corpus items may not separate hard retrieved candidates.",
        ],
      },
      {
        title: "Objectives and business policy",
        summary:
          "Model relevance and deterministic policy should have explicit ownership.",
        points: [
          "Pointwise losses estimate per-item outcomes, pairwise losses optimize relative order, and listwise losses approximate slate metrics; choose based on labels and serving complexity.",
          "Combine multi-objective scores only after normalizing semantics and studying Pareto tradeoffs; use hard filters for legal or safety eligibility rather than hoping a penalty is sufficient.",
          "Apply diversity, freshness, creator caps, ad pacing, and inventory constraints in a re-ranker, then log both raw model order and policy-adjusted order.",
        ],
      },
      {
        title: "Position bias and counterfactual evidence",
        summary:
          "Clicks reflect relevance, exposure, presentation, and the previous policy.",
        points: [
          "Only exposed items can be clicked, and higher positions attract more attention. Naively treating non-clicks as negatives teaches the model to reproduce prior placement.",
          "Estimate examination propensities with randomized swaps or another defensible exposure experiment; inverse propensity scoring weights outcomes by 1/propensity and needs clipping or self-normalization to control variance.",
          "Counterfactual estimators require overlap: the logging policy must give candidate actions nonzero probability. Hidden deterministic filtering makes some new policies unevaluable offline.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Pointwise, pairwise, or listwise learning",
        preferA: "Use pointwise objectives for simple probabilistic outcomes and scalable training.",
        preferB: "Use pairwise or listwise objectives when relative order or top-heavy slate quality dominates.",
        watch: "Label bias, calibration needs, computational cost, and mismatch between loss and product utility.",
      },
      {
        decision: "Single score or constrained re-ranker",
        preferA: "Use a single score when one objective dominates and constraints are minimal.",
        preferB: "Use a re-ranker when slate diversity, inventory, safety, or pacing has hard interactions.",
        watch: "Opaque manual weights, discontinuities, feasibility, and loss of raw relevance.",
      },
      {
        decision: "Observational logs or randomized exploration",
        preferA: "Use logs for scale when assumptions and propensities are credible.",
        preferB: "Use bounded randomization to identify position effects and new policy value.",
        watch: "User harm, inadequate overlap, high-variance weights, and novelty effects.",
      },
    ],
    failureModes: [
      {
        mode: "Clicks are treated as unbiased relevance labels",
        symptom: "The model reinforces old top positions and rarely surfaces new items.",
        mitigation: "Log exposure and propensities, run safe randomization, and use clipped counterfactual objectives.",
      },
      {
        mode: "Re-ranking silently erases model gains",
        symptom: "Offline raw NDCG improves but final-slate quality and online metrics do not.",
        mitigation: "Evaluate every stage, log policy interventions, and optimize model and constraints jointly against final output.",
      },
      {
        mode: "An expensive feature overruns the ranker budget",
        symptom: "Tail latency spikes and fallback frequency concentrates on large candidate sets.",
        mitigation: "Set stage deadlines, precompute stable features, batch calls, and degrade by a tested feature or model cascade.",
      },
    ],
    interviewQuestions: [
      "Why not run the most accurate model over the whole corpus?",
      "Which constraints belong in eligibility filters versus a re-ranker?",
      "How would you estimate relevance from position-biased clicks?",
      "What overlap assumption does inverse propensity scoring need?",
    ],
    decisionChecklist: [
      "Budget candidate count, compute, and latency per stage.",
      "Measure relevant-item survival after retrieval, pre-rank, and rank.",
      "Match objective and evaluation to ordered-slate utility.",
      "Separate model scores from hard eligibility and slate constraints.",
      "Log exposures, positions, propensities, raw order, and final order.",
      "Define timeout, partial-result, and fallback behavior.",
    ],
    exercise:
      "Design a re-ranking component that accepts 200 scored items and returns 20 under diversity, freshness, creator-cap, and safety rules. Specify objective, constraint solver or greedy policy, latency degradation, policy logging, and a counterfactual evaluation plan.",
    prerequisites: ["ml-retrieval-ann", "ml-metrics-slices"],
    relatedDesigns: ["recommendation-feed", "search-ranking", "ads-ctr"],
    quiz: [
      {
        prompt: "Why is a non-clicked item not automatically a clean negative?",
        options: [
          "It may not have been examined because exposure and position affect clicks.",
          "Clicks are always delayed by a month.",
          "Non-clicks contain no item identifier.",
          "Ranking models cannot consume binary labels.",
        ],
        answerIndex: 0,
        explanation:
          "Observed behavior is conditional on the logging policy and examination; an unseen or poorly placed item may be relevant.",
      },
      {
        prompt: "What is required for offline inverse-propensity evaluation of a new policy?",
        options: [
          "Every action the new policy may choose had nonzero probability under the logging policy.",
          "The logging policy was fully deterministic.",
          "All propensities equal zero.",
          "The new policy uses the same model family.",
        ],
        answerIndex: 0,
        explanation:
          "Support or overlap is essential; actions never exposed by the logger have no outcome evidence to reweight.",
      },
    ],
    recallCards: [
      { id: "mlrp-position-bias", prompt: "Explain position bias and why training naively on click logs degrades a ranker.", answer: "Users click what they are shown, and higher-ranked items receive more clicks regardless of relevance, so click logs reflect the previous ranker's exposure as much as user preference. Training directly on them teaches the model to reproduce the incumbent's ordering and creates a feedback loop that entrenches it, while starving unshown items of the data needed to prove they are good. Corrections include inverse-propensity weighting by estimated exposure, randomized or interleaved exploration slots, and position-aware models that treat rank as a feature at training and neutralize it at inference." },
      { id: "mlrp-objective", prompt: "Describe why a ranker optimizing a single engagement metric is dangerous.", answer: "A single proxy such as click-through rate is optimized literally: the model learns clickbait, sensational content, and short-horizon engagement that harms retention and trust while the target metric improves. Production rankers therefore blend multiple objectives - predicted click, dwell or completion, explicit satisfaction, and negative feedback - with weights set by product judgment, and constrain the result with diversity, freshness, and safety requirements. Guardrail metrics that would detect the failure must be monitored alongside the objective, because the proxy improving is not evidence the product improved." },
    ],
  },
  {
    id: "ml-training-evaluation-registry",
    week: 9,
    day: 3,
    tier: 2,
    title: "Make training reproducible and promotion evidence-based",
    eyebrow: "Week 5 · Day 7",
    estimatedMinutes: 70,
    summary:
      "Build a training control plane that versions data, code, features, configuration, artifacts, evaluation reports, and promotion decisions from experiment to production.",
    whyItMatters:
      "The trained weights are only one dependency. A senior design must reproduce why an artifact exists, prove it passed relevant gates, and roll it back with its compatible schema.",
    objectives: [
      "Choose batch, incremental, or distributed training based on data and freshness requirements.",
      "Capture lineage for datasets, code, configuration, transforms, metrics, and artifacts.",
      "Design evaluation gates with temporal backtests, slices, calibration, and baseline comparisons.",
      "Separate registry state transitions from serving deployment and support champion-challenger workflows.",
    ],
    concepts: [
      "reproducible run",
      "dataset registry",
      "model registry",
      "temporal backtest",
      "validation gate",
      "champion-challenger",
      "artifact lineage",
      "promotion state machine",
    ],
    deepDive: [
      {
        title: "Training orchestration and reproducibility",
        summary:
          "A run is reproducible when inputs and execution identity are immutable and discoverable.",
        points: [
          "Record dataset manifest and snapshot, feature versions, label definition, split policy, code commit, dependency image, random seeds, hyperparameters, and hardware assumptions.",
          "Make stages idempotent and content-address artifacts where practical; retries should not silently select newer source data.",
          "Use incremental training only when replay, optimizer state, and catastrophic-forgetting risks are understood; periodically compare against a clean full retrain.",
        ],
      },
      {
        title: "Evaluation as a promotion contract",
        summary:
          "A candidate passes only if it beats the right baseline without breaking critical slices or operational limits.",
        points: [
          "Run temporal backtests and compare the candidate with the current champion on identical examples using paired uncertainty estimates.",
          "Gate primary metrics, calibration, critical slices, fairness or safety checks, model size, feature availability, latency, and numerical stability.",
          "Store the complete evaluation report and signed decision with the artifact; a single scalar metric is insufficient evidence for promotion.",
        ],
      },
      {
        title: "Registry, deployment, and rollback",
        summary:
          "The registry describes approved artifacts; the serving control plane moves traffic.",
        points: [
          "Use explicit states such as registered, validated, approved, shadow, canary, production, and retired with authorization and audit history.",
          "Bind model artifact, preprocessing graph, feature schema, threshold or policy version, and compatibility requirements into one deployable release.",
          "Keep the champion available while challengers shadow or receive bounded traffic; rollback restores the entire compatible release, not weights alone.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Full batch retraining or incremental updates",
        preferA: "Use full retraining for simple reproducibility and manageable datasets.",
        preferB: "Use incremental updates for very large data or tight freshness targets with strong replay and drift controls.",
        watch: "Optimizer-state dependence, forgotten history, correction handling, and divergent results.",
      },
      {
        decision: "Automatic or human-approved promotion",
        preferA: "Automate low-risk, well-instrumented promotions with mature gates.",
        preferB: "Require review for high-impact decisions, novel data, or ambiguous slice changes.",
        watch: "Rubber-stamp reviews, slow recovery, and gates that optimize only known failures.",
      },
      {
        decision: "One global champion or slice-specific models",
        preferA: "Use one model when operational simplicity and shared data dominate.",
        preferB: "Use specialized models where populations and error costs materially differ.",
        watch: "Routing errors, sparse slice data, duplicated operations, and inconsistent calibration.",
      },
    ],
    failureModes: [
      {
        mode: "A model artifact cannot be reproduced",
        symptom: "A rerun with the recorded configuration yields different data or metrics.",
        mitigation: "Pin immutable data, code, environment, seeds, and transforms in a run manifest.",
      },
      {
        mode: "Promotion gates ignore operational compatibility",
        symptom: "The candidate passes offline metrics but fails on missing features, memory, or latency.",
        mitigation: "Add schema, dependency, shadow-replay, load, and numerical checks to the release gate.",
      },
      {
        mode: "Rollback restores weights but not policy or features",
        symptom: "Performance remains broken after a nominal model rollback.",
        mitigation: "Version and atomically deploy the model, transforms, schema, thresholds, and routing policy as one release.",
      },
    ],
    interviewQuestions: [
      "What information is sufficient to reproduce this training run six months later?",
      "Which gates must a candidate pass beyond an aggregate offline metric?",
      "When would incremental training be riskier than a full retrain?",
      "What exactly changes when you roll a model release back?",
    ],
    decisionChecklist: [
      "Pin data, labels, features, code, environment, seeds, and configuration.",
      "Make training stages retry-safe and artifact lineage queryable.",
      "Backtest chronologically and compare with the champion on paired examples.",
      "Gate critical slices, calibration, safety, compatibility, latency, and size.",
      "Define registry state transitions, approvers, and audit events.",
      "Package model, transforms, schema, policy, and fallback into one release.",
    ],
    exercise:
      "Design a candidate-promotion service: run manifest, artifact keys, evaluation API, paired-comparison report, approval state machine, compatibility checks, challenger routing, and atomic rollback of a complete release.",
    prerequisites: ["ml-data-labels-leakage", "ml-feature-platforms", "ml-metrics-slices"],
    relatedDesigns: ["ads-ctr", "eta-prediction", "credit-risk"],
    quiz: [
      {
        prompt: "Which set is closest to a reproducible model release?",
        options: [
          "Weights and final accuracy only",
          "Weights, immutable data and code identity, transforms, feature schema, configuration, evaluation, and policy version",
          "The latest training table and a model name",
          "A container tag that always points to latest",
        ],
        answerIndex: 1,
        explanation:
          "Reproduction and rollback require immutable identities for all data and execution dependencies plus the decision policy.",
      },
      {
        prompt: "Why compare a challenger and champion on paired evaluation examples?",
        options: [
          "It removes all production risk.",
          "It reduces variance in their performance difference and isolates per-example changes.",
          "It guarantees fairness.",
          "It avoids temporal validation.",
        ],
        answerIndex: 1,
        explanation:
          "Paired comparisons exploit shared examples, yielding a more sensitive and interpretable estimate of the delta.",
      },
    ],
    recallCards: [
      { id: "mltr-reproduce", prompt: "List what must be versioned for a trained model to be reproducible and auditable.", answer: "The training dataset snapshot or its manifest, the feature transformation code and its version, model code, hyperparameters, random seeds, framework and library versions, hardware or precision settings where they affect results, and the resulting metrics with the evaluation set they were computed on. The registry entry ties these together with lineage, so any deployed model can be traced back to exactly the data and code that produced it - which is what makes a regression debuggable and an audit answerable." },
      { id: "mltr-backtest", prompt: "Explain why a temporal backtest is required for a model that will serve future traffic.", answer: "Randomly splitting an evolving system leaks the future into training: the model sees examples from after the evaluation period and learns patterns it could not have known, so offline metrics overstate deployed performance. A temporal split trains on a past window and evaluates on the following one, mirroring deployment, and rolling-origin backtests across several such windows show whether performance is stable or decaying. Where entities repeat, group isolation must be applied inside the chronological folds so the same user does not appear on both sides." },
    ],
  },
  {
    id: "ml-imbalance-calibration-thresholds",
    week: 9,
    day: 4,
    tier: 2,
    title: "Handle imbalance, calibration, and decision thresholds",
    eyebrow: "Week 6 · Day 1",
    estimatedMinutes: 75,
    summary:
      "Train on rare outcomes without corrupting probability semantics, calibrate on representative data, and choose policy thresholds from costs, capacity, and slice constraints.",
    whyItMatters:
      "High-stakes systems consume probabilities as decisions. A model can rank cases correctly yet systematically overstate risk, overwhelm reviewers, or harm a critical cohort.",
    objectives: [
      "Distinguish discrimination, calibration, and thresholded decision quality.",
      "Correct probability interpretation after class-weighting or negative downsampling.",
      "Compare Platt scaling, isotonic regression, and temperature scaling.",
      "Set and monitor global or slice-aware thresholds under cost and capacity constraints.",
    ],
    concepts: [
      "class imbalance",
      "sampling correction",
      "calibration curve",
      "expected calibration error",
      "Brier score",
      "Platt scaling",
      "isotonic regression",
      "decision threshold",
    ],
    deepDive: [
      {
        title: "Rare-event training and evaluation",
        summary:
          "Sampling can improve learning efficiency, but evaluation must represent production prevalence.",
        points: [
          "Downsample abundant negatives or use weighted losses for optimization, while preserving example weights and an untouched validation set with the deployment base rate.",
          "PR-AUC and precision at capacity reveal useful rare-event performance; ROC-AUC alone can hide an intolerable absolute false-positive count.",
          "If training prevalence differs from serving prevalence, raw logits generally do not represent serving probabilities; correct prior shift only when class-conditional distributions are plausibly stable.",
        ],
      },
      {
        title: "Calibration mechanisms",
        summary:
          "A calibrated model assigns probability p to groups that realize the event about p of the time.",
        points: [
          "Reliability diagrams bin predictions and compare mean score with empirical rate; Brier score measures squared probability error, while ECE summarizes bin gaps but depends on binning.",
          "Platt scaling fits a sigmoid over a score; isotonic regression fits a monotone step function and needs more data; temperature scaling rescales multiclass logits without changing class order.",
          "Fit calibration on held-out, representative data after model selection. Recalibrate by slice only with enough support and a defensible operational need.",
        ],
      },
      {
        title: "Thresholds are policy",
        summary:
          "Threshold selection converts probabilities into actions under asymmetric costs and finite capacity.",
        points: [
          "For calibrated binary risk and constant costs, act when expected benefit exceeds expected cost; then simulate review capacity, intervention effects, and abstention.",
          "Choose thresholds on validation data, freeze them into the release, and report precision, recall, workload, expected cost, and critical-slice behavior.",
          "Monitor score distributions and action rates because prevalence or calibration drift can change workload even when ranking AUC is stable.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Resampling or class-weighted loss",
        preferA: "Use resampling for compute efficiency and control of training composition.",
        preferB: "Use class weights to retain examples and encode error emphasis.",
        watch: "Both can distort probability estimates; always evaluate and calibrate on representative prevalence.",
      },
      {
        decision: "Platt scaling or isotonic regression",
        preferA: "Use Platt scaling with limited data and approximately sigmoidal miscalibration.",
        preferB: "Use isotonic regression with ample calibration data and nonparametric monotone distortion.",
        watch: "Overfitting, distribution shift, and calibration sets reused for model selection.",
      },
      {
        decision: "Global or slice-specific thresholds",
        preferA: "Use one threshold for simplicity and consistent score semantics.",
        preferB: "Use slice-aware policies when costs or capacity differ and governance permits.",
        watch: "Sparse slices, fairness implications, routing mistakes, and maintenance complexity.",
      },
    ],
    failureModes: [
      {
        mode: "Downsampled training scores are treated as production probabilities",
        symptom: "Predicted risk greatly exceeds the observed base rate and workload explodes.",
        mitigation: "Evaluate on natural prevalence and apply a validated prior correction or held-out calibration.",
      },
      {
        mode: "A threshold is selected on the test set",
        symptom: "Reported operating-point performance fails to reproduce on new data.",
        mitigation: "Select model, calibrator, and threshold on separate validation data; reserve the test set for final estimation.",
      },
      {
        mode: "Global calibration hides slice miscalibration",
        symptom: "Overall reliability looks good while a critical cohort is consistently over- or under-scored.",
        mitigation: "Report slice reliability with uncertainty and repair data, model, or policy where support is sufficient.",
      },
    ],
    interviewQuestions: [
      "Can a model be well ranked but poorly calibrated?",
      "How does negative downsampling affect probability interpretation?",
      "How would you choose a threshold when reviewers can inspect only 10,000 cases per day?",
      "When is per-slice calibration justified, and what new risk does it create?",
    ],
    decisionChecklist: [
      "Measure serving prevalence and alert or action capacity.",
      "Preserve sampling weights and representative validation data.",
      "Evaluate PR metrics, probability scores, and the operating point.",
      "Fit the calibrator after model selection on held-out data.",
      "Version thresholds with model and policy releases.",
      "Monitor calibration, score distribution, action rate, and workload by slice.",
    ],
    exercise:
      "Design a threshold-policy service for a rare-event model. It should load versioned calibration and thresholds, enforce reviewer capacity, support abstention, expose expected-cost and workload simulations, and alert on slice calibration and action-rate changes.",
    prerequisites: ["ml-metrics-slices", "ml-training-evaluation-registry"],
    relatedDesigns: ["fraud-detection", "credit-risk", "content-moderation"],
    quiz: [
      {
        prompt: "A model has excellent ROC-AUC but predicted 0.8 events occur only 40% of the time. What is true?",
        options: [
          "It is discriminative but miscalibrated.",
          "It is calibrated but cannot rank.",
          "ROC-AUC proves the probabilities are correct.",
          "The threshold must always be 0.5.",
        ],
        answerIndex: 0,
        explanation:
          "Ranking quality and probability calibration are distinct; AUC does not require scores to equal event frequencies.",
      },
      {
        prompt: "Where should a calibrator be fit?",
        options: [
          "On the same rows used to minimize the base model loss",
          "On representative held-out data after model fitting and selection",
          "Only on production positives",
          "On a dataset with unknown sampling and no weights",
        ],
        answerIndex: 1,
        explanation:
          "A separate representative set estimates out-of-sample score-to-probability mapping without fitting to training errors.",
      },
    ],
    recallCards: [
      { id: "mlc-calibration", prompt: "Define calibration, explain how it differs from discrimination, and name the correction methods.", answer: "A model is calibrated when among cases assigned probability p, about p of them actually occur; discrimination is only the ability to rank positives above negatives. The two are independent: a model can rank perfectly while systematically overstating risk, which breaks any downstream decision that compares a probability to a cost threshold or sums expected values. Measure with reliability diagrams, Brier score, and ECE, and correct with Platt scaling for limited data with sigmoidal distortion, isotonic regression for ample data and arbitrary monotone distortion, or temperature scaling for multiclass logits, always fitted on held-out representative data after model selection." },
      { id: "mlc-sampling", prompt: "Explain what downsampling negatives does to predicted probabilities.", answer: "Training on a re-balanced sample changes the base rate the model learns, so its outputs represent the sampled prevalence rather than production prevalence and are systematically inflated. Ranking is largely unaffected, which is why the problem hides behind a healthy AUC. Either keep example weights that restore the original distribution, apply a prior-shift correction to the logits - valid only if class-conditional feature distributions are stable - or recalibrate on an untouched validation set drawn at the true deployment base rate, which is the most reliable option." },
    ],
    furtherReading: [
      {
        label: "Guo et al.: On Calibration of Modern Neural Networks",
        url: "https://proceedings.mlr.press/v70/guo17a.html",
      },
    ],
  },
  {
    id: "ml-delayed-high-stakes",
    week: 9,
    day: 5,
    tier: 2,
    title: "Reason about delayed labels and high-stakes decisions",
    eyebrow: "Week 6 · Day 2",
    estimatedMinutes: 75,
    summary:
      "Operate when ground truth arrives late, is selectively observed, or is changed by intervention, while preserving auditability and safe human escalation.",
    whyItMatters:
      "Fraud, credit, and safety outcomes mature slowly and may be unknowable for rejected cases. Treating missing outcomes as negatives creates biased models and misleading monitoring.",
    objectives: [
      "Model label maturity, right censoring, late corrections, and training cutoffs.",
      "Distinguish delayed feedback from selective labels and intervention effects.",
      "Design safe decision bands, abstention, review queues, and immutable audit records.",
      "Use leading indicators without confusing them with mature outcome evidence.",
    ],
    concepts: [
      "delayed feedback",
      "right censoring",
      "selective labels",
      "survival analysis",
      "positive-unlabeled learning",
      "human review",
      "abstention",
      "decision audit",
    ],
    deepDive: [
      {
        title: "Label maturity and censoring",
        summary:
          "A missing outcome before its observation window closes is unknown, not negative.",
        points: [
          "Store decision_at, outcome_at, mature_at, observed_at, and label_status; train conventional classifiers only on cohorts whose full horizon has elapsed.",
          "When freshness matters, model time-to-event with censoring-aware survival objectives or estimate delayed conversion, then backtest assumptions against eventually mature cohorts.",
          "Late disputes and reversals are versioned label corrections. Never mutate an evaluation snapshot without preserving its prior state and provenance.",
        ],
      },
      {
        title: "Selective labels and interventions",
        summary:
          "The decision policy often determines whether an outcome can be observed.",
        points: [
          "Default is observed for approved loans, not declined applications; fraud loss is altered by blocking; moderator review is concentrated on existing model alerts.",
          "This is not solved by waiting. Use bounded exploration where ethical, randomized review near the boundary, causal assumptions, or partial-identification bounds.",
          "Log propensities, actions, reasons, and downstream interventions so future training can distinguish natural outcome from policy-mediated observation.",
        ],
      },
      {
        title: "High-stakes policy and operations",
        summary:
          "Deploy a decision system with explicit uncertainty, review, reason codes, and recovery.",
        points: [
          "Define auto-allow, review, auto-block or decline bands using calibrated risk, costs, capacity, uncertainty, and legal or safety constraints.",
          "Use deterministic eligibility and policy checks around the model; provide stable reason codes and preserve input, feature, model, threshold, action, and override versions.",
          "Monitor immediate process indicators separately from mature outcomes, with cohort backfills that revise dashboards once labels arrive.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Wait for complete outcomes or use a delay model",
        preferA: "Wait when correctness and auditability dominate freshness.",
        preferB: "Use a validated censoring-aware model when the environment changes faster than labels mature.",
        watch: "Misspecified delay mechanisms and older training cohorts no longer matching current traffic.",
      },
      {
        decision: "Automatic decision or human review",
        preferA: "Automate well-calibrated low-uncertainty regions with clear policy authority.",
        preferB: "Review ambiguous, novel, or high-impact cases when humans add independent evidence.",
        watch: "Reviewer inconsistency, queue delay, automation bias, and labels selected by the model.",
      },
      {
        decision: "Explore for labels or remain conservative",
        preferA: "Explore within approved low-risk bands to reduce selective-label bias.",
        preferB: "Remain conservative when an adverse action is irreversible or exploration is unethical.",
        watch: "Insufficient overlap, hidden harm, and invalid causal extrapolation beyond explored regions.",
      },
    ],
    failureModes: [
      {
        mode: "Unmatured cases are labeled negative",
        symptom: "Recent cohorts look safer and model performance decays as labels backfill.",
        mitigation: "Use maturity cutoffs or a validated censoring-aware objective and recompute cohort metrics.",
      },
      {
        mode: "Selective labels are mistaken for complete truth",
        symptom: "The model becomes confident exactly where prior policy prevented outcome observation.",
        mitigation: "Log policy propensities, audit missingness by action, and obtain bounded randomized or reviewed outcomes where safe.",
      },
      {
        mode: "Human review is treated as a perfect oracle",
        symptom: "Labels vary by reviewer or queue pressure and the model learns reviewer artifacts.",
        mitigation: "Use rubrics, blind overlap, adjudication, quality metrics, and reviewer-aware audits.",
      },
    ],
    interviewQuestions: [
      "When is an absent outcome a negative versus a censored observation?",
      "Why does waiting not solve selective labels in credit decisions?",
      "What should an immutable decision record contain?",
      "How do you monitor a model today if trustworthy labels mature in 90 days?",
    ],
    decisionChecklist: [
      "Define observation horizon, mature_at, censoring, and correction semantics.",
      "Map how policy actions change label availability or the outcome itself.",
      "Separate leading process metrics from mature cohort outcomes.",
      "Create action bands, abstention, review capacity, and fallback rules.",
      "Log model, features, score, uncertainty, policy, action, and overrides.",
      "Plan periodic backfills, retrospective calibration, and governance review.",
    ],
    exercise:
      "Design a label-maturity and audit component for credit decisions. Include accepted and declined cases, 90-day outcomes, selective-label analysis, randomized boundary review constraints, immutable decision snapshots, corrections, and cohort dashboards.",
    prerequisites: ["ml-data-labels-leakage", "ml-imbalance-calibration-thresholds"],
    relatedDesigns: ["fraud-detection", "credit-risk", "content-moderation"],
    quiz: [
      {
        prompt: "Why are declined credit applications a selective-label problem?",
        options: [
          "Their requested amounts are always missing.",
          "The repayment outcome is generally observed only if credit was granted under the prior policy.",
          "All declines are known defaults.",
          "Calibration cannot be applied to scores.",
        ],
        answerIndex: 1,
        explanation:
          "The previous action controls outcome observation, so labeled approved cases are a selected population rather than all applicants.",
      },
      {
        prompt: "What is the correct status for a 30-day-old case whose label requires a 90-day outcome window?",
        options: ["Negative", "Positive", "Censored or immature", "Randomly assigned"],
        answerIndex: 2,
        explanation:
          "The outcome window is incomplete, so absence of an event is not yet evidence of a negative.",
      },
    ],
    recallCards: [
      { id: "mlh-delay", prompt: "Explain how label delay constrains both training and monitoring.", answer: "When the outcome arrives weeks after the decision, the freshest data is unlabeled, so training on mature labels means training on a stale world while training on recent data means training on incomplete outcomes. Monitoring inherits the same gap: true performance cannot be measured until labels mature, so degradation must be detected through leading proxies - score distribution shift, feature drift, action rates, and early-maturing partial outcomes - with the authoritative metric confirmed later. Designs must state the delay explicitly and show which decisions rely on proxies versus confirmed labels." },
      { id: "mlh-recourse", prompt: "Describe the obligations specific to high-stakes automated decisions.", answer: "Decisions affecting credit, employment, or access require an auditable record of the inputs, model version, and reason for each decision; an explanation the affected person can act on; a human review path for contested outcomes; and monitoring for disparate performance across protected groups with predeclared thresholds. Certain features may be legally prohibited, and proxies for them must be tested rather than assumed absent. The system must also support recourse - a person changing their circumstances should be able to change the outcome, which constrains the use of features they cannot influence." },
    ],
  },
  {
    id: "ml-online-experimentation",
    week: 10,
    day: 1,
    tier: 2,
    title: "Run trustworthy online experiments",
    eyebrow: "Week 6 · Day 3",
    estimatedMinutes: 75,
    summary:
      "Design assignment, exposure, power, analysis, and guardrails that identify product impact despite sample-ratio mismatch, interference, novelty, and repeated peeking.",
    whyItMatters:
      "An experiment is a distributed measurement system, not a dashboard toggle. Assignment bugs or cross-unit effects can make precise-looking results causally meaningless.",
    objectives: [
      "Choose the randomization unit and exposure rule from the causal mechanism.",
      "Estimate detectable effects, duration, and guardrails before launch.",
      "Detect sample-ratio mismatch and instrumentation failures early.",
      "Reason about interference, position bias, novelty, and sequential decisions.",
    ],
    concepts: [
      "randomization unit",
      "intention to treat",
      "sample-ratio mismatch",
      "minimum detectable effect",
      "interference",
      "novelty effect",
      "interleaving",
      "sequential testing",
    ],
    deepDive: [
      {
        title: "Assignment and exposure",
        summary:
          "Stable randomization and explicit exposure preserve the estimand.",
        points: [
          "Hash an immutable unit identifier with experiment and salt into mutually exclusive buckets; persist allocation metadata and exclude neither arm based on post-assignment behavior.",
          "Choose user, session, request, seller, or geographic cluster according to carryover and interaction. Analyze at the unit of randomization or use cluster-robust uncertainty.",
          "Log assignment separately from qualified exposure. Intention-to-treat uses all assigned units; triggered analysis is valid only with a pre-treatment trigger applied symmetrically.",
        ],
      },
      {
        title: "Power, metrics, and inference",
        summary:
          "Precommit the hypothesis, primary metric, MDE, duration, and stopping rule.",
        points: [
          "Estimate sample size from baseline variance, alpha, desired power, allocation, clustering, and minimum detectable effect; run through full business cycles.",
          "Use one primary metric plus guardrails and predeclared slices. Variance reduction can improve sensitivity, but features used for adjustment must be pre-treatment.",
          "Repeated peeking inflates false positives under fixed-horizon tests; use a fixed horizon or a valid group-sequential or always-valid procedure.",
        ],
      },
      {
        title: "SRM, interference, and ranking effects",
        summary:
          "Validate the experiment before interpreting uplift.",
        points: [
          "Sample-ratio mismatch compares observed arm counts with expected allocation, commonly through a chi-square test; investigate assignment, eligibility, bots, logging, and missing events rather than correcting the p-value away.",
          "Interference violates independent-unit assumptions when one user's treatment changes another's inventory, price, network, or creator outcomes; randomize clusters or model marketplace-wide effects.",
          "For rankers, interleaving can sensitively compare preferences in one slate, while long experiments reveal novelty, learning, fatigue, and ecosystem effects.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "User or request randomization",
        preferA: "Use user assignment when treatment has memory, learning, or cross-session effects.",
        preferB: "Use request assignment for stateless effects and faster variance reduction.",
        watch: "Cross-arm contamination, cache leakage, and analyzing at the wrong unit.",
      },
      {
        decision: "A/B test or interleaving",
        preferA: "Use A/B tests for absolute product impact and broad guardrails.",
        preferB: "Use interleaving for sensitive head-to-head ranking preference tests.",
        watch: "Attribution assumptions, slate interactions, novelty, and inability to measure all product outcomes.",
      },
      {
        decision: "Fixed horizon or sequential monitoring",
        preferA: "Use fixed horizons for simple valid inference and business-cycle coverage.",
        preferB: "Use preplanned sequential methods when early stopping has material safety or opportunity value.",
        watch: "Uncorrected peeking, optional stopping, and changing metrics after observing results.",
      },
    ],
    failureModes: [
      {
        mode: "Sample-ratio mismatch is ignored",
        symptom: "Arm counts differ significantly from planned allocation before outcome analysis.",
        mitigation: "Stop interpretation, trace assignment and logging by platform and time, and rerun only after root cause is fixed.",
      },
      {
        mode: "The randomization unit permits interference",
        symptom: "Treatment changes shared inventory or network outcomes observed by control units.",
        mitigation: "Cluster-randomize at the interaction boundary or estimate system-level effects with an appropriate design.",
      },
      {
        mode: "The team repeatedly peeks and stops on significance",
        symptom: "Reported wins fail to replicate and experiment durations vary with noisy early effects.",
        mitigation: "Precommit a fixed horizon or use a valid sequential test with explicit spending and stopping rules.",
      },
    ],
    interviewQuestions: [
      "What is the randomization unit, and where can treatment spill into control?",
      "How do assignment, eligibility, and exposure differ?",
      "What does sample-ratio mismatch tell you before any product metric?",
      "How will you separate novelty from persistent value?",
    ],
    decisionChecklist: [
      "State hypothesis, estimand, primary metric, guardrails, MDE, and duration.",
      "Choose a stable assignment unit and map possible interference.",
      "Log assignment, eligibility, exposure, and metric events independently.",
      "Validate balance, SRM, and instrumentation before reading uplift.",
      "Use the correct analysis unit, uncertainty, and multiple-testing plan.",
      "Predeclare stopping, ramp, and post-experiment follow-up.",
    ],
    exercise:
      "Design an experiment assignment and analysis component for a feed ranker. Include deterministic bucketing, namespaces, exposure logging, SRM checks, power inputs, user-level inference, creator-side interference, guardrails, and a valid stopping rule.",
    prerequisites: ["ml-ranking-policy", "ml-metrics-slices"],
    relatedDesigns: ["recommendation-feed", "search-ranking", "personalized-notifications"],
    quiz: [
      {
        prompt: "An experiment planned 50/50 has 520,000 treatment and 480,000 control assignments. What should happen first?",
        options: [
          "Interpret conversion lift.",
          "Reweight the smaller arm and continue.",
          "Run an SRM test and investigate assignment or logging before outcome analysis.",
          "Delete enough treatment rows to balance counts.",
        ],
        answerIndex: 2,
        explanation:
          "A large allocation discrepancy can signal broken randomization or measurement; causal interpretation should pause until explained.",
      },
      {
        prompt: "Why might seller-level randomization be better than buyer-level randomization for a marketplace ranking change?",
        options: [
          "It always needs fewer samples.",
          "Treatment may alter shared seller inventory or outcomes, causing interference across buyers.",
          "It removes novelty effects.",
          "It guarantees equal revenue.",
        ],
        answerIndex: 1,
        explanation:
          "Cluster assignment can contain spillovers when treated demand changes a shared supplier's state seen by control buyers.",
      },
    ],
    recallCards: [
      { id: "mle-srm", prompt: "Define sample-ratio mismatch, explain why it invalidates a result, and how to respond.", answer: "SRM is a statistically significant deviation between observed arm sizes and the intended allocation, tested with a chi-square against expected proportions. It matters because a mismatch means assignment or logging is broken, so the arms differ by more than the treatment and any measured lift is confounded regardless of how significant it looks. The response is to invalidate and investigate - assignment hashing, eligibility filters, bot filtering, redirect losses, differential logging - never to adjust the analysis to compensate, because the defect is in who entered the experiment, not in the arithmetic." },
      { id: "mle-interference", prompt: "Explain interference and when user-level randomization stops being valid.", answer: "Standard analysis assumes one unit's treatment does not affect another's outcome. That breaks in marketplaces where treated buyers consume inventory that control buyers then cannot buy, in social products where treated users change what their untreated friends see, and wherever a shared budget, price, or model is affected. The result is bias that can point either direction and does not shrink with sample size. Mitigate by randomizing at the level of the interference - clusters, geographies, or entire markets - accepting far lower power, or by modeling the equilibrium effect directly." },
    ],
  },
  {
    id: "ml-safe-deployment",
    week: 10,
    day: 2,
    tier: 2,
    title: "Deploy through shadow, canary, and rollback stages",
    eyebrow: "Week 6 · Day 4",
    estimatedMinutes: 65,
    summary:
      "Promote a complete model release through replay, shadow, canary, and ramp stages with compatibility checks, capacity protection, and automatic rollback.",
    whyItMatters:
      "Offline success cannot reveal live feature skew, dependency failures, latency tails, or action-side harm. Progressive delivery limits blast radius while producing production evidence.",
    objectives: [
      "Explain what shadow traffic can and cannot validate.",
      "Design canary routing, guardrail gates, bake windows, and automatic rollback.",
      "Version the model, features, calibration, thresholds, and policy as a release.",
      "Protect serving with fallbacks, load testing, autoscaling, and kill switches.",
    ],
    concepts: [
      "shadow deployment",
      "canary rollout",
      "traffic ramp",
      "release manifest",
      "rollback",
      "fallback model",
      "load shedding",
      "kill switch",
    ],
    deepDive: [
      {
        title: "Shadow evaluation",
        summary:
          "A shadow receives copied requests but does not determine the user-visible action.",
        points: [
          "Mirror representative requests asynchronously, pin both release identities, and compare feature availability, prediction distributions, disagreement, latency, errors, and resource use.",
          "Shadowing validates execution and observational deltas but cannot measure treatment outcomes because users still experience the champion's action.",
          "Prevent shadow side effects: disable writes, notifications, charges, queue mutations, and feedback events; isolate capacity so shadows cannot harm production.",
        ],
      },
      {
        title: "Canary and controlled ramp",
        summary:
          "A canary exposes a small stable cohort to the new decision and expands only after evidence and bake time.",
        points: [
          "Route by deterministic user or entity hash where carryover matters; begin with internal or low-risk cohorts, then ramp 1%, 5%, 25%, 50%, and 100% only as gates pass.",
          "Gate errors, p95 and p99 latency, feature misses, score and action rates, immediate safety signals, business guardrails, and capacity headroom.",
          "Use minimum sample and bake windows. Fast operational metrics can stop a release early, while delayed product outcomes may require holding at a safe percentage.",
        ],
      },
      {
        title: "Rollback as a designed path",
        summary:
          "Rollback must restore a known-compatible release quickly and predictably.",
        points: [
          "Keep the previous artifact, feature schema, calibrator, threshold, routing rule, and dependency configuration warm and addressable.",
          "Automate rollback on hard guardrails with hysteresis to avoid flapping; retain a manual kill switch and audit who invoked it.",
          "Forward-only data writes may make binary rollback unsafe, so use backward-compatible schemas, dual reads, or isolate model decisions from irreversible side effects.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Shadow or immediate small canary",
        preferA: "Shadow first for new dependencies, expensive models, or uncertain parity.",
        preferB: "Canary when only treatment outcomes can answer the remaining question and blast radius is bounded.",
        watch: "Shadow capacity, side effects, canary harm, and insufficient samples.",
      },
      {
        decision: "Fast ramp or long bake",
        preferA: "Ramp quickly for low-risk, well-understood changes with strong leading metrics.",
        preferB: "Bake longer for delayed outcomes, rare harms, or traffic cycles.",
        watch: "Opportunity cost versus hidden weekly, regional, or cohort effects.",
      },
      {
        decision: "Automatic or manual rollback",
        preferA: "Automate clear operational and safety thresholds that demand fast response.",
        preferB: "Use human review for noisy, delayed, or multi-metric product tradeoffs.",
        watch: "Alert flapping, stale telemetry, permission bottlenecks, and irreversible actions.",
      },
    ],
    failureModes: [
      {
        mode: "Shadow code performs production side effects",
        symptom: "Duplicate writes, notifications, or feedback events appear during validation.",
        mitigation: "Enforce read-only shadow credentials, side-effect stubs, isolated queues, and end-to-end side-effect tests.",
      },
      {
        mode: "Canary cohorts are not stable or representative",
        symptom: "Users switch releases across requests or only one platform is evaluated.",
        mitigation: "Hash stable entities, stratify rollout, and report assignment and traffic composition by slice.",
      },
      {
        mode: "Rollback is incompatible with current features or schemas",
        symptom: "The previous model fails immediately after traffic returns.",
        mitigation: "Retain warm compatible release bundles and test rollback during every staged deployment.",
      },
    ],
    interviewQuestions: [
      "What can shadow traffic prove, and which questions require a canary?",
      "Which metrics trigger automatic rollback versus a human decision?",
      "How do you prevent a shadow from emitting side effects?",
      "What dependencies must roll back with the model weights?",
    ],
    decisionChecklist: [
      "Package model, transforms, feature schema, calibration, threshold, and policy.",
      "Replay and load-test representative traffic before live exposure.",
      "Run side-effect-free shadow comparisons with isolated capacity.",
      "Use stable canary assignment, ramp gates, and minimum bake windows.",
      "Keep fallback and previous compatible release warm.",
      "Test automatic rollback, manual kill switch, and audit trail.",
    ],
    exercise:
      "Design a rollout controller with shadow mirroring, release manifests, deterministic canary routing, metric gates, bake timers, capacity budgets, automatic rollback with hysteresis, and a manual kill switch. Include a rollback drill.",
    prerequisites: ["ml-training-evaluation-registry", "ml-online-experimentation"],
    relatedDesigns: ["ads-ctr", "fraud-detection", "eta-prediction"],
    quiz: [
      {
        prompt: "Which claim can a shadow deployment support?",
        options: [
          "The new policy causally improves retention.",
          "The candidate meets live feature, latency, prediction, and capacity expectations without controlling user actions.",
          "Users prefer the new ranking.",
          "The treatment has no marketplace interference.",
        ],
        answerIndex: 1,
        explanation:
          "A shadow validates live execution and observational comparisons; it does not deliver treatment, so it cannot estimate causal product effects.",
      },
      {
        prompt: "What should a robust rollback restore?",
        options: [
          "Only the weight file",
          "Only the decision threshold",
          "A known-compatible model, transforms, feature schema, calibration, threshold, and routing policy",
          "The oldest available container",
        ],
        answerIndex: 2,
        explanation:
          "The serving contract spans the complete release, and partial rollback can preserve the incompatibility that caused failure.",
      },
    ],
    recallCards: [
      { id: "mls-shadow", prompt: "Distinguish shadow, canary, and interleaving, and state what each can and cannot tell you.", answer: "Shadow mode runs the new model on live traffic without serving its output, validating infrastructure, latency, and score distribution with zero user risk - but it cannot measure user response because nobody sees the results. Canary serves a small traffic fraction, exposing real user impact and enabling fast rollback while limiting blast radius. Interleaving mixes results from two rankers within a single slate, giving a highly sensitive within-user preference comparison for ranking quality, though it cannot measure whole-product outcomes. A safe rollout usually uses all three in that order." },
      { id: "mls-rollback", prompt: "Explain what makes a model rollback different from a code rollback.", answer: "Reverting the serving binary does not necessarily restore prior behavior, because the model artifact, the feature definitions it expects, and any state the model has already influenced are separate. A rollback must restore a pinned model version together with the compatible feature transformation version, and the deployment system needs both to be immutable and jointly versioned. Feedback effects complicate it further: a bad ranker changes what users saw and clicked, so the logs now contain its influence, and simply reverting the model does not undo the contaminated training data." },
    ],
  },
  {
    id: "ml-drift-feedback-monitoring",
    week: 10,
    day: 3,
    tier: 2,
    title: "Monitor drift, feedback loops, and model health",
    eyebrow: "Week 6 · Day 5",
    estimatedMinutes: 80,
    summary:
      "Observe data, features, predictions, decisions, outcomes, slices, latency, and cost while distinguishing drift signals from evidence that retraining will improve the system.",
    whyItMatters:
      "Production ML changes the data it later learns from. Without lineage-aware monitoring, teams either miss real degradation or automatically retrain on a corrupted feedback loop.",
    objectives: [
      "Distinguish data drift, concept drift, calibration drift, skew, and data-quality failure.",
      "Design monitoring for immediate signals and delayed mature outcomes.",
      "Explain exposure, selection, and self-reinforcing feedback loops.",
      "Create a gated retraining and rollback process instead of drift-triggered automation.",
    ],
    concepts: [
      "covariate drift",
      "concept drift",
      "calibration drift",
      "population stability index",
      "feedback loop",
      "delayed ground truth",
      "slice degradation",
      "model observability",
    ],
    deepDive: [
      {
        title: "A layered monitoring model",
        summary:
          "Monitor the chain from source data to user outcome with release and slice dimensions.",
        points: [
          "Data layer: schema, volume, nulls, ranges, categorical novelty, event lag, feature age, online/offline parity, and training-serving distribution distance.",
          "Serving layer: request rate, errors, timeouts, p50/p95/p99 latency, cache hits, default rates, resource saturation, model version, score distribution, action rate, and fallback rate.",
          "Outcome layer: mature precision, recall, calibration, utility, safety and fairness guardrails by cohort, decision date, and release with uncertainty and label coverage.",
        ],
      },
      {
        title: "Drift diagnosis, not drift theater",
        summary:
          "Distribution change is a clue; degradation requires labels or a defensible task-specific proxy.",
        points: [
          "Covariate drift means P(X) changes; concept drift means P(Y|X) changes; prior shift means P(Y) changes. They imply different repairs and can occur independently.",
          "Use PSI, KS, Jensen-Shannon divergence, missingness, or embedding summaries as diagnostics with reference windows and slice context, not universal retrain thresholds.",
          "When labels mature late, monitor leading process signals now and backfill outcome dashboards by prediction cohort; compare the same maturity age across releases.",
        ],
      },
      {
        title: "Feedback loops and safe adaptation",
        summary:
          "Predictions influence exposure, labels, and future training data.",
        points: [
          "A recommender exposes popular items, collects more interactions for them, then treats exposure-driven clicks as relevance; a fraud model blocks cases whose natural outcomes can no longer be observed.",
          "Log candidate sets, exposures, propensities, actions, review selection, and overrides; retain bounded exploration, unbiased holdouts, or randomized audits where safe.",
          "On drift: validate data, wait for or acquire labels, train a candidate, run temporal and slice gates, shadow or canary, then promote or roll back. Never retrain solely because a distance alarm fired.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Sensitive drift alerts or stable actionable alerts",
        preferA: "Use sensitive diagnostics for investigation and high-harm features.",
        preferB: "Alert only on sustained, material changes tied to an owner and playbook.",
        watch: "Seasonality, correlated features, alert fatigue, and thresholds without outcome relevance.",
      },
      {
        decision: "Automatic retraining or gated candidate generation",
        preferA: "Automate candidate training when pipelines are mature and reversible.",
        preferB: "Require outcome and deployment gates before promotion, especially for high-stakes systems.",
        watch: "Training on corrupted data, amplifying feedback, and promoting before labels mature.",
      },
      {
        decision: "Explore or exploit",
        preferA: "Exploit when the current policy is reliable and harm from weak actions is high.",
        preferB: "Reserve bounded exploration to learn about underexposed actions and detect loop degeneracy.",
        watch: "User cost, overlap, exploration bias, and whether exploration is ethically permissible.",
      },
    ],
    failureModes: [
      {
        mode: "Any feature drift automatically triggers retraining and promotion",
        symptom: "Model versions churn after benign seasonality or corrupted input changes.",
        mitigation: "Treat drift as triage, validate data and labeled performance, and require offline plus staged deployment gates.",
      },
      {
        mode: "Only aggregate outcome metrics are monitored",
        symptom: "A severe cohort regression is diluted by stable high-volume traffic.",
        mitigation: "Monitor predeclared critical slices with support, uncertainty, maturity, and release dimensions.",
      },
      {
        mode: "The policy trains only on its own exposed outcomes",
        symptom: "Diversity and discovery shrink while offline replay appears to improve.",
        mitigation: "Log exposure propensities and preserve safe exploration or an unbiased evaluation holdout.",
      },
    ],
    interviewQuestions: [
      "How do covariate drift and concept drift differ operationally?",
      "Why is drift alone insufficient reason to retrain?",
      "Which signals are available before labels mature?",
      "How does the model's own policy alter its future training distribution?",
    ],
    decisionChecklist: [
      "Map source, feature, serving, decision, and outcome telemetry with owners.",
      "Dimension dashboards by release, slice, region, and prediction cohort.",
      "Set reference windows that account for seasonality and label maturity.",
      "Monitor exposure, propensities, actions, review selection, and overrides.",
      "Attach every alert to a diagnostic and rollback playbook.",
      "Require labeled evaluation and staged gates before promotion of a retrained model.",
    ],
    exercise:
      "Design a monitoring control plane that joins prediction logs to delayed outcomes, computes data and calibration drift by release and slice, detects feature freshness and fallback changes, audits exposure feedback, and opens—but does not automatically promote—a retraining candidate.",
    prerequisites: ["ml-delayed-high-stakes", "ml-safe-deployment"],
    relatedDesigns: ["recommendation-feed", "fraud-detection", "personalized-notifications"],
    quiz: [
      {
        prompt: "A feature distribution shifts sharply but mature model performance is unchanged. What is the best response?",
        options: [
          "Automatically promote a retrained model.",
          "Delete the feature immediately.",
          "Investigate data quality and causes, continue outcome monitoring, and retrain only through normal evidence gates.",
          "Ignore all future drift alerts.",
        ],
        answerIndex: 2,
        explanation:
          "Drift is diagnostic evidence, not proof of degradation or proof that retraining will help.",
      },
      {
        prompt: "Which example is concept drift?",
        options: [
          "The device mix changes but behavior conditional on features stays constant.",
          "For the same observed features, the probability of fraud changes after a new attack pattern.",
          "A feature column becomes null due to a pipeline outage.",
          "The model server's p99 latency increases.",
        ],
        answerIndex: 1,
        explanation:
          "Concept drift is a change in the conditional relationship P(Y|X), here caused by changed attacker behavior.",
      },
    ],
    recallCards: [
      { id: "mldm-drift-types", prompt: "Distinguish covariate shift, label shift, and concept drift, and say which is most dangerous.", answer: "Covariate shift means the input distribution changed while the input-to-output relationship held; label shift means the outcome base rate moved; concept drift means the relationship itself changed, so the same input now implies a different outcome. Concept drift is the most dangerous because input monitoring cannot see it - features look entirely normal while the model is increasingly wrong - and it can only be detected once labels arrive or through a leading proxy. This is why monitoring must cover inputs, predictions, and outcomes rather than inputs alone." },
      { id: "mldm-feedback", prompt: "Explain how a deployed model contaminates its own future training data.", answer: "The model's decisions determine what is observed: a fraud model that blocks a transaction never learns whether it would have been fraudulent, and a ranker only generates engagement data for items it chose to show. Training naively on these logs reinforces the model's existing beliefs and starves alternatives of evidence, so measured performance improves while true performance stagnates or declines. Breaking the loop requires deliberate exploration - a randomized holdout that bypasses the model, or logged propensities enabling inverse-propensity weighting - accepted as a standing cost of keeping the system honest." },
    ],
  },
];

export const mlPrompts: DesignPrompt[] = [
  {
    id: "recommendation-feed",
    title: "Recommendation feed",
    category: "ml",
    difficulty: "hard",
    durationMinutes: 55,
    prompt:
      "Design a personalized home feed that selects and orders items from a large, frequently changing corpus. Optimize long-term user value under freshness, diversity, safety, creator, latency, and cost constraints.",
    requirementsToExplore: [
      "Clarify feed surface, eligible content, request context, freshness target, and 200 ms p95 budget.",
      "Define short- and long-term objectives plus complaint, hide, diversity, and creator-exposure guardrails.",
      "Specify impression, position, dwell, action, and negative-feedback instrumentation.",
      "Handle new users, new items, sparse interests, and users with multiple intents.",
      "Design blended retrieval, multi-stage ranking, slate constraints, and deterministic fallbacks.",
      "Address position bias, feedback loops, experiment interference, and delayed satisfaction.",
      "Plan training cadence, embedding/index migration, progressive rollout, and rollback.",
    ],
    expectedTopics: [
      "two-tower retrieval",
      "HNSW or IVF-PQ",
      "multi-task ranking",
      "position debiasing",
      "diversity re-ranking",
      "feature freshness",
      "A/B testing",
      "feedback-loop monitoring",
    ],
    commonFailureModes: [
      "Optimizing clicks without negative-feedback or long-term guardrails.",
      "Discussing only the ranker while omitting candidate coverage.",
      "Treating unexposed items as negative examples.",
      "Mixing incompatible embedding and ANN index versions.",
      "Allowing re-ranking constraints to operate without attribution or evaluation.",
    ],
    followUpQuestions: [
      "How would the system recover if personalized features are unavailable?",
      "How do you estimate position propensities safely?",
      "What changes when the corpus grows from 10 million to 1 billion items?",
      "How do you detect popularity feedback-loop collapse?",
      "How do creator-side effects alter experiment randomization?",
    ],
    reference: {
      diagram: {
        caption: "Cheap retrieval bounds the candidate set before an expensive ranker scores it; the same feature transformation serves training and inference so the two cannot drift apart.",
        nodes: [
          { id: "user", label: "User", kind: "client", col: 0, row: 1 },
          { id: "api", label: "Feed API", kind: "service", col: 1, row: 1 },
          { id: "retr", label: "Candidate retrieval (ANN)", kind: "compute", col: 2, row: 1 },
          { id: "emb", label: "Embedding index", kind: "store", col: 2, row: 0 },
          { id: "rank", label: "Ranking model", kind: "compute", col: 3, row: 1 },
          { id: "feat", label: "Online feature store", kind: "store", col: 3, row: 0 },
          { id: "policy", label: "Diversity & policy filter", kind: "compute", col: 4, row: 1 },
          { id: "logs", label: "Exposure + label logs", kind: "stream", col: 4, row: 2 },
          { id: "train", label: "Training pipeline", kind: "compute", col: 3, row: 3 },
          { id: "offline", label: "Offline feature store", kind: "store", col: 2, row: 3 },
        ],
        edges: [
          { from: "user", to: "api", label: "GET /feed" },
          { from: "api", to: "retr", label: "user context" },
          { from: "retr", to: "emb", label: "nearest items" },
          { from: "retr", to: "rank", label: "candidates" },
          { from: "rank", to: "feat", label: "PIT features" },
          { from: "rank", to: "policy", label: "scores" },
          { from: "policy", to: "user", label: "slate" },
          { from: "policy", to: "logs", label: "impressions", async: true },
          { from: "logs", to: "offline", label: "join labels", async: true },
          { from: "offline", to: "train", label: "datasets", async: true },
          { from: "train", to: "rank", label: "new model", async: true },
        ],
      },
      scope: [
        "Unit: one eligible user-request-item decision; horizon: session actions plus longer-term return behavior.",
        "Objective: expected satisfaction utility, not raw click probability; constraints cover safety, blocks, freshness, diversity, and creator caps.",
        "SLO: p95 under 200 ms with a deterministic followed/trending fallback and no duplicate items in a page.",
        "Privacy: pseudonymous entity keys, purpose-limited events, retention bounds, and deletion propagated to features and training sets.",
      ],
      apis: [
        "GET /v1/feed?cursor&limit -> items, next_cursor, feed_release_id",
        "POST /v1/events -> impression_id, item_id, position, action, event_time",
        "POST /v1/feedback -> impression_id, feedback_type, event_time",
        "POST /internal/rank -> request_context, candidate_refs -> scored slate and policy reasons",
      ],
      dataModel: [
        "[Data] Impression(impression_id, pseudonymous_user_key, item_id, request_id, position, source, score_versions, shown_at).",
        "[Labels] Outcome(impression_id, action_type, value, occurred_at, mature_at) with explicit positive and negative windows.",
        "[Features] UserFeature and ItemFeature keyed by entity, feature_version, effective_at, available_at, values.",
        "[Training] DatasetManifest(snapshot_ids, label_rule, feature_views, temporal_split, code_version) and ModelRelease.",
        "[Serving] Candidate(item_id, source, retrieval_score, embedding_version) and SlateDecision(raw_rank, final_rank, policy_reasons).",
      ],
      architecture: [
        "[Data] Event collector validates impression and feedback schemas, deduplicates event IDs, and publishes immutable events.",
        "[Labels] Session and delayed-return jobs create mature labels while retaining exposure and position propensity.",
        "[Features] Batch and stream materializers produce point-in-time user, item, context, and recent-interaction features.",
        "[Training] Two-tower retrieval and multi-task ranker train on chronological snapshots with sampled and hard negatives.",
        "[Evaluation] Gates cover retrieval recall@k, NDCG, calibration, cold-start and safety slices, latency, and final-slate policy.",
        "[Serving] Blended sources feed ANN retrieval, cheap pre-rank, richer ranker, and a constraint-aware re-ranker.",
        "[Policy] Eligibility and safety filter precedes scoring; diversity, freshness, and creator caps operate on the final slate.",
        "[Deployment] Versioned embedding indexes and release bundles progress through shadow, stable canary, experiment, and rollback.",
      ],
      invariants: [
        "Every displayed item was eligible at decision time and appears at most once in the page.",
        "Every interaction label links to a logged impression, position, source, and release.",
        "Query encoder, item embeddings, and ANN index use a compatible embedding version.",
        "Historical features contain no event or update unavailable at the original request time.",
        "Fallback output enforces the same safety and eligibility policy as personalized output.",
      ],
      deepDives: [
        {
          title: "Data, labels, and features",
          summary: "Preserve exposure context so behavioral labels are interpretable.",
          points: [
            "Log candidate source, impression, exact position, raw and final ranks, and negative feedback; use dwell carefully because it is presentation-dependent.",
            "Build short-term action labels and delayed satisfaction proxies separately; define mature negatives and exclude censored sessions.",
            "Use recent sequence, affinity, item quality, freshness, and request-context features with point-in-time joins and bounded online age.",
          ],
        },
        {
          title: "Training and evaluation",
          summary: "Measure retrieval coverage and final-slate utility independently.",
          points: [
            "Train two towers with exposed, random, and hard negatives; correct sampler and position effects where assumptions permit.",
            "Train the ranker on retrieved candidates with multi-task outcomes, then validate calibration and NDCG by cold-start and long-tail slices.",
            "Replay every stage and evaluate final policy output; launch only through a powered user-level experiment with creator guardrails.",
          ],
        },
        {
          title: "Serving and feedback control",
          summary: "Use a latency-budgeted cascade with observability at each decision boundary.",
          points: [
            "Overretrieve from learned, followed, lexical, trending, and exploration sources; deduplicate with source attribution.",
            "Deadline feature fetch and stages independently; fall back from rich ranker to light ranker and then eligible non-personalized feed.",
            "Reserve bounded exploration and monitor exposure concentration, novelty, action propensity, and unseen-corpus coverage.",
          ],
        },
      ],
      scaling: [
        "Shard ANN indexes by embedding version and optionally locale or corpus partition; replicate hot partitions.",
        "Precompute item embeddings and stable features; batch ranker scoring and cache immutable item features.",
        "Use cursor pagination tied to a feed-session snapshot to avoid duplicates and unstable offsets.",
        "Bound each candidate source and ranking stage with deadlines, quotas, and partial-result behavior.",
        "Stream new-item updates into a delta index and compact into periodic immutable base indexes.",
        "Autoscale feature and scoring services on request concurrency while reserving capacity for fallbacks.",
      ],
      observability: [
        "Candidate recall and contribution by source, stage survival, duplicate rate, and empty-feed rate.",
        "Feature age, default rate, parity diffs, ANN recall probes, and embedding-version mismatches.",
        "Ranker score and action distributions, calibration, NDCG, and outcomes by release and key slice.",
        "p50/p95/p99 latency per stage, timeouts, fallback rate, cache hit rate, and cost per feed.",
        "Safety violations, hides, complaints, diversity, novelty, and creator exposure concentration.",
        "Experiment SRM, cross-arm contamination, mature retention effects, and feedback-loop indicators.",
      ],
    },
  },
  {
    id: "search-ranking",
    title: "Search ranking",
    category: "ml",
    difficulty: "hard",
    durationMinutes: 55,
    prompt:
      "Design a search ranking system for a large changing corpus. Support lexical and semantic intent, filters, typo tolerance, freshness, and a sub-250 ms p95 while learning from biased interaction logs.",
    requirementsToExplore: [
      "Define query classes, document eligibility, filters, locales, freshness, and latency targets.",
      "Choose relevance labels from judgments and interactions with position and presentation context.",
      "Blend lexical, ANN, and rule-based retrieval without losing exact or rare-term matches.",
      "Design pre-rank, learning-to-rank, and re-rank stages with timeout behavior.",
      "Evaluate recall@k, NDCG, MRR, zero-result rate, calibration, and critical query slices.",
      "Handle query and document cold start, spam or unsafe content, and index freshness.",
      "Compare rankers through interleaving and longer A/B tests.",
    ],
    expectedTopics: [
      "inverted index",
      "semantic retrieval",
      "hybrid candidate fusion",
      "learning to rank",
      "position bias",
      "NDCG and MRR",
      "query slicing",
      "index versioning",
    ],
    commonFailureModes: [
      "Replacing exact lexical retrieval with embeddings for every query.",
      "Using clicks as relevance without exposure or position correction.",
      "Training the final ranker on easy random corpus negatives.",
      "Reporting only aggregate NDCG and missing head, tail, or zero-result queries.",
      "Cutting over to a partially built or incompatible index.",
    ],
    followUpQuestions: [
      "How do quoted phrases and exact identifiers interact with semantic retrieval?",
      "How would you estimate relevance for never-exposed documents?",
      "What happens when one retrieval source times out?",
      "How do you deploy a new tokenizer and index safely?",
      "When would interleaving be preferable to an A/B test?",
    ],
    reference: {
      diagram: {
        caption: "Lexical and semantic retrieval are unioned before a cross-encoder reranks a small set; click logs feed back only with exposure propensities to avoid entrenching the incumbent ranker.",
        nodes: [
          { id: "user", label: "User", kind: "client", col: 0, row: 1 },
          { id: "qs", label: "Query service", kind: "service", col: 1, row: 1 },
          { id: "qu", label: "Query understanding", kind: "compute", col: 2, row: 0 },
          { id: "inv", label: "Inverted index", kind: "store", col: 3, row: 0 },
          { id: "ann", label: "Vector index", kind: "store", col: 3, row: 1 },
          { id: "fuse", label: "Candidate fusion", kind: "compute", col: 4, row: 1 },
          { id: "rerank", label: "Cross-encoder rerank", kind: "compute", col: 4, row: 0 },
          { id: "clicks", label: "Click + propensity log", kind: "stream", col: 4, row: 2 },
          { id: "train", label: "Ranker training", kind: "compute", col: 3, row: 2 },
        ],
        edges: [
          { from: "user", to: "qs", label: "query" },
          { from: "qs", to: "qu", label: "normalize" },
          { from: "qu", to: "inv", label: "terms" },
          { from: "qu", to: "ann", label: "embedding" },
          { from: "inv", to: "fuse", label: "postings" },
          { from: "ann", to: "fuse", label: "neighbours" },
          { from: "fuse", to: "rerank", label: "top-k" },
          { from: "rerank", to: "user", label: "results" },
          { from: "rerank", to: "clicks", label: "logged", async: true },
          { from: "clicks", to: "train", label: "IPW labels", async: true },
          { from: "train", to: "rerank", label: "model", async: true },
        ],
      },
      scope: [
        "Unit: query-session-document with locale, filters, and decision time; objective: task success under relevance and latency constraints.",
        "Support navigational, informational, exact-identifier, fresh-event, and long-tail query slices.",
        "SLO: p95 under 250 ms; graceful partial results and a stable previous-index fallback.",
        "Safety and eligibility are hard filters; sponsored placement, if present, remains a separately labeled policy surface.",
      ],
      apis: [
        "GET /v1/search?q&filters&cursor&limit -> results, facets, query_id, release_id",
        "POST /v1/search/events -> query_id, result_id, position, action, event_time",
        "POST /internal/retrieve -> normalized_query, filters, source_budgets -> candidates",
        "POST /internal/rank -> query_context, candidates -> raw_scores, final_order, reasons",
      ],
      dataModel: [
        "[Data] QueryEvent(query_id, normalized_terms, locale, filters, issued_at, result_set_version).",
        "[Labels] RelevanceJudgment(query_id, document_id, grade, source, judged_at) and Interaction with examination context.",
        "[Features] Query, document, and query-document features with effective_at, available_at, and tokenizer or embedding version.",
        "[Training] TrainingPair or Slate(query_id, candidates, grades, propensities, snapshot_id) and ModelRelease.",
        "[Serving] SearchDocument(document_id, eligibility, lexical_fields, embedding_ref, indexed_at) and RankedResult.",
      ],
      architecture: [
        "[Data] Content ingestion parses, validates, deduplicates, safety-screens, and writes versioned lexical and vector index inputs.",
        "[Labels] Editorial judgments complement impression and click logs; randomized position probes estimate examination propensities.",
        "[Features] Query normalization and request-time features join with versioned document quality and freshness features.",
        "[Training] Candidate-aware learning-to-rank uses graded judgments and clipped propensity-weighted interactions.",
        "[Evaluation] Exact-search recall, hybrid recall@k, NDCG@k, MRR, zero-result, calibration, and query-slice gates run on temporal sets.",
        "[Serving] Parallel lexical and ANN retrieval merge through source-aware fusion, pre-rank, rich ranker, and policy re-ranker.",
        "[Policy] Eligibility, locale, access, and safety filters are enforced before display with reason codes.",
        "[Deployment] Dual-read index and model versions shadow live queries before atomic alias cutover and canary.",
      ],
      invariants: [
        "Every result satisfies request filters, access rules, safety policy, and index eligibility.",
        "Impressions preserve query, position, source, and release identity for every behavioral label.",
        "Tokenizer, lexical index, embedding encoder, vector index, and ranker versions are compatible.",
        "Quoted terms and exact identifiers retain a deterministic exact-match path.",
        "A source timeout cannot exceed the overall deadline or bypass policy filters.",
      ],
      deepDives: [
        {
          title: "Data, labels, and features",
          summary: "Combine high-quality judgments with carefully interpreted behavior.",
          points: [
            "Use graded relevance rubrics and overlap judgments; log skipped, clicked, reformulated, and completed sessions.",
            "Estimate position effects from bounded randomization and retain propensity plus presentation features.",
            "Build term, semantic, quality, freshness, field-match, and query-document interaction features with strict index-time versioning.",
          ],
        },
        {
          title: "Training and evaluation",
          summary: "Train on realistic retrieved negatives and gate every query regime.",
          points: [
            "Generate hard negatives from the active hybrid retriever, preventing the ranker from learning only trivial separations.",
            "Optimize pairwise or listwise ranking while validating task completion and calibrated satisfaction where probabilities are consumed.",
            "Report exact-query, head, tail, locale, zero-result, and fresh-document slices with uncertainty, then interleave and A/B test.",
          ],
        },
        {
          title: "Serving and index lifecycle",
          summary: "Parallel retrieval and immutable index releases preserve both quality and availability.",
          points: [
            "Run lexical and semantic sources concurrently under budgets, fuse ranked lists, then apply staged scoring.",
            "Build new immutable indexes, shadow representative traffic, check document counts and recall probes, and atomically move an alias.",
            "Return partial safe results when a source or rich model times out; never wait past the request deadline.",
          ],
        },
      ],
      scaling: [
        "Partition indexes by corpus and locale while routing exact identifiers directly.",
        "Replicate hot lexical and vector shards; cache normalized queries and immutable document features.",
        "Use incremental delta indexes for fresh documents and merge them into immutable base segments.",
        "Batch scoring and bound cross features to the top pre-ranked candidates.",
        "Overretrieve before selective filters or use filter-aware partitions when filters are common.",
        "Load-test query mixes, not only uniform traffic, and isolate expensive pathological queries.",
      ],
      observability: [
        "Query rate, zero-result and reformulation rates, task completion, and abandonment by query class.",
        "Recall@k and source contribution against judged probes; ANN exact-recall samples.",
        "NDCG, MRR, calibration, and click or completion metrics by release and slice.",
        "Index document counts, ingestion lag, tokenizer mismatches, embedding versions, and failed shards.",
        "Stage latency, timeout, partial-result, fallback, cache-hit, and cost distributions.",
        "Position propensity stability, interleaving preference, experiment SRM, safety misses, and complaints.",
      ],
    },
  },
  {
    id: "ads-ctr",
    title: "Ads click-through-rate prediction",
    category: "ml",
    difficulty: "hard",
    durationMinutes: 55,
    prompt:
      "Design a low-latency ads CTR prediction and ranking system that estimates click probability, supports auction utility and pacing, remains calibrated under delayed feedback, and protects user experience.",
    requirementsToExplore: [
      "Separate CTR estimation from auction, bid, budget, eligibility, and pacing policy.",
      "Define impression, click, conversion, attribution, and mature-negative semantics.",
      "Handle extreme cardinality, new ads, delayed events, negative downsampling, and calibration.",
      "Specify point-in-time request, user-context, ad, and cross features.",
      "Meet a tight serving budget with candidate preselection, caches, and a fallback model.",
      "Design advertiser, placement, locale, and cold-start slice evaluation.",
      "Experiment without ignoring auction interference, revenue, complaints, or latency.",
    ],
    expectedTopics: [
      "calibrated probability",
      "negative sampling correction",
      "delayed labels",
      "high-cardinality features",
      "multi-stage scoring",
      "auction policy",
      "budget pacing",
      "marketplace experimentation",
    ],
    commonFailureModes: [
      "Treating a sampled training score as an uncorrected CTR probability.",
      "Using conversions inside a CTR label or feature window before they are knowable.",
      "Letting the model enforce budget or legal eligibility implicitly.",
      "Ignoring placement-specific calibration and auction feedback.",
      "Launching on offline AUC without revenue and user-experience guardrails.",
    ],
    followUpQuestions: [
      "How do you correct probabilities after negative downsampling?",
      "Where should pacing and budget constraints live?",
      "How do you calibrate a brand-new ad with few impressions?",
      "What happens when the feature service exceeds its deadline?",
      "How does a new ranker interfere with auction prices and advertiser outcomes?",
    ],
    reference: {
      diagram: {
        caption: "Calibrated probability drives the auction, so the model cannot be evaluated on ranking alone; delayed conversions arrive on their own path and must not be labelled negative early.",
        nodes: [
          { id: "req", label: "Ad request", kind: "client", col: 0, row: 1 },
          { id: "auc", label: "Auction service", kind: "service", col: 1, row: 1 },
          { id: "cand", label: "Eligible ad retrieval", kind: "compute", col: 2, row: 0 },
          { id: "ctr", label: "CTR model", kind: "compute", col: 2, row: 1 },
          { id: "cal", label: "Calibration layer", kind: "compute", col: 3, row: 1 },
          { id: "budget", label: "Budget & pacing", kind: "service", col: 3, row: 0 },
          { id: "feat", label: "Feature store", kind: "store", col: 2, row: 2 },
          { id: "imp", label: "Impression log", kind: "stream", col: 4, row: 1 },
          { id: "conv", label: "Delayed conversion joiner", kind: "compute", col: 4, row: 2 },
          { id: "train", label: "Retraining", kind: "compute", col: 3, row: 3 },
        ],
        edges: [
          { from: "req", to: "auc", label: "context" },
          { from: "auc", to: "cand", label: "targeting" },
          { from: "cand", to: "ctr", label: "candidates" },
          { from: "ctr", to: "feat", label: "features" },
          { from: "ctr", to: "cal", label: "raw score" },
          { from: "cal", to: "budget", label: "pClick x bid" },
          { from: "budget", to: "auc", label: "priced" },
          { from: "auc", to: "imp", label: "serve log", async: true },
          { from: "imp", to: "conv", label: "attribution", async: true },
          { from: "conv", to: "train", label: "matured", async: true },
          { from: "train", to: "ctr", label: "model", async: true },
        ],
      },
      scope: [
        "Unit: eligible auction-request-ad at impression time; output: calibrated click probability with uncertainty or cold-start status.",
        "Primary use: auction utility such as bid times expected outcome, with budget, pacing, policy, and user-experience constraints externalized.",
        "SLO: single-digit to low tens of milliseconds for model scoring inside the auction deadline.",
        "Data minimization: use pseudonymous and coarse context features with retention and access controls.",
      ],
      apis: [
        "POST /v1/ads/score -> request_context, candidate_ads -> p_click, model_version, calibration_version",
        "POST /v1/ads/impression -> auction_id, ad_id, placement, position, shown_at, release_id",
        "POST /v1/ads/outcome -> impression_id, click_or_conversion, occurred_at",
        "POST /internal/auction -> bids, calibrated_scores, constraints -> winners, prices, reasons",
      ],
      dataModel: [
        "[Data] AuctionRequest(auction_id, pseudonymous_context_key, placement, candidates, requested_at).",
        "[Labels] AdOutcome(impression_id, event_type, occurred_at, attribution_rule, mature_at, label_status).",
        "[Features] AdFeature, ContextFeature, and CrossFeature with event_time, available_at, version, and default policy.",
        "[Training] SampledExample(impression_id, inclusion_probability, label, feature_snapshot) and DatasetManifest.",
        "[Serving] AdScore(ad_id, p_click, calibration_bucket, release_id) and AuctionDecision(policy_version, winner, reason).",
      ],
      architecture: [
        "[Data] Auction, impression, click, and conversion collectors deduplicate IDs and preserve placement and eligibility.",
        "[Labels] Attribution jobs mature click and conversion windows separately and retain inclusion probabilities for sampled negatives.",
        "[Features] Batch ad-history features combine with streaming recent counts and request-time context via point-in-time contracts.",
        "[Training] Weighted rare-event training uses chronological splits, cold-start simulation, and representative calibration data.",
        "[Evaluation] PR-AUC, log loss, calibration, precision at spend, and advertiser, placement, locale, and new-ad slices gate candidates.",
        "[Serving] Eligible candidates pass a light pre-ranker, vectorized scorer, placement calibrator, then deterministic auction and pacing policy.",
        "[Policy] Legal eligibility, budgets, bids, pacing, frequency caps, and auction rules remain outside the predictor.",
        "[Deployment] Shadow compares scores and auction counterfactuals; canary ramps with revenue, latency, complaint, and spend guardrails.",
      ],
      invariants: [
        "Only eligible, funded, policy-compliant ads enter the auction.",
        "Every score uses feature values available before its auction decision.",
        "Returned p_click is calibrated for the declared placement and traffic population.",
        "Sampling probability and attribution version accompany each training example.",
        "A scoring timeout invokes a safe auction fallback without exceeding the deadline.",
      ],
      deepDives: [
        {
          title: "Data, labels, and features",
          summary: "Impression-based examples require mature windows and explicit sampling.",
          points: [
            "Join clicks to logged impressions with deduplication and a fixed window; do not call recent unclicked impressions mature negatives.",
            "Retain negative inclusion probability so weighted loss and evaluation can reconstruct natural prevalence.",
            "Use ad history, creative or category embeddings, placement, coarse context, and interaction crosses with freshness and cold-start defaults.",
          ],
        },
        {
          title: "Training and probability evaluation",
          summary: "CTR is a probability product, so ranking lift without calibration is insufficient.",
          points: [
            "Train on sampled data, evaluate on natural prevalence, and fit placement-aware calibration only on held-out representative traffic.",
            "Gate log loss, Brier score, PR-AUC, calibration and expected spend or utility by advertiser, placement, locale, and new-ad slices.",
            "Backtest by time to capture campaign and seasonality shifts; compare with the live champion on paired impressions.",
          ],
        },
        {
          title: "Serving and auction boundary",
          summary: "The predictor estimates outcomes; auction policy makes the constrained allocation.",
          points: [
            "Score a bounded eligible candidate set in a vectorized batch with cached ad features and request-time context.",
            "Apply calibrated score in auction utility, then enforce pacing, caps, diversity, and budgets with logged policy reasons.",
            "Fallback to a simple placement-prior or contextual model when rich features miss their deadline.",
          ],
        },
      ],
      scaling: [
        "Partition high-cardinality feature storage by stable hashed keys and cache hot ad features.",
        "Vectorize candidate scoring and reuse request features across all ads in an auction.",
        "Use stream aggregates with event-time windows and idempotent impression or click deduplication.",
        "Bound candidates before rich scoring and precompute stable embeddings or crosses.",
        "Shard training data chronologically and use distributed sparse embedding updates with consistency checks.",
        "Isolate model capacity from auction orchestration and preserve a low-cost fallback path.",
      ],
      observability: [
        "Score distributions, natural CTR, log loss, PR-AUC, and calibration by placement, advertiser, locale, and release.",
        "Action, win, spend, pacing, budget-exhaustion, price, and revenue distributions.",
        "Feature age, default and miss rates, parity diffs, unknown-category rate, and stream lag.",
        "Scoring p95/p99 latency, timeouts, batch size, cache hit rate, fallback rate, and cost.",
        "Label maturity, attribution lag, deduplication, negative sampling weights, and late-event corrections.",
        "Experiment SRM, marketplace spillovers, complaints, hides, frequency, and long-term user guardrails.",
      ],
    },
  },
  {
    id: "fraud-detection",
    title: "Real-time fraud detection",
    category: "ml",
    difficulty: "hard",
    durationMinutes: 60,
    prompt:
      "Design a real-time fraud-risk system that decides whether to allow, review, or block transactions under severe class imbalance, adaptive attackers, delayed chargeback labels, review limits, and strict audit requirements.",
    requirementsToExplore: [
      "Define transaction decision time, fraud horizon, loss, customer friction, and review capacity.",
      "Separate risk estimation from allow, review, and block policy.",
      "Create delayed, corrected labels without treating recent transactions as negatives.",
      "Design velocity, entity-link, device, merchant, amount, and behavioral features with point-in-time correctness.",
      "Address class imbalance, calibrated loss estimates, thresholds, and abstention.",
      "Meet a low-latency SLO with rule and model fallbacks.",
      "Monitor adversarial drift, selective labels, reviewer quality, and loss by slice.",
    ],
    expectedTopics: [
      "delayed chargeback labels",
      "class imbalance",
      "calibration",
      "velocity features",
      "graph signals",
      "review queue",
      "adversarial drift",
      "auditable decisions",
    ],
    commonFailureModes: [
      "Marking transactions with no current chargeback as clean negatives.",
      "Using post-decision investigation or chargeback fields as features.",
      "Optimizing recall without pricing false declines and review capacity.",
      "Assuming reviewed cases are an unbiased sample of all traffic.",
      "Automatically retraining on an attack-corrupted data pipeline.",
    ],
    followUpQuestions: [
      "How do you choose the allow, review, and block bands?",
      "How do blocked transactions create selective labels?",
      "What is your fallback if velocity features are stale?",
      "How do you measure a model before chargebacks mature?",
      "How do you respond to a sudden coordinated attack?",
    ],
    reference: {
      diagram: {
        caption: "Synchronous scoring runs inside the payment deadline with a rules fallback if the model is unavailable; blocked transactions never reveal their outcome, so a randomized holdout keeps the training data honest.",
        nodes: [
          { id: "txn", label: "Transaction", kind: "client", col: 0, row: 1 },
          { id: "dec", label: "Decision service", kind: "service", col: 1, row: 1 },
          { id: "rules", label: "Rules engine", kind: "service", col: 2, row: 0 },
          { id: "model", label: "Fraud model", kind: "compute", col: 2, row: 1 },
          { id: "feat", label: "Streaming features", kind: "store", col: 3, row: 1 },
          { id: "thresh", label: "Threshold policy", kind: "compute", col: 3, row: 0 },
          { id: "review", label: "Manual review queue", kind: "external", col: 4, row: 0 },
          { id: "holdout", label: "Randomized holdout", kind: "compute", col: 2, row: 2 },
          { id: "labels", label: "Chargeback labels", kind: "stream", col: 4, row: 2 },
          { id: "train", label: "Retraining", kind: "compute", col: 3, row: 2 },
        ],
        edges: [
          { from: "txn", to: "dec", label: "authorize?" },
          { from: "dec", to: "rules", label: "hard rules" },
          { from: "dec", to: "model", label: "score" },
          { from: "model", to: "feat", label: "velocity aggs" },
          { from: "model", to: "thresh", label: "calibrated p" },
          { from: "thresh", to: "dec", label: "allow / block" },
          { from: "thresh", to: "review", label: "borderline", async: true },
          { from: "dec", to: "holdout", label: "bypass", async: true },
          { from: "holdout", to: "labels", label: "outcome", async: true },
          { from: "labels", to: "train", label: "matured", async: true },
          { from: "train", to: "model", label: "model", async: true },
        ],
      },
      scope: [
        "Unit: one transaction at authorization time; output: calibrated fraud probability or expected loss before an allow, review, or block policy.",
        "Objectives balance prevented fraud loss, false-decline harm, review cost, latency, and customer experience.",
        "SLO: risk decision within the authorization budget with a fail-mode chosen by transaction risk and policy.",
        "Auditability: immutable inputs, feature and model versions, score, threshold, action reason, reviewer override, and timestamps.",
      ],
      apis: [
        "POST /v1/risk/score -> transaction_context -> risk, uncertainty, release_id, reason_codes",
        "POST /v1/risk/decide -> risk, policy_context -> allow|review|block, policy_version",
        "POST /v1/risk/outcomes -> transaction_id, outcome_type, occurred_at, correction_of",
        "GET /internal/review/next -> prioritized case with evidence snapshot and decision deadline",
      ],
      dataModel: [
        "[Data] Transaction(transaction_id, pseudonymous_entity_keys, merchant_category, amount_bucket, event_time, available_at).",
        "[Labels] FraudOutcome(transaction_id, type, loss, observed_at, mature_at, status, label_version).",
        "[Features] VelocityFeature and RelationshipFeature(entity_key, window, value, effective_at, available_at, version).",
        "[Training] RiskExample(feature_snapshot, label_status, sample_weight, action_propensity) and DatasetManifest.",
        "[Serving] RiskDecision(score, calibration_version, policy_version, action, reason_codes, release_id, decided_at).",
      ],
      architecture: [
        "[Data] Authorization events enter an immutable log; idempotent outcome ingestion versions chargebacks, recoveries, and corrections.",
        "[Labels] Maturity jobs build cohort labels after the dispute horizon and preserve censored or policy-unobservable cases.",
        "[Features] Streaming keyed state computes short velocity windows; batch jobs compute long history and relationship summaries.",
        "[Training] Weighted rare-event model trains on mature chronological cohorts with attacker, merchant, region, and cold-start slices.",
        "[Evaluation] PR-AUC, recall at false-decline and review budgets, expected loss, calibration, and worst-slice gates compare with champion.",
        "[Serving] Rules and feature retrieval run under deadlines, a calibrated model scores, then policy maps risk to allow, review, or block.",
        "[Policy] Deterministic sanctions, regulatory, amount, and outage rules surround the model; uncertain cases can abstain to review.",
        "[Deployment] Shadow, low-risk canary, alerting, hot previous release, and a kill switch limit attack-time blast radius.",
      ],
      invariants: [
        "No feature contains information first available after authorization decision time.",
        "Immature or unobserved outcomes are never silently encoded as legitimate negatives.",
        "Every automated adverse action has a versioned policy reason and reproducible decision snapshot.",
        "Review queue admissions never exceed capacity without a documented overflow policy.",
        "Fallback behavior is explicit by risk band and cannot bypass mandatory rules.",
      ],
      deepDives: [
        {
          title: "Data, labels, and features",
          summary: "Fraud truth is delayed, corrected, and changed by intervention.",
          points: [
            "Version chargeback, investigation, recovery, and confirmed-clean definitions with maturity horizons and correction history.",
            "Use point-in-time velocity, prior outcomes, entity-link and amount-deviation features; control hot keys and late events.",
            "Log allow, review, block, reviewer selection, and override propensities to expose selective labels.",
          ],
        },
        {
          title: "Training and decision evaluation",
          summary: "Evaluate economic decisions at feasible review and friction budgets.",
          points: [
            "Train with weights or sampling, calibrate on natural prevalence, and backtest across attack eras.",
            "Select action bands from expected loss and capacity; report recall, precision, false declines, workload, and calibration by slice.",
            "Use mature labels for promotion; leading score, rules, and review rates support incident response but do not prove accuracy.",
          ],
        },
        {
          title: "Serving and incident response",
          summary: "Layer fast rules, model risk, human review, and explicit degraded modes.",
          points: [
            "Fetch deadline-bounded features, score, and apply policy in one auditable request with idempotent transaction identity.",
            "On feature failure, choose conservative rules, stale bounded features, or review according to amount and risk rather than one global default.",
            "During attacks, rate-limit abusive entities, adjust temporary policy separately from model version, preserve evidence, and canary any candidate retrain.",
          ],
        },
      ],
      scaling: [
        "Partition stream state by pseudonymous entity and salt extreme hot keys while preserving exact short-window counts.",
        "Use hierarchical aggregates and approximate sketches only where their error cannot violate policy.",
        "Cache stable merchant features and deadline individual feature groups.",
        "Prioritize review queues by expected avoidable loss and deadline, with fairness and age controls.",
        "Store immutable compact decision snapshots separately from high-volume raw telemetry.",
        "Isolate scoring capacity by region and retain local rules plus fallback during dependency failure.",
      ],
      observability: [
        "Mature fraud recall, precision, expected loss, calibration, and false declines by release and critical slice.",
        "Score, allow, review, block, override, and queue-age distributions with capacity utilization.",
        "Chargeback maturity, corrections, label coverage, reviewer agreement, and selection propensity.",
        "Feature lag, default rate, velocity-state gaps, parity, unknown entities, and hot-key pressure.",
        "p95/p99 decision latency, dependency timeouts, fallback path, error rate, and cost per decision.",
        "Attack indicators, graph concentration, abrupt score shifts, rules volume, drift, and rollback events.",
      ],
    },
  },
  {
    id: "credit-risk",
    title: "Credit-risk scoring",
    category: "ml",
    difficulty: "hard",
    durationMinutes: 60,
    prompt:
      "Design a credit-risk scoring system for application decisions. Estimate a clearly defined repayment outcome while handling delayed labels, rejected-applicant selection bias, calibration, adverse-action auditability, fairness review, and policy constraints.",
    requirementsToExplore: [
      "Define product, applicant population, decision unit, repayment horizon, loss, and abstention.",
      "Separate calibrated risk estimation from eligibility, affordability, limit, pricing, and approval policy.",
      "Build mature labels with delinquency, default, recovery, and correction semantics.",
      "Address selective labels because outcomes are observed mainly for approved applications.",
      "Design point-in-time features with data minimization and provenance.",
      "Evaluate calibration, expected loss, approval and default rates, and consequential slices.",
      "Plan human review, reason codes, release governance, monitoring, and rollback.",
    ],
    expectedTopics: [
      "delayed repayment labels",
      "selective labels",
      "calibration",
      "expected loss",
      "point-in-time features",
      "fairness evaluation",
      "reason codes",
      "model governance",
    ],
    commonFailureModes: [
      "Calling rejected applicants non-defaulting negatives.",
      "Leaking post-decision account performance into application features.",
      "Using AUC alone without calibration or policy operating points.",
      "Treating policy approval rate as an intrinsic model metric.",
      "Rolling back weights without the compatible calibrator and decision policy.",
    ],
    followUpQuestions: [
      "How can you learn about outcomes for declined applicants?",
      "What is the distinction between score, calibration, and approval policy?",
      "How do you monitor a 12-month outcome today?",
      "What evidence supports a reason code?",
      "How would a macroeconomic shift change validation and thresholds?",
    ],
    reference: {
      diagram: {
        caption: "Every decision is written to an immutable audit record with its model version and reasons, because the applicant is entitled to an explanation and a human review path.",
        nodes: [
          { id: "app", label: "Applicant", kind: "client", col: 0, row: 1 },
          { id: "intake", label: "Application service", kind: "service", col: 1, row: 1 },
          { id: "bureau", label: "Bureau data", kind: "external", col: 2, row: 0 },
          { id: "model", label: "Scoring model", kind: "compute", col: 2, row: 1 },
          { id: "policy", label: "Policy & cutoffs", kind: "compute", col: 3, row: 1 },
          { id: "reason", label: "Reason codes", kind: "compute", col: 3, row: 0 },
          { id: "audit", label: "Decision audit log", kind: "store", col: 4, row: 1 },
          { id: "fair", label: "Fairness monitor", kind: "compute", col: 4, row: 0 },
          { id: "human", label: "Adverse-action review", kind: "external", col: 4, row: 2 },
        ],
        edges: [
          { from: "app", to: "intake", label: "application" },
          { from: "intake", to: "bureau", label: "consented pull" },
          { from: "bureau", to: "model", label: "attributes" },
          { from: "model", to: "policy", label: "risk" },
          { from: "policy", to: "reason", label: "explain" },
          { from: "policy", to: "audit", label: "decision" },
          { from: "reason", to: "app", label: "notice" },
          { from: "audit", to: "fair", label: "slice metrics", async: true },
          { from: "policy", to: "human", label: "contested", async: true },
        ],
      },
      scope: [
        "Unit: one complete eligible application at decision time; output: calibrated probability of a versioned adverse repayment outcome over a stated horizon.",
        "Objective: expected risk-adjusted value subject to affordability, policy, capital, operational, and fairness guardrails.",
        "Action bands: approve, manual review, or decline, with an explicit abstention path for missing or out-of-distribution inputs.",
        "Governance: minimize data, control access, retain decision lineage, and require review for high-impact release changes.",
      ],
      apis: [
        "POST /v1/credit/score -> application_snapshot -> calibrated_risk, uncertainty, reason_factors, release_id",
        "POST /v1/credit/decide -> score, policy_context -> approve|review|decline, policy_version",
        "POST /v1/credit/outcomes -> account_id, outcome_event, occurred_at, correction_of",
        "GET /internal/decisions/{decision_id} -> immutable evidence and version chain",
      ],
      dataModel: [
        "[Data] Application(application_id, pseudonymous_applicant_key, submitted_at, declared_fields, source_versions).",
        "[Labels] RepaymentOutcome(account_id, definition_version, horizon, event_time, mature_at, loss, correction_version).",
        "[Features] ApplicationFeature(entity_key, name, value, effective_at, available_at, provenance, feature_version).",
        "[Training] CreditExample(application_snapshot, observed_policy, action_propensity, label_status, feature_manifest).",
        "[Serving] CreditDecision(score, calibration, uncertainty, reason_factors, policy_action, release_versions, decided_at).",
      ],
      architecture: [
        "[Data] Application ingestion validates completeness and freezes an immutable decision-time snapshot with source provenance.",
        "[Labels] Cohort jobs compute horizon-specific repayment labels, loss and recoveries only after maturity, preserving corrections.",
        "[Features] Approved feature definitions generate point-in-time training values and deadline-bounded online values from minimized inputs.",
        "[Training] Interpretable or constrained risk candidates train on chronological cohorts with an explicit selective-label strategy.",
        "[Evaluation] Gates cover PR-AUC, log loss, calibration, expected loss, approval/default tradeoffs, stability, and critical slices.",
        "[Serving] A versioned scorer and calibrator produce risk; deterministic eligibility and policy map it to action or review.",
        "[Policy] Capacity, affordability, limits, pricing, and governance rules remain separate and auditable.",
        "[Deployment] Independent validation, shadow replay, bounded canary, approval workflow, complete-release rollback, and periodic review.",
      ],
      invariants: [
        "Every feature was available before the recorded application decision and has approved provenance.",
        "A rejected application without repayment evidence is not represented as a known non-default.",
        "Score, calibrator, feature schema, reason mapping, and policy versions are recorded together.",
        "Every adverse automated action has a reproducible evidence snapshot and review path.",
        "Monitoring compares outcomes at equal maturity and reports supported critical slices with uncertainty.",
      ],
      deepDives: [
        {
          title: "Data, labels, and selective observation",
          summary: "Repayment truth is delayed and conditional on prior approval.",
          points: [
            "Version default, delinquency, loss, cure, and recovery definitions and build only mature horizon cohorts.",
            "Record prior policy action and propensity; use safe boundary review or approved exploration only where ethically and operationally permissible.",
            "Treat conclusions outside observed support as uncertain, using sensitivity analysis rather than inventing labels for declines.",
          ],
        },
        {
          title: "Training and evaluation",
          summary: "Risk probabilities must remain calibrated and stable at the policy boundary.",
          points: [
            "Use chronological and economic-regime backtests, representative calibration data, and uncertainty around expected loss.",
            "Evaluate ranking, log loss, reliability, decision cost, approval and bad rates, plus slice calibration and stability.",
            "Create stable reason factors from validated feature contributions or a policy-approved interpretable model; test fidelity and consistency.",
          ],
        },
        {
          title: "Serving, policy, and audit",
          summary: "The model estimates risk while a governed policy owns the action.",
          points: [
            "Freeze input and feature snapshots, deadline missing sources, and abstain to review when essential evidence is absent.",
            "Version calibration and thresholds by approved product or horizon while controlling routing complexity.",
            "Write an append-only decision record and support replay with the exact release; keep the prior complete release warm for rollback.",
          ],
        },
      ],
      scaling: [
        "Precompute slow stable features and fetch only approved request-time evidence under per-source deadlines.",
        "Partition cohort generation by decision month and label horizon for reproducible backfills.",
        "Cache immutable application snapshots, not mutable current account state, for decision replay.",
        "Prioritize human review by uncertainty and decision deadline under a fixed capacity.",
        "Separate low-latency scoring from slower audit and explanation enrichment.",
        "Run regional release controls where data and policies differ while maintaining comparable metric definitions.",
      ],
      observability: [
        "Calibration, log loss, expected loss, approval rate, and mature outcome rate by release, cohort age, and slice.",
        "Label coverage, maturity lag, recoveries, corrections, and selective-observation support.",
        "Feature missingness, provenance failures, freshness, parity, and out-of-distribution rates.",
        "Score, uncertainty, approve/review/decline, override, and reason-factor distributions.",
        "Scoring latency, dependency timeouts, abstention, fallback, and review queue age.",
        "Slice stability, policy changes, canary gates, audit replay success, and rollback events.",
      ],
    },
  },
  {
    id: "content-moderation",
    title: "Content moderation",
    category: "ml",
    difficulty: "hard",
    durationMinutes: 60,
    prompt:
      "Design a multi-label content moderation system that screens new and edited content, prioritizes human review, supports appeals, handles adversarial and multilingual drift, and meets strict safety and latency goals.",
    requirementsToExplore: [
      "Define policy taxonomy, content unit, surfaces, severity, action, and appeal semantics.",
      "Combine deterministic rules, lightweight screening, richer models, and human review.",
      "Create adjudicated labels while measuring reviewer consistency and selection bias.",
      "Choose per-policy thresholds from harm, false-action cost, and queue capacity.",
      "Handle text, image, metadata, context, duplicates, edits, and language slices.",
      "Design synchronous and asynchronous serving plus emergency degraded modes.",
      "Monitor emerging abuse, appeals, calibration, queue health, and policy-version changes.",
    ],
    expectedTopics: [
      "multi-label classification",
      "human annotation",
      "severity thresholds",
      "review prioritization",
      "adversarial drift",
      "multilingual slices",
      "appeals",
      "safe deployment",
    ],
    commonFailureModes: [
      "Using one binary label for policies with different harms and actions.",
      "Treating historical reviewer actions as unbiased ground truth.",
      "Optimizing aggregate accuracy while rare severe classes fail.",
      "Allowing the review queue to grow without an overflow or priority policy.",
      "Shadowing a moderation model with accidental user-visible side effects.",
    ],
    followUpQuestions: [
      "Which content can publish pending asynchronous review?",
      "How do you set thresholds for rare severe harms?",
      "How are policy changes reflected in labels and evaluation?",
      "What do appeals tell you about model and reviewer quality?",
      "How would you respond to a new evasion campaign?",
    ],
    reference: {
      diagram: {
        caption: "Cheap classifiers triage at ingest and only uncertain or high-severity items reach human reviewers, whose decisions become the label stream the models retrain on.",
        nodes: [
          { id: "post", label: "Uploaded content", kind: "client", col: 0, row: 1 },
          { id: "ingest", label: "Ingest service", kind: "service", col: 1, row: 1 },
          { id: "hash", label: "Known-bad hash match", kind: "store", col: 2, row: 0 },
          { id: "clf", label: "Multi-modal classifiers", kind: "compute", col: 2, row: 1 },
          { id: "policy", label: "Severity policy", kind: "compute", col: 3, row: 1 },
          { id: "auto", label: "Auto-enforce", kind: "service", col: 4, row: 0 },
          { id: "queue", label: "Review queue", kind: "stream", col: 4, row: 1 },
          { id: "human", label: "Human reviewers", kind: "external", col: 4, row: 2 },
          { id: "appeal", label: "Appeals", kind: "external", col: 3, row: 2 },
          { id: "train", label: "Retraining", kind: "compute", col: 2, row: 2 },
        ],
        edges: [
          { from: "post", to: "ingest", label: "upload" },
          { from: "ingest", to: "hash", label: "exact match" },
          { from: "hash", to: "auto", label: "known bad" },
          { from: "ingest", to: "clf", label: "score" },
          { from: "clf", to: "policy", label: "scores" },
          { from: "policy", to: "auto", label: "confident" },
          { from: "policy", to: "queue", label: "uncertain" },
          { from: "queue", to: "human", label: "assign" },
          { from: "human", to: "train", label: "labels", async: true },
          { from: "appeal", to: "human", label: "re-review" },
          { from: "train", to: "clf", label: "model", async: true },
        ],
      },
      scope: [
        "Unit: one content version plus relevant conversation or account context; output: per-policy calibrated risk and uncertainty.",
        "Actions include allow, limited distribution, review, warn, or block, selected by severity-specific policy rather than one threshold.",
        "SLOs differ by surface: synchronous pre-publication screening for high-risk surfaces and bounded asynchronous rescans elsewhere.",
        "Minimize retained content and isolate reviewer access; retain policy and decision evidence according to defined limits.",
      ],
      apis: [
        "POST /v1/moderation/score -> content_ref, context_ref -> policy_scores, uncertainty, release_id",
        "POST /v1/moderation/decide -> scores, surface, policy_version -> action, reasons",
        "POST /v1/review/outcome -> case_id, labels, action, reviewer_metadata, rubric_version",
        "POST /v1/appeals -> decision_id, appeal_outcome, decided_at",
      ],
      dataModel: [
        "[Data] ContentVersion(content_id, version_id, modality_refs, locale, created_at, policy_context).",
        "[Labels] PolicyLabel(version_id, policy_class, severity, annotator_source, rubric_version, adjudication_status).",
        "[Features] ContentFeature and ContextFeature with extractor_version, effective_at, available_at, retention_class.",
        "[Training] ModerationExample(content_version, multi_labels, sampling_source, review_propensity, dataset_manifest).",
        "[Serving] ModerationDecision(policy_scores, thresholds, action, reasons, content_version, release_versions, appeal_link).",
      ],
      architecture: [
        "[Data] Content versioning and event ingestion create immutable modality references and deduplicate known hashes.",
        "[Labels] Trained reviewers use versioned rubrics, blind overlap, adjudication, and appeal outcomes; selection propensity is retained.",
        "[Features] Modality extractors and context joins produce versioned representations with point-in-time policy context.",
        "[Training] Multi-label candidates combine broad sampled data with hard adversarial examples and language-aware slices.",
        "[Evaluation] Per-policy PR curves, recall at severe-harm budgets, calibration, false-action rate, slice and robustness gates run offline.",
        "[Serving] Fast rules and screening cascade into richer models and uncertainty-based review; asynchronous rescans handle slower context.",
        "[Policy] Per-class thresholds, precedence, surface rules, and reviewer overflow determine final action.",
        "[Deployment] Side-effect-free shadow, policy simulation, low-risk canary, emergency kill switch, and complete-release rollback.",
      ],
      invariants: [
        "Every action references the exact content version, policy taxonomy, thresholds, and model release.",
        "Severe-policy eligibility checks cannot be bypassed by model timeout or missing modality.",
        "Labels distinguish no violation, unknown, not reviewed, and each adjudicated policy class.",
        "Reviewer queue never silently drops cases; overflow invokes a documented safe policy.",
        "Appeals and corrections append evidence rather than rewriting the original decision.",
      ],
      deepDives: [
        {
          title: "Data, labels, and review quality",
          summary: "Policy labels require explicit rubrics and measurement of who was selected for review.",
          points: [
            "Version taxonomy and rubric; relabel benchmark anchors when policy changes rather than mixing incompatible targets.",
            "Use blinded overlap, adjudication and per-class agreement; reviewer action alone is not a clean label.",
            "Sample random allowed content and model disagreements in addition to alerts to estimate unseen false negatives and selection bias.",
          ],
        },
        {
          title: "Training and threshold evaluation",
          summary: "Each policy class has distinct prevalence, severity, and error economics.",
          points: [
            "Train multi-label models with hard-negative and adversarial refreshes while preserving natural-prevalence evaluation.",
            "Calibrate and threshold per policy and surface; report PR-AUC, recall at review capacity, false actions, and worst supported slices.",
            "Stress test obfuscation, language, context truncation, duplicate variants, and newly emerging attack templates.",
          ],
        },
        {
          title: "Serving and human escalation",
          summary: "A cascade spends latency and reviewer effort according to risk and uncertainty.",
          points: [
            "Apply exact rules and cheap screening first, then richer multimodal or contextual models for ambiguous cases.",
            "Prioritize review by severity, uncertainty, virality, age, and deadline with fairness and starvation controls.",
            "Use explicit fail-closed or limited-distribution modes by surface when models, modalities, or queues are unavailable.",
          ],
        },
      ],
      scaling: [
        "Hash-deduplicate exact and near-duplicate content so prior reviewed evidence can be reused with version checks.",
        "Batch expensive modality inference asynchronously where publication policy permits.",
        "Partition review queues by expertise and locale while enforcing global severity priorities.",
        "Cache versioned immutable content representations and invalidate on edits.",
        "Use priority admission control during abuse spikes and reserve capacity for severe policies.",
        "Separate synchronous screening SLOs from rescanning and historical backfill throughput.",
      ],
      observability: [
        "Per-policy precision, recall, PR-AUC, calibration, action and appeal-overturn rates by slice and release.",
        "Random-audit miss rate, reviewer agreement, adjudication, review propensity, and rubric version.",
        "Queue depth, age, SLA misses, severity mix, reviewer throughput, and overflow actions.",
        "Feature and modality failures, language detection, extractor versions, staleness, and edit invalidation.",
        "Screening and rich-model p95/p99 latency, timeouts, cascade rate, fallback, and cost.",
        "Emerging-cluster drift, duplicate bursts, adversarial probes, complaints, canary gates, and rollback events.",
      ],
    },
  },
  {
    id: "eta-prediction",
    title: "ETA prediction",
    category: "ml",
    difficulty: "medium",
    durationMinutes: 50,
    prompt:
      "Design an ETA prediction system for active trips or deliveries. Produce accurate, calibrated arrival intervals that update as conditions change while avoiding route leakage and meeting low-latency serving goals.",
    requirementsToExplore: [
      "Clarify prediction moments, trip stages, route assumptions, ETA horizon, and update frequency.",
      "Define arrival labels, cancellations, reroutes, waiting time, and censored trips.",
      "Create point-in-time traffic, route, location-cell, weather, supply, and entity-history features.",
      "Predict a distribution or quantiles, not only a mean, and calibrate intervals.",
      "Evaluate MAE, tail error, pinball loss, interval coverage, and route or region slices.",
      "Support batch training, streaming traffic features, and online low-latency inference.",
      "Handle incidents, new regions, missing location updates, rollout, and fallback.",
    ],
    expectedTopics: [
      "regression",
      "quantile prediction",
      "point-in-time traffic",
      "route snapshots",
      "censoring",
      "interval calibration",
      "stream features",
      "incident drift",
    ],
    commonFailureModes: [
      "Using actual completed-route information in departure-time features.",
      "Optimizing mean error while severe underestimates remain hidden.",
      "Dropping cancelled or heavily delayed trips without analyzing selection bias.",
      "Updating ETA so aggressively that the user-facing estimate oscillates.",
      "Training on current corrected traffic rather than what was available at prediction time.",
    ],
    followUpQuestions: [
      "Why predict quantiles rather than only expected arrival time?",
      "How do reroutes change the prediction unit and label?",
      "How do you avoid leakage from completed path data?",
      "What is the fallback during a traffic-stream outage?",
      "How would you detect interval miscalibration during a regional incident?",
    ],
    reference: {
      diagram: {
        caption: "A routing engine supplies the physical baseline and the model learns the residual, so live traffic and historical patterns correct a structurally sound estimate rather than replacing it.",
        nodes: [
          { id: "client", label: "Rider app", kind: "client", col: 0, row: 1 },
          { id: "api", label: "ETA API", kind: "service", col: 1, row: 1 },
          { id: "route", label: "Routing engine", kind: "compute", col: 2, row: 0 },
          { id: "model", label: "Residual model", kind: "compute", col: 2, row: 1 },
          { id: "live", label: "Live traffic features", kind: "store", col: 3, row: 0 },
          { id: "hist", label: "Historical segments", kind: "store", col: 3, row: 1 },
          { id: "cache", label: "Segment cache", kind: "cache", col: 2, row: 2 },
          { id: "actual", label: "Actual arrival log", kind: "stream", col: 4, row: 1 },
          { id: "train", label: "Retraining", kind: "compute", col: 4, row: 2 },
        ],
        edges: [
          { from: "client", to: "api", label: "origin/dest" },
          { from: "api", to: "route", label: "shortest path" },
          { from: "route", to: "model", label: "baseline" },
          { from: "model", to: "live", label: "live speeds" },
          { from: "model", to: "hist", label: "priors" },
          { from: "api", to: "cache", label: "hot corridors" },
          { from: "api", to: "client", label: "ETA + interval" },
          { from: "client", to: "actual", label: "arrival", async: true },
          { from: "actual", to: "train", label: "residuals", async: true },
          { from: "train", to: "model", label: "model", async: true },
        ],
      },
      scope: [
        "Unit: trip at a named prediction checkpoint with current route snapshot; output: median ETA plus calibrated arrival interval.",
        "Objective balances MAE, severe underestimation, interval coverage, estimate stability, latency, and user trust.",
        "Stages may include pre-dispatch, pickup, en route, and final approach, each with distinct features and models or stage indicators.",
        "SLO: tens of milliseconds for scoring with periodic event-driven updates and a routing-engine baseline.",
      ],
      apis: [
        "POST /v1/eta/predict -> trip_snapshot, route_version -> median_eta, interval, release_id",
        "POST /v1/eta/update -> trip_id, location_event, route_version -> revised estimate",
        "POST /v1/trips/outcome -> trip_id, arrived_at, cancellation, correction",
        "GET /internal/traffic/features?cells&as_of -> versioned speeds, incidents, freshness",
      ],
      dataModel: [
        "[Data] TripSnapshot(trip_id, stage, route_version, origin_cell, destination_cell, observed_at, available_at).",
        "[Labels] ArrivalOutcome(trip_id, stage_anchor, arrived_at, duration, cancellation_status, mature_at).",
        "[Features] TrafficCellFeature, RouteFeature, and ContextFeature with event_time, available_at, window, and version.",
        "[Training] EtaExample(snapshot_ref, route_ref, target_duration, censoring_status, feature_manifest).",
        "[Serving] EtaPrediction(median, lower_quantile, upper_quantile, route_version, feature_as_of, release_id).",
      ],
      architecture: [
        "[Data] Location and trip events are deduplicated and ordered by event time; route snapshots are immutable and versioned.",
        "[Labels] Arrival jobs compute remaining duration from each eligible checkpoint and separately classify cancellations or censored trips.",
        "[Features] Streaming traffic aggregates combine with route geometry, distance, stage, time, region, and bounded historical signals.",
        "[Training] Stage-aware quantile models train on chronological snapshots with incidents and new-region slices.",
        "[Evaluation] MAE, median and p95 absolute error, signed bias, pinball loss, interval coverage and width gate candidates.",
        "[Serving] Route engine baseline and versioned feature retrieval feed a low-latency predictor plus smoothing policy.",
        "[Policy] Update cadence and monotonic-time safeguards reduce oscillation without hiding genuine disruption.",
        "[Deployment] Historical replay, live shadow, regional canary, interval and latency gates, and routing-baseline rollback.",
      ],
      invariants: [
        "Prediction features contain only route and traffic information available at the checkpoint.",
        "Every estimate names its route version, feature as-of time, and model release.",
        "Arrival interval lower bound is no later than median, which is no later than upper bound.",
        "A stale or missing live feature invokes a declared routing-baseline fallback.",
        "Evaluation includes cancellations and reroutes as explicit states rather than silently dropping them.",
      ],
      deepDives: [
        {
          title: "Data, labels, and point-in-time routes",
          summary: "Each update is a new prediction example anchored to what the system knew then.",
          points: [
            "Persist route and trip state at checkpoints; never join the eventual completed path into an earlier prediction.",
            "Use remaining arrival duration for completed trips and retain cancellation or censoring reasons to audit excluded populations.",
            "Build traffic windows using event and availability timestamps so corrected historical traffic does not leak into training.",
          ],
        },
        {
          title: "Training and uncertainty evaluation",
          summary: "Quantiles express asymmetric uncertainty that a mean hides.",
          points: [
            "Train median and tail quantiles with pinball loss or a probabilistic duration model; correct crossing quantiles if necessary.",
            "Evaluate signed error, MAE, tail miss, interval coverage and width across stage, region, distance, incident, and new-route slices.",
            "Calibrate intervals on held-out temporal cohorts and test that nominal 90% intervals cover about 90% by supported slice.",
          ],
        },
        {
          title: "Serving and update stability",
          summary: "Combine fresh traffic with predictable user-facing updates.",
          points: [
            "Fetch route and traffic features under deadlines, batch cell reads, and score only when new evidence or cadence warrants.",
            "Smooth small noisy revisions but bypass smoothing for incidents or route changes; log both raw and displayed estimates.",
            "Fallback to route-engine duration with conservative uncertainty when learned or streaming dependencies fail.",
          ],
        },
      ],
      scaling: [
        "Partition streaming traffic state by spatial cell and time bucket; manage hot urban cells through replication.",
        "Batch route-cell feature fetches and cache immutable route geometry by route version.",
        "Downsample redundant trip checkpoints for training while preserving incident and tail cases.",
        "Use regional model or calibration variants only when data and routing regimes justify routing complexity.",
        "Separate high-QPS prediction service from asynchronous label and route-replay pipelines.",
        "Backpressure location events and prefer latest-state compaction where intermediate points are not needed.",
      ],
      observability: [
        "MAE, signed bias, p95 absolute error, pinball loss, interval coverage and width by stage, region, and release.",
        "Raw-to-displayed adjustment, estimate oscillation, update frequency, and severe underestimate rate.",
        "Traffic and location lag, missing cells, route-version mismatch, feature default, and parity.",
        "Prediction p95/p99 latency, dependency timeout, fallback, cache hit, and cost.",
        "Cancellation and reroute rates, label maturity, excluded-population mix, and incident cohorts.",
        "Shadow disagreement, regional canary gates, drift during incidents, and rollback events.",
      ],
    },
  },
  {
    id: "personalized-notifications",
    title: "Personalized notifications",
    category: "ml",
    difficulty: "hard",
    durationMinutes: 55,
    prompt:
      "Design a personalized notification decision system that selects whether, what, when, and through which channel to notify. Optimize incremental long-term value while controlling fatigue, quiet hours, safety, cost, and channel capacity.",
    requirementsToExplore: [
      "Define eligible notification opportunities, action space, outcome horizons, and no-send baseline.",
      "Distinguish response likelihood from the causal incremental effect of sending.",
      "Instrument eligibility, candidate set, propensity, send, delivery, open, action, mute, and unsubscribe.",
      "Design content, user-state, recent-fatigue, timing, channel, and context features.",
      "Create candidate generation, response or uplift estimation, and constrained scheduling.",
      "Handle delayed outcomes, exploration, caps, quiet hours, and unreliable delivery.",
      "Experiment at a unit that prevents cross-channel and repeated-message contamination.",
    ],
    expectedTopics: [
      "uplift modeling",
      "no-send counterfactual",
      "delayed outcomes",
      "frequency caps",
      "fatigue",
      "constrained scheduling",
      "propensity logging",
      "long-term guardrails",
    ],
    commonFailureModes: [
      "Ranking by open probability, which targets users likely to act without a notification.",
      "Training only on sent messages and labeling unsent opportunities implicitly negative.",
      "Letting per-candidate scores bypass global frequency and quiet-hour constraints.",
      "Randomizing by request while treatment carries across a user and day.",
      "Optimizing immediate opens while mute, unsubscribe, or long-term retention worsens.",
    ],
    followUpQuestions: [
      "How do you estimate value relative to not sending?",
      "Where do frequency caps and quiet hours live?",
      "How do you explore safely without annoying users?",
      "What is the label for an eligible opportunity that was not sent?",
      "How does channel failure affect training data and evaluation?",
    ],
    reference: {
      diagram: {
        caption: "Send-or-not is a decision under a fatigue budget, not a ranking; long-term engagement guards against a model that optimizes opens by over-sending.",
        nodes: [
          { id: "trigger", label: "Candidate events", kind: "client", col: 0, row: 1 },
          { id: "value", label: "Value model", kind: "compute", col: 1, row: 1 },
          { id: "fatigue", label: "Fatigue & budget state", kind: "store", col: 2, row: 0 },
          { id: "policy", label: "Send policy", kind: "compute", col: 2, row: 1 },
          { id: "timing", label: "Send-time optimizer", kind: "compute", col: 3, row: 1 },
          { id: "channel", label: "Channel router", kind: "service", col: 4, row: 1 },
          { id: "out", label: "Push / email", kind: "external", col: 4, row: 0 },
          { id: "resp", label: "Open / dismiss / mute", kind: "stream", col: 4, row: 2 },
          { id: "guard", label: "Retention guardrail", kind: "compute", col: 3, row: 2 },
        ],
        edges: [
          { from: "trigger", to: "value", label: "utility" },
          { from: "value", to: "policy", label: "candidates" },
          { from: "policy", to: "fatigue", label: "budget left" },
          { from: "policy", to: "timing", label: "send set" },
          { from: "timing", to: "channel", label: "route" },
          { from: "channel", to: "out", label: "dispatch" },
          { from: "out", to: "resp", label: "reaction", async: true },
          { from: "resp", to: "fatigue", label: "update", async: true },
          { from: "resp", to: "guard", label: "long-horizon", async: true },
          { from: "guard", to: "policy", label: "tighten", async: true },
        ],
      },
      scope: [
        "Unit: eligible user-message-channel-time opportunity; action includes no-send, send now, or schedule later.",
        "Objective: incremental task or retention value minus fatigue, unsubscribe, complaint, delivery, and opportunity costs.",
        "Hard constraints cover consent, quiet hours, safety, per-user frequency, duplicate suppression, and channel capacity.",
        "SLO: online decision in tens of milliseconds; scheduler guarantees idempotent delivery and deadline-aware cancellation.",
      ],
      apis: [
        "POST /v1/notifications/decide -> opportunity_set, context -> no_send|scheduled_action, policy_reasons",
        "POST /v1/notifications/delivery -> notification_id, channel, delivery_status, occurred_at",
        "POST /v1/notifications/outcomes -> notification_id or opportunity_id, action, occurred_at",
        "DELETE /v1/notifications/scheduled/{id} -> cancellation reason and policy version",
      ],
      dataModel: [
        "[Data] Opportunity(opportunity_id, pseudonymous_user_key, message_type, channels, eligible_at, expires_at).",
        "[Labels] NotificationOutcome(opportunity_id, assigned_action, propensity, delivery, responses, mature_at, fatigue_events).",
        "[Features] UserState and MessageFeature with recent-send windows, effective_at, available_at, and version.",
        "[Training] PolicyExample(opportunity_set, action, propensity, outcomes, observation_window, feature_snapshot).",
        "[Serving] NotificationDecision(action, message_id, channel, send_at, score_or_uplift, release_versions, reasons).",
      ],
      architecture: [
        "[Data] Opportunity generator and channel collectors log eligibility before selection, assignment propensity, delivery, action, and negative feedback.",
        "[Labels] Attribution joins short actions and delayed retention or fatigue outcomes to opportunity cohorts without treating no-send as observed response.",
        "[Features] Batch affinity and message features combine with streaming recency, fatigue, channel state, and request-time eligibility.",
        "[Training] Response baseline evolves toward treatment-effect or policy models using randomized holdouts and clipped propensity-aware estimation.",
        "[Evaluation] Offline policy value, calibration or uplift curves, workload, fatigue and slice gates supplement response prediction metrics.",
        "[Serving] Candidate messages are generated, scored, deduplicated, and passed to a constraint-aware scheduler that includes no-send.",
        "[Policy] Consent, quiet hours, caps, cooldowns, duplicate suppression, safety, channel cost, and capacity are deterministic constraints.",
        "[Deployment] Shadow decisions have no sends; stable user-level canaries and holdouts measure incremental and long-term effects before ramp.",
      ],
      invariants: [
        "No notification is scheduled without current consent, eligibility, quiet-hour, cap, and safety checks.",
        "One idempotency key creates at most one delivery attempt sequence for the intended opportunity.",
        "Every logged label retains eligibility, assigned action, propensity, delivery status, and release.",
        "No-send is a first-class policy action, not a missing training row.",
        "Fallback policy enforces all consent, cap, cooldown, and duplicate constraints.",
      ],
      deepDives: [
        {
          title: "Data, labels, and counterfactuals",
          summary: "Observed responders are not the same as users helped by a send.",
          points: [
            "Log the full eligible opportunity set before ranking, including no-send assignment and propensity from randomized holdouts.",
            "Create short response, task-completion, and delayed fatigue or retention outcomes with separate windows and delivery status.",
            "A high response score may target always-takers; estimate conditional treatment effect where randomized support exists and report uncertainty.",
          ],
        },
        {
          title: "Training and policy evaluation",
          summary: "Evaluate incremental value under the exact caps and scheduler constraints.",
          points: [
            "Begin with calibrated response and explicit randomized control, then train uplift or policy models using treated and control opportunities.",
            "Use off-policy estimates only with overlap and logged propensities, clipped or doubly robust where assumptions are defensible.",
            "Replay the final scheduler for caps and collisions, then run user-level experiments long enough to observe fatigue and carryover.",
          ],
        },
        {
          title: "Serving and constrained scheduling",
          summary: "The scorer proposes utility; a global per-user scheduler selects a feasible action.",
          points: [
            "Generate bounded message candidates, score incremental value by channel and time, and include no-send in optimization.",
            "Resolve cross-message collisions with caps, deadlines, quiet hours, channel cost, and diversity; persist reservation state atomically.",
            "Cancel stale or invalid opportunities before delivery and log delivery failures separately so they do not masquerade as lack of interest.",
          ],
        },
      ],
      scaling: [
        "Partition per-user scheduling state by pseudonymous key and serialize conflicting decisions.",
        "Use a delayed queue with idempotency, expiration, cancellation, retries, and dead-letter handling.",
        "Precompute stable affinities; stream send, open, mute, and cap counters with bounded lateness.",
        "Batch candidate scoring per user and reuse message features across recipients where permitted.",
        "Apply admission control by channel capacity and degrade to high-priority deterministic messages only.",
        "Retain a persistent randomized holdout and isolate experiment namespaces to avoid overlapping policies.",
      ],
      observability: [
        "Eligible, no-send, scheduled, delivered, opened, acted, muted, unsubscribed, and expired rates by release and slice.",
        "Incremental experiment lift, treatment propensity, overlap, SRM, carryover, and long-term guardrails.",
        "Per-user frequency, cap hits, quiet-hour blocks, duplicate suppression, and message collision rates.",
        "Feature age, recent-send counter lag, default rate, parity, and out-of-distribution cohorts.",
        "Decision and scheduler latency, queue age, delivery failure, retry, cancellation, and channel cost.",
        "Uplift or response calibration, policy-value estimates, slice degradation, feedback loops, and rollback events.",
      ],
    },
  },
];
