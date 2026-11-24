import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import { addLesson, addLongQuiz, addModule, addQuiz, setUp } from "./fixtures";

let t: ReturnType<typeof setUp>;
let lessonId: number;

beforeEach(() => {
  t = setUp();
  const mod = addModule(t.db, t.course.id, 1);
  lessonId = addLesson(t.db, mod.id, { position: 1 }).id;
});

describe("grading a ten-question quiz", () => {
  it.each([
    [10, "A", true],
    [9, "A", true],
    [8, "B", true],
    [7, "C", false],
    [6, "D", false],
    [5, "F", false],
  ])("%i right is a %s (passed: %s)", (right, grade, passed) => {
    const { quiz, questions } = addLongQuiz(t.db, lessonId, 10);
    const answers = Object.fromEntries(
      questions.slice(0, right).map((q) => [q.id, q.right])
    );
    const result = t.lessonPage.submitQuiz(
      { userId: t.user.id, quizId: quiz.id },
      answers
    );
    expect(result).toMatchObject({ grade, passed, totalCorrect: right });
  });
});

it("scores a quiz with no questions as zero", () => {
  const { quiz } = addLongQuiz(t.db, lessonId, 0);
  const result = t.lessonPage.submitQuiz(
    { userId: t.user.id, quizId: quiz.id },
    {}
  );
  expect(result).toMatchObject({ score: 0, passed: false, totalQuestions: 0 });
});

it("records only the questions that were answered", () => {
  const q = addQuiz(t.db, lessonId);
  const result = t.lessonPage.submitQuiz(
    { userId: t.user.id, quizId: q.quiz.id },
    { [q.second.id]: q.second.wrong }
  );
  const answers = t.db
    .select()
    .from(schema.quizAnswers)
    .where(eq(schema.quizAnswers.attemptId, result?.attemptId ?? -1))
    .all();
  expect(answers.map((a) => [a.questionId, a.selectedOptionId])).toEqual([
    [q.second.id, q.second.wrong],
  ]);
});
