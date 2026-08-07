/**
 * Runs the study-content authoring control.
 *
 * `build` and `test` both depend on this, so a broken reference or a thin field
 * fails the pipeline rather than shipping. It lives in a script instead of at
 * `studyData` module scope so none of it reaches the browser bundle.
 */
import { validateStudyContent } from "../app/content/validate";
import { allTopics, curriculumWeeks, designPrompts } from "../app/studyData";

validateStudyContent(allTopics, designPrompts, curriculumWeeks);

const modules = allTopics.length;
const prompts = designPrompts.length;
const quizItems = allTopics.reduce((sum, topic) => sum + topic.quiz.length, 0);
const recallCards = allTopics.reduce((sum, topic) => sum + topic.recallCards.length, 0);
console.log(`Study content OK — ${modules} modules, ${prompts} prompts, ${quizItems} quiz items, ${recallCards} recall cards.`);
