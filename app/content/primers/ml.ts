import type { TopicPrimerEntry } from "../types";

/**
 * From-zero explanations for the ML system design modules. These assume no
 * machine learning background at all: precision, calibration, and embeddings
 * are built up from scratch rather than assumed. The distributed-systems
 * vocabulary from tier 0 is assumed.
 */
export const mlPrimers: Record<string, TopicPrimerEntry> = {
  "ml-problem-framing": {
    primer: {
      plainSummary:
        "Machine learning interviews are lost in the first five minutes far more often than in the modelling discussion. The reason is that most candidates start choosing models before establishing what decision the model informs, who or what is being predicted about, at what moment, and what it costs to be wrong in each direction. This module is about that framing, and about the baseline you should build before any model at all.",
      analogy:
        "Hiring a weather forecaster for an outdoor event. The useful question is not 'how accurate is the forecast' but 'what will we do differently based on it'. If the only decision is whether to hire a marquee, and the marquee must be booked a week ahead, then a brilliant forecast issued the day before is worthless, and the cost of the two mistakes is wildly asymmetric - an unused marquee costs money, a soaked event costs the whole occasion. Every one of those considerations is decided before anyone discusses forecasting technique.",
      sections: [
        {
          heading: "Start from the decision, not the prediction",
          body: [
            "A model produces a number. That number is worth nothing until something changes because of it. So the first thing to establish is the decision policy: what action the system takes, at what threshold, and what happens by default. 'Predict fraud' is not a problem statement. 'Block a transaction, or route it to manual review, or let it through' is, because it tells you the number must be comparable against a threshold and that there are three possible actions rather than two.",
            "Four things are commonly conflated and must be separated. The user outcome is what the person experiences. The business outcome is what the company measures. The model output is the number produced. The decision is the action taken. A recommender may output a click probability while the business cares about long-term retention and the user cares about finding something worth watching - three different things, and optimising the first while claiming the third is how recommender systems degrade into clickbait.",
            "Then pin down the unit of prediction: what is one row? One transaction, one user-session, one user-item pair, one delivery? This determines the data model, how examples are counted, and what the metrics even mean. Two candidates can describe the same system and mean different things until this is stated.",
            "Finally, decision time and prediction horizon. Decision time is the moment the prediction must exist, which determines what information is available - you cannot use a feature computed from data that arrives later, and this is the single most common source of a model that performs brilliantly offline and fails completely in production. The horizon is how far ahead you are predicting: churn within 30 days is a different problem from churn within a year, with different labels, different features, and a different feedback delay before you learn whether you were right.",
          ],
        },
        {
          heading: "Objectives, proxies, and the cost of each error",
          body: [
            "The thing you truly care about is rarely directly trainable. Long-term satisfaction cannot be labelled today, so teams substitute a proxy - clicks, watch time, purchases - that is measurable now and correlated with the goal. This substitution is often necessary and always dangerous, because the model optimises the proxy exactly, including in the regions where the proxy and the goal diverge.",
            "The failure has a name worth using: the proxy is a measure, and once a measure becomes a target it stops being a good measure, because the system finds the ways to move the measure that do not move the goal. Optimising clicks produces sensational headlines; optimising watch time produces autoplay loops. So state your proxy explicitly, state how it can diverge from the real objective, and name the guardrail metric that would detect the divergence.",
            "Then quantify the asymmetry of errors, because a single accuracy number assumes all mistakes cost the same and they almost never do. Two error types matter. A false positive is predicting the event when it did not occur - blocking a legitimate transaction. A false negative is missing an event that did occur - letting fraud through. For fraud, a false negative costs the transaction value while a false positive costs a frustrated customer, and these are not remotely equal. For medical screening the asymmetry is far larger and in the other direction.",
            "This asymmetry is what actually sets the decision threshold, and it is where the theoretically correct answer is easy to state: act when the expected cost of acting is lower than the expected cost of not acting, which for a well-calibrated probability reduces to comparing it against a threshold derived from the relative costs. Naming the cost ratio - even roughly, as 'a missed fraud costs about twenty times a false alarm' - converts threshold selection from a tuning exercise into a business decision, and it is the sentence that most distinguishes a senior answer here.",
          ],
        },
        {
          heading: "Baselines and proving value in stages",
          body: [
            "Before any model, build the non-ML baseline: a rule, a heuristic, a popularity ranking, a simple statistic. This is not a formality. It establishes what the model must beat to be worth its complexity, and it is frequently much stronger than expected - recommending the most popular items is a genuinely hard baseline to beat, and a fraud rule of 'flag transactions over 10,000 from new accounts' catches a meaningful share of fraud with no infrastructure at all.",
            "The baseline also gives you something to ship immediately, which matters because it starts producing the data and the feedback loop a model will eventually need. And it protects against the outcome where a team spends six months building a model that performs slightly worse than three lines of business logic, which happens more often than anyone admits.",
            "Say out loud what would make the model unnecessary. If the baseline achieves most of the available value, the correct engineering answer may be to stop. Interviewers notice candidates who can say this, because it demonstrates you are solving a problem rather than performing machine learning.",
            "Then define the launch criterion before building: what offline metric, on what slices, plus what online result, would justify deployment. Deciding this afterwards means deciding it while looking at results you are motivated to accept, which is how models get launched on the strength of an improvement that was noise.",
            "Finally, list the hard constraints early, because they eliminate architectures. Latency - a model in a checkout path has perhaps 50 milliseconds, which rules out large models and multi-hop feature fetches. Capacity - how many manual reviews can the fraud team actually perform per day, since a threshold producing ten thousand daily reviews for a team of five is not a threshold. Privacy and regulation - some features may not be legally usable, and in some domains decisions must be explainable, which constrains model choice directly. And the fallback: what the system does when the model is unavailable, which must be answered because it will happen.",
          ],
        },
      ],
      workedExample: {
        title: "Framing a fraud detection problem before choosing a model",
        setup:
          "A payments company wants machine learning to reduce fraud. Currently a rules engine flags about 2 percent of transactions for manual review, and a team of 20 analysts reviews them. Fraud is about 0.1 percent of transactions.",
        steps: [
          "Establish the decision and its options. Not 'predict fraud' but three actions: allow, review, block. That means two thresholds rather than one, and it means the model output must be a calibrated probability so thresholds correspond to actual risk rather than to arbitrary score cut-offs.",
          "Establish capacity, which turns out to bound the design. Twenty analysts reviewing perhaps 200 transactions daily each gives 4,000 reviews per day. At 10 million daily transactions that is 0.04 percent - so the review threshold is determined by staffing, not by the model. Any solution routing more than 4,000 transactions to review is not deployable regardless of its accuracy, and noticing this early changes what you optimise for.",
          "Quantify the error asymmetry. A missed fraud costs the transaction value, average 120 dollars. A wrongly blocked legitimate transaction costs the margin on that sale plus a real risk of losing the customer - call it 40 dollars in expectation. So the cost ratio is roughly 3:1 against missed fraud, which sets the block threshold: block when the fraud probability exceeds roughly one in four, not at the intuitive 50 percent.",
          "Pin the unit and the decision time. The unit is one transaction. The decision time is during authorisation, with a budget of about 100 milliseconds, which rules out anything requiring a slow feature lookup or a large model. And it rules out any feature that is only known after the transaction completes - chargeback data, for instance, exists in the training data and cannot exist at decision time.",
          "Name the horizon and the feedback delay. Fraud is confirmed by a chargeback, which can arrive up to 90 days later. So labels for recent transactions are incomplete, and evaluating a model on last week's data will understate fraud because most of it has not been reported yet. This single fact shapes training data construction, evaluation windows, and how quickly the model can be retrained - and it is the detail most candidates miss entirely.",
          "Set the baseline and the launch criterion. The existing rules engine is the baseline, with its current catch rate and review volume measured. The model must catch materially more fraud at the same review capacity, hold across slices such as new accounts and international transactions, and be decided before results are seen.",
        ],
        takeaway:
          "Not one word about model architecture, and yet the design is now heavily constrained: a calibrated probability, two thresholds set by cost ratio and by staffing, a 100 millisecond budget, features restricted to what exists at authorisation time, and evaluation that accounts for a 90 day label delay. Candidates who begin with gradient boosting versus neural networks skip all of this, and it is all of this that determines whether the system works.",
      },
    },
    glossary: [
      { term: "Decision policy", definition: "What action the system takes given a model output, and at what threshold. Without it a prediction changes nothing and has no value." },
      { term: "Unit of prediction", definition: "What one row represents - a transaction, a user-session, a user-item pair. Determines the data model and what every metric means." },
      { term: "Decision time", definition: "The moment a prediction must exist, which bounds what information can be used. Using data that arrives later is the classic cause of offline success and production failure." },
      { term: "Prediction horizon", definition: "How far into the future the prediction reaches. Determines label definition and how long before you learn whether you were right." },
      { term: "Proxy objective", definition: "A measurable stand-in for what you actually care about, such as clicks for satisfaction. Necessary and dangerous, because the model exploits exactly where proxy and goal diverge." },
      { term: "Guardrail metric", definition: "A metric watched to detect the proxy diverging from the real objective, even when the proxy is improving." },
      { term: "False positive", definition: "Predicting the event when it did not occur - blocking a legitimate transaction, or flagging a healthy unit as defective. Its cost is what makes precision matter." },
      { term: "False negative", definition: "Missing an event that did occur - letting fraud through, or passing a defective unit. Its cost relative to a false positive is what sets the decision threshold." },
      { term: "Cost matrix", definition: "The relative cost of each error type. What actually determines the decision threshold, converting it from tuning into a business decision." },
      { term: "Bayes decision rule", definition: "Act when the expected cost of acting is below the expected cost of not acting. For a calibrated probability this reduces to a threshold set by the cost ratio." },
      { term: "Non-ML baseline", definition: "A rule or simple statistic the model must beat to justify its complexity. Frequently much stronger than expected, and shippable immediately." },
      { term: "Launch criterion", definition: "The offline and online results that would justify deployment, agreed before building rather than while looking at tempting results." },
      { term: "Fallback path", definition: "What the system does when the model is unavailable or its inputs are missing. Required, because it will happen." },
    ],
  },

  "ml-metrics-slices": {
    primer: {
      plainSummary:
        "A single accuracy number is almost always misleading, and on rare-event problems it is worse than useless. This module builds up the metric vocabulary from scratch - what precision and recall actually mean, when the popular ranking metric flatters a bad model, why probabilities need a separate check - and then covers the discipline of measuring subgroups without fooling yourself with statistics.",
      analogy:
        "A doctor claiming 99 percent accuracy at diagnosing a disease that affects 1 percent of people. They achieve it by telling everyone they are healthy. The number is real and the doctor is useless, and no amount of precision in reporting that 99 percent fixes it. Every metric problem in this module is a version of that: a number that is technically correct while describing something other than what you care about.",
      sections: [
        {
          heading: "Precision, recall, and why accuracy fails",
          body: [
            "Start with the four outcomes of a binary decision. A true positive is a correct positive prediction, a false positive is a wrong one, a true negative is a correct negative, and a false negative is a missed positive. Every binary metric is built from these four counts.",
            "Accuracy is the fraction of all predictions that were correct. It is intuitive and it collapses whenever classes are imbalanced, because the majority class dominates it. If 0.1 percent of transactions are fraudulent, predicting 'never fraud' scores 99.9 percent accuracy while catching nothing. Accuracy is only informative when classes are roughly balanced and both errors cost about the same.",
            "Precision answers: of the things I flagged, what fraction were real? It is the metric that matters when acting on a positive is expensive - if you flag a thousand transactions and five are fraudulent, precision is 0.5 percent and you have wasted an enormous amount of review capacity. Recall answers: of the real positives, what fraction did I catch? It matters when missing one is expensive.",
            "The two trade off against each other, and the trade-off is controlled by the threshold. Lower the threshold and you flag more things, catching more real positives (higher recall) while flagging more innocent ones (lower precision). Raise it and the reverse. So precision and recall are meaningless without stating the threshold, and quoting one without the other is a way to make any model look good. The F1 score combines them into a single number as their harmonic mean, which is convenient and hides the trade-off - it implicitly assumes precision and recall matter equally, which the cost asymmetry usually contradicts.",
            "A better summary for rare events is the precision-recall curve, which plots the trade-off across all thresholds, and the area beneath it. This is where a specific warning belongs. ROC-AUC - the area under the receiver operating characteristic curve - is the most commonly quoted metric and is misleading on rare-event problems. It plots true positive rate against false positive rate, and because false positive rate has the enormous negative class in its denominator, a large absolute number of false positives barely moves it. A model can show ROC-AUC of 0.95, which sounds excellent, while its precision at any usable threshold is 2 percent. PR-AUC uses precision instead and does not hide this. When someone quotes a strong ROC-AUC on an imbalanced problem, asking for precision at the operating threshold is the right question.",
          ],
        },
        {
          heading: "Ranking and probability need their own metrics",
          body: [
            "Many systems do not make a binary decision at all - they order things. For ranking, what matters is whether good items appear near the top, since users see position one far more than position ten. Metrics must therefore weight by position.",
            "NDCG - normalised discounted cumulative gain - does exactly this. Each result's relevance is discounted logarithmically by its position, so an excellent item at rank one contributes far more than the same item at rank twenty, and the total is normalised against the best possible ordering so scores are comparable across queries with different numbers of relevant results. Simpler alternatives are precision at k, the fraction of the top k that were relevant, and mean reciprocal rank, driven by the position of the first relevant result, which suits problems with one correct answer.",
            "Separately, some systems need the probability itself to be meaningful, not just the ordering. If you use a predicted probability to compute an expected value - expected fraud loss, expected revenue from showing an ad - then a model that ranks perfectly but outputs numbers twice as large as reality will produce wrong decisions everywhere. A model is calibrated when among the cases it assigns 0.3, about 30 percent are actually positive.",
            "Calibration is a genuinely separate property from ranking quality, and this is the point most often missed: a model can have excellent AUC and terrible calibration, because AUC only depends on the ordering of scores and is completely unchanged if you square every one of them. Measure calibration with a reliability plot, which buckets predictions and compares average predicted probability against observed frequency, and summarise with expected calibration error. Log loss and the Brier score are proper scoring rules that penalise both wrong ordering and wrong confidence together, which makes them good training objectives and slightly harder to interpret in isolation.",
          ],
        },
        {
          heading: "Slices, and the statistics of not fooling yourself",
          body: [
            "An aggregate metric is an average over populations that may behave completely differently, and averages hide the groups being failed. A model can improve overall while degrading badly for new users, for one country, or for a device type - and if those groups are small, the aggregate does not move at all.",
            "So evaluate on slices chosen before looking at results: user tenure, geography, device, language, traffic source, item popularity, and any group where fairness matters. Choosing slices afterwards, by hunting for interesting differences, is how noise becomes a finding.",
            "This is the multiple comparisons problem, and it is worth stating with a number. If you test 100 slices at the conventional 5 percent significance level, you expect about 5 false discoveries by chance alone, even when nothing is wrong anywhere. A dashboard with hundreds of segments will always show something 'significant', and treating each as a real finding produces a team permanently chasing noise. Corrections such as Bonferroni or false discovery rate control adjust for this, and the simpler discipline is to pre-register a small set of slices that matter.",
            "Small slices need particular caution because they have wide confidence intervals. A slice with 50 examples can show a dramatic difference that is entirely consistent with random variation. Always report an interval alongside a point estimate, and set a minimum sample size below which a slice is reported as inconclusive rather than as a result. Two numbers with overlapping intervals are not different, however different the point estimates look.",
            "Finally, connect offline metrics to online outcomes explicitly. Offline metrics are measured on logged historical data, which reflects what the old system chose to show - so a new model that would have surfaced different items is being evaluated on a population it did not select, and the correlation between offline improvement and online improvement is often much weaker than assumed. Offline metrics are a filter to decide what deserves an online test, and the online test is the evidence. Treating an offline gain as proof is the most expensive mistake in this module.",
          ],
        },
      ],
      workedExample: {
        title: "A model with excellent AUC that is useless in production",
        setup:
          "A team reports ROC-AUC of 0.94 for a fraud model, comfortably beating the rules engine. It is deployed at a threshold sized to the review team's capacity of 4,000 transactions per day. Analysts report that almost everything they review is legitimate, and confirmed fraud has barely fallen.",
        steps: [
          "Compute precision at the actual operating threshold, which nobody had done. Out of 10 million daily transactions, 0.1 percent - 10,000 - are fraudulent. Sending the top 4,000 by score to review catches perhaps 800 of them, so precision is 20 percent and recall is 8 percent. The AUC of 0.94 was real, and both of these numbers are also real. The metric was answering a different question from the one the business had.",
          "Explain why AUC concealed it. ROC-AUC's false positive rate divides by 9,990,000 negatives, so even 3,200 false positives moves it by 0.03 percent. The metric is structurally insensitive to absolute false positive volume, which is exactly the quantity that determines whether the review team's day is useful. Switch to PR-AUC and precision at the capacity threshold, which cannot hide this.",
          "Check calibration before trusting any expected-value reasoning. A reliability plot shows the model outputs 0.6 for cases that are truly fraudulent about 15 percent of the time - badly overconfident, most likely because it was trained on downsampled negatives without correcting the resulting probability shift. Any threshold derived from cost ratios was therefore wrong, since it assumed the probabilities meant something.",
          "Recalibrate rather than retrain. Fit isotonic regression on a held-out set to map raw scores onto observed frequencies. Ranking is unchanged - so AUC does not move at all, which is itself a useful demonstration that the two properties are independent - but now a predicted 0.25 corresponds to a genuine one-in-four risk and the cost-based threshold means what it claims.",
          "Slice the results and find where the model actually fails. Overall precision of 20 percent decomposes into 45 percent for established accounts and 4 percent for accounts under seven days old - and new accounts are where fraud concentrates. The model is failing hardest exactly where it matters most, and the aggregate number said nothing about it. Pre-registered slices would have caught this before deployment.",
          "Fix the evaluation process, not just this model. Report PR-AUC and precision at the capacity threshold as the headline metrics, publish calibration alongside, evaluate a pre-registered slice list with confidence intervals and a minimum sample size, and require an online test before any claim of impact - since offline evaluation on logged data from the rules engine cannot tell you how the model behaves on transactions the rules engine never flagged.",
        ],
        takeaway:
          "Nothing was fabricated and nobody was careless with arithmetic; the metric was simply insensitive to the quantity the business cared about. That is how metric mistakes actually happen. The habit worth taking away is to always ask what a metric is insensitive to, and to check the number at the threshold you will really operate at rather than a summary across thresholds you will never use.",
      },
    },
    glossary: [
      { term: "True/false positive, true/false negative", definition: "The four outcomes of a binary decision, from which every binary metric is built." },
      { term: "Accuracy", definition: "Fraction of all predictions that were correct. Collapses under class imbalance, where predicting the majority class always scores well." },
      { term: "Precision", definition: "Of the cases flagged, the fraction that were real. Matters when acting on a positive is expensive." },
      { term: "Recall (sensitivity)", definition: "Of the real positives, the fraction caught. Matters when missing one is expensive." },
      { term: "Precision-recall trade-off", definition: "Lowering the threshold raises recall and lowers precision. Neither number means anything without stating the threshold." },
      { term: "F1 score", definition: "The harmonic mean of precision and recall. Convenient, and it hides the trade-off by assuming the two matter equally." },
      { term: "ROC-AUC", expansion: "area under the receiver operating characteristic curve", definition: "Probability a random positive scores above a random negative. Misleading on rare events, because the huge negative class makes it insensitive to absolute false positive volume." },
      { term: "PR-AUC", expansion: "area under the precision-recall curve", definition: "Summarises the precision-recall trade-off. The right summary metric for imbalanced problems, since it cannot hide false positive volume." },
      { term: "NDCG", expansion: "normalised discounted cumulative gain", definition: "A ranking metric discounting relevance by position and normalising against the ideal ordering, so scores compare across queries." },
      { term: "Precision at k", definition: "The fraction of the top k results that were relevant. Simple and directly interpretable for a fixed-size result page." },
      { term: "MRR", expansion: "mean reciprocal rank", definition: "Driven by the position of the first relevant result. Suits problems with a single correct answer." },
      { term: "Calibration", definition: "Whether predicted probabilities match observed frequencies - among cases scored 0.3, about 30 percent are positive. Independent of ranking quality." },
      { term: "Reliability plot", definition: "Predicted probability bucketed against observed frequency. The standard visual check for calibration." },
      { term: "Expected calibration error", definition: "The average gap between predicted probability and observed frequency across buckets." },
      { term: "Log loss / Brier score", definition: "Proper scoring rules penalising both wrong ordering and wrong confidence, which makes them good training objectives." },
      { term: "Slice evaluation", definition: "Measuring on pre-registered subgroups, since aggregates hide degradation in groups too small to move the average." },
      { term: "Multiple comparisons problem", definition: "Testing many slices produces false discoveries by chance - about 5 per 100 tests at the 5 percent level, even when nothing is wrong." },
      { term: "Confidence interval", definition: "The range consistent with the observed data. Two estimates with overlapping intervals are not different, however different they look." },
      { term: "Offline-online gap", definition: "The weak correlation between offline metrics on logged data and online results, since logged data reflects what the old system chose to show." },
    ],
  },

  "ml-data-labels-leakage": {
    primer: {
      plainSummary:
        "A label is the answer a model learns from, and defining one is far less obvious than it sounds - 'fraudulent' is not a fact sitting in a database but an operational definition involving who decided, when, and after how long. This module is about constructing labels honestly, and about leakage: the family of bugs where information from the future or from the answer itself contaminates training data and produces a model that looks superb and fails completely.",
      analogy:
        "Setting an exam using last year's paper, having accidentally left the answers printed faintly on the back. Every student scores brilliantly and you conclude they have mastered the material. The mistake is invisible from the results alone - the marks look wonderful, and the better the answers show through, the better everyone appears to do. Leakage is exactly this, and its signature is the same: performance that is too good, which is a warning sign rather than a success.",
      sections: [
        {
          heading: "Labels are operational definitions, not facts",
          body: [
            "Writing down a label definition forces four questions. What event counts? Over what window? Who or what decided? And when did the decision become available?",
            "Consider churn. Is a user churned if they have not opened the app in 30 days, or 60, or if they cancelled a subscription? Each gives a different dataset, a different base rate, and a different model. There is no true answer - only a definition chosen to match the decision the model supports. If the business acts by sending a retention offer that takes a week to have effect, then a label defined on 7 days of inactivity is useless because by the time it fires the intervention window has closed.",
            "The attribution window matters just as much. If a user clicks an ad and buys three weeks later, is that a conversion? A 1-day window and a 30-day window produce different labels for identical behaviour, and comparing models trained under different windows is meaningless.",
            "Then there is censoring, which is the most underrated idea here. Right censoring means the outcome has not been observed yet - a transaction 5 days old might still be disputed within the 90 day chargeback window, so it is not 'not fraud', it is 'not yet known'. Treating unresolved cases as negatives systematically understates the positive rate, and the effect is strongest on the most recent data, which is exactly what you most want to train on. The correct handling is either to exclude immature examples or to model the maturity explicitly, and either way the training cutoff must sit far enough in the past for labels to have matured.",
            "Finally, decide which examples are eligible to be negatives at all. If a fraud model only ever sees transactions the current rules engine allowed, the blocked ones are absent - so the training data describes a filtered world. This is selection bias, and it means the model learns about the population the existing system chose to let through rather than the population it will actually score.",
          ],
        },
        {
          heading: "Leakage: the failure that looks like success",
          body: [
            "Leakage is any situation where training data contains information that will not be available, or is a consequence of the answer, at prediction time. The signature is a model that performs implausibly well, which should always trigger investigation rather than celebration.",
            "Target leakage is the most direct form: a feature that is a consequence of the label. A fraud model given a 'chargeback_amount' feature will be nearly perfect, because chargebacks only exist for fraud - and at decision time the field is empty for every transaction. Similar cases include a field populated by the very process the model is meant to trigger, such as 'assigned_reviewer', or an aggregate silently updated after the outcome.",
            "Temporal leakage is subtler and more common. It occurs whenever a feature is computed from data that did not exist at decision time. A feature such as 'average transaction amount for this customer' computed over the whole dataset includes transactions from after the one being scored. The bug is invisible in code and produces a large, entirely fictitious improvement - and it survives many code reviews because the feature name sounds innocuous.",
            "Group leakage happens when related rows are split across training and test sets. If one patient has ten scans and some land in each set, the model can memorise the patient rather than the condition, and the test score measures memorisation. The fix is to split by the natural group - by patient, by user, by session - rather than by row.",
            "Train-test contamination is the process-level version: any decision made by looking at the test set leaks it. Fitting a scaler or an imputation statistic on all data before splitting, selecting features by their correlation with the target across everything, or tuning hyperparameters repeatedly against the same test set all leak information gradually. The last is the sneakiest, because no single evaluation is wrong - the leak accumulates through repetition, which is why a genuinely held-out final set that is looked at once is worth maintaining.",
          ],
        },
        {
          heading: "Point-in-time correctness and data contracts",
          body: [
            "The systematic defence against temporal leakage is to build every training example as of its decision time, which requires distinguishing two timestamps for every fact. Event time is when something happened in the world. Availability time is when your system knew about it. These differ constantly - a chargeback occurs on day 40 and lands in your warehouse on day 42, a batch job computes yesterday's aggregate at 3am today.",
            "A point-in-time join constructs features using only rows whose availability time precedes the example's decision time. It is more expensive than an ordinary join and it is the difference between a model that works and one that does not. If you can state only one implementation detail about training data in an interview, this is the one, because it is the mechanism rather than the warning.",
            "This is also the deep reason feature platforms exist. When training features are computed by a SQL query over the warehouse and serving features are computed by application code, the two will diverge - different defaults for missing values, different time zones, different rounding, different definitions of 'last 30 days'. That divergence is training-serving skew, and it degrades models silently because nothing errors. Sharing one transformation definition between training and serving is the structural fix.",
            "Treat datasets as versioned immutable artefacts, exactly as you would code. A model is reproducible only if the exact data that produced it can be reconstructed, and 'we retrained on the latest data' is not a description anyone can reproduce or debug. Record lineage: which raw sources, which transformations, which code version.",
            "Finally, validate data continuously with explicit contracts, because data quality failures are silent by nature. Check schema, null rates, value ranges, category sets, row counts, and freshness on every run, and alert on distribution shifts in inputs. A model receiving a feature that has silently become all zeros because an upstream job changed will keep serving predictions with no error anywhere, and the only way to find out is to have been checking.",
          ],
        },
      ],
      workedExample: {
        title: "A churn model with suspiciously good results",
        setup:
          "A churn model reports 0.97 AUC in offline evaluation, far above the 0.78 of the previous model. The team is preparing to launch. The features include account tenure, usage counts, support ticket counts, and a 'days since last login' feature.",
        steps: [
          "Treat the number itself as the first evidence. A jump from 0.78 to 0.97 on the same problem with the same feature families is not plausible as a modelling improvement. Implausibly good results should be investigated as bugs before being reported as wins, and the discipline of doing this is worth more than any particular leakage check.",
          "Trace each feature to its availability time. 'Days since last login' is computed at dataset build time rather than at the prediction decision point. Churn is defined as 30 days of inactivity - so for a churned user this feature is 30 or more by construction. The feature is a restatement of the label. The model has learned 'if days since last login is at least 30, predict churn', which is not a prediction but a definition.",
          "Look for the second, quieter leak. Support ticket counts are computed over each user's full history, including tickets filed after the prediction date. Users about to churn file more tickets, so this feature carries information from the future. Less dramatic than the first, and it would have survived review because the feature name looks entirely reasonable.",
          "Rebuild with point-in-time joins. Fix a decision date per example, and compute every feature using only facts whose availability time precedes it. Days since last login becomes days as of the decision date; ticket counts become tickets before the decision date. AUC falls to 0.81 - modestly better than the baseline, and now real.",
          "Check the label for censoring. Users whose 30-day window has not fully elapsed cannot yet be labelled churned, and marking them as retained biases the recent data toward negatives. Move the training cutoff back so every example has a matured label, accepting that the freshest month of data is unusable for training.",
          "Prevent recurrence structurally rather than by vigilance. Require every feature to declare its availability time and reject any whose value could postdate the decision. Move feature computation into a shared definition used by both training and serving, so a feature that cannot be computed at serving time cannot be trained on. Keep a final held-out period that is evaluated once.",
        ],
        takeaway:
          "Both leaks were ordinary-looking features that nobody wrote carelessly, and the only signal from the outside was a suspiciously good number. That is why leakage is defended against structurally - by point-in-time construction and by shared feature definitions - rather than by remembering to check. A model that cannot be computed at serving time should be impossible to train, not merely discouraged.",
      },
    },
    glossary: [
      { term: "Label", definition: "The answer a model learns from. An operational definition involving a rule, a window, a decider, and a time - not a fact sitting in a database." },
      { term: "Event time vs availability time", definition: "When something happened versus when your system knew about it. The distinction that makes point-in-time correctness possible." },
      { term: "Label window", definition: "The period over which the outcome is observed. Different windows give different labels for identical behaviour, so models trained under different windows are not comparable." },
      { term: "Right censoring", definition: "The outcome has not been observed yet. Treating unresolved cases as negatives understates the positive rate, most severely on the most recent data." },
      { term: "Label maturity", definition: "Whether enough time has passed for a label to be trustworthy. Determines how far back the training cutoff must sit." },
      { term: "Selection bias", definition: "Training only on examples the existing system allowed through, so the data describes a filtered population rather than the one the model will score." },
      { term: "Leakage", definition: "Training data containing information unavailable at prediction time or derived from the answer. Its signature is performance that is too good." },
      { term: "Target leakage", definition: "A feature that is a consequence of the label, such as a chargeback amount in a fraud model. Empty at decision time for every real request." },
      { term: "Temporal leakage", definition: "A feature computed from data that did not exist at decision time, such as an aggregate spanning the whole dataset. Invisible in code and produces large fictitious gains." },
      { term: "Group leakage", definition: "Related rows split across train and test, letting the model memorise the entity rather than learn the pattern. Fixed by splitting on the natural group." },
      { term: "Train-test contamination", definition: "Any decision informed by the test set - fitting scalers before splitting, or repeatedly tuning against it. Accumulates through repetition rather than in one error." },
      { term: "Point-in-time join", definition: "Building features using only facts available before the example's decision time. The mechanism that structurally prevents temporal leakage." },
      { term: "Training-serving skew", definition: "Divergence between how features are computed in training and in serving. Silent, because nothing errors - only accuracy degrades." },
      { term: "Dataset versioning and lineage", definition: "Treating datasets as immutable versioned artefacts with recorded sources and transformations, without which a model cannot be reproduced or debugged." },
      { term: "Data contract", definition: "Automated checks on schema, null rates, ranges, row counts, and freshness, since data quality failures produce no errors and no exceptions." },
    ],
  },

  "ml-feature-platforms": {
    primer: {
      plainSummary:
        "A feature is an input to a model - a number describing something about the entity being scored. The difficulty is that the same feature must be computed twice: once over history to train, and once in milliseconds to serve, by different code, in different systems. This module is about the platform that makes those two agree, because when they disagree the model degrades silently with no error anywhere.",
      analogy:
        "A recipe developed by a chef and executed by a factory. The chef weighs by hand and tastes as they go; the factory uses machines and fixed timings. Even with everyone acting in good faith, the outputs differ - and nobody can taste the difference until customers complain, by which time months of production have shipped. The fix is not more care, it is one specification that both the kitchen and the factory execute.",
      sections: [
        {
          heading: "A feature platform is a contract, not a key-value store",
          body: [
            "The naive view is that a feature store is a fast database of precomputed values. That misses the point. Its real job is to guarantee that a feature means the same thing in training and in serving, which is a definitional problem before it is a storage problem.",
            "So the central artefact is the feature definition: a named transformation from raw data to a value, owned by someone, versioned, and documented. 'Number of transactions in the last 30 days' is not a self-evident quantity - is it the last 30 calendar days, or 720 hours? In which time zone? Does it include the current in-flight transaction? Does a cancelled transaction count? Two engineers implementing this independently will produce different numbers, and both will look right in review.",
            "The platform then has several parts. The offline store holds full history for building training sets, optimised for large scans, typically a columnar warehouse. The online store holds only current values for serving, optimised for single-key reads in single-digit milliseconds, typically a key-value store. Materialisation is the process keeping the online store fed from the same definitions. A metadata layer records ownership, lineage, freshness, and which models consume which features, and that last relationship matters more than it sounds - without it, nobody can safely change or delete a feature, so features accumulate forever.",
            "The property that makes the whole thing worthwhile: a feature is defined once and both paths derive from that definition. Two implementations of one definition is the failure mode the platform exists to prevent, and a design that stores values without unifying definitions has built a cache, not a feature platform.",
          ],
        },
        {
          heading: "Three compute paths, chosen by freshness",
          body: [
            "Features are computed in one of three places, and the choice follows from how fresh the value must be.",
            "Batch computation runs on a schedule over the warehouse - hourly or daily - and suits features that change slowly: a user's country, their 90-day average order value, an item's category. It is cheap, easy to backfill, and its freshness is bounded by the schedule, so a daily job means values can be almost 24 hours stale.",
            "Streaming computation consumes an event stream and updates values continuously, giving seconds of freshness. It suits features that change meaningfully within a session - transactions in the last hour, items viewed in this visit. It costs considerably more to build and operate, and it introduces its own correctness questions about late-arriving and out-of-order events.",
            "Request-time computation happens during the prediction call, from data in the request itself: the current basket total, the time of day, the device. It is perfectly fresh by construction and bounded by the latency budget, so it must be cheap.",
            "Choose by asking how much the value can change between computation and use, and how much that matters. Making everything streaming is a common and expensive mistake - most features genuinely do not need it, and each streaming pipeline is a system to operate. Making everything batch means fraud features that cannot see the last hour, which is where fraud lives. The decision is per feature, and justifying it per feature is what an interviewer wants to hear.",
            "Whichever path, parity must be verified rather than assumed. The strongest test is replay: take logged production requests, recompute features through the training path, and compare against the values actually served. Non-zero divergence is a bug, and this test catches the whole class of skew that unit tests miss - because unit tests check each path against expectations, and skew is the two paths disagreeing with each other.",
          ],
        },
        {
          heading: "Backfills, missing values, and failure behaviour",
          body: [
            "A new feature has no history, so training on it requires computing it backwards over past data - a backfill. The backfill must respect point-in-time correctness, computing each historical value as it would have been at that moment rather than from today's data. A backfill using current values for historical rows creates temporal leakage at scale, which is the most expensive form of this bug because it contaminates the entire training set.",
            "Missing values need an explicit policy, decided once and applied identically in both paths. A new user has no 30-day history: is that zero, or unknown? The distinction matters, because zero is a claim about the world and unknown is a claim about your data, and a model treating 'no purchase history' as 'zero purchases' will confuse new users with dormant ones. Whatever you choose, the default must be identical in training and serving - a mismatch here is one of the most common causes of skew, and it looks like nothing at all in the code.",
            "Embeddings deserve their own note. An embedding is a learned vector representing an entity, and the numbers only mean something relative to the model that produced them. If the embedding model is retrained, every stored vector changes meaning, so consumers must be updated together. Version embeddings explicitly and treat a version change as a coordinated migration rather than a data refresh - a serving model reading vectors from a newer embedding model than it was trained against will produce confident nonsense.",
            "Finally, design serving failure behaviour, because feature lookups fail and the model must still respond. Options are to use a stale cached value, to use a default and record that you did, or to fall back to a simpler model that needs fewer features. What you must not do is fail the request or silently substitute a default without recording it - the silent substitution turns a feature outage into a quiet accuracy loss that nobody detects until someone investigates a business metric weeks later. Monitor the rate of default substitution as a first-class signal.",
          ],
        },
      ],
      workedExample: {
        title: "Model accuracy drops with no code change",
        setup:
          "A recommendation model has been in production for three months. Offline metrics on fresh data look unchanged, but online click-through has fallen 8 percent over two weeks. No model or serving code has been deployed in that window.",
        steps: [
          "Compare served features against recomputed features, since offline metrics being fine while online results fall points at the inputs rather than the model. Take a day of logged production requests, recompute every feature through the training path, and compare with what was actually served. This replay test is the diagnostic, and it is only possible if serving logs the feature values it used - which is worth building before you need it.",
          "Find the divergence. One feature - items viewed in the last 7 days - matches for most users and is zero in serving for about 12 percent while the training path computes a positive value. The model is being told those users have viewed nothing.",
          "Trace it to the cause. The streaming pipeline maintaining that feature had begun dropping events for one client version whose event schema changed slightly. The pipeline logged a parse warning and continued, so nothing alerted, and the online store simply stopped receiving updates for those users. Offline metrics never showed it because the training path reads the warehouse, which is fed by a different route that parsed the events correctly.",
          "Note why the missing-value policy made it worse. Absent values were being read as zero rather than as unknown, so the model confidently treated active users as having no recent activity. Had unknown been distinguished from zero, the model would have degraded gracefully and the default-substitution rate would have been visible as a metric.",
          "Fix the immediate problem and then the class of problem. Repair the parsing, backfill the affected window, and then add the missing controls: alert on parse failure rates rather than logging them, alert on staleness per feature in the online store, and monitor the rate of default substitution at serving time as a first-class signal.",
          "Add the continuous check. Run the replay comparison as a scheduled job on a sample of production traffic, alerting on divergence between served and recomputed features. This is the test that would have caught the problem within hours instead of two weeks, and it generalises to every future skew bug rather than to this one.",
        ],
        takeaway:
          "Nothing was deployed and no code was wrong in isolation - an upstream schema change interacted with a permissive parser and a missing-value policy that erased the distinction between zero and unknown. This is the characteristic shape of feature platform failures: silent, upstream, and invisible to offline metrics. The defence is measuring the agreement between the two paths continuously, rather than trusting that they agree because they were derived from the same definition.",
      },
    },
    glossary: [
      { term: "Feature", definition: "An input to a model describing the entity being scored. Must mean the same thing in training and serving, which is harder than it sounds." },
      { term: "Feature definition (feature view)", definition: "A named, owned, versioned transformation from raw data to a value. The central artefact of a feature platform - the storage is secondary." },
      { term: "Offline store", definition: "Full historical feature values for building training sets, optimised for large scans. Usually a columnar warehouse." },
      { term: "Online store", definition: "Current feature values for serving, optimised for single-key reads in milliseconds. Usually a key-value store." },
      { term: "Materialisation", definition: "The process keeping the online store fed from the same definitions used offline." },
      { term: "Training-serving skew", definition: "Divergence between features as computed in training and as served. Silent, because nothing errors - only accuracy falls." },
      { term: "Replay test", definition: "Recomputing features for logged production requests and comparing against served values. The only test that catches skew, since it compares the two paths against each other." },
      { term: "Batch / streaming / request-time computation", definition: "The three compute paths, chosen per feature by how fresh the value must be. Making everything streaming is expensive; making everything batch loses recency where it matters." },
      { term: "Feature freshness", definition: "How old a served value may be. Bounded by the compute path's schedule, and worth alerting on per feature." },
      { term: "Backfill", definition: "Computing a new feature's historical values for training. Must respect point-in-time correctness or it introduces leakage across the entire training set." },
      { term: "Missing value policy", definition: "How absent values are represented, and whether zero is distinguished from unknown. Must be identical in both paths; a mismatch is invisible in code." },
      { term: "Embedding version", definition: "The identity of the model that produced a vector. Vectors from different versions are not comparable, so a version change is a coordinated migration." },
      { term: "Default substitution rate", definition: "How often serving falls back to a default because a lookup failed. A first-class metric, since silent substitution is an undetectable accuracy loss." },
      { term: "Feature lineage", definition: "The record of which sources and transformations produce a feature and which models consume it. Without it, features can never be safely changed or removed." },
    ],
  },

  "ml-retrieval-ann": {
    primer: {
      plainSummary:
        "Recommending from a catalogue of ten million items cannot mean scoring ten million items - that is far too slow. So the work is split: a cheap stage retrieves a few hundred plausible candidates from the whole catalogue, and an expensive stage ranks those. This module is about the retrieval stage, how items and users are turned into vectors whose closeness means relevance, and how to search millions of vectors in milliseconds by accepting approximate answers.",
      analogy:
        "Finding a book in a large library. You do not examine every book; you go to the right section, which narrows ten million to a few hundred, and then browse those carefully. The section is a coarse index - it occasionally misses a book shelved unusually, and that occasional miss is an entirely acceptable price for not reading the whole library. Approximate search makes exactly this bargain, deliberately and measurably.",
      sections: [
        {
          heading: "Embeddings and the two-tower model",
          body: [
            "An embedding is a list of numbers - a vector - representing an entity, learned so that similar entities have nearby vectors. 'Nearby' is measured by cosine similarity, which compares the angle between two vectors, or by Euclidean distance. The useful consequence is that a semantic question - which items suit this user - becomes a geometric one - which item vectors are closest to this user vector - and geometry can be indexed.",
            "The two-tower model is the standard way to learn them. One tower is a neural network mapping a user and their context to a vector; the other maps an item to a vector. Both output into the same space, and the model is trained so that a user's vector lands close to items they engaged with and far from items they did not.",
            "The architectural reason for two separate towers is what makes this practical, and it is worth stating explicitly. Because the item tower depends only on the item, every item's vector can be computed offline in advance and stored in an index. At serving time you compute one user vector and search. If instead a single model took a user and an item together - which would be more accurate, since it could model interactions between them - you would have to run it for every candidate item, which is precisely the cost you were trying to avoid. The two-tower design deliberately sacrifices accuracy for the ability to precompute, and that trade is the entire reason retrieval and ranking are separate stages.",
            "Training needs negatives - examples of items a user did not engage with - and getting them right is subtle. The cheap approach, in-batch negatives, treats other users' positives within the same training batch as negatives, which is efficient but biases toward popular items since they appear in batches most often. Hard negative mining adds items that are similar to positives but were not engaged with, which teaches the fine distinctions that matter; used carelessly it destabilises training, because some 'hard negatives' are actually items the user would have liked and simply never saw.",
            "That last point deserves emphasis. Your data records what users engaged with among what they were shown, so an item never shown is not a negative - it is unobserved. Treating unobserved as negative teaches the model to reproduce the current system's choices, which is a self-reinforcing loop that narrows the catalogue over time.",
          ],
        },
        {
          heading: "Searching millions of vectors quickly",
          body: [
            "Exact nearest-neighbour search over ten million vectors means ten million distance computations per query, which is far outside a serving budget. Approximate nearest neighbour search trades a small amount of recall - occasionally missing a true nearest neighbour - for orders of magnitude less work. The trade is explicit and tunable, which is what makes it acceptable.",
            "HNSW - hierarchical navigable small world - builds a layered graph. Each vector is a node connected to its near neighbours, with upper layers holding progressively sparser subsets that act as an express network. A search enters at the top, greedily walks toward the query through the sparse layer to arrive quickly in the right region, then descends and refines. Search time grows logarithmically with the number of vectors, and quality is excellent. Its costs are memory - the graph edges are substantial, often comparable to the vectors themselves - and awkward deletion, since removing a node damages graph connectivity, which is why deletions are usually marked and cleaned during a rebuild.",
            "IVF-PQ - inverted file with product quantisation - takes a different approach in two parts. The inverted file part clusters vectors into cells and searches only the cells nearest the query, cutting the search space immediately. Product quantisation compresses each vector by splitting it into sub-vectors and replacing each with the identifier of the closest entry in a small learned codebook, so a 512-dimensional float vector needing 2 kilobytes can be stored in 64 bytes. Distances are then computed on compressed representations using lookup tables. The gain is a thirty-fold memory reduction that makes billion-vector indexes affordable; the cost is that compression loses information, so results are re-scored against exact vectors for the top candidates.",
            "The practical choice: HNSW when quality and latency matter most and the index fits comfortably in memory, IVF-PQ when the index is very large and memory is the binding constraint. Both expose parameters trading recall against latency - how many neighbours to explore, how many cells to probe - and those parameters must be tuned against measured recall rather than left at defaults, because the default is a guess about someone else's data.",
            "Index freshness is the operational reality that is easy to forget. New items must become retrievable quickly, and rebuilding a large index takes time, so production systems typically serve a large periodically-rebuilt index alongside a small fresh one covering recent additions, searching both and merging. Without this, new content is invisible for hours - which for a news or marketplace product is fatal.",
          ],
        },
        {
          heading: "Multiple sources, quotas, and cold start",
          body: [
            "One retrieval source is never enough, because each has a characteristic blind spot. Embedding retrieval captures semantic similarity and struggles with items having little interaction history. Keyword or filter retrieval handles explicit intent and constraints. Popularity and trending sources provide reliable broad appeal. Graph-based sources - what similar users liked - capture collaborative signal. Rule-based sources handle editorial or business requirements.",
            "So run several in parallel and blend. Give each a quota so no source can crowd out the others - a popularity source will otherwise dominate, since popular items are close to almost everything. Deduplicate across sources, and record which source produced each candidate, because that attribution is what lets you measure each source's contribution to final results and remove one that adds nothing but latency.",
            "Cold start is the case that breaks embedding retrieval specifically. A brand-new item has no interactions, so its learned embedding is meaningless, and it will never be retrieved - which means it never gets interactions, which means its embedding stays meaningless. The loop is self-sustaining and it silently suppresses all new content.",
            "The fixes are content-based embeddings computed from item attributes such as text and images rather than from interactions, which give a usable vector on day one; explicit exploration quotas reserving a slice of results for under-exposed items; and separate cold-start sources with their own quota. The same problem applies to new users, handled with context and popularity until enough signal accumulates.",
            "Finally, measure retrieval on its own terms. The retrieval stage's job is recall - did the good items make it into the candidate set - because an item missed here can never be recovered by ranking, however good the ranker is. Measuring retrieval by final click-through conflates two stages and hides which one is at fault. Track candidate recall against a held-out set of known-good items, and treat it as the retrieval stage's own metric.",
          ],
        },
      ],
      workedExample: {
        title: "Retrieval for a 50 million item marketplace",
        setup:
          "A marketplace has 50 million active listings and must return recommendations in under 100 milliseconds total, of which retrieval may use 30. New listings appear continuously and must be discoverable within minutes. Most listings have very few interactions.",
        steps: [
          "Size the problem before choosing an index. 50 million vectors at 256 dimensions in 4-byte floats is about 51 gigabytes - too large to hold comfortably in memory per replica with HNSW's graph overhead on top, which would roughly double it. That arithmetic points at IVF-PQ, and doing it aloud is what justifies the choice rather than asserting it.",
          "Choose IVF-PQ and re-score. Compress vectors to 64 bytes each, bringing the index to roughly 3 gigabytes and making it comfortably memory-resident with replicas. Probe a tuned number of cells, retrieve perhaps 1,000 approximate candidates, then re-score the top few hundred against exact vectors held separately to recover the precision lost to compression.",
          "Handle the cold-start majority, which is most of the catalogue. Since most listings have few interactions, interaction-based embeddings would be meaningless for the bulk of inventory. Compute content-based embeddings from title, description, images, and category so every listing has a usable vector the moment it is created - this is not an edge case here, it is the main case.",
          "Solve freshness with a two-index design. Rebuild the main index every few hours, and maintain a small in-memory HNSW index over listings created since the last rebuild - perhaps a few hundred thousand vectors, where HNSW's memory cost is irrelevant and its quality and easy insertion are exactly what is wanted. Search both and merge, giving minutes-fresh discoverability.",
          "Blend sources with quotas. Embedding retrieval gets 400 candidates, keyword and filter retrieval matching explicit search intent gets 300, trending in the user's categories gets 200, and a reserved exploration quota for under-exposed listings gets 100. Deduplicate and tag each candidate with its source so per-source contribution can be measured later.",
          "Measure retrieval separately from ranking. Build a held-out set of listings users actually engaged with, and measure how often they appear in the candidate set. If recall at 1,000 candidates is 85 percent, then 15 percent of good listings are being lost before ranking ever sees them - a ceiling on the whole system that no ranking improvement can lift, and one that would be invisible if you only tracked final click-through.",
        ],
        takeaway:
          "The index choice fell out of memory arithmetic, and the two-index design resolved the genuine tension between rebuild cost and freshness. The step most easily skipped is the last one: retrieval and ranking need separate metrics, because an item lost at retrieval is unrecoverable, and a team measuring only the end result cannot tell which of the two stages is limiting them.",
      },
    },
    glossary: [
      { term: "Embedding", definition: "A learned vector representing an entity, positioned so similar entities are nearby. Turns a semantic question into a geometric one." },
      { term: "Cosine similarity", definition: "Similarity measured as the angle between two vectors, ignoring magnitude. The usual metric for text and recommendation embeddings." },
      { term: "Two-tower model", definition: "Separate networks encoding user and item into one space. The separation is what allows item vectors to be precomputed, which is the entire reason retrieval can be cheap." },
      { term: "In-batch negatives", definition: "Using other examples in a training batch as negatives. Efficient, and biased toward popular items since they appear most often." },
      { term: "Hard negative mining", definition: "Adding similar-but-not-engaged items as negatives to teach fine distinctions. Risky, because some are items the user would have liked but never saw." },
      { term: "Unobserved vs negative", definition: "An item never shown is not a negative. Treating it as one teaches the model to reproduce the current system's choices, narrowing the catalogue over time." },
      { term: "ANN", expansion: "approximate nearest neighbour", definition: "Searching for near neighbours while accepting occasional misses, trading a tunable amount of recall for orders of magnitude less work." },
      { term: "HNSW", expansion: "hierarchical navigable small world", definition: "A layered neighbour graph searched by greedy descent. Excellent quality and logarithmic search time, at high memory cost and with awkward deletions." },
      { term: "IVF", expansion: "inverted file index", definition: "Clustering vectors into cells and probing only those nearest the query, cutting the search space immediately." },
      { term: "Product quantisation", definition: "Compressing vectors by replacing sub-vectors with codebook entries, cutting memory roughly thirty-fold at the cost of precision - hence re-scoring the top candidates." },
      { term: "Recall at k", definition: "The fraction of true nearest neighbours found in the top k returned. The metric that makes the approximation trade-off explicit and tunable." },
      { term: "Index freshness", definition: "How quickly new items become retrievable. Usually solved with a large periodic index plus a small fresh one, searched together." },
      { term: "Source quota", definition: "A cap on candidates per retrieval source, preventing one source - usually popularity - from crowding out the others." },
      { term: "Source attribution", definition: "Recording which source produced each candidate, which is what lets you measure a source's contribution and remove one that only adds latency." },
      { term: "Cold start", definition: "The absence of interaction data for a new item or user, which makes interaction-based embeddings meaningless and creates a self-sustaining invisibility loop." },
      { term: "Content-based embedding", definition: "A vector computed from an item's own attributes rather than from interactions, giving new items a usable representation immediately." },
      { term: "Candidate recall", definition: "The fraction of genuinely good items that reach the candidate set. Retrieval's own metric, and a ceiling no ranking improvement can lift." },
    ],
  },

  "ml-ranking-policy": {
    primer: {
      plainSummary:
        "Once retrieval has produced a few hundred candidates, ranking decides their order. The difficulty is threefold: the best model is too slow to run on every candidate, so ranking is staged; the training data is biased because users only interact with what was previously shown; and the business needs constraints - diversity, freshness, safety - that do not belong inside the model's objective. This module covers all three.",
      analogy:
        "Judging a competition with three hundred entries and two judges for a day. You cannot give every entry a full review, so you skim all three hundred quickly, give thirty a proper reading, and deliberate carefully over the final five. The staging is forced by time, not preference. And you must be careful about a subtler problem: if you only ever call back entrants who did well in previous years, next year's data will confirm that those entrants are the best, because nobody else was ever given a chance.",
      sections: [
        {
          heading: "Staging, and where the latency budget goes",
          body: [
            "Ranking is a cascade. Pre-ranking scores several hundred candidates with a cheap model and keeps perhaps the top hundred. Ranking scores those with a much more expensive model. Re-ranking applies business logic and considers the list as a whole, producing the final order.",
            "The reason is arithmetic. If the full model takes 2 milliseconds per candidate and you have 500 candidates, that is one second - ten times a typical budget. Cutting to 50 candidates makes it 100 milliseconds. Each stage exists to reduce how many items reach the next, and the number kept at each stage is a direct latency-versus-quality dial that should be set by measurement rather than convention.",
            "One important asymmetry governs the design: each stage can only remove items, never add them. An item dropped by pre-ranking cannot be recovered, so pre-ranking should favour recall - it should be reluctant to discard - while later stages favour precision. A pre-ranker aggressively optimised for precision will quietly cap the whole system's quality, and because it is measured against the ranker's output rather than against ground truth, that cap is easy to miss.",
            "Batching matters practically. Scoring 100 candidates as one batched call to a model server is far more efficient than 100 separate calls, because it amortises the per-call overhead and uses hardware parallelism. Ranking systems are therefore built around batch scoring, and a design that scores candidates one at a time has usually missed the largest available speedup.",
            "There is also a question of what the model predicts. Most ranking models are multi-objective: they predict several outcomes - click, purchase, long dwell, hide - and combine them with weights. That combination is where product intent lives, and keeping it explicit rather than baked into a single trained score is what lets you change the balance between engagement and satisfaction without retraining.",
          ],
        },
        {
          heading: "Learning to rank, and position bias",
          body: [
            "Ranking objectives come in three shapes. Pointwise trains the model to predict each item's relevance independently, then sorts by the score - simple, and it optimises absolute accuracy rather than order. Pairwise trains on pairs, learning which of two items should rank higher, which matches the task more closely. Listwise optimises a metric over the whole list directly, which is the closest match to what you care about and the most complex to train. For most systems pointwise with good features is a strong starting point, and the gains from pairwise or listwise are real but smaller than the gains from fixing the data.",
            "Which brings us to the central problem: position bias. Users click the top result far more often than the fifth, partly because it is genuinely better and partly just because it is at the top. Your training data records clicks, so an item that was shown at position one accumulates clicks and looks excellent, while an equally good item shown at position ten looks mediocre.",
            "Train on that data naively and the model learns 'items the old model ranked highly are good', which is a description of the previous model rather than of relevance. The system then confirms its own choices, exploration collapses, and quality plateaus while every offline metric looks fine - which is what makes this failure so persistent.",
            "The standard correction is inverse propensity weighting. Estimate the propensity - the probability that an item at a given position would be examined at all - and weight each training example by its inverse, so a click at position ten counts for more than a click at position one because it was much less likely to happen. Propensities are estimated by deliberately randomising positions for a small slice of traffic, or from models fitted to interaction patterns.",
            "Be honest about its limits, because overclaiming here is a common failure. Inverse propensity weighting corrects only the bias it models - examination probability by position - and does nothing for the deeper problem that items never shown have no data at all. Its variance also explodes when propensities are small, since dividing by a tiny probability amplifies noise enormously, which is why estimates are usually clipped. It reduces the bias; it does not eliminate it, and the residual is why exploration remains necessary.",
          ],
        },
        {
          heading: "Constraints belong in policy, not in labels",
          body: [
            "Real ranking systems must satisfy requirements the model's objective does not express. Results should be diverse rather than ten near-identical items. Some items must be excluded for legal or safety reasons. New items need exposure to accumulate data. Sponsored content has placement rules. Supply must be paced so one seller is not exhausted by 9am.",
            "The tempting shortcut is to encode these by manipulating training labels or by adding a penalty into the model's objective. Resist it. Once a constraint is inside the model, you cannot tell whether a result reflects predicted relevance or an encoded rule, you cannot change the rule without retraining, and you cannot audit or explain the behaviour. Legal and safety requirements especially must be enforceable and verifiable, which a learned weight is not.",
            "Instead apply constraints as an explicit re-ranking layer over the model's scores. Hard constraints - ineligible items, safety exclusions - are filters. Soft constraints - diversity, freshness, pacing - are adjustments to the ordering. The model predicts relevance; policy decides what to do with that prediction. The separation makes each independently testable, and it means a legal requirement is a line of code someone can point at rather than an emergent property of a trained model.",
            "Diversity specifically needs list-level reasoning, because it is a property of the set rather than of any item. The common technique is greedy selection with a penalty: choose the highest-scoring item, then penalise remaining items by their similarity to what has already been chosen, and repeat. This trades a little per-item relevance for a noticeably better list, and it is one of the few places where the whole-list view matters more than per-item accuracy.",
            "Finally, budget deliberately for exploration. A system that always shows its current best estimate learns nothing about the items it does not show, and the position-bias loop above ensures that becomes self-fulfilling. Reserving a slice of traffic or of each result page for under-exposed items costs a small amount of immediate performance and is what keeps the system able to improve at all. Frame it explicitly as buying information rather than as accepting a loss.",
          ],
        },
      ],
      workedExample: {
        title: "A ranker that improves offline and does nothing online",
        setup:
          "A team trains a new ranking model. Offline NDCG improves 6 percent over the production model on logged data. It goes to an A/B test and shows no change in engagement, and a slight fall in the diversity of items shown.",
        steps: [
          "Question the offline evaluation first, since the gap between offline and online is the finding. Offline NDCG was computed on logged interactions - which only exist for items the current production model chose to show. The new model is being scored on its ability to reorder the old model's choices, and a model that agrees more closely with the old model's ranking scores higher on this data by construction. The offline gain measured similarity to the incumbent, not quality.",
          "Check for position bias in training. Training used raw clicks with no propensity correction, so items historically shown high accumulated clicks and appear excellent. The new model learned this more thoroughly than the old one - which is exactly why offline NDCG rose and online engagement did not. It got better at predicting the old system.",
          "Apply inverse propensity weighting, with its limits stated. Randomise positions on 1 percent of traffic to estimate examination probability by position, then weight training examples by the inverse, clipping extreme values to control variance. This corrects the position component of the bias. It does not correct for items never shown at all, which needs exploration rather than reweighting.",
          "Fix the evaluation to include exploration data. Reserve a small traffic slice showing randomised or under-exposed items, and evaluate offline on that unbiased slice rather than on the biased logged data. The slice is small, so confidence intervals are wide - but it measures the right thing, and a wide interval around the right quantity beats a narrow one around the wrong quantity.",
          "Diagnose the diversity regression as a symptom of the same cause. The new model, being better at predicting historical clicks, concentrates more heavily on popular items. Rather than penalising popularity inside the objective - which would hide the mechanism - add an explicit re-ranking step with a similarity penalty, so diversity becomes a policy dial that can be tuned or removed without retraining.",
          "Re-test with the loop closed. Retrain with propensity weighting, evaluate on the exploration slice, apply diversity as explicit policy, and A/B test again - and this time treat the online result as the evidence and the offline number as the filter that decided the test was worth running.",
        ],
        takeaway:
          "The offline metric was not measuring quality; it was measuring agreement with the system that produced the data. That is the defining hazard of ranking, and it is self-reinforcing, because a model trained on its predecessor's choices will always look best on its predecessor's data. Breaking the loop needs unbiased data from deliberate exploration - which is why exploration is infrastructure rather than a nice-to-have.",
      },
    },
    glossary: [
      { term: "Multi-stage ranking", definition: "A cascade of pre-rank, rank, and re-rank stages, each reducing candidate count so an expensive model runs on few items. Forced by the latency budget." },
      { term: "Pre-ranking", definition: "A cheap first scoring pass. Should favour recall, since anything it drops is unrecoverable and silently caps the whole system's quality." },
      { term: "Re-ranking", definition: "The final stage applying list-level and business logic over model scores, where diversity, safety, and pacing belong." },
      { term: "Batch scoring", definition: "Scoring many candidates in one model call, amortising per-call overhead. Usually the largest single speedup available in a ranking path." },
      { term: "Multi-objective ranking", definition: "Predicting several outcomes and combining them with explicit weights, so product intent stays visible and adjustable without retraining." },
      { term: "Pointwise / pairwise / listwise", definition: "Learning-to-rank objectives predicting each item's relevance, the order of pairs, or a whole-list metric. Complexity rises across the three; the gains are smaller than fixing the data." },
      { term: "Position bias", definition: "Users clicking top results partly because they are on top. Makes logged clicks a record of what was shown as much as of what was good." },
      { term: "Propensity score", definition: "The estimated probability an item at a given position would be examined. Estimated by randomising position on a traffic slice." },
      { term: "Inverse propensity weighting", definition: "Weighting training examples by the inverse of their propensity, so unlikely observations count for more. Corrects only the bias it models, and its variance explodes at small propensities." },
      { term: "Feedback loop (exposure)", definition: "A model trained on its predecessor's choices confirming those choices, collapsing exploration while offline metrics keep looking healthy." },
      { term: "Exploration budget", definition: "Traffic or slots reserved for under-exposed items, deliberately buying information at a small immediate cost. What keeps the system able to improve." },
      { term: "Hard vs soft constraint", definition: "Exclusions that are filters versus preferences that adjust ordering. Both belong in a policy layer, not inside the model's objective." },
      { term: "Diversity penalty", definition: "Greedy selection that penalises candidates similar to those already chosen. A list-level property, so it cannot be expressed per item." },
      { term: "Counterfactual evaluation", definition: "Estimating how a new policy would have performed from logged data, which requires propensity estimates and unbiased exploration data to be trustworthy." },
    ],
  },

  "ml-training-evaluation-registry": {
    primer: {
      plainSummary:
        "A model in production is an artefact someone will need to reproduce, debug, compare, and roll back - possibly a year later, possibly under pressure. This module is about the infrastructure that makes that possible: training runs that can be reproduced exactly, evaluation gates that decide promotion on evidence rather than on enthusiasm, and a registry that separates 'this model is approved' from 'this model is serving traffic'.",
      analogy:
        "A pharmaceutical approval process. A promising compound does not go to market because the team is excited about it. It passes defined trials against pre-agreed endpoints, its manufacturing process is documented so that batches are reproducible, and there is a recall procedure that exists before anything ships. None of that is bureaucracy - it is what makes the results mean anything and what makes the failure survivable.",
      sections: [
        {
          heading: "Reproducibility, and what it actually requires",
          body: [
            "A training run is reproducible if you can recreate the same model from recorded inputs. That requires more than the code: the exact dataset version, the exact feature definitions, the code version, the hyperparameters, the environment and library versions, and the random seeds. Miss any one and you have a model nobody can rebuild, which means nobody can debug it either.",
            "Dataset version is the piece most often missing, and 'we trained on the last 90 days' is not a version - run it a week later and you get different data. Datasets must be immutable snapshots with identifiers, so a run refers to dataset v47 rather than to a query that returns whatever exists today.",
            "Perfect bit-for-bit reproducibility is sometimes unattainable, since GPU floating-point operations can be non-deterministic depending on scheduling. That is acceptable as long as results are statistically equivalent - two runs of the same configuration should produce models with metrics within noise. What is not acceptable is being unable to explain a large difference, and knowing which of the two situations you are in requires having recorded enough to check.",
            "Training itself takes one of three shapes, chosen from data size and freshness needs. Batch retraining trains from scratch on a schedule - simple, predictable, and the right default. Incremental training updates an existing model with new data, which is cheaper and faster but accumulates drift and makes reproducibility harder since the model depends on its entire update history. Distributed training splits work across machines when a model or dataset does not fit on one, adding real operational complexity that should be justified by necessity rather than by ambition.",
          ],
        },
        {
          heading: "Evaluation as a promotion contract",
          body: [
            "Promotion should be a contract agreed before results are seen, not a judgement made while looking at tempting numbers. The gate specifies which metrics, on which data, against which baseline, with what thresholds - and it fails closed, so a model that cannot be evaluated is not promoted.",
            "The evaluation data must respect time. Random splits are wrong for any problem where the world changes, because training on data from after the test period leaks future information - the same temporal leakage that contaminates features, at the level of the split. Use a temporal backtest: train on everything before a cutoff, evaluate on what follows, and ideally repeat across several cutoffs so you learn whether the improvement is consistent or was one lucky period.",
            "The gate should check several things, not one headline number. Compare against the current production model on identical data, since 'better than nothing' is not the relevant question. Check the pre-registered slices, so a model that improves overall while degrading for a subgroup is caught. Check calibration if downstream decisions use probabilities. And check the operational properties that are not about accuracy at all: inference latency, model size, memory, and cost, any of which can make an accurate model undeployable.",
            "Guardrails matter as much as targets. A model may improve its primary metric while regressing something the business cares about, so name the metrics that must not get worse, and treat a regression as a block rather than as a trade to be argued about after the fact.",
            "One discipline is worth insisting on: keep a final test set that is used once. Every time you evaluate against a set and then change something in response, you leak a little information into your choices, and after fifty iterations your test metric is optimistic in a way no single evaluation was. Tune against validation data; touch the final set once, at the end.",
          ],
        },
        {
          heading: "The registry, and separating approval from deployment",
          body: [
            "A model registry is the inventory of model versions and their state - trained, evaluated, approved, deployed, archived. Its central contribution is separating two things that are constantly conflated: whether a model is approved, and whether it is serving traffic. Approval is a statement about evidence; deployment is a statement about infrastructure. Keeping them distinct lets you approve a model on Monday and roll it out on Wednesday, run two approved models in a champion-challenger comparison, or roll back to a previously approved version instantly without re-evaluating anything.",
            "That last capability is the one that matters most in an incident. Rollback must be a state transition, not a rebuild - if recovering from a bad model requires retraining, your recovery time is measured in hours and someone will instead try to fix forward under pressure, which is how small incidents become large ones.",
            "What is versioned must be the whole serving configuration, not just the weights. A model's behaviour depends on its feature definitions, its preprocessing, its calibration mapping, its decision thresholds, and its policy rules. Version these together as one release artefact. A rollback that restores old weights while leaving new thresholds in place produces a combination that was never tested and never evaluated - and that is a genuinely dangerous state, worse than either version alone.",
            "Champion-challenger is the standard operating pattern. The champion serves traffic; challengers run in shadow, receiving the same requests and producing predictions that are logged but not used. This gathers real production evidence at zero user risk, and it is how you learn whether a model that looked good offline behaves well on live traffic - though note that shadow mode cannot measure anything that depends on the model's output affecting user behaviour, which is why it complements an online test rather than replacing one.",
            "Finally, record lineage end to end: which data produced which model, which model produced which prediction. When someone asks in six months why a particular decision was made - and in regulated domains they will, with legal force - the answer must be reconstructible from records rather than from memory.",
          ],
        },
      ],
      workedExample: {
        title: "A model degrades and nobody can reproduce it",
        setup:
          "A recommendation model has been serving for four months. Engagement has declined gradually. The team wants to retrain and compare against the original, but the person who trained it has left, the training script has changed several times since, and nobody is certain which data it used.",
        steps: [
          "Establish what can be recovered. The model artefact exists and the code repository has history, but the dataset was built by a query over a mutable warehouse table, so the exact training data no longer exists in the form it was consumed. The original model cannot be reproduced - which means the team cannot answer whether the new model is better, only whether it is better than the current one behaving as it currently does.",
          "Recognise the real cost. Without reproducibility, every question becomes unanswerable: was the decline caused by the model, by drift in the input data, or by a change in user behaviour? A reproducible baseline would let them retrain on the original data and compare directly, isolating the cause. They cannot, so they are reduced to guessing.",
          "Fix the foundation before the model. Introduce immutable dataset versions with identifiers, and make every training run record dataset version, code commit, feature definition versions, hyperparameters, environment, and seeds. This is unglamorous and it is what makes every subsequent investigation tractable.",
          "Build the promotion gate before training the replacement, so the criteria are set before anyone is invested in a result. Temporal backtest across three cutoffs rather than one; comparison against the current production model on identical data; pre-registered slices for new users, returning users, and each major category; calibration check; and latency and cost limits. Guardrails: session length and content diversity must not regress.",
          "Version the whole release, not just the weights. Package model, feature definitions, preprocessing, calibration, and thresholds as one artefact with one version. This prevents the specific failure of rolling back weights while leaving new thresholds in place, which produces an untested combination at the worst possible moment.",
          "Run the challenger in shadow before exposing anyone. Send production traffic to both, log both predictions, and compare distributions and slice behaviour on live data. This catches the class of problem that offline evaluation misses - features behaving differently in production, unexpected input distributions - at no user risk, and it is cheap once the registry supports it.",
        ],
        takeaway:
          "The decline in engagement was the visible problem; the inability to reproduce anything was the real one, because it made every diagnosis impossible. Reproducibility feels like overhead when things work and is the difference between a two-hour investigation and an unanswerable question when they do not. And the rollback point generalises beyond ML: if recovery requires a rebuild, you do not have a rollback.",
      },
    },
    glossary: [
      { term: "Reproducible run", definition: "A training run recreatable from recorded inputs - dataset version, code, features, hyperparameters, environment, seeds. Missing any one makes the model undebuggable." },
      { term: "Dataset version", definition: "An immutable identified snapshot. 'The last 90 days' is a query, not a version, and returns different data every time it runs." },
      { term: "Batch vs incremental training", definition: "Retraining from scratch on a schedule versus updating an existing model. Incremental is cheaper and accumulates drift, and its result depends on its whole update history." },
      { term: "Temporal backtest", definition: "Training before a cutoff and evaluating after it, repeated across cutoffs. Random splits leak future information whenever the world changes over time." },
      { term: "Validation gate", definition: "Pre-agreed promotion criteria covering metrics, slices, baselines, and operational limits, which fails closed when evaluation cannot be completed." },
      { term: "Guardrail metric", definition: "A metric that must not regress even if the target metric improves. Treated as a block rather than as a trade to be negotiated afterwards." },
      { term: "Held-out test set", definition: "Data evaluated once at the end. Repeated evaluation followed by changes leaks information gradually, making the final metric optimistic." },
      { term: "Model registry", definition: "The inventory of model versions and their states, which separates approval - a statement about evidence - from deployment, a statement about infrastructure." },
      { term: "Release artefact", definition: "Model weights, feature definitions, preprocessing, calibration, and thresholds versioned together, so a rollback cannot produce an untested combination." },
      { term: "Champion-challenger", definition: "A serving model alongside candidates receiving the same traffic in shadow, gathering production evidence at no user risk." },
      { term: "Shadow mode", definition: "Running a model on real traffic while discarding its output. Validates inputs, latency, and prediction distribution; cannot measure effects that depend on acting on the prediction." },
      { term: "Rollback as a state transition", definition: "Reverting by promoting a previously approved version rather than rebuilding. If recovery requires retraining, there is no rollback." },
      { term: "Artifact lineage", definition: "The recorded chain from data to model to prediction, required to answer after the fact why a specific decision was made." },
    ],
  },

  "ml-imbalance-calibration-thresholds": {
    primer: {
      plainSummary:
        "Many of the most valuable ML problems involve rare events - fraud, defects, disease, churn. Rarity breaks the usual training and evaluation habits, and the common fixes quietly break something else: after rebalancing your data, the model's probabilities no longer mean what they claim. This module covers training on rare events, restoring probabilities to honesty, and choosing the threshold that turns a probability into a decision.",
      analogy:
        "A metal detector on a beach. Turn the sensitivity up and you dig every bottle cap; turn it down and you walk past the ring. There is no setting that finds everything and digs nothing, so the correct setting depends entirely on how much digging costs you and how much the ring is worth. The machine's job is to report how confident it is; deciding what confidence justifies digging is yours, and it is a different kind of decision.",
      sections: [
        {
          heading: "Training and evaluating when positives are rare",
          body: [
            "When positives are 0.1 percent of the data, two things go wrong. Evaluation breaks first: accuracy is meaningless, and ROC-AUC is insensitive to absolute false-positive volume because the negative class in its denominator is enormous. Use precision-recall analysis, and quote precision at the threshold you will actually run at.",
            "Training is affected too, though less dramatically than folklore suggests. Most learning algorithms still work on imbalanced data; what suffers is that the gradient signal from the rare class is swamped, and models tend toward predicting the majority. Two standard interventions address this. Class weighting increases the loss contribution of rare-class examples so the model pays proportionally more attention to them. Negative downsampling keeps all positives and a random fraction of negatives, which additionally makes training much faster - often the practical motivation, since a hundred-fold reduction in data size matters more than the statistical effect.",
            "Synthetic oversampling methods generate artificial positive examples by interpolating between real ones. They can help on small tabular datasets and are frequently oversold: interpolating between two fraud cases may produce a point that is not fraud-like at all, and on large datasets the gains are usually small compared with better features. Mention it as an option, not as a default.",
            "Here is the consequence that matters most and is most often missed. Any of these interventions changes the class balance the model sees, so its output probabilities now describe the resampled world rather than the real one. Downsample negatives by a factor of 100 and the model behaves as if positives are a hundred times more common than they are, so a prediction of 0.5 might correspond to a true probability nearer 0.01. Ranking is unaffected, so AUC looks fine and nothing appears wrong - but any threshold set from cost reasoning, and any expected-value calculation, is now badly wrong. Either correct the probabilities analytically using the known sampling rate, or recalibrate on data with the true class balance.",
          ],
        },
        {
          heading: "Calibration: making probabilities mean something",
          body: [
            "A model is calibrated when its stated probabilities match reality: among the cases it scores 0.3, about 30 percent are positive. This is a genuinely separate property from ranking quality. A model can order cases perfectly - perfect AUC - while every probability it emits is far too high, because AUC depends only on order and is unchanged by any monotonic transformation of the scores.",
            "Calibration matters whenever the number is used for arithmetic rather than for sorting. Expected loss, expected revenue, cost-based thresholds, combining several model outputs, showing a user a risk estimate - all of these need the probability to be honest. If you only ever take the top k, calibration is irrelevant and you should say so rather than performing it out of habit.",
            "Measure it with a reliability plot - bucket predictions and compare mean predicted probability against observed frequency - and summarise with expected calibration error. Look at the shape rather than only the summary: models are commonly overconfident in the middle of the range and reasonable at the extremes, and a single number hides where the problem is.",
            "Three correction methods, all fitted on held-out data the model did not train on. Platt scaling fits a logistic regression mapping scores to probabilities - two parameters, so it works with little data, but it can only apply an S-shaped correction. Isotonic regression fits any monotonic mapping, which is far more flexible and needs more data or it overfits the calibration set. Temperature scaling divides logits by one learned parameter and is the standard choice for neural network classifiers, preserving the ranking exactly while fixing systematic over-confidence.",
            "Two operational notes. Calibration is per population: a model calibrated overall can be badly miscalibrated for a subgroup, so check calibration on your slices too. And calibration drifts as the world changes, so it should be monitored and periodically refitted - which is cheap, since it needs only labelled outcomes and no retraining.",
          ],
        },
        {
          heading: "The threshold is policy",
          body: [
            "A model produces a probability; a decision needs a cut-off. Choosing it is a business decision, not a modelling one, and the default of 0.5 is almost never right - it is the correct answer only when the two errors cost exactly the same and the classes are balanced, which is a coincidence rather than a design.",
            "With a calibrated probability the principled choice follows from costs. Act when the expected cost of acting is less than the expected cost of not acting, which reduces to a threshold determined by the ratio of the cost of a false positive to the cost of a false negative. If missing fraud costs twenty times a false alarm, the threshold is roughly one in twenty-one, not one half. Making that arithmetic explicit converts a tuning knob into a decision the business can review and own.",
            "Capacity often overrides cost, and this is worth checking early because it can dominate everything. If a review team can handle 4,000 cases a day, the threshold is whatever sends 4,000 cases a day, regardless of what the cost ratio suggests. Then the operating point is set by staffing, and the way to improve outcomes is to improve precision at that fixed volume rather than to move the threshold.",
            "Thresholds can be per-slice, and this is where a genuine tension lives. Different subgroups may have different base rates and different cost structures, so a single global threshold can produce very different error rates across groups. Per-slice thresholds equalise outcomes across groups - and are exactly what fairness regulation in some domains prohibits, since they mean treating individuals differently based on group membership. There is no purely technical resolution: the different fairness definitions are mathematically incompatible with each other except in degenerate cases. Recognising it as a policy and legal question with a technical implementation, rather than as a tuning problem, is the correct answer.",
            "Finally, thresholds need monitoring like any other production parameter. As the model, the population, or the base rate drifts, a fixed threshold produces a drifting volume of positive decisions. Monitor the rate of positive decisions, precision at threshold, and the review queue depth, and treat a threshold change as a versioned deployment with its own rollback - not as a configuration tweak someone makes quietly.",
          ],
        },
      ],
      workedExample: {
        title: "Setting an operating point for defect detection",
        setup:
          "A manufacturer wants to detect defective units on a production line. Defects are 0.3 percent of output. A missed defect reaching a customer costs about 500 dollars in returns and reputation. A false alarm costs about 15 dollars in manual inspection time. The inspection station can handle 2 percent of production.",
        steps: [
          "Train with downsampling for tractability, and record the rate. Keeping all defects and 1 in 50 negatives cuts the dataset enormously and speeds iteration. Record the sampling rate of 50, because the model's probabilities are now inflated relative to reality and that factor is what will undo it.",
          "Correct the probabilities before doing any cost arithmetic. Either apply the analytic correction for the known sampling rate, or fit isotonic regression on a held-out set with the true 0.3 percent base rate. Verify with a reliability plot. Skipping this step is the single most consequential error available here, because every subsequent number depends on the probabilities being honest.",
          "Compute the cost-optimal threshold. The cost ratio is 500 to 15, about 33 to 1, giving a threshold near 1/34, roughly 0.03. Inspect any unit with more than a 3 percent chance of being defective - far from the default 0.5, and a number the operations manager can understand and challenge.",
          "Check it against capacity, which is where reality intervenes. At a 0.03 threshold the model flags 5 percent of production; the station handles 2 percent. Capacity binds, so the operating threshold is whatever yields 2 percent - perhaps 0.08. This should be stated as a deliberate constraint: the current staffing means accepting more missed defects than the cost analysis alone would justify, and the gap quantifies exactly what additional inspection capacity would be worth.",
          "Measure what the operating point actually delivers, in the units the business uses. At 2 percent flagged, recall is perhaps 70 percent and precision perhaps 10 percent. So 30 percent of defects still reach customers, and the expected cost of those is the number that justifies either more capacity or a better model. Precision of 10 percent sounds poor and is fine here, because inspection is cheap relative to the defect - which is why precision must always be read against the cost structure rather than against intuition.",
          "Put it under monitoring. Track flagged volume, precision at threshold from inspection outcomes, and calibration drift. If the defect rate rises seasonally, a fixed threshold silently overruns inspection capacity, so alert on flagged volume rather than assuming the threshold holds its meaning. Treat threshold changes as versioned deployments.",
        ],
        takeaway:
          "The threshold came from costs, was overridden by capacity, and then required continuous monitoring because its meaning drifts as the world does. The calibration step in the middle is what made any of the arithmetic valid - and it is the step that silently invalidates everything downstream when it is skipped, because nothing errors and the ranking metrics stay perfectly healthy.",
      },
    },
    glossary: [
      { term: "Class imbalance", definition: "One class being far rarer than another, which breaks accuracy-style metrics and swamps the rare class's contribution to the training signal." },
      { term: "Class weighting", definition: "Increasing the loss contribution of rare-class examples so the model attends to them proportionally." },
      { term: "Negative downsampling", definition: "Keeping all positives and a fraction of negatives. Speeds training substantially and shifts the model's probabilities away from the true base rate." },
      { term: "Synthetic oversampling", definition: "Generating artificial minority examples by interpolation. Occasionally useful on small tabular data, frequently oversold, and no substitute for better features." },
      { term: "Sampling correction", definition: "Restoring true probabilities after resampling, analytically from the known rate or by recalibrating on data with the real base rate. Skipping it invalidates every cost calculation." },
      { term: "Calibration", definition: "Whether stated probabilities match observed frequencies. Independent of ranking quality, and unaffected by any monotonic rescaling of scores." },
      { term: "Reliability plot (calibration curve)", definition: "Predicted probability bucketed against observed frequency. Its shape shows where miscalibration lives, which a summary number hides." },
      { term: "Expected calibration error", definition: "Average absolute gap between predicted probability and observed frequency across buckets." },
      { term: "Platt scaling", definition: "Fitting a two-parameter logistic mapping from scores to probabilities. Works with little data; can only apply an S-shaped correction." },
      { term: "Isotonic regression", definition: "Fitting any monotonic mapping from scores to probabilities. Flexible, and overfits when the calibration set is small." },
      { term: "Temperature scaling", definition: "Dividing logits by one learned parameter. The standard fix for overconfident neural classifiers, and it preserves ranking exactly." },
      { term: "Decision threshold", definition: "The cut-off turning a probability into an action. A business decision; 0.5 is correct only when errors cost equally and classes are balanced." },
      { term: "Cost ratio", definition: "The relative cost of a false negative to a false positive, which determines the cost-optimal threshold for a calibrated probability." },
      { term: "Capacity constraint", definition: "A downstream limit on how many positive decisions can be handled, which frequently overrides the cost-optimal threshold entirely." },
      { term: "Slice-aware thresholds", definition: "Different cut-offs per subgroup. Equalises outcomes across groups and is prohibited in some regulated domains - a policy question, not a tuning one." },
    ],
  },

  "ml-delayed-high-stakes": {
    primer: {
      plainSummary:
        "Some systems learn the outcome of a decision within seconds; others wait months, and some never learn it at all because the decision itself prevented the outcome from being observable. This module is about designing under those conditions - loan defaults that take a year, fraud confirmed by chargebacks 90 days later, and the systematic blind spot created when you only ever see what happened to the applications you approved.",
      analogy:
        "A university admissions office trying to predict which applicants will succeed. Outcomes take four years, so the model always trains on a world that has moved on. Worse, you only observe outcomes for the students you admitted - the rejected ones might have thrived and you will never know. So your data can only ever tell you about people similar to those you already accept, and every model trained on it inherits and hardens that boundary.",
      sections: [
        {
          heading: "Label maturity and censoring",
          body: [
            "When outcomes arrive late, recent data has incomplete labels. A loan issued last month has not defaulted - but it also has not had time to. Treating it as a good loan systematically understates risk, and the distortion is strongest on the most recent data, which is exactly the data you most want to use.",
            "This is right censoring: the observation window ended before the outcome could occur. The two workable responses are to exclude immature examples by moving the training cutoff far enough back that labels have matured, which is simple and discards recent data; or to model maturity explicitly using survival analysis, which treats time-to-event as the quantity of interest and handles censored observations correctly rather than pretending they are negatives. Survival methods are more complex and let you use recent data honestly, which matters when the phenomenon changes quickly.",
            "You also need a label maturity curve: what fraction of eventual positives have been observed as a function of age. If 60 percent of chargebacks arrive within 30 days and 95 percent within 90, then a 30-day-old label is 60 percent complete - and that curve lets you correct evaluation on recent data instead of either discarding it or trusting it. It is worth building because everything else in this module depends on knowing it.",
            "Late corrections need explicit handling too. A label can change after you record it - a chargeback is reversed, a decision is overturned on appeal - so labels are not immutable facts. Store them with the time they were determined and treat updates as new versions, or your training data will silently disagree with your reporting.",
            "The most immediate consequence is on retraining cadence. If labels take 90 days to mature, a model cannot meaningfully be retrained weekly on mature labels - there simply is not new mature data. Teams that retrain weekly on immature labels are training on a biased view that systematically under-represents the positive class, which produces a model that drifts steadily toward under-predicting risk.",
          ],
        },
        {
          heading: "Selective labels: the blind spot you cannot measure",
          body: [
            "There is a harder problem than delay. If your model decides which loans to approve, you only observe repayment for approved loans. For rejected applicants there is no outcome, ever - not delayed, but absent by construction. This is the selective labels problem, and it is qualitatively different from missing data because the missingness was caused by your own decision.",
            "The consequence is a self-confirming system. The model learns from approved applicants, whose distribution reflects the model's own past decisions. It appears to perform excellently on that population, because it is the population it selected. It cannot learn that it is wrongly rejecting an entire category of good applicants, because it never sees what would have happened. Every offline metric looks healthy while a systematic error persists indefinitely.",
            "Several partial remedies exist, and it is worth being clear that none fully solves it. Deliberate exploration - approving a small random sample of applicants who would have been rejected - generates unbiased data about the rejected region. It is the only method that directly answers the question, and it has a real cost in expected losses and sometimes an ethical one, which is precisely why it must be an explicit, bounded, and consciously approved decision rather than something an engineer enables quietly.",
            "Where exploration is unacceptable, you can look for natural experiments: policy changes, threshold changes, or reviewers who differ in strictness all create quasi-random variation in who was approved, and that variation carries information about the boundary region. You can also use outcomes from a different channel - a partner who approved applicants you rejected - or bound the possible effect statistically under assumptions that must be stated.",
            "Related to this is intervention effect. If you predict churn and then act on the prediction by offering a discount, the users predicted to churn are exactly the ones who received an intervention. Their observed outcomes reflect model plus intervention, so the model is being evaluated on a world it changed. Training naively on this data teaches the model that its own high-risk predictions were wrong, since the intervention prevented the outcome - a system that systematically un-learns its own correct predictions. Recording which interventions were applied to which cases is the minimum requirement for untangling this later, and it must be logged at decision time because it cannot be reconstructed afterwards.",
          ],
        },
        {
          heading: "Designing high-stakes decision systems",
          body: [
            "When a decision materially affects someone - credit, employment, medical triage, content removal - the design needs more than accuracy, and interviewers in these domains are testing whether you know that.",
            "Use decision bands rather than a single threshold. Confident positive, confident negative, and an uncertain middle band routed to human review. This concentrates human effort where the model is least reliable, which is far more valuable than reviewing a random sample, and it gives the system a way to be unsure. Abstention - declining to decide - is a legitimate and often correct output, and a model forced to choose on every case will make its worst mistakes precisely where it should have deferred.",
            "Size the review band by capacity, exactly as with thresholds. A band routing more cases than reviewers can handle produces a growing queue, which becomes a latency problem for applicants and eventually a rubber-stamp process, which is worse than no review at all because it manufactures the appearance of oversight.",
            "Human review must be designed rather than assumed. Reviewers need the information behind the prediction, not just a score; they need to be able to disagree, and their disagreements are a valuable training signal; and their decisions need to be recorded with reasons. A review process that mostly confirms the model is not providing oversight - it is providing the appearance of it, and measuring the override rate is how you tell the difference.",
            "Everything must be auditable. Record the inputs, the model version, the output, the threshold in force, the decision, and any human involvement - immutably, because the value of an audit record is that it cannot be revised after a dispute arises. In regulated domains you may also need to explain individual decisions, which constrains model choice: if you must state the reasons for a rejection, a model whose reasoning cannot be summarised faithfully may be unusable regardless of its accuracy.",
            "Finally, distinguish leading indicators from mature outcomes and never let them substitute. Early signals - a first missed payment, an early complaint - are useful for monitoring and for detecting a sudden problem quickly. They are not the outcome, and a system that retrains on leading indicators because mature labels are slow will optimise for the indicator and drift away from the thing that actually matters.",
          ],
        },
      ],
      workedExample: {
        title: "A credit model that looks perfect and is quietly narrowing",
        setup:
          "A lender uses a model to approve loans. Approved loans default at 2 percent, comfortably below target, and the model's AUC on approved loans is 0.82. Approval rates have fallen from 45 percent to 31 percent over two years with no policy change. Leadership considers the model a success.",
        steps: [
          "Notice that the evaluation population is the model's own selection. AUC of 0.82 is measured only on approved loans - the population the model chose. It says nothing about rejected applicants, whose outcomes are unobservable by construction. The model could be rejecting a large number of applicants who would have repaid, and no metric currently computed would ever reveal it.",
          "Explain the drift mechanism. Each retraining uses outcomes from approved loans, so the training distribution narrows toward applicants the previous model liked. The model becomes more confident about that narrowing region and more cautious outside it, so approvals fall, so the next training set is narrower still. The falling approval rate with no policy change is the observable symptom of this loop, and it is the one number in the setup that is actually alarming.",
            "Check label maturity before drawing conclusions about the 2 percent. Loans default over years, so recent cohorts have not had time to default. If the reported figure includes loans issued in the last six months, it understates the true rate. Build the maturity curve and evaluate only on cohorts old enough to be informative - the 2 percent may be a reporting artefact rather than a result.",
          "Introduce bounded exploration, with the cost stated explicitly. Approve a small random sample - perhaps 2 percent of applicants just below the threshold - to generate unbiased outcomes in the rejected region. Model the expected loss so leadership approves it as a known, budgeted cost of information rather than as an unexplained increase in defaults. Frame it as measurement, because that is what it is.",
          "Exploit the natural experiment already available. The threshold has moved over two years, so applicants approved under the old looser policy but who would be rejected today are exactly the population of interest, and their outcomes are already known. This gives immediate evidence at no additional risk, and it is often the fastest available answer.",
          "Add the high-stakes controls. Introduce a review band for uncertain applicants sized to actual reviewer capacity; record inputs, model version, threshold, decision, and reviewer reasoning immutably; monitor approval rate by demographic slice for disparate impact; and track reviewer override rate, since a rate near zero means the review is decorative.",
        ],
        takeaway:
          "Every metric the team looked at was healthy, and the system was steadily narrowing who it would lend to - because the metrics were computed on the population the model had already selected. Selective labels create exactly this: a system that appears to be improving while its blind spot grows. The falling approval rate was the only visible symptom, which is why watching the decision distribution, not just prediction quality, is essential in any system whose decisions determine what data it later sees.",
      },
    },
    glossary: [
      { term: "Delayed feedback", definition: "Outcomes arriving long after the decision, so recent data has incomplete labels and retraining cadence is bounded by label maturity rather than by data volume." },
      { term: "Right censoring", definition: "The observation window ending before the outcome could occur. Treating censored cases as negatives systematically understates the positive rate." },
      { term: "Label maturity curve", definition: "The fraction of eventual positives observed as a function of age. Lets recent data be corrected rather than discarded or wrongly trusted." },
      { term: "Survival analysis", definition: "Modelling time-to-event with explicit handling of censored observations, allowing honest use of data whose outcome has not yet occurred." },
      { term: "Late label correction", definition: "An outcome changing after it was recorded, such as a reversed chargeback. Labels therefore need determination timestamps and versioning." },
      { term: "Selective labels", definition: "Outcomes observable only for cases the system acted on, so the rejected region is permanently unobserved. Missing by construction, not by accident." },
      { term: "Self-confirming loop", definition: "A model trained on its own selections appearing excellent on that population while its blind spot grows, with every offline metric staying healthy." },
      { term: "Exploration (in high-stakes decisions)", definition: "Deliberately acting against the model on a small bounded sample to generate unbiased data. The only direct remedy for selective labels, with a real and explicit cost." },
      { term: "Natural experiment", definition: "Quasi-random variation from policy changes, threshold moves, or reviewer differences, which yields evidence about the boundary region at no additional risk." },
      { term: "Intervention effect", definition: "Acting on a prediction changing the outcome it predicted, so the model appears wrong precisely when it was right and correct action was taken." },
      { term: "Decision band", definition: "Confident-yes, confident-no, and an uncertain middle routed to human review, concentrating human effort where the model is least reliable." },
      { term: "Abstention", definition: "Declining to decide. A legitimate output, and its absence forces the worst errors precisely where the model should have deferred." },
      { term: "Override rate", definition: "How often reviewers disagree with the model. A rate near zero means the review is decorative rather than oversight." },
      { term: "Decision audit record", definition: "An immutable record of inputs, model version, threshold, output, and human involvement, valuable precisely because it cannot be revised after a dispute." },
      { term: "Leading indicator", definition: "An early signal correlated with the eventual outcome. Useful for monitoring and dangerous as a training target, since optimising it drifts away from the real objective." },
    ],
  },

  "ml-online-experimentation": {
    primer: {
      plainSummary:
        "Offline metrics predict online results poorly, so the only reliable evidence that a change helps is a controlled experiment on real traffic. Running one properly is harder than splitting traffic in half: you must choose what to randomise, know in advance how long to run, detect when the split itself is broken, and recognise the situations where the standard method silently does not apply.",
      analogy:
        "A drug trial. You do not give the new drug to volunteers and the old one to whoever was left over, because the groups would differ in ways unrelated to the drug. You randomise, decide the sample size and endpoints before starting, and resist looking at results early and stopping the moment they look good - because if you keep peeking and stop at the first favourable moment, you will find an effect roughly whether or not one exists.",
      sections: [
        {
          heading: "What to randomise, and what counts as exposed",
          body: [
            "The randomisation unit is what gets independently assigned to a variant. Randomising by request is statistically appealing - the most data and the tightest confidence intervals - and usually wrong, because one user would see different variants on successive requests, which is both an inconsistent experience and a contaminated measurement.",
            "Randomise by user in almost all cases, so each user has a consistent experience for the whole experiment, and their behaviour across sessions is attributable to one variant. Sometimes you need something coarser: for a change with effects between people - a marketplace pricing change, a social feature - randomise by geography or by market, accepting far fewer independent units and correspondingly much weaker statistical power.",
            "Assignment should be deterministic: hash the user ID with the experiment ID and take the result modulo the number of variants. This needs no stored assignment table, is consistent across services, and gives independent assignments across experiments because each experiment's hash differs. Hashing the user ID alone would put the same users together in every experiment, so effects would correlate across experiments in ways nobody would notice.",
            "Then decide the exposure rule: who counts as being in the experiment. Including users who never reached the changed surface dilutes the effect toward zero, since most of your sample was unaffected. Counting only users who reached it is more sensitive and introduces a trap - if the change itself affects who reaches the surface, then filtering on that creates a biased comparison between groups that are no longer comparable. The safe rule is to log exposure at the first point where the variants could possibly differ, before any behaviour is influenced.",
            "The rigorous default is intention to treat: analyse every user by the group they were assigned to, whatever happened afterwards. It answers the question you actually care about - the effect of shipping the change - rather than the effect on the subset who engaged with it, which is a self-selected group.",
          ],
        },
        {
          heading: "Power, duration, and the discipline of deciding in advance",
          body: [
            "Before starting, compute the minimum detectable effect: the smallest change your experiment could reliably detect, given traffic, metric variance, and how long you will run. This determines whether the experiment is worth running at all. If you can only detect a 5 percent change and the plausible effect is 1 percent, the experiment will produce an inconclusive result no matter what happens, and running it wastes weeks - so run it longer, on more traffic, or not at all.",
            "Duration is not just about sample size. Behaviour varies by day of week, so run for whole weeks to avoid a weekend or a Monday dominating the comparison. Novelty effects mean users react to any change simply because it is new, with the effect decaying over one to two weeks - a shiny new layout can show a strong early lift that vanishes entirely, and stopping at day three captures the novelty rather than the value. Some effects also take time to appear at all: a change to recommendation diversity may reduce clicks immediately and improve retention over a month.",
            "The most important discipline is deciding the stopping point before starting. Repeatedly checking results and stopping when they become significant is called peeking, and it dramatically inflates the false positive rate - a test at the 5 percent level, checked daily and stopped at the first significant result, produces false positives far more often than 5 percent of the time, because you have given yourself many chances to catch a random fluctuation. Either fix the duration in advance and look once, or use a sequential testing method designed to permit continuous monitoring while controlling the error rate. What you must not do is use a fixed-horizon test and monitor it continuously, which is the most common experimentation error in the industry.",
            "Choose the metrics in advance too: one primary metric that decides the outcome, a small set of secondary metrics for understanding, and guardrail metrics that must not regress - latency, error rate, unsubscribe rate. Testing many metrics and reporting whichever moved is the multiple comparisons problem again, and it guarantees a finding.",
          ],
        },
        {
          heading: "When the experiment is lying to you",
          body: [
            "The first check on any result is whether the split itself is correct. Sample ratio mismatch means the observed group sizes differ from the intended split by more than chance allows - you intended 50/50 and observe 50.4/49.6, which on millions of users is wildly improbable. This is not a curiosity; it means something is systematically dropping or misassigning users, and any result from that experiment is untrustworthy. Common causes are a variant erroring for a subset of users, bot filtering that treats variants differently, or exposure logging that fires later in one variant. Check it automatically on every experiment and treat a failure as a hard block - the temptation to analyse anyway is strong and should be refused, because the mechanism causing the mismatch is usually also biasing the metric.",
            "Then consider interference, which breaks the fundamental assumption that one user's assignment does not affect another's outcome. It appears in several forms. In a marketplace, showing better recommendations to the treatment group can consume limited inventory, making the control group worse - so the measured difference overstates the true effect, because part of it is harm to control. In a social network, treated users influence their untreated friends, contaminating the control group and understating the effect. When both groups draw from a shared resource - a budget, a rate limit, a supply of drivers - they are not independent.",
            "Where interference is likely, randomise at a level that contains it: by market, by region, by social cluster, or by time period with switchback designs that alternate all traffic between variants. All of these trade statistical power for validity, which is the right trade - a precise estimate of the wrong quantity is worse than an imprecise estimate of the right one.",
            "Ranking experiments have their own difficulty, since a small ranking change produces a small metric change that ordinary A/B tests struggle to detect at reasonable traffic. Interleaving addresses this by mixing results from both rankers into one list for the same user and observing which ranker's items get clicked. Because each user sees both, it removes between-user variance and is far more sensitive - often detecting differences with a fraction of the traffic. It measures relative preference between rankers rather than the absolute effect of shipping one, so it is a powerful screening tool that an A/B test should still confirm.",
          ],
        },
      ],
      workedExample: {
        title: "A result that reverses when the experiment is run properly",
        setup:
          "A team tests a new recommendation model. After 3 days they see a 4 percent lift in click-through rate, significant at p less than 0.05, and want to ship. The experiment randomised by session, was checked daily, and the treatment group has 51.2 percent of sessions against an intended 50 percent.",
        steps: [
          "Stop at the sample ratio mismatch, before discussing the result at all. 51.2 percent against an intended 50 percent on a large sample is far outside chance. Something is systematically different between the groups. Investigation finds the new model times out on about 2 percent of requests and those sessions fail to log exposure - so the treatment group is silently missing its slowest, and likely least engaged, sessions. The 4 percent lift is at least partly the removal of bad sessions from treatment, which is a measurement artefact rather than an improvement.",
          "Fix the randomisation unit. Session-level assignment means a returning user can see different variants on different visits, contaminating both the experience and the measurement, and it breaks the independence assumption because one user contributes correlated sessions to both groups. Switch to user-level assignment with a deterministic hash of user ID and experiment ID.",
          "Address the peeking. Checking daily and stopping at the first significant result inflates the false positive rate well beyond the nominal 5 percent. Either fix the duration in advance and analyse once, or adopt a sequential test designed for continuous monitoring. Compute the minimum detectable effect first to confirm the experiment can detect the effect size that would matter - otherwise the whole exercise is predetermined to be inconclusive.",
          "Run for at least two full weeks. Three days cannot separate a genuine improvement from a novelty effect, and it does not cover a full weekly cycle. Two weeks lets the novelty decay and covers two complete cycles, so the estimate reflects steady-state behaviour rather than reaction to change.",
          "Consider interference explicitly. If the recommender surfaces limited inventory, treatment users consuming it makes control worse and inflates the measured difference. Check whether items shown to treatment are constrained; if so, randomise by market instead and accept the loss of power in exchange for a valid comparison.",
          "Re-run and interpret honestly. With user-level assignment, fixed duration, timeout logging repaired, and two weeks of data, the lift is 0.8 percent with a confidence interval from 0.2 to 1.4 percent. Smaller than the original claim and real. Check guardrails - latency, diversity, session length - before shipping, and note that had the team shipped on the original result, they would have attributed a logging bug to their model.",
        ],
        takeaway:
          "Four independent problems each inflated the result in the same direction, and the sample ratio mismatch was the one that should have stopped everything immediately - it is the cheapest and most reliable signal that an experiment is untrustworthy. The general lesson is that experimentation errors do not announce themselves as errors; they arrive as encouraging results, which is precisely why the checks must be automatic rather than discretionary.",
      },
    },
    glossary: [
      { term: "Randomisation unit", definition: "What is independently assigned to a variant - request, user, or market. Coarser units contain interference and cost statistical power." },
      { term: "Deterministic assignment", definition: "Hashing user ID with experiment ID so assignment needs no stored table, is consistent across services, and is independent across experiments." },
      { term: "Exposure rule", definition: "Who counts as being in the experiment. Logged at the first point variants could differ, before any behaviour is influenced." },
      { term: "Intention to treat", definition: "Analysing users by assigned group regardless of what happened afterwards. Answers the effect of shipping, rather than the effect on a self-selected subset." },
      { term: "Minimum detectable effect", definition: "The smallest change an experiment could reliably detect. If it exceeds the plausible effect, the experiment is predetermined to be inconclusive." },
      { term: "Statistical power", definition: "The probability of detecting a real effect of a given size. Determined by traffic, metric variance, and duration." },
      { term: "Novelty effect", definition: "Users reacting to a change because it is new, decaying over one to two weeks. Short experiments measure the novelty rather than the value." },
      { term: "Peeking", definition: "Repeatedly checking results and stopping when significant, which inflates the false positive rate well beyond the nominal level." },
      { term: "Sequential testing", definition: "Methods designed to permit continuous monitoring while controlling the error rate - the correct alternative to a fixed-horizon test checked daily." },
      { term: "Guardrail metric", definition: "A metric that must not regress regardless of the primary result, such as latency, error rate, or unsubscribes." },
      { term: "SRM", expansion: "sample ratio mismatch", definition: "Observed group sizes differing from the intended split beyond chance. Indicates systematic misassignment or dropped users, and invalidates the experiment." },
      { term: "Interference (SUTVA violation)", definition: "One user's assignment affecting another's outcome, through shared inventory, social influence, or a shared budget. Breaks the independence the analysis assumes." },
      { term: "Switchback design", definition: "Alternating all traffic between variants over time periods, used when interference makes simultaneous groups incomparable." },
      { term: "Interleaving", definition: "Mixing two rankers' results into one list for the same user. Removes between-user variance and detects ranking differences with far less traffic, measuring relative preference rather than absolute effect." },
    ],
  },

  "ml-safe-deployment": {
    primer: {
      plainSummary:
        "Deploying a model is riskier than deploying ordinary code, because a model can be perfectly healthy by every infrastructure measure - no errors, good latency - while producing predictions that are quietly wrong. This module is about releasing models so that a bad one is caught early, affects few users, and can be reversed in seconds rather than hours.",
      analogy:
        "Opening a new bridge. You do not open it to full traffic on day one. You load-test it, then let a few vehicles across, then increase gradually while monitoring for movement, and you keep the old bridge standing until you are confident. Critically, the failure you are watching for is not the bridge collapsing - that would be obvious - but small deflections that indicate a problem before it becomes visible.",
      sections: [
        {
          heading: "Shadow deployment: what it proves and what it cannot",
          body: [
            "Shadow mode runs the new model on real production traffic while discarding its output. Users see the current model's results; the new model's predictions are logged for comparison. This is the cheapest possible production validation, since nobody can be harmed by it.",
            "It answers several questions that offline evaluation cannot. Does the model handle real production traffic - the malformed inputs, the unexpected distributions, the edge cases that never appear in a curated dataset? Does it meet its latency budget under real load and real concurrency? Are the features it receives in production the same as those it trained on? And how does its prediction distribution compare with the current model's, which is often where a problem first shows: a model predicting positive at three times the current rate has something wrong, whatever its offline metrics said.",
            "Being equally clear about the limits matters, because shadow mode is routinely overclaimed. It cannot measure impact, because nothing acted on the predictions. It cannot detect problems that only appear when users respond to the model's output - if a recommender surfaces different items, user behaviour changes, and shadow mode sees none of that. It cannot evaluate anything with a feedback loop. And for any decision that changes the world - approving a loan, blocking a transaction - shadow predictions have no observable outcome at all.",
            "So shadow mode validates the mechanics: inputs, latency, stability, output distribution. It cannot validate the value. Those need a canary and an experiment respectively, and stating that division cleanly is the point.",
          ],
        },
        {
          heading: "Canary and controlled ramp",
          body: [
            "A canary sends a small fraction of real traffic to the new model - 1 percent - while the rest continues to the current one. Now the model's outputs are actually used, so real impact is observable and real harm is bounded to that fraction.",
            "The ramp increases exposure in stages - 1 percent, 5 percent, 25 percent, 50 percent, 100 percent - with a bake period at each stage long enough for problems to appear. The right duration depends on how quickly you learn about failures: if your key metric has a one-hour reporting delay, a fifteen-minute bake window guarantees you advance before you could have seen anything. State the bake time in terms of the slowest signal you depend on.",
            "Each stage has gates: automatic checks that must pass before proceeding, and that trigger rollback if violated. Technical gates cover error rate, latency, and resource use. Prediction gates cover the distribution of outputs and the rate of fallback to defaults. Business gates cover the metrics that actually matter, which usually have the longest delay and therefore gate the later stages rather than the first.",
            "Canary analysis must compare against a concurrent control rather than against yesterday, because traffic varies by hour and day and a comparison against a different time period will attribute normal variation to the model. Compare the canary population against a comparable population served by the current model at the same moment.",
            "One trap to avoid: routing canary traffic by a non-random rule - a region, an availability zone, a subset of accounts - makes the population non-comparable, so a difference may reflect who the users are rather than what the model does. Route randomly, and hash by user so a user's experience is consistent through the ramp.",
          ],
        },
        {
          heading: "Rollback as a designed path, and protecting the serving layer",
          body: [
            "Rollback must be a first-class, rehearsed, fast operation - one action reverting to the previous version in seconds. If reverting requires rebuilding, redeploying, or retraining, then under pressure people will attempt to fix forward instead, which is how a small model problem becomes a long outage.",
            "The unit of rollback is the release, not the weights. A model's behaviour depends on its feature definitions, preprocessing, calibration mapping, decision thresholds, and policy rules, so these are versioned and reverted together. Rolling back weights while leaving new thresholds in place produces a combination that was never tested - which is a worse state than either version, and it happens precisely when everyone is stressed.",
            "Automate the rollback trigger for the conditions you can define objectively - error rate above a bound, latency past a threshold, prediction distribution outside expected range. Automated rollback is faster than paging a human and does not depend on someone being awake, and the cost of an unnecessary rollback is low while the cost of a slow one is high, so the asymmetry favours a hair trigger.",
            "Beyond the release process, the serving layer needs its own protection. A kill switch disables the model entirely and falls back to a simpler model or a rule, which is the escape hatch when the problem is the model itself rather than a specific version. Fallbacks handle partial failures: when features are unavailable, serve from a model requiring fewer features rather than failing. Under overload, shed load by priority rather than degrading for everyone, and consider serving cheaper predictions to lower-priority traffic.",
            "Load-test before deploying, because inference cost is not a property of accuracy and a model that is 2 percent better and three times slower may be undeployable. Test at expected peak with realistic input sizes, and verify autoscaling actually keeps up - model servers often scale slowly because loading a large model takes time, so autoscaling that works for stateless services can be far too slow here. That startup delay is worth measuring explicitly, since it determines whether you can absorb a traffic spike at all.",
          ],
        },
      ],
      workedExample: {
        title: "Rolling out a fraud model without a bad day",
        setup:
          "A new fraud model has passed offline evaluation and is ready for production. It blocks transactions, so an error is directly harmful - a false positive is a customer unable to pay. The current model has been serving for a year and its behaviour is well understood.",
        steps: [
          "Shadow for one week first. Run the new model on all traffic with outputs discarded. Compare its prediction distribution against the current model's, verify latency at peak, and confirm every feature is populated as expected. Finding here that it flags 2.5 times as many transactions is exactly what shadow mode is for - and note this is a distribution comparison rather than an accuracy claim, since no shadow prediction has an outcome.",
          "Investigate the distribution difference rather than proceeding. It turns out the model was trained on downsampled negatives without probability correction, so its scores are inflated and the threshold carried over from the old model corresponds to a much lower true risk. Recalibrate and re-derive the threshold from the cost ratio. This is a defect that offline ranking metrics could not have shown, because ranking was fine.",
          "Canary at 1 percent with random user-level routing. Now blocks are real, so 1 percent bounds the harm. Gates: block rate within expected bounds, customer service contact rate about blocked transactions, latency, and error rate. Bake for 24 hours to cover a full daily cycle, since fraud patterns vary strongly by hour.",
          "Ramp with bake times set by the slowest signal. 5 percent, 25 percent, 50 percent, 100 percent, each with at least 24 hours. Confirmed fraud takes days to be reported, so the early stages are gated on leading indicators - block rate, customer complaints, authorisation decline rate - while confirmed-fraud comparison gates the last stage. Being explicit that the early gates use proxies is what keeps them honest.",
          "Compare against a concurrent control at every stage. Fraud rates vary by day, by promotion, and by season, so comparing today's canary against last week's baseline would attribute normal variation to the model. Hold out a comparable randomly-selected population on the current model throughout the ramp.",
          "Define and rehearse the reversal path. One action reverts model, calibration, thresholds, and policy together as one release. Automate rollback on block rate exceeding 1.5 times baseline, on error rate, and on latency. Keep a kill switch disabling the model entirely in favour of the old rules engine, and rehearse it before the rollout rather than discovering during an incident that nobody has permission to trigger it.",
        ],
        takeaway:
          "The important defect - a calibration error that would have blocked far too many legitimate transactions - was found in shadow mode, before any customer was affected, by comparing prediction distributions rather than by any accuracy metric. Offline evaluation could not have caught it because ranking was unaffected. That is the argument for a staged rollout: not that it catches known risks, but that it catches the ones you did not think to test for, while the blast radius is still 1 percent.",
      },
    },
    glossary: [
      { term: "Shadow deployment", definition: "Running a model on real traffic while discarding its output. Validates inputs, latency, stability, and output distribution; cannot validate impact." },
      { term: "Prediction distribution comparison", definition: "Comparing the new model's output distribution against the current one's. Often where a defect first shows, independent of any accuracy metric." },
      { term: "Canary", definition: "Serving a small fraction of real traffic with the new model, so impact is observable and harm is bounded to that fraction." },
      { term: "Traffic ramp", definition: "Increasing exposure in stages with a bake period at each, sized by the slowest signal you depend on rather than by convenience." },
      { term: "Bake period", definition: "Time spent at a ramp stage before advancing. Shorter than the reporting delay of your key metric means advancing blind." },
      { term: "Deployment gate", definition: "An automatic check that must pass to advance and triggers rollback if violated, covering technical, prediction-distribution, and business signals." },
      { term: "Concurrent control", definition: "A comparable population served by the current model at the same moment, since comparing against a past period attributes normal variation to the model." },
      { term: "Release manifest", definition: "Model, features, preprocessing, calibration, thresholds, and policy versioned as one artefact, so a rollback cannot produce an untested combination." },
      { term: "Rollback", definition: "Reverting to the previous release in one fast action. If it requires rebuilding or retraining, people will fix forward under pressure instead." },
      { term: "Automated rollback trigger", definition: "Objective conditions that revert without human involvement. Justified by asymmetry: an unnecessary rollback is cheap, a slow one is not." },
      { term: "Kill switch", definition: "Disabling the model entirely in favour of a simple fallback. The escape hatch when the problem is the model rather than a version." },
      { term: "Fallback model", definition: "A simpler model needing fewer features, served when features are unavailable, so partial failures degrade rather than fail." },
      { term: "Model server autoscaling", definition: "Scaling inference capacity with load. Often far slower than for stateless services because loading a model takes time, which bounds absorbable spikes." },
    ],
  },

  "ml-drift-feedback-monitoring": {
    primer: {
      plainSummary:
        "A deployed model degrades even when nothing about it changes, because the world it was trained on moves away from it. This module is about noticing that - distinguishing the several distinct things people call drift, monitoring when the truth arrives months late, and recognising feedback loops where the model's own outputs shape the data it will next be trained on.",
      analogy:
        "A map. A perfectly accurate map slowly becomes wrong as roads are built and buildings demolished, without anyone editing the map. Noticing requires either driving the routes and comparing, or watching for signals that the territory has changed. And there is a subtler case: if everyone follows the map, traffic patterns adapt to it, so the map starts shaping the territory it describes - which means comparing map to territory no longer tells you whether the map was right.",
      sections: [
        {
          heading: "Four things called drift, which need different responses",
          body: [
            "Covariate drift, or data drift, means the distribution of inputs changes while the relationship between inputs and outcome stays the same. More young users sign up, or a new device type appears. The model is not wrong about the relationship, but it is now operating on inputs unlike its training data, where it may be less reliable. Detected by comparing input distributions over time.",
            "Concept drift means the relationship itself changes: the same inputs now imply a different outcome. Fraud tactics evolve, so behaviour that indicated fraud last year is now normal. This is the serious one, because no amount of input monitoring detects it - the inputs can look completely stable while the model has become wrong. Detecting concept drift requires outcomes.",
            "Calibration drift means the ranking is still good but the probabilities have shifted, usually because the base rate moved. A model that ranked risk well when defaults were 2 percent will produce systematically wrong probabilities when they reach 5 percent, and every cost-based threshold silently becomes wrong with it. Often fixable by recalibrating on recent data, without retraining.",
            "And data quality failure is not drift at all, though it looks identical on a dashboard: an upstream job failed, a schema changed, a field became all nulls, a unit changed from cents to dollars. These are bugs with sudden onset, and they are far more common than genuine drift. The practical rule is to rule out data quality first whenever a monitor fires, because the responses are completely different - fix a pipeline, versus retrain a model - and treating a broken pipeline as drift means retraining on corrupted data, which makes things considerably worse.",
            "Note that the fourth is distinguished from the others largely by its shape in time: quality failures appear as step changes, real drift is usually gradual. That is a useful first diagnostic before anything more sophisticated.",
          ],
        },
        {
          heading: "Monitoring in layers, given that truth arrives late",
          body: [
            "The most reliable signal - was the prediction right - is also the slowest, and sometimes never arrives. So monitoring is layered by how quickly each signal is available, and each layer detects a different class of problem.",
            "Immediately available: input distributions, missing-value and default-substitution rates, feature freshness, prediction distribution, latency, and error rates. These catch data quality failures and gross problems within minutes, and they are the layer that catches most real incidents.",
            "Available within hours: leading indicators and proxy outcomes - clicks, immediate user reactions, early complaints, downstream system behaviour. Correlated with the eventual outcome and not the same thing, which is fine for monitoring and dangerous as a training target.",
            "Available eventually: actual outcomes and true model quality, on whatever delay the domain imposes. This is the only signal that detects concept drift, so it must be measured even though it is slow, and evaluated by cohort - grouping predictions by when they were made - or delayed labels will smear across periods and hide when the degradation began.",
            "For distribution comparison, population stability index is the common summary, computed by bucketing a feature and comparing bucket proportions between a reference and a current window. Conventional thresholds - below 0.1 stable, 0.1 to 0.25 moderate, above 0.25 significant - are rules of thumb rather than laws, and worth treating that way. Two cautions matter more than the choice of statistic. On large samples, any statistical test detects tiny differences that mean nothing, so measure effect size rather than significance. And drift in an unimportant feature is not important, so weight monitoring by feature importance rather than alerting equally on everything, which is how drift monitoring becomes noise everyone ignores.",
            "Monitor by slice as well as in aggregate, since a model can degrade badly for a subgroup while the overall number stays flat - which is the same reason slice evaluation matters before deployment.",
          ],
        },
        {
          heading: "Feedback loops, and adapting without automating the mistake",
          body: [
            "The distinctive hazard of deployed ML is that the model's outputs influence the data it will next be trained on. This makes the usual assumption - that training data is a sample from the world - false, because the data is a sample from a world the model helped create.",
            "Exposure loops: a recommender shows certain items, users can only engage with what they see, so those items accumulate engagement and look better, so they are shown more. Popularity concentrates and the catalogue narrows, while every offline metric looks healthy because the model is predicting its own selections accurately.",
            "Selection loops: a fraud model blocks certain transactions, so their outcomes are never observed, so training data contains only what the model allowed. The model becomes increasingly confident about the region it permits and blind outside it.",
            "Self-fulfilling loops: predicting a user will churn triggers a retention offer that prevents the churn, so the prediction appears wrong. Train on that and the model learns not to predict churn for exactly the users where predicting it was valuable - it un-learns its own correct predictions.",
            "The countermeasures are consistent across all three. Log the decision and the intervention alongside the prediction, at decision time, since the confound cannot be reconstructed afterwards. Maintain an exploration slice - randomised or unfiltered traffic - that provides unbiased data. Monitor the decision distribution, not just prediction quality, because a narrowing approval rate or a concentrating recommendation distribution is the visible symptom of a loop that no accuracy metric will show. And in some systems, deliberately hold out a control population that never receives the model's intervention, which is expensive and is the only clean measurement of the model's actual effect.",
            "Finally, do not automate retraining on drift. It is tempting and it is a way to amplify a bad situation quickly: a drift signal caused by a broken pipeline triggers retraining on corrupted data, and now the model is broken too. Retraining should be a gated process - triggered by monitoring, but passing the same validation gates as any other candidate, evaluated against the current production model, and rolled out through the same staged deployment. The monitoring decides when to consider retraining; the gates decide whether the result is fit to serve.",
          ],
        },
      ],
      workedExample: {
        title: "Diagnosing a gradual decline in model quality",
        setup:
          "A content ranking model has been serving for eight months. Engagement per session has fallen about 12 percent over that period. Input distributions show no significant drift. The model, features, and thresholds are unchanged.",
        steps: [
          "Rule out data quality first, since it is the most common cause and the cheapest to check. Verify feature freshness, null rates, and default-substitution rates against eight months ago. All stable, and the decline is gradual rather than a step change - which is characteristic of genuine drift rather than a pipeline failure, and lets you move on with some confidence.",
          "Note what stable inputs do and do not rule out. No covariate drift means the inputs look like they did. It says nothing about whether the relationship between inputs and engagement has changed, because concept drift is invisible in input monitoring by definition. Many investigations stop here and conclude the model is fine, which is exactly the wrong inference.",
          "Evaluate quality by cohort. Group predictions by the month they were made and compute actual ranking quality per cohort against realised engagement. Quality declines steadily across cohorts, confirming the model has genuinely become worse at ranking rather than users simply engaging less overall. This is the measurement that distinguishes a model problem from a product problem.",
          "Check for a feedback loop, which is the most likely cause given stable inputs. Look at the distribution of items shown over time: the effective catalogue has narrowed considerably, with a growing share of impressions concentrated in a shrinking set of items. The model is increasingly recommending what it has already been recommending - an exposure loop - and users have less to discover.",
          "Confirm with the exploration slice. Comparing engagement on the randomised exploration slice against production shows the gap widening over eight months, which means the production model is doing worse relative to random than it used to. That is strong evidence for the loop rather than for a general decline in user engagement, and it is only available because the slice existed.",
          "Fix the loop rather than only the model. Retraining on the same feedback-shaped data would reproduce it within months. Increase the exploration budget, add a diversity constraint in the re-ranking policy, weight training examples by inverse propensity to correct exposure bias, and add a monitor on impression concentration so the loop is visible directly rather than inferred from a decline eight months later.",
        ],
        takeaway:
          "Every conventional monitor was green - inputs stable, no errors, no data quality issues - while the model degraded steadily, because the cause was the model's own influence on its data rather than anything about the inputs. That is why decision distributions and an exploration slice need monitoring alongside prediction quality: they are the only signals that make a feedback loop visible while it is happening rather than after a year of decline.",
      },
    },
    glossary: [
      { term: "Covariate drift (data drift)", definition: "Input distributions changing while the input-outcome relationship holds. Detectable from inputs alone." },
      { term: "Concept drift", definition: "The relationship between inputs and outcome changing, so the model becomes wrong while inputs look stable. Detectable only from outcomes." },
      { term: "Calibration drift", definition: "Probabilities shifting, usually with the base rate, while ranking stays good. Silently invalidates cost-based thresholds, and often fixed by recalibration alone." },
      { term: "Data quality failure", definition: "A pipeline or schema bug that resembles drift on a dashboard but appears as a step change. More common than real drift, and must be ruled out first." },
      { term: "Layered monitoring", definition: "Organising signals by how quickly they arrive - inputs immediately, leading indicators in hours, true outcomes eventually - since each layer catches different problems." },
      { term: "PSI", expansion: "population stability index", definition: "A summary of distribution shift computed from bucket proportions between a reference and a current window. Its conventional thresholds are rules of thumb." },
      { term: "Effect size vs significance", definition: "On large samples any test detects trivial differences, so drift monitoring must measure how much a distribution moved rather than whether the move is significant." },
      { term: "Importance-weighted drift monitoring", definition: "Alerting on drift in features the model actually relies on, since equal alerting across all features produces noise everyone learns to ignore." },
      { term: "Cohort evaluation", definition: "Grouping predictions by when they were made before measuring quality, so delayed labels do not smear degradation across periods." },
      { term: "Exposure feedback loop", definition: "A model's recommendations determining what users can engage with, concentrating popularity and narrowing the catalogue while offline metrics stay healthy." },
      { term: "Selection feedback loop", definition: "A model's decisions determining which outcomes are observable, so training data covers only the region the model permits." },
      { term: "Self-fulfilling prediction", definition: "Acting on a prediction preventing the predicted outcome, so the model appears wrong precisely where it was right and useful." },
      { term: "Exploration slice", definition: "Randomised or unfiltered traffic providing unbiased data, and the reference that makes a feedback loop measurable while it is happening." },
      { term: "Decision distribution monitoring", definition: "Watching what the system decides - approval rates, impression concentration - rather than only prediction quality. The signal that reveals feedback loops." },
      { term: "Gated retraining", definition: "Retraining triggered by monitoring but subject to the same validation gates and staged rollout as any candidate, so a drift signal caused by a bug cannot promote a model trained on corrupted data." },
    ],
  },
};
