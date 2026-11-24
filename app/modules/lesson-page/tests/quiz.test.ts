import { beforeEach, describe, expect, it } from "vitest";
import {
  addLesson,
  addModule,
  addQuestionWithNoRightOption,
  addQuiz,
  setUp,
} from "./fixtures";

let t: ReturnType<typeof setUp>;
let lessonId: number;
let q: ReturnType<typeof addQuiz>;

beforeEach(() => {
  t = setUp();
  const mod = addModule(t.db, t.course.id, 1);
  lessonId = addLesson(t.db, mod.id, { position: 1 }).id;
  q = addQuiz(t.db, lessonId);
});

function submit(answers: Record<number, number>, userId = t.user.id) {
  return t.lessonPage.submitQuiz({ userId, quizId: q.quiz.id }, answers);
}

describe("quiz", () => {
  it("has no quiz on a lesson without one", () => {
    const mod = addModule(t.db, t.course.id, 2);
    const bare = addLesson(t.db, mod.id, { position: 1 });
    expect(t.lessonPage.quiz(bare.id, t.user.id)).toEqual({
      quiz: null,
      bestAttempt: null,
    });
  });

  it("lists questions in position order without revealing answers", () => {
    const { quiz } = t.lessonPage.quiz(lessonId, t.user.id);
    expect(quiz).toEqual({
      id: q.quiz.id,
      title: "Check yourself",
      passingScore: 0.7,
      questions: [
        {
          id: q.first.id,
          questionText: "Q1",
          questionType: "multiple_choice",
          position: 1,
          options: [
            { id: q.first.wrong, optionText: "wrong" },
            { id: q.first.right, optionText: "right" },
          ],
        },
        {
          id: q.second.id,
          questionText: "Q2",
          questionType: "true_false",
          position: 2,
          options: [
            { id: q.second.wrong, optionText: "wrong" },
            { id: q.second.right, optionText: "right" },
          ],
        },
      ],
    });
  });

  it("has no best attempt for someone signed out or yet to try", () => {
    expect(t.lessonPage.quiz(lessonId, null).bestAttempt).toBeNull();
    expect(t.lessonPage.quiz(lessonId, t.user.id).bestAttempt).toBeNull();
  });

  it("reports the person's best attempt, not someone else's", () => {
    submit({ [q.first.id]: q.first.right });
    submit({ [q.first.id]: q.first.right, [q.second.id]: q.second.right });
    submit({});
    submit({ [q.first.id]: q.first.wrong }, t.instructor.id);
    expect(t.lessonPage.quiz(lessonId, t.user.id).bestAttempt).toEqual({
      score: 1,
      passed: true,
    });
  });

  it("finds a quiz by id", () => {
    expect(t.lessonPage.quizById(q.quiz.id)?.lessonId).toBe(lessonId);
    expect(t.lessonPage.quizById(q.quiz.id + 100)).toBeUndefined();
  });
});

describe("submitQuiz", () => {
  it("scores every answer right as a pass with an A", () => {
    const result = submit({
      [q.first.id]: q.first.right,
      [q.second.id]: q.second.right,
    });
    expect(result).toMatchObject({
      score: 1,
      passed: true,
      grade: "A",
      totalCorrect: 2,
      totalQuestions: 2,
    });
    expect(result?.questionResults).toEqual([
      {
        questionId: q.first.id,
        correct: true,
        selectedOptionId: q.first.right,
        correctOptionId: q.first.right,
      },
      {
        questionId: q.second.id,
        correct: true,
        selectedOptionId: q.second.right,
        correctOptionId: q.second.right,
      },
    ]);
  });

  it("marks a wrong answer and shows the right one", () => {
    const result = submit({
      [q.first.id]: q.first.right,
      [q.second.id]: q.second.wrong,
    });
    expect(result).toMatchObject({
      score: 0.5,
      passed: false,
      grade: "F",
      totalCorrect: 1,
    });
    expect(result?.questionResults[1]).toEqual({
      questionId: q.second.id,
      correct: false,
      selectedOptionId: q.second.wrong,
      correctOptionId: q.second.right,
    });
  });

  it("counts an unanswered question as wrong, revealing nothing", () => {
    const result = submit({ [q.second.id]: q.second.right });
    expect(result?.questionResults[0]).toEqual({
      questionId: q.first.id,
      correct: false,
      selectedOptionId: null,
      correctOptionId: null,
    });
  });

  it("records each attempt with a new id", () => {
    const one = submit({});
    const two = submit({});
    expect(one?.attemptId).toBeGreaterThan(0);
    expect(two?.attemptId).toBe((one?.attemptId ?? 0) + 1);
  });

  it("scores an answer to a question with no right option as wrong", () => {
    const bare = addQuestionWithNoRightOption(t.db, q.quiz.id, {
      position: 3,
      wrongOptions: 0,
    });
    const allWrong = addQuestionWithNoRightOption(t.db, q.quiz.id, {
      position: 4,
      wrongOptions: 1,
    });
    const { quiz } = t.lessonPage.quiz(lessonId, t.user.id);
    expect(quiz?.questions[2]).toMatchObject({
      id: bare.id,
      questionText: "Q3",
      options: [],
    });
    expect(quiz?.questions[3].options).toMatchObject([{ optionText: "wrong" }]);

    const result = submit({
      [bare.id]: q.first.right,
      [allWrong.id]: q.first.right,
    });
    expect(result?.questionResults.slice(2)).toEqual([
      {
        questionId: bare.id,
        correct: false,
        selectedOptionId: q.first.right,
        correctOptionId: null,
      },
      {
        questionId: allWrong.id,
        correct: false,
        selectedOptionId: q.first.right,
        correctOptionId: null,
      },
    ]);
  });

  it("records no attempt when an answer cannot be stored", () => {
    expect(() => submit({ [q.first.id]: 999_999 })).toThrow();
    expect(t.lessonPage.quiz(lessonId, t.user.id).bestAttempt).toBeNull();
  });

  it("returns null for an unknown quiz", () => {
    expect(
      t.lessonPage.submitQuiz({ userId: t.user.id, quizId: 999 }, {})
    ).toBeNull();
  });
});
