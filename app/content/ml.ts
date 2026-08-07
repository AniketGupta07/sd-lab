import type { DesignPrompt, RawStudyTopic } from "./types";

export const mlTopics: RawStudyTopic[] = [
  {
    id: "ml-problem-framing",
    week: 8,
    day: 1,
    tier: 2,
    title: "Frame the ML problem before choosing a model",
    eyebrow: "Decisions before models",
    estimatedMinutes: 55,
    summary:
      "Translate a product goal into a decision, prediction unit, horizon, objective, constraints, and a baseline that can prove ML is worth operating.",
    whyItMatters:
      "A notification model that predicts click probability perfectly still cannot tell you how many notifications to send, to whom, or whether sending is permitted at all. That gap between an estimate and an action is where most machine-learning product failures actually live. The decision contract - entity, decision time, horizon, eligible population, action, and fallback - is what closes it, and it costs an afternoon to write before any training job runs. Skip it and the team discovers six months later that training rows, serving requests, and the metric denominator describe three different populations.",
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
          "Use a cost matrix to expose asymmetric mistakes. If false negatives cost C_FN and false positives cost C_FP, a calibrated probability can be thresholded near C_FP / (C_FP + C_FN) before operational constraints; with a false approval costing 90 and a false decline costing 10 that puts the starting cut at 10/(10+90) = 0.10, not the reflexive 0.5.",
          "Audit proxy gaps: engagement can reward outrage, approval rate can hide risk selection, and average ETA error can hide severe tail misses.",
        ],
      },
      {
        title: "Baselines and staged value proof",
        summary:
          "A baseline anchors complexity, feasibility, and the minimum evidence required to launch.",
        points: [
          "Start by replaying the current policy on the same point-in-time split, then add a popularity or most-recent heuristic, then logistic regression over ten features. Anything that comes close is a warning about how much the model is really contributing.",
          "Decompose value into data lift, model lift, and policy lift so gains are not incorrectly attributed to architecture. If the popularity baseline already captures 8 of 10 points of offline lift, the architecture did not earn them.",
          "Predeclare offline gates, online success and guardrails, a latency budget, and rollback conditions before expensive training or infrastructure work.",
        ],
      },
      {
        title: "Constraints stated as numbers",
        summary:
          "A constraint that cannot fail a design review is not a constraint; it is an adjective.",
        points: [
          "Write each hard limit as something a build can be checked against. A p99 scoring budget of 30 ms inside a 200 ms page, a review team that clears 2,000 cases a day, a legal rule naming attributes that may not enter the model or any proxy for them: each of those settles an argument. \"Fast\", \"fair\", and \"cheap\" settle nothing and survive to the launch review unchallenged.",
          "Separate the limits that bind the model from the limits that bind the policy. The 30 ms budget binds the model; a cap of three notifications per user per week binds the policy, and folding that cap into the loss function hides it from every person who will later need to change it without retraining anything.",
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
    prerequisites: ["estimation", "storage-indexing"],
    relatedDesigns: ["personalized-notifications", "fraud-detection", "credit-risk"],
    quiz: [
      {
        prompt: "A calibrated model predicts loss probability p. A false approval costs 90 and a false decline costs 10. Ignoring other constraints, which decline threshold is the correct starting point?",
        options: ["0.10, from 10/(10+90)", "0.50, the neutral cut", "0.90, from 90/(10+90)", "None; costs cannot set it"],
        answerIndex: 0,
        explanation:
          "Decline when p times 90 exceeds (1-p) times 10, so p > 10/(90+10) = 0.10. Choosing 0.90 inverts the ratio, and choosing 0.50 assumes the symmetric costs this cost matrix explicitly denies.",
      },
      {
        prompt: "Why should an ML design specify a non-ML baseline?",
        options: [
          "It removes the need for an online experiment.",
          "It guarantees the scores will be calibrated.",
          "It isolates model lift and doubles as a fallback.",
          "It makes feature freshness irrelevant later.",
        ],
        answerIndex: 2,
        explanation:
          "A comparable baseline separates data lift and policy lift from model lift and can be served when the model is unavailable. The tempting wrong answer is that a baseline replaces online measurement: an offline comparison is still not a causal estimate of product value.",
      },
      {
        prompt: "The true outcome, 90-day retention, matures far more slowly than the weekly iteration loop. What does the module recommend?",
        options: [
          "Shorten the horizon so the label matures daily.",
          "Use a validated proxy and monitor its alignment.",
          "Promote the proxy itself to the product goal.",
          "Wait for mature labels before any experiment.",
        ],
        answerIndex: 1,
        explanation:
          "A validated proxy is legitimate when the true outcome is delayed, provided proxy-to-outcome alignment stays monitored and guarded. Promoting the proxy to the goal is the Goodhart failure this module names: engagement optimized for its own sake rewards outrage.",
      },
      {
        prompt: "After launch, offline AUC and click-through both improve while complaint rate rises and task success falls. Which failure does the module name?",
        options: [
          "The prediction unit and horizon were ambiguous.",
          "No credible non-ML baseline was ever measured.",
          "The eligible population was defined too widely.",
          "The label measures a proxy, not the outcome.",
        ],
        answerIndex: 3,
        explanation:
          "Proxy metrics rising while outcome metrics fall is the signature of a label that measures something convenient rather than the desired result. Ambiguous units produce a different symptom: training rows, serving requests, and metric denominators describing different populations.",
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
    eyebrow: "Measure at the operating point",
    estimatedMinutes: 65,
    summary:
      "Build an offline and online metric stack that reflects prevalence, ranking position, probability quality, product utility, and performance on consequential slices.",
    whyItMatters:
      "A fraud model with 0.97 ROC-AUC is still worthless to a team that can review 2,000 cases a day, because the only number that decides whether that queue is usable is precision at the capacity the business actually staffs.",
    objectives: [
      "Choose discrimination, ranking, calibration, and decision metrics for the actual serving policy.",
      "Explain why ROC-AUC can look strong on rare-event problems while precision is poor.",
      "Evaluate stable, sufficiently powered slices without turning dashboards into a multiple-testing trap.",
      "Connect offline metrics to online success, blocking guardrail metrics, latency, and availability.",
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
          "Put both error axes on the same scale before arguing. At 1% prevalence over 1,000,000 daily events there are 10,000 positives and 990,000 negatives, so a false-positive rate of only 0.5% still contributes 4,950 false alerts—the same order of magnitude as every true positive that exists in the day.",
        ],
      },
      {
        title: "Probability, ranking, and product metrics",
        summary:
          "Use a metric family matching the artifact consumed by the product.",
        points: [
          "Log loss averages -[y log p + (1-y) log(1-p)] and strongly penalizes confident mistakes; Brier score averages (p-y)^2 and measures probabilistic accuracy.",
          "For ordered lists, DCG@k sums gain_i/log2(i+1); NDCG divides by the ideal DCG. Add recall@k for candidate coverage and task-specific diversity or safety constraints.",
          "Offline metrics are gates, not causal product estimates. Online metrics measure behavior, while complaint rate, latency, cost, fairness, and safety protect against local optimization. Keep the two roles named apart: a guardrail metric is a blocking release gate that stops a launch when it regresses, whereas a signal that is only watched is a monitored metric and blocks nothing.",
        ],
      },
      {
        title: "Slice-based evaluation with statistical discipline",
        summary:
          "Slices turn aggregate performance into a deployability assessment.",
        points: [
          "Predeclare the slices that product mechanics predict will break: users in their first session, each launch locale, low-end Android, and items outside the top 10,000 by popularity. A slice discovered after the results are in is hypothesis generation, not evidence.",
          "Report every slice with its denominator and a bootstrap interval beside the point estimate, because a slice of 300 cases cannot tell 60% precision apart from 45%. Pool or shrink the thin ones rather than ranking them.",
          "Gate the release on regressions in the slices you named as critical, and keep the worst adequately supported slice on the dashboard as a standing number.",
          "Control repeated comparison. Forty slice tests at alpha 0.05 will surface about two nominal regressions on a model that changed nothing, so a post-hoc cut is a hypothesis to confirm on fresh data, not a result to block on.",
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
      "Which slices deserve guardrail metrics that block a launch, and which only deserve monitored metrics on a dashboard?",
      "What evidence would convince you that the offline metric is causally connected to user value?",
    ],
    decisionChecklist: [
      "Measure prevalence and define the evaluation population.",
      "Choose metrics for ranking, probability quality, and the deployed threshold.",
      "Tie the operating point to cost, capacity, or a product constraint.",
      "Predeclare consequential slices and minimum support.",
      "Report uncertainty and compare against a shared baseline.",
      "Specify online success metrics, blocking guardrail metrics, monitored metrics, and an offline-to-online validation plan.",
    ],
    exercise:
      "Design a metric component that ingests scored examples and slice keys, then outputs ROC-AUC, PR-AUC, log loss, calibration error, and precision/recall at a review budget with bootstrap intervals. Explain how you prevent tiny or overlapping slices from creating false alarms.",
    prerequisites: ["ml-problem-framing"],
    relatedDesigns: ["fraud-detection", "content-moderation", "ads-ctr"],
    quiz: [
      {
        prompt: "Why can a 1% prevalence classifier have a strong ROC-AUC but unusable precision?",
        options: [
          "ROC-AUC assumes the training data was balanced.",
          "A small FPR on the 99% negatives swamps positives.",
          "Precision does not depend on class prevalence.",
          "ROC-AUC measures calibration, not ranking order.",
        ],
        answerIndex: 1,
        explanation:
          "False-positive rate divides by the huge negative pool, so a low FPR still produces many false positives, and precision counts every one of them. The tempting error is believing precision is prevalence-independent, when prevalence is exactly what moves it.",
      },
      {
        prompt: "Which metric directly assesses the quality of probabilities used by several downstream thresholds?",
        options: [
          "Recall@k on retrieved items",
          "Mean reciprocal rank of hits",
          "ROC-AUC across all thresholds",
          "Log loss on predicted risk",
        ],
        answerIndex: 3,
        explanation:
          "Log loss is a proper scoring rule, minimized only by true probabilities, so it certifies scores that several policies will threshold. Ranking metrics such as MRR and ROC-AUC are invariant to any monotone rescaling and stay perfect on badly calibrated scores.",
      },
      {
        prompt: "Reviewers handle 2,000 cases a day. Daily volume is 1,000,000 at 1% prevalence, and at the chosen cut the 2,000 alerts contain 600 true positives. What is the operating point?",
        options: [
          "Precision 30%, recall 6% at review capacity.",
          "Precision 6%, recall 30% at review capacity.",
          "Precision 30%, recall 30% at review capacity.",
          "Precision 60%, recall 6% at review capacity.",
        ],
        answerIndex: 0,
        explanation:
          "Precision is 600/2,000 = 30% and recall is 600/10,000 = 6%, so the queue is affordable while 94% of positives are never seen. Swapping the two denominators is the standard slip, and it makes a capacity-limited system look coverage-complete.",
      },
      {
        prompt: "A dashboard reports 40 predefined and ad-hoc slices, and three regress at p below 0.05. What does the module prescribe?",
        options: [
          "Block the release on all three of the regressed slices.",
          "Stop slicing and gate on the global metric only.",
          "Ask whether the slices were predeclared and powered.",
          "Rerun until the three slices stop regressing.",
        ],
        answerIndex: 2,
        explanation:
          "Across forty comparisons a few nominal regressions are expected by chance, so gates apply only to predeclared, sufficiently supported slices and post-hoc cuts are hypotheses needing confirmation. Blocking on every significant slice is the multiple-testing trap; dropping slices entirely is the opposite error that lets a broken cohort hide in the average.",
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
    eyebrow: "Only what was knowable then",
    estimatedMinutes: 70,
    summary:
      "Design event, annotation, and dataset pipelines whose labels mean what the decision needs and whose features contain only information available at prediction time.",
    whyItMatters:
      "Leakage does not announce itself as a bug; it announces itself as a great result. An offline AUC that jumps from 0.78 to 0.94 after a feature-engineering sprint is far more often a timestamp mistake than a breakthrough, and the usual culprit is a feature joined on when the fact became true rather than on when the serving path could have read it. Everything in this module exists to make that difference testable instead of a matter of someone remembering.",
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
          "Anchor the example at decision time t and say which events inside the window (t, t+h] count as the positive, which repeats collapse into one, and at what instant the row becomes label-complete. Every one of those left unwritten becomes a judgment call that two pipelines will make differently.",
          "Do not mark an unlabeled, still-maturing example negative. Store label_status and mature_at; account for right censoring when observation windows differ. With a 60-day chargeback window, a nightly job over the trailing 90 days holds only 30 days of label-complete rows.",
          "Human labels need a rubric, adjudication, annotator quality checks, and agreement measures; observed enforcement actions may reflect reviewer selection rather than ground truth.",
          "Measure how much noise the labels themselves carry before crediting any model with beating them. Send 500 items to two annotators blind; if they disagree on 12 of every 100, a one-point difference between two candidates evaluated on those labels is inside the measurement error and cannot be read as a win.",
        ],
      },
      {
        title: "Leakage and contamination",
        summary:
          "Leakage is any information path unavailable at the real decision time or shared improperly across splits.",
        points: [
          "Target leakage includes post-outcome fields, aggregates updated after the label event, and operational actions caused by an earlier model.",
          "Temporal leakage comes from random splits in evolving systems; group leakage comes from the same user, case, or item appearing across train and validation.",
          "Fit every learned transform on the training partition alone - the normalization statistics, the token vocabulary, the imputation fills, the selected feature subset, the resampling ratio. A dataset transform leaks with every raw column clean, which is why this variety survives code review so reliably.",
          "Audit the feature list against the clock, one column at a time. The question is never whether a column looks suspicious but which timestamp made its value writable, and whether that instant precedes t. It is the same question that makes merchant_chargeback_rate_90d a leak in a transaction-risk model and a perfectly legitimate feature in a merchant-onboarding model.",
        ],
      },
      {
        title: "Point-in-time joins and quality contracts",
        summary:
          "Historical training rows must reproduce what online serving could have known.",
        points: [
          "For each prediction row at t, join the latest feature event whose event_time <= t and availability_time <= simulated execution time; use versioned as-of semantics.",
          "Late corrections require bitemporal records or immutable versions so a backfill does not rewrite history with newly known values.",
          "Run the candidate dataset through assertions before it is allowed to become a training set: primary keys unique, row count inside a band around the trailing seven-day median, null rate per column stable, newest event no older than the freshness SLA, label prevalence consistent per source. Quarantine a failing partition instead of training on it, and keep the manifest and lineage of whatever passed.",
        ],
      },
      {
        title: "Splits that mirror the deployment",
        summary:
          "The split is not a convention to inherit; it is a model of how the system will actually be used.",
        points: [
          "Derive the split from the deployment question. A model retrained monthly to serve the following month is tested by fitting on months 1 through 11 and scoring month 12, then rolling that origin forward several times to see whether the gap is stable or widening. A random 80/20 answers a question nobody in production is asking.",
          "Nest the two isolations instead of choosing between them: keep an entity's rows together inside chronological folds, so the same merchant never lands on both sides of a boundary and the boundary itself still runs forward in time.",
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
      {
        mode: "A repeated entity straddles the split boundary",
        symptom: "Validation error sits far below the error on a chronological holdout of the same size, and the gap grows with how often entities repeat.",
        mitigation: "Group by the entity key before splitting, then count how many entities still cross the boundary; near-duplicate items need a similarity pass, because an identifier match will not catch a reposted listing.",
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
          "Yes - its event time precedes the prediction.",
          "No - it was not readable by the serving path.",
          "Yes - if it lifts offline recall materially.",
          "No - only daily rollups may be joined here.",
        ],
        answerIndex: 1,
        explanation:
          "Point-in-time correctness needs event time and availability time, and a fact that landed two hours late was not knowable to serving. Joining on event time alone is the most common leak, and it produces offline scores that collapse in shadow traffic.",
      },
      {
        prompt: "Which split best tests a model that retrains monthly and predicts future behavior in a changing market?",
        options: [
          "A random row-level split",
          "An alphabetical entity split",
          "Rows duplicated across folds",
          "A chronological backtest",
        ],
        answerIndex: 3,
        explanation:
          "A chronological backtest mirrors deployment by training on a past window and scoring the next one, exposing change between them. The random split is the temporal-leakage trap: it lets the model learn from the future and inflates every reported number.",
      },
      {
        prompt: "Normalization statistics and the token vocabulary were fit on the full dataset before the train/validation split. Is that leakage?",
        options: [
          "No - only raw feature columns can leak.",
          "No - the transform never sees a label.",
          "Yes - fit transforms on training rows only.",
          "Yes - but only under a temporal split.",
        ],
        answerIndex: 2,
        explanation:
          "Normalization statistics, vocabularies, imputation, feature selection, and resampling are learned from data, so fitting them before the split carries validation information into training. The tempting belief is that leakage requires a label-derived column, but a dataset transform leaks with every raw column clean.",
      },
      {
        prompt: "Chargebacks arrive up to 60 days after a transaction. The team trains nightly on the last 90 days and marks every unlabeled row negative. What breaks?",
        options: [
          "The freshest 60 days are mislabeled negative.",
          "The oldest 30 days dominate the training loss.",
          "Nothing: 90 days exceeds the 60-day window.",
          "Only ROC-AUC moves, precision is unaffected.",
        ],
        answerIndex: 0,
        explanation:
          "A row is label-complete only once its own 60-day window closes, so two-thirds of a 90-day training set is censored and calling it negative teaches the model that recent means safe. Confusing the lookback length with per-row maturity is the specific error here.",
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
    eyebrow: "One definition, both paths",
    estimatedMinutes: 65,
    summary:
      "Unify feature definitions, historical materialization, low-latency serving, freshness, lineage, and backfills without pretending offline and online storage are identical.",
    whyItMatters:
      "Two implementations of purchases_30d - one in a nightly Spark job, one in the serving path - will agree for months and then disagree the week a time zone, a null convention, or a window boundary changes. The platform's job is to make that divergence impossible to introduce quietly: one definition compiled into both paths, and sampled online vectors diffed against historical replay every day.",
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
          "A feature view is a declaration, not a table. purchases_30d has to say which entity it is keyed by, which timestamp column defines its 30-day window, how stale the online copy may be before the read is a miss - 15 minutes, say - and what is served when it does miss; the checklist below enumerates the full set. Whatever the definition leaves implicit is exactly where batch and serving will later disagree.",
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
          "Bundle a signed schema with the model so the serving path can refuse a vector whose column order, vocabulary, or normalization constants no longer match what training saw. A single column shifted by one position is silent at runtime: the model scores the garbage happily and the error only shows up in the outcome metrics weeks later.",
          "Price the parity check so that it actually runs every day. Logging one served vector in a thousand on a 20,000 QPS service is 20 rows a second, about 1.7 million a day - cheap enough to diff against a nightly replay, and dense enough that a single skewed column shows up within hours rather than at the next quarterly review.",
        ],
      },
      {
        title: "Freshness, backfills, and resilience",
        summary:
          "Every online read needs an explicit age, version, and degradation policy.",
        points: [
          "Materializers write idempotently by entity, feature version, and effective timestamp. Alert on the p99 of now minus effective_at per feature rather than on job success: a pipeline that finishes on schedule with an hour-old watermark is still serving hour-old values against a 15-minute SLA.",
          "Backfills write a new immutable version and are validated before promotion; they must not overwrite values used by an active model without compatibility checks.",
          "Serve bounded-staleness values, documented defaults, or a fallback model on misses; never silently substitute a semantically different feature.",
          "Return an age with every online read, not just a value. A response shaped as value, effective_at, feature_version lets the caller decide what to do, and lets a dashboard tell \"this feature is missing\" apart from \"this feature is 40 minutes old against a 15-minute SLA\" - two conditions with completely different repairs.",
          "Size the online store from the read pattern rather than the row count. A ranker assembling 120 features for each of 500 candidates needs 60,000 feature values per request, which is affordable only as a batched multi-get over 500 entity-keyed rows and ruinous as 60,000 individual round trips.",
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
      {
        decision: "One wide row per entity or one row per feature",
        preferA: "Store a wide row when a single consumer reads most of the features together and one get can answer the request.",
        preferB: "Store per-feature rows when independent producers write at different cadences and a slow feature must not delay the rest.",
        watch: "Write amplification and read-modify-write contention on wide rows, against a read fan-out that turns one lookup into dozens on narrow ones.",
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
          "Training and serving read one shared database.",
          "Every feature is recomputed at request time.",
          "Equal inputs at one as-of time give equal vectors.",
          "Online feature values are never allowed to expire.",
        ],
        answerIndex: 2,
        explanation:
          "Parity is semantic: the same inputs at the same as-of time, through the same transform, defaults, and ordering, yield the same vector whatever the storage. The shared-database answer is the infrastructure fallacy, since one store with two transform implementations still skews.",
      },
      {
        prompt: "How should a large historical backfill reach an active model?",
        options: [
          "Overwrite the online values in place, then check.",
          "Write a new version, validate, then promote it.",
          "Skip validation because the source is trusted.",
          "Auto-retrain every model before the backfill.",
        ],
        answerIndex: 1,
        explanation:
          "Backfills write an immutable new version that is validated and shadowed before consumers are switched, so recomputation cannot silently change an active model's inputs. In-place overwrite is the failure mode where a feature distribution jumps with no traffic change and history stops being reproducible.",
      },
      {
        prompt: "One feature's online lookup times out during a traffic spike. Which serving behavior does the module endorse?",
        options: [
          "Substitute the nearest similar feature value.",
          "Retry until it returns, whatever the latency.",
          "Impute the mean computed over live traffic.",
          "Serve a documented default or stale value.",
        ],
        answerIndex: 3,
        explanation:
          "The platform must declare a degradation policy - bounded staleness or a documented default - with default rate monitored because it moves calibration. Silently substituting a semantically different feature is the forbidden move, since the model then scores a vector it never trained on.",
      },
      {
        prompt: "Replay and live requests built from identical inputs produce different prediction distributions. Which cause fits the module's diagnosis?",
        options: [
          "The two paths implement the transform twice.",
          "The online store was sharded onto more nodes.",
          "The model was trained with too few epochs.",
          "Traffic composition changed during the replay.",
        ],
        answerIndex: 0,
        explanation:
          "Identical inputs yielding different vectors points at two implementations of one definition - different windows, null handling, or normalization statistics - so the fix is one definition compiled into both paths plus continuous vector diffing. Blaming traffic mix cannot explain a difference measured on the same inputs.",
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
    eyebrow: "Recall lost is unrecoverable",
    estimatedMinutes: 75,
    summary:
      "Generate a high-recall, low-latency candidate set with blended sources, learned embeddings, and an ANN index chosen for memory, freshness, and recall constraints.",
    whyItMatters:
      "Retrieval sets a ceiling that ranking cannot raise. If the right item is not among the 1,000 candidates handed to the ranker, no loss function, no extra layer, and no additional feature will recover it. That is why recall@k by source is measured before anyone is allowed to argue about the ranker.",
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
          "Budget the query side deliberately. One query-tower forward pass plus an ANN probe has to fit inside roughly 20 ms of a 200 ms feed budget, which is precisely why item vectors are encoded offline and only the query tower runs on the request path.",
        ],
      },
      {
        title: "HNSW mechanics",
        summary:
          "HNSW is a navigable multi-layer proximity graph with high recall and fast search at a memory cost.",
        points: [
          "Upper sparse layers make long jumps; search descends greedily, then explores a candidate frontier in the dense base layer.",
          "M bounds stored neighbors and primarily raises index memory plus build/search work; efConstruction widens construction search and trades build time for graph quality; efSearch widens query exploration and trades query latency for recall without increasing persistent index memory. At M = 32 the base layer alone holds about 64 neighbor ids per vector, roughly 256 bytes at four bytes each, before the vectors themselves are counted.",
          "Incremental inserts are practical; deletion is the part that bites. A removed vector is tombstoned and still traversed during search, so both recall and memory drift away from their benchmark numbers until a rebuild, which is why a corpus with heavy churn needs a compaction schedule and a standing recall probe rather than a one-time measurement taken on the day the index was built.",
        ],
      },
      {
        title: "IVF-PQ mechanics",
        summary:
          "IVF narrows search to coarse clusters; product quantization compresses residual vectors for memory-efficient distance estimates.",
        points: [
          "Train coarse centroids, assign each item to an inverted list, probe nprobe nearby lists, and approximate distances with lookup tables over quantized subvectors.",
          "More probes and finer codes improve recall but increase compute or memory; coarse quantizer quality and distribution shift determine which candidates are never visited.",
          "Do the memory arithmetic before choosing the family. Five hundred million 768-dimension float32 vectors are about 1.5 terabytes raw, whereas PQ into 64 one-byte subvector codes stores 64 bytes per item, roughly 32 gigabytes—the difference between a sharded fleet and a handful of machines.",
        ],
      },
      {
        title: "Blending sources, filters, and freshness",
        summary:
          "The candidate set that reaches ranking is assembled from several producers, and each one needs a quota, a deadline, and an attribution tag.",
        points: [
          "Blend the learned retriever with lexical match, trending, subscription, and geographic sources under explicit per-source quotas—say 400 from ANN, 200 lexical, 100 followed, 50 fresh—then deduplicate and carry source and retrieval score forward so ranking evaluation can attribute credit.",
          "Benchmark recall with production filters attached, not on clean vectors. A predicate that leaves 2% of the corpus eligible forces the search to walk far more of the graph, so a recall figure measured at efSearch 64 on unfiltered traffic can collapse in production; overretrieve, partition by the filter value, or use a filter-aware index.",
          "Decide how a minute-old item enters the index before you pick the structure: HNSW accepts incremental inserts, IVF-PQ usually does not without a rebuild, so freshness-sensitive products run a small delta index beside a periodically rebuilt base and search both.",
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
          "Widens the frontier: more recall, more latency.",
          "Compresses each vector into fewer stored bytes.",
          "Rebuilds the graph and retrains the encoders.",
          "Returns exact neighbors at unchanged cost.",
        ],
        answerIndex: 0,
        explanation:
          "efSearch enlarges the query-time candidate frontier, buying recall with query work while leaving persistent index memory unchanged. Confusing it with M or efConstruction is the usual error: those raise index memory and build time, not per-query exploration.",
      },
      {
        prompt: "What is product quantization doing in IVF-PQ?",
        options: [
          "It replicates each vector into every partition.",
          "It links every pair of items with graph edges.",
          "It codes subvectors for table-lookup distances.",
          "It maps retrieval scores onto probabilities.",
        ],
        answerIndex: 2,
        explanation:
          "PQ splits a vector into subvectors and stores one codebook index per subvector, so distances become table lookups at a fraction of the memory. Mistaking it for the graph structure confuses IVF-PQ with HNSW, which spends memory on neighbor links rather than saving it by compression.",
      },
      {
        prompt: "Three successive ranker improvements move offline NDCG but not end-to-end quality. What should be measured first?",
        options: [
          "Whether the ranker needs a deeper network.",
          "Whether MRR should replace NDCG offline.",
          "Whether the index should switch to HNSW.",
          "Whether retrieval surfaced the items at all.",
        ],
        answerIndex: 3,
        explanation:
          "Ranking cannot recover an item retrieval never returned, so recall@k by source and slice is measured before any ranker change is credited. Reaching for a larger ranker is the tempting response, and it cannot move quality when the relevant candidate is absent from the candidate set.",
      },
      {
        prompt: "A new encoder version ships and the ANN index must migrate. What must hold during the cutover?",
        options: [
          "Only the item tower is refreshed, saving a rebuild.",
          "Query and item vectors stay in one embedding space.",
          "Mixed encoder versions are fine if recall is watched.",
          "Cosine scores remain comparable across versions.",
        ],
        answerIndex: 1,
        explanation:
          "Similarity is only defined inside a single embedding space, so encoder and index are pinned as a compatible pair and cut over atomically, usually through dual indexes. Refreshing one tower or trusting cross-version scores is the mixed-version mistake whose symptom is recall collapsing mid-migration.",
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
    eyebrow: "Spend compute as candidates shrink",
    estimatedMinutes: 75,
    summary:
      "Turn retrieved candidates into a useful slate through progressively expensive scoring, debiased learning, calibrated objectives, and deterministic policy constraints.",
    whyItMatters:
      "Ranking is two problems wearing one name. The first is statistical: click logs were written by the previous ranker, so a non-click means either \"not relevant\" or \"never looked at\", and a model trained without that distinction learns to reproduce whatever the incumbent already showed. The second is a constraint problem: diversity, creator caps, ad pacing, and safety are deterministic rules that can consume an entire relevance gain between the raw score and the shipped slate. A design that keeps the two apart, and logs both orders, can say which one moved.",
    objectives: [
      "Allocate candidate counts, model cost, and latency across pre-rank, rank, and re-rank stages.",
      "Choose pointwise, pairwise, or listwise objectives and evaluate top-of-list quality.",
      "Explain exposure and position bias (ranking) plus limits of inverse-propensity correction.",
      "Apply eligibility, diversity, pacing, and safety constraints without hiding them inside labels.",
    ],
    concepts: [
      "multi-stage ranking",
      "learning to rank",
      "NDCG",
      "position bias (ranking)",
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
          "Pre-rank 2,000 candidates with cheap features, rank the surviving 100 with rich cross features at roughly 0.4 ms each against a 40 ms stage budget, then re-rank the final 20 under slate constraints. Track how many relevant items each cut discards, because that number is the real cost of the cascade.",
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
          "Put the deterministic slate rules in a re-ranker that runs after scoring—at most two items per creator in a page of 20, one sponsored slot every fifth position, no two near-duplicate items adjacent—and log the raw model order beside the policy-adjusted order so you can tell which stage changed the result.",
        ],
      },
      {
        title: "Position bias (ranking) and counterfactual evidence",
        summary:
          "Clicks reflect relevance, exposure, presentation, and the previous policy. Say position bias (ranking) explicitly, because the same phrase also names an unrelated artifact in LLM evaluation - position bias (judge ordering), where a pairwise judge favors whichever answer it reads first.",
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
      {
        mode: "The pre-ranker filters a population it was never trained on",
        symptom: "Relevant-item survival falls sharply at the pre-rank cut even though the pre-ranker's own offline AUC looks healthy on a random sample.",
        mitigation: "Distill the pre-ranker from the rank model's scores over actually retrieved candidates, and gate on stage recall rather than per-stage AUC.",
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
          "Non-click rows omit the item identifier.",
          "The item may never have been examined.",
          "Clicks are always delayed by about a month.",
          "Ranking losses cannot take binary labels.",
        ],
        answerIndex: 1,
        explanation:
          "Exposure and position determine whether an item could be clicked at all, so a non-click confounds irrelevance with never being seen. Treating non-clicks as clean negatives is exactly what teaches the ranker to reproduce the incumbent's ordering.",
      },
      {
        prompt: "What is required for offline inverse-propensity evaluation of a new policy?",
        options: [
          "Every action the new policy may take had support.",
          "The logging policy was strictly deterministic there.",
          "All logged propensities were equal to zero.",
          "Both policies share the same model family.",
        ],
        answerIndex: 0,
        explanation:
          "Inverse propensity scoring reweights logged outcomes, so any action the new policy might take needs nonzero probability under the logger; without overlap there is no evidence to reweight. Believing a deterministic logger is acceptable inverts the requirement, because determinism destroys the overlap the estimator needs.",
      },
      {
        prompt: "Retrieval returns 2,000 candidates. The rank model costs 0.4 ms per item against a 40 ms stage budget. What does the module prescribe?",
        options: [
          "Score all 2,000 candidates with the rank model.",
          "Cut retrieval to 100 candidates up front.",
          "Pre-rank to about 100, then rank those.",
          "Drop the re-rank stage and rank everything.",
        ],
        answerIndex: 2,
        explanation:
          "Only 40 / 0.4 = 100 items fit the budget, so a cheap pre-rank narrows 2,000 to roughly that many and the expensive model scores the survivors while stage recall loss is tracked. Shrinking retrieval instead is the tempting shortcut, and it discards recall no later stage can recover.",
      },
      {
        prompt: "Raw model NDCG improves but the shipped slate and the online metrics do not move. What does the module diagnose?",
        options: [
          "The pairwise loss should have been pointwise.",
          "Position propensities were clipped too tightly.",
          "Retrieval recall fell in the same release.",
          "Re-ranker constraints undo the model's order.",
        ],
        answerIndex: 3,
        explanation:
          "Diversity, pacing, freshness, and safety rules applied after scoring can consume the entire relevance gain, which is why each stage is evaluated and both raw and policy-adjusted orders are logged. Blaming the loss function is the reflex answer and cannot explain a gain that exists in the raw order and vanishes in the slate.",
      },
    ],
    recallCards: [
      { id: "mlrp-position-bias", prompt: "Explain position bias (ranking) and why training naively on click logs degrades a ranker.", answer: "Position bias (ranking) is the click-log confound - distinct from position bias (judge ordering), the ordering artifact in pairwise LLM judging. Users click what they are shown, and higher-ranked items receive more clicks regardless of relevance, so click logs reflect the previous ranker's exposure as much as user preference. Training directly on them teaches the model to reproduce the incumbent's ordering and creates a feedback loop that entrenches it, while starving unshown items of the data needed to prove they are good. Corrections include inverse-propensity weighting by estimated exposure, randomized or interleaved exploration slots, and position-aware models that treat rank as a feature at training and neutralize it at inference." },
      { id: "mlrp-objective", prompt: "Describe why a ranker optimizing a single engagement metric is dangerous.", answer: "A single proxy such as click-through rate is optimized literally: the model learns clickbait, sensational content, and short-horizon engagement that harms retention and trust while the target metric improves. Production rankers therefore blend multiple objectives - predicted click, dwell or completion, explicit satisfaction, and negative feedback - with weights set by product judgment, and constrain the result with diversity, freshness, and safety requirements. Guardrail metrics - blocking release gates, not merely monitored metrics - must be defined for the harms the proxy hides, because the proxy improving is not evidence the product improved." },
    ],
  },
  {
    id: "ml-training-evaluation-registry",
    week: 9,
    day: 3,
    tier: 2,
    title: "Make training reproducible and promotion evidence-based",
    eyebrow: "Promote on evidence, not weights",
    estimatedMinutes: 70,
    summary:
      "Build a training control plane that versions data, code, features, configuration, artifacts, evaluation reports, and promotion decisions from experiment to production.",
    whyItMatters:
      "The weights are the smallest part of a model release. Reproducing a result six months later, or rolling one back at 3 a.m., needs the dataset snapshot, the transform version, the feature schema, the calibrator, the threshold, and the routing rule pinned together as one immutable bundle - which is why a rollback that restores only the weight file usually preserves the exact incompatibility that caused the incident.",
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
          "A run is identified by its inputs, not by the path it wrote to. Record the dataset snapshot id, the code commit, and the container image digest so that rerunning the manifest a year later resolves to the same bytes; the checklist below enumerates the rest of what has to be pinned. The test is blunt: rerun last quarter's manifest and diff the metrics.",
          "Make stages idempotent and content-address artifacts where practical; retries should not silently select newer source data.",
          "Use incremental training only when replay, optimizer state, and catastrophic-forgetting risks are understood; periodically compare against a clean full retrain.",
          "Seeds and nondeterminism belong in the manifest too. Nondeterministic GPU kernels and a reshuffled data loader can move a headline metric by a few tenths of a point on their own, so train the same configuration three times, record the seed-to-seed spread, and treat any candidate whose margin over the champion is smaller than that spread as not yet a candidate.",
        ],
      },
      {
        title: "Evaluation as a promotion contract",
        summary:
          "A candidate passes only if it beats the right baseline without breaking critical slices or operational limits.",
        points: [
          "Run temporal backtests and compare the candidate with the current champion on identical examples using paired uncertainty estimates.",
          "A promotion gate is a conjunction, not a single number. A candidate that wins the primary metric but adds 15 ms to p99, or depends on a feature that is not yet materialized online, has not passed; express each gate as an explicit threshold against the champion measured on the same examples.",
          "Store the complete evaluation report and signed decision with the artifact; a single scalar metric is insufficient evidence for promotion.",
          "Check that the evaluation set can even resolve the gate you wrote. If the paired difference in log loss carries a bootstrap standard error of 0.002, then a candidate 0.001 behind the champion has not failed and one 0.001 ahead has not passed; either widen the evaluation window until the interval is smaller than the decision, or lower the ambition of the gate and say so.",
        ],
      },
      {
        title: "Registry, deployment, and rollback",
        summary:
          "The registry describes approved artifacts; the serving control plane moves traffic.",
        points: [
          "Model the registry as a state machine—registered, validated, approved, shadow, canary, production, retired—and require an authorized actor plus an audit record for every transition. The state records what evidence exists about an artifact, not where traffic is currently pointed.",
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
      {
        decision: "One organization-wide registry or a registry per team",
        preferA: "Run one registry when promotion policy, audit trail, and rollback tooling have to be identical across every model that touches the same surface.",
        preferB: "Allow per-team registries when release cadence and risk profiles genuinely differ, provided each exports its promotion decisions to a shared audit log.",
        watch: "Promotion criteria that quietly diverge, compatibility checks reimplemented four times, and a rollback runbook only one team has ever rehearsed.",
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
          "Weights plus the headline accuracy number",
          "The newest training table and a model name",
          "Data, code, transforms, config, and policy ids",
          "A container tag that always points at latest",
        ],
        answerIndex: 2,
        explanation:
          "Reproduction and rollback need immutable identities for data, code, environment, transforms, feature schema, thresholds, and policy version; the weights are one dependency among many. Recording weights and a metric is the common shortcut, and it cannot say why the artifact exists or what to restore.",
      },
      {
        prompt: "Why compare a challenger and champion on paired evaluation examples?",
        options: [
          "It removes every production risk from promotion.",
          "It cuts variance in the champion-challenger delta.",
          "It guarantees the candidate is fair by group.",
          "It replaces the need for temporal validation.",
        ],
        answerIndex: 1,
        explanation:
          "Scoring both models on identical examples cancels example difficulty, so the paired difference has far lower variance and per-example regressions become visible. Treating the comparison as a fairness or risk guarantee confuses a sensitivity technique with a gate; slices, calibration, and operational checks are still required.",
      },
      {
        prompt: "When does the module say incremental training is riskier than a full retrain?",
        options: [
          "When replay and forgetting risks are unexamined.",
          "Whenever the training data outgrows a single node.",
          "When the freshness target is stated in hours.",
          "When champion and challenger share features.",
        ],
        answerIndex: 0,
        explanation:
          "Incremental updates inherit optimizer state and can quietly forget history or mishandle corrections, so they are allowed only when those risks are understood and checked periodically against a clean full retrain. Assuming data size alone forces incremental training is the misread: scale argues for it but does not make it safe.",
      },
      {
        prompt: "A model rollback completes and the service still behaves badly. What does the module identify as the cause?",
        options: [
          "The bake window before rollback was too short.",
          "The registry state machine skipped an approval.",
          "The champion was never content-addressed.",
          "Thresholds and transforms did not roll back.",
        ],
        answerIndex: 3,
        explanation:
          "A release is the model plus preprocessing graph, feature schema, calibrator, threshold, and routing policy, so restoring weights alone leaves the incompatible pieces in production. Treating the model as just a weight file is precisely the misconception this failure mode corrects.",
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
    eyebrow: "Calibrated probability, then policy",
    estimatedMinutes: 75,
    summary:
      "Train on rare outcomes without corrupting probability semantics, calibrate on representative data, and choose policy thresholds from costs, capacity, and slice constraints.",
    whyItMatters:
      "Downsample negatives twenty to one and ROC-AUC will not budge, which is exactly why the damage is easy to miss: every predicted probability is now inflated by about a factor of twenty in odds terms, and a threshold tuned against those numbers fires far too often at a 0.5% serving base rate. Ranking survived; probability semantics did not. Calibrate on held-out data drawn at the deployment prevalence, then choose the threshold from costs and review capacity rather than from the score distribution.",
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
          "Downsample abundant negatives or use weighted losses for optimization, while preserving example weights and an untouched validation set at the deployment base rate. At 0.5% prevalence, keeping one negative in twenty turns 200 million rows into roughly 11 million without discarding a single positive.",
          "PR-AUC and precision at capacity reveal useful rare-event performance; ROC-AUC alone can hide an intolerable absolute false-positive count.",
          "If training prevalence differs from serving prevalence, raw logits generally do not represent serving probabilities; correct prior shift only when class-conditional distributions are plausibly stable.",
          "Count positives rather than rows when judging whether there is enough data. Two hundred million rows at 0.5% prevalence carry a million positives, which is ample; the same prevalence over 400,000 rows carries 2,000, and no sampling scheme invents information those 2,000 examples do not already hold.",
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
          "For calibrated binary risk and constant costs, act when expected benefit exceeds expected cost. At C_FP = 10 and C_FN = 90 that cut sits at 0.10, but if only 2,000 of the 12,000 daily cases above 0.10 can be reviewed, capacity rather than the cost matrix sets the threshold you actually ship.",
          "Choose the threshold on validation data and freeze it into the release manifest next to the calibrator it depends on. Publish what it implies operationally—alerts per day, precision and recall at that cut, expected cost, behavior on the critical slices—so the number can be argued about by people who do not read the code.",
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
      {
        mode: "The calibrator is refitted but the threshold is left where it was",
        symptom: "Alert volume jumps or collapses after a routine recalibration even though the model weights and the incoming traffic are unchanged.",
        mitigation: "Version calibrator and threshold as a single object and re-derive the cut from costs and review capacity every time the calibrator moves, since the same 0.10 means something different on a rescaled probability.",
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
          "It ranks well but its probabilities are wrong.",
          "It is calibrated but it cannot separate classes.",
          "A strong ROC-AUC proves the probabilities.",
          "The threshold must be left at 0.5 here.",
        ],
        answerIndex: 0,
        explanation:
          "AUC depends only on score order, so a model can rank perfectly while calling 40% events 0.8: discrimination and calibration are independent properties. Reading AUC as evidence that probabilities are trustworthy is the error that breaks every expected-cost threshold downstream.",
      },
      {
        prompt: "Where should a calibrator be fit?",
        options: [
          "On the rows used to minimize training loss",
          "On held-out data at the serving prevalence",
          "On the production positives collected so far",
          "On any sample whose weights are unrecorded",
        ],
        answerIndex: 1,
        explanation:
          "A calibrator maps scores to probabilities out of sample, so it is fit after model selection on held-out data drawn at the deployment base rate. Fitting on the training rows learns the model's overconfidence instead of correcting it, because those scores are already optimized against those labels.",
      },
      {
        prompt: "Negatives are downsampled to one in twenty for training and raw scores ship unchanged. Serving prevalence is 0.5%. What follows?",
        options: [
          "Ranking collapses while its calibration survives.",
          "Recall drops but precision stays unchanged.",
          "Nothing: sampling cannot move any score.",
          "Predicted risk inflates and workload explodes.",
        ],
        answerIndex: 3,
        explanation:
          "Keeping one negative in twenty multiplies the positive odds by about twenty, so raw scores describe the sampled prevalence rather than the 0.5% actually served and every fixed threshold fires far too often. Assuming sampling is harmless because AUC held is the trap: ranking survives, probability semantics do not.",
      },
      {
        prompt: "Aggregate reliability looks excellent, yet one cohort is consistently over-scored. What does the module prescribe?",
        options: [
          "Lower the global threshold until the cohort balances.",
          "Refit one calibrator per cohort regardless.",
          "Report slice reliability, then repair the gap.",
          "Ignore it: global fit implies slice fit.",
        ],
        answerIndex: 2,
        explanation:
          "Averaging cancels opposite errors, so reliability is reported per predeclared slice with support and uncertainty before data, model, or policy is repaired. Recalibrating every cohort regardless of support is the overcorrection the module warns about, since thin slices yield noisy calibrators plus new routing and fairness risk.",
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
    eyebrow: "Missing is not negative",
    estimatedMinutes: 75,
    summary:
      "Operate when ground truth arrives late, is selectively observed, or is changed by intervention, while preserving auditability and safe human escalation.",
    whyItMatters:
      "Credit, fraud, and safety systems make decisions whose outcomes arrive 30 to 90 days later, if they arrive at all. A declined applicant never repays and never defaults, so the labeled data describes only the population the previous policy chose to approve, and waiting longer does nothing whatsoever to fix that. This module is about operating - training, monitoring, escalating, and auditing - when outcomes are late, selectively observed, and altered by the intervention itself.",
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
          "Store decision_at, outcome_at, mature_at, observed_at, and label_status, and train conventional classifiers only on cohorts whose full horizon has elapsed. With a 90-day window that means today's decisions become training data in three months, not tomorrow.",
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
          "Cut the calibrated risk scale into bands with an action attached to each: auto-allow below 0.02, human review between 0.02 and 0.15, auto-decline above 0.15. Set those boundaries from costs, review capacity, and legal constraints rather than from round numbers, and re-derive them whenever the calibrator changes.",
          "Wrap the model in deterministic eligibility checks and emit a stable reason code with every adverse action, because the affected person is entitled to a reason and a support agent needs one that does not change meaning between releases. Write the decision record once and never mutate it; the checklist below lists what that record has to carry.",
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
      {
        decision: "Derive reason codes from the model or from the policy layer",
        preferA: "Derive them from the model when attributions are stable enough to survive a retrain and can be checked against the score they claim to explain.",
        preferB: "Derive them from deterministic policy rules when identical inputs must produce an identical explanation across releases and reviewers.",
        watch: "Post-hoc attributions that reshuffle after every retrain, and reason codes naming features the applicant has no way to change.",
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
          "Repayment is seen only where credit was granted.",
          "The requested loan amounts are missing on declines.",
          "Every declined applicant is a known default.",
          "Declined scores can never be calibrated.",
        ],
        answerIndex: 0,
        explanation:
          "The prior policy decides who gets an observable outcome, so the labeled set covers approved applicants and is a selected population rather than all applicants. Treating declines as defaults invents labels the system was never able to observe.",
      },
      {
        prompt: "What is the correct status for a 30-day-old case whose label requires a 90-day outcome window?",
        options: [
          "Negative, since nothing has happened yet",
          "Positive, pending a later reversal",
          "Censored: the window is still open",
          "Randomly assigned to keep balance",
        ],
        answerIndex: 2,
        explanation:
          "Two-thirds of the observation window remains, so the absence of an event is unknown rather than negative. Marking immature rows negative is what makes recent cohorts look artificially safe and makes calibration shift with row age.",
      },
      {
        prompt: "A team proposes waiting a full year so every credit label matures. Why does that not solve selective labels?",
        options: [
          "A year of waiting outruns any stable window.",
          "Declined applicants never produce an outcome.",
          "Survival models require censoring to remain.",
          "Reviewer rubrics change over that horizon.",
        ],
        answerIndex: 1,
        explanation:
          "Maturity cures delay, not selection: declined applicants generate no repayment outcome however long anyone waits, so bounded exploration, randomized boundary review, or partial-identification bounds are required. Confusing delayed feedback with selective labels is the exact error, since only the first is fixed by patience.",
      },
      {
        prompt: "Label agreement drops on busy days and the model starts predicting reviewer identity well. What is happening?",
        options: [
          "Concept drift is changing P(Y|X) in the queue.",
          "The calibration set is now too small to fit.",
          "Right censoring truncates the busy cohorts.",
          "The model is learning reviewer queue artifacts.",
        ],
        answerIndex: 3,
        explanation:
          "Human labels vary with rubric, adjudication, and queue pressure, so a model trained on them can fit the review process instead of the underlying truth; blind overlap, adjudication, and reviewer-aware audits are the mitigation. Reading it as concept drift sends the team to retrain on the same contaminated labels.",
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
    eyebrow: "Validate assignment before lift",
    estimatedMinutes: 75,
    summary:
      "Design assignment, exposure, power, analysis, and guardrails that identify product impact despite sample-ratio mismatch, interference, novelty, and repeated peeking.",
    whyItMatters:
      "An experiment is a distributed measurement system with a hash function, an eligibility filter, a logging pipeline, and a statistical contract, and any of the four can break while the dashboard keeps rendering a confident number. A 52/48 split on a planned 50/50 allocation is not a rounding artifact: it says the arms differ by something other than the treatment, and every lift on that page is uninterpretable until the cause is found.",
    objectives: [
      "Choose the randomization unit and exposure rule from the causal mechanism.",
      "Estimate detectable effects, duration, and guardrails before launch.",
      "Detect sample-ratio mismatch and instrumentation failures early.",
      "Reason about interference, position bias (ranking), novelty, and sequential decisions.",
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
          "Namespace experiments so two tests on the same surface cannot collide in the same hash. Salt the bucketing with the experiment id, and either place interacting tests in mutually exclusive layers or accept that what you are measuring is their interaction.",
        ],
      },
      {
        title: "Power, metrics, and inference",
        summary:
          "Precommit the hypothesis, primary metric, MDE, duration, and stopping rule.",
        points: [
          "Work the sample size backwards from the smallest effect you would actually act on. Detecting a 2% relative lift on a 5% conversion baseline at 80% power and alpha 0.05 needs on the order of 800,000 units per arm, and cluster randomization inflates that by the design effect; round the resulting duration up to whole business cycles so weekday mix cannot masquerade as treatment.",
          "Use one primary metric plus guardrails and predeclared slices. Variance reduction can improve sensitivity, but features used for adjustment must be pre-treatment.",
          "Repeated peeking inflates false positives under fixed-horizon tests; use a fixed horizon or a valid group-sequential or always-valid procedure.",
        ],
      },
      {
        title: "SRM, interference, and ranking effects",
        summary:
          "Validate the experiment before interpreting uplift.",
        points: [
          "Test the observed arm counts against the planned allocation with a chi-square before reading any outcome. On a planned 50/50, 520,000 against 480,000 is nowhere near chance, and it means something upstream—bucketing, an eligibility filter, bot removal, or differential logging—is selecting who enters the experiment. Fix that cause; reweighting the arms only hides it.",
          "Interference violates independent-unit assumptions when one user's treatment changes another's inventory, price, network, or creator outcomes; randomize clusters or model marketplace-wide effects.",
          "For rankers, interleaving mixes both orderings into one slate and asks the same user to choose, which removes between-user variance and can settle a preference question with roughly a tenth of the traffic an A/B test would need. It buys that sensitivity by answering a narrower question: only a long-running experiment shows whether the winner survives novelty wearing off, habits forming, or creators changing what they post.",
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
      {
        mode: "A novelty spike is read as durable lift",
        symptom: "The treatment effect is largest in the first days of exposure and decays toward zero as the experiment runs.",
        mitigation: "Run through at least two full business cycles, plot the effect by days since first exposure, and read the estimate from the stabilized period rather than the launch week.",
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
          "Read out the conversion lift per arm.",
          "Reweight the smaller arm and continue.",
          "Run an SRM test before outcome analysis.",
          "Drop treatment rows until counts match.",
        ],
        answerIndex: 2,
        explanation:
          "A 52/48 split over a million units is far outside chance, so assignment, eligibility, bot filtering, or logging is broken and any lift is confounded. Reweighting is the tempting repair and it is wrong: the defect is in who entered the experiment, not in the arithmetic.",
      },
      {
        prompt: "Why might seller-level randomization be better than buyer-level randomization for a marketplace ranking change?",
        options: [
          "Cluster assignment absorbs spillover via sellers.",
          "Seller clusters always require a far smaller sample.",
          "Randomizing sellers removes novelty effects.",
          "It equalizes revenue across the two arms.",
        ],
        answerIndex: 0,
        explanation:
          "Treated buyers change shared seller inventory and behavior that control buyers then encounter, so randomizing the seller puts the interference inside a cluster. Expecting cluster designs to need fewer samples is backwards: clustering costs power, and that cost is what buys an unbiased estimate.",
      },
      {
        prompt: "A team checks a fixed-horizon test daily for two weeks and stops the first time p falls below 0.05. What is the consequence?",
        options: [
          "Power rises because data is used sooner.",
          "The estimate stays unbiased, intervals widen.",
          "Only guardrail metrics become unreliable.",
          "The false-positive rate far exceeds 5%.",
        ],
        answerIndex: 3,
        explanation:
          "Fourteen looks at the same accumulating data give noise fourteen chances to cross the line, so realized alpha is several times the nominal 5% and reported wins fail to replicate. Believing early stopping merely saves time is the misconception; valid early stopping needs a group-sequential or always-valid procedure planned in advance.",
      },
      {
        prompt: "Only 8% of assigned users ever reach the changed surface. Which analysis stays valid?",
        options: [
          "Drop unexposed users from the treatment arm.",
          "Trigger on a pre-treatment rule, symmetrically.",
          "Compare exposed treatment with all controls.",
          "Re-randomize the exposed users into new arms.",
        ],
        answerIndex: 1,
        explanation:
          "Assignment is random but exposure happens after treatment, so the only valid narrowing is a trigger defined before treatment and applied identically to both arms; otherwise intention-to-treat over all assigned units is the estimand. Filtering only the treatment arm on observed exposure is the post-assignment selection bug that destroys comparability.",
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
    eyebrow: "Earn traffic in stages",
    estimatedMinutes: 65,
    summary:
      "Promote a complete model release through replay, shadow, canary, and ramp stages with compatibility checks, capacity protection, and automatic rollback.",
    whyItMatters:
      "Shadow traffic proves the new release can execute - features resolve, p99 holds, memory fits - and proves absolutely nothing about whether users end up better off, which is the entire reason canary cohorts, bake windows, and a rehearsed rollback path exist downstream of it.",
    objectives: [
      "Explain what shadow traffic can and cannot validate.",
      "Design canary routing, blocking guardrail metrics, bake windows, and automatic rollback.",
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
          "Mirror a representative sample of live requests asynchronously with both release identities pinned, then compare the two on the questions a shadow can actually answer: does every feature resolve, how far apart are the score distributions, how often do champion and candidate choose different actions, and do p99 latency and memory still fit the box.",
          "Shadowing validates execution and observational deltas but cannot measure treatment outcomes because users still experience the champion's action.",
          "Run the shadow under credentials that cannot write anything. Stubbing side effects one at a time is how a charge or a push notification eventually escapes; revoking the write path outright makes the mistake unavailable, and a separate capacity pool stops a slow shadow from stealing threads from the request it was copied from.",
        ],
      },
      {
        title: "Canary and controlled ramp",
        summary:
          "A canary exposes a small stable cohort to the new decision and expands only after evidence and bake time.",
        points: [
          "Route by deterministic user or entity hash where carryover matters; begin with internal or low-risk cohorts, then ramp 1%, 5%, 25%, 50%, and 100% only as gates pass.",
          "Attach a numeric gate to each ramp step instead of eyeballing a dashboard: error rate within 10% of champion, p99 inside its SLO, feature-miss and fallback rates flat, action rate inside a predeclared band, and no safety signal above zero. A gate nobody wrote down is a gate nobody enforces at 2 a.m.",
          "Use minimum sample and bake windows. Fast operational metrics can stop a release early, while delayed product outcomes may require holding at a safe percentage.",
        ],
      },
      {
        title: "Rollback as a designed path",
        summary:
          "Rollback must restore a known-compatible release quickly and predictably.",
        points: [
          "Rollback speed is decided long before the incident. Keep the whole previous release - artifact, feature schema, calibrator, threshold, and routing rule - loaded and addressable behind a pointer, so restoring it is a pointer flip taking seconds rather than a container pull and a cold model load taking minutes while the graph keeps falling.",
          "Automate rollback on hard guardrail metrics with hysteresis to avoid flapping; retain a manual kill switch and audit who invoked it.",
          "Forward-only data writes may make binary rollback unsafe, so use backward-compatible schemas, dual reads, or isolate model decisions from irreversible side effects.",
        ],
      },
      {
        title: "Capacity rehearsal before exposure",
        summary:
          "A release that is correct and 50 percent more expensive fails at the first traffic peak, not in the canary.",
        points: [
          "Load-test at the peak QPS the surface really sees, with the candidate-set sizes production really produces. A ranker whose per-item cost drifts from 0.4 ms to 0.6 ms quietly cuts the number of items that fit a 40 ms stage budget from 100 to 66, and that loss surfaces as missing recall rather than as a latency alert.",
          "Rehearse dependency failure before the ramp instead of during it: take the online feature store away in a staging replay and confirm the release follows its documented default path rather than holding the request thread until the deadline expires.",
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
          "That the new policy causally lifts retention.",
          "That live features, latency, and capacity hold.",
          "That users prefer the new ranking order.",
          "That treatment causes no marketplace spillover.",
        ],
        answerIndex: 1,
        explanation:
          "A shadow executes on mirrored traffic without owning the action, so it proves feature availability, latency, prediction deltas, and resource fit, and nothing about user response. Expecting a shadow to show causal lift is the error, because users still receive the champion's decision throughout.",
      },
      {
        prompt: "What should a robust rollback restore?",
        options: [
          "Only the previous weight file, kept warm",
          "Only the decision threshold and its version",
          "The compatible release: model through policy",
          "The oldest container image in the registry",
        ],
        answerIndex: 2,
        explanation:
          "The serving contract spans model, transforms, feature schema, calibration, threshold, and routing, and all of them must return together to a known-compatible state. Rolling back weights alone usually preserves the very incompatibility that caused the incident.",
      },
      {
        prompt: "During shadow validation, users start receiving duplicate notifications. What went wrong?",
        options: [
          "The shadow was allowed to perform writes.",
          "The canary ramp passed its bake window.",
          "Shadow and champion shared a cache key.",
          "The mirrored traffic was unrepresentative.",
        ],
        answerIndex: 0,
        explanation:
          "A shadow must be read-only: writes, notifications, charges, queue mutations, and feedback events are stubbed and its capacity isolated, or validation becomes the incident. Assuming a shadow is harmless because it does not serve the response is the misconception, since not serving is not the same as not acting.",
      },
      {
        prompt: "The primary outcome for a release matures in seven days. What does the module recommend for the ramp?",
        options: [
          "Ramp straight to 100% once error gates pass.",
          "Skip the canary and shadow for seven days.",
          "Automate rollback on the delayed outcome.",
          "Hold at a safe percentage until it matures.",
        ],
        answerIndex: 3,
        explanation:
          "Fast operational metrics can stop a release early but cannot clear it, so the ramp holds at a bounded percentage through a bake window until the delayed outcome arrives. Treating green latency and error gates as sufficient for full traffic is the shortcut staged delivery exists to prevent.",
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
    eyebrow: "Drift diagnoses, labels decide",
    estimatedMinutes: 80,
    summary:
      "Observe data, features, predictions, decisions, outcomes, slices, latency, and cost while distinguishing drift signals from evidence that retraining will improve the system.",
    whyItMatters:
      "A recommender that learns from its own exposure logs earns a better offline replay score every quarter while surfacing fewer distinct items every quarter, and no feature-distribution alarm fires, because the inputs never stopped looking normal. The signal that would catch it lives in the join between predictions and matured outcomes, dimensioned by prediction cohort and release - which under a 90-day label window means the trustworthy number about today's model arrives a quarter from now, and everything before it is a leading proxy that has to be labeled as one.",
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
          "The data layer answers one question: are the inputs still arriving intact? It watches whether the schema still matches, whether today's row count sits inside its usual band, whether any column's null rate has moved, and how old the newest event is against its freshness SLA. A p99 feature age of 40 minutes against a 15-minute SLA is a data-layer failure, and no model metric will ever name it.",
          "The serving layer answers whether the deployed release behaves like the one that was tested. Read the score distribution and the action rate beside the ordinary request rate, errors, and p99, because a release can hold every latency target while quietly doubling the share of traffic it routes to human review.",
          "The outcome layer answers whether the decisions were any good, and it is the only layer that can. It reports matured precision, recall, and calibration by prediction cohort and release, and it carries label coverage alongside every number, so a metric computed over 40% of a cohort is never read as though it described the whole cohort.",
          "Dimension all three layers by release rather than by wall clock. A metric plotted against time alone blends the outgoing and incoming releases throughout every ramp, which is precisely the window in which a regression is cheapest to catch and easiest to attribute.",
        ],
      },
      {
        title: "Drift diagnosis, not drift theater",
        summary:
          "Distribution change is a clue; degradation requires labels or a defensible task-specific proxy.",
        points: [
          "Covariate drift means P(X) changes; concept drift means P(Y|X) changes; prior shift means P(Y) changes. They imply different repairs and can occur independently.",
          "Reach for PSI, a KS statistic, or Jensen-Shannon divergence as a diagnostic attached to a named reference window, and read it against the same week a year earlier where seasonality is real. None of them says the model got worse: a PSI of 0.3 on a feature the model barely weights is noise, while 0.05 on the feature carrying most of the signal can be a genuine regression.",
          "When labels mature late, monitor leading process signals now and backfill outcome dashboards by prediction cohort; compare the same maturity age across releases.",
        ],
      },
      {
        title: "Feedback loops and safe adaptation",
        summary:
          "Predictions influence exposure, labels, and future training data.",
        points: [
          "A recommender exposes popular items, collects more interactions for them, then treats exposure-driven clicks as relevance; a fraud model blocks cases whose natural outcomes can no longer be observed.",
          "Log what the policy declined to do as carefully as what it did: the candidate set it saw, the propensity attached to each action it could have taken, and which cases a reviewer pulled out of the queue. Then hold back a randomized slice - 1% of traffic bypassing the model entirely - so one population's outcomes were never selected by the thing being measured.",
          "Treat a drift alarm as the first step of a pipeline rather than the last. Validate the data, wait for or acquire labels, train a candidate, and put it through the same temporal and slice gates as any other release before shadowing it. Retraining because a distance crossed a threshold skips every step that would have established whether the new model is actually better.",
        ],
      },
    ],
    tradeoffs: [
      {
        decision: "Sensitive drift alerts or stable actionable alerts",
        preferA: "Use sensitive diagnostics for investigation and high-harm features.",
        preferB: "Alert only on sustained, material changes tied to an owner and playbook, and keep drift distances as monitored metrics rather than promoting them to blocking guardrail metrics.",
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
      {
        mode: "Drift thresholds were calibrated on a quiet week",
        symptom: "Every seasonal peak reopens the same alert, and the on-call closes it unread within a minute.",
        mitigation: "Compare against the equivalent period a year earlier where seasonality is genuine, require an alarm to persist across several intervals before it pages, and delete any threshold nobody has acted on twice.",
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
          "Promote a retrained model automatically.",
          "Delete the drifting feature from serving.",
          "Silence drift alerts for that feature.",
          "Investigate causes, keep the usual gates.",
        ],
        answerIndex: 3,
        explanation:
          "Drift is a diagnostic clue rather than proof of degradation, so the response is data validation and continued outcome monitoring, with retraining only through labeled and staged gates. Auto-retraining on a distance alarm is the named failure mode: versions churn after benign seasonality or corrupted input.",
      },
      {
        prompt: "Which example is concept drift?",
        options: [
          "The device mix moves; behavior given features holds.",
          "Fraud probability changes for identical features.",
          "A column goes null after a pipeline outage.",
          "Server p99 latency climbs during peak hours.",
        ],
        answerIndex: 1,
        explanation:
          "Concept drift is a change in P(Y|X): the same observed features now imply a different outcome, as when attackers switch tactics. Calling a shift in device mix concept drift confuses it with covariate drift, where P(X) moves while the conditional relationship is intact.",
      },
      {
        prompt: "A recommender's offline replay keeps improving while discovery and diversity shrink. What is the mechanism?",
        options: [
          "Calibration drifted along with the base rate.",
          "The candidate index has grown stale on disk.",
          "It trains only on outcomes it chose to show.",
          "Replay is scored at the wrong maturity age.",
        ],
        answerIndex: 2,
        explanation:
          "The policy decides what is exposed, the logs record only those exposures, and training on them reinforces the incumbent while starving unshown items of evidence, so replay improves as real coverage narrows. Reading it as calibration drift misses that the data itself is selected by the model.",
      },
      {
        prompt: "Overall precision is flat but a new-market cohort has clearly regressed. What did the dashboard need?",
        options: [
          "Predeclared slices with support and maturity.",
          "A tighter global alert threshold on precision.",
          "More frequent recompute of the same rollup.",
          "One drift distance summarizing all features.",
        ],
        answerIndex: 0,
        explanation:
          "Stable high-volume traffic dilutes a cohort regression in the average, so outcome metrics are dimensioned by predeclared critical slice, release, and prediction cohort with uncertainty and label coverage. Tightening the global threshold is the reflex fix and it only trades a missed regression for noise, because the signal is not in the aggregate.",
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
      "Address position bias (ranking), feedback loops, experiment interference, and delayed satisfaction.",
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
      "position bias (ranking)",
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
          { from: "ann", to: "fuse", label: "neighbors" },
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
            "Pin every feature to the index version that produced it, because a term-match score computed under one tokenizer and a semantic score computed under another describe different documents wearing the same id.",
          ],
        },
        {
          title: "Training and evaluation",
          summary: "Train on realistic retrieved negatives and gate every query regime.",
          points: [
            "Generate hard negatives from the active hybrid retriever, preventing the ranker from learning only trivial separations.",
            "Optimize pairwise or listwise ranking while validating task completion and calibrated satisfaction where probabilities are consumed.",
            "Report each query regime on its own line with an interval, because head queries dominate the aggregate: an exact-identifier query that stops returning its document is invisible in a corpus-wide NDCG. Interleave first for sensitivity, then A/B test for absolute product impact.",
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
        caption: "Calibrated probability drives the auction, so the model cannot be evaluated on ranking alone; delayed conversions arrive on their own path and must not be labeled negative early.",
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
            "Gate on probability quality per placement, not on one global number: a model that is calibrated in aggregate can overprice a low-CTR placement by a factor of two, and the auction spends real money on that error every impression.",
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
            "Translate every candidate into the two numbers the credit committee argues about - the approval rate it implies and the bad rate that follows - and show reliability by slice underneath them, since a ranking gain that moves neither number buys nothing.",
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
      "Dropping canceled or heavily delayed trips without analyzing selection bias.",
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
            "Report signed error next to MAE, because a route that runs four minutes late half the time and four minutes early the rest scores the same MAE as one that is never wrong, and only the first one loses customers. Break both out by stage, region, and incident, and add the tail-miss rate that averages hide.",
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
