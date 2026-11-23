import { and, desc, eq, inArray } from "drizzle-orm";
import {
  quizAnswers,
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizzes,
} from "~/db/schema";
import type { Db } from "./db";

export function getQuizByLessonId(db: Db, lessonId: number) {
  return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).get();
}

export function getQuizWithQuestions(db: Db, quizId: number) {
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
  if (!quiz) return null;

  const questions = questionsOf(db, quizId);
  const options = optionsByQuestion(db, questions);

  const questionsWithOptions = questions.map((question) => ({
    ...question,
    options: options.get(question.id) ?? [],
  }));

  return { ...quiz, questions: questionsWithOptions };
}

function questionsOf(db: Db, quizId: number) {
  return db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();
}

type QuizOption = typeof quizOptions.$inferSelect;

/** Every option of the given questions in one query, grouped by question. */
function optionsByQuestion(db: Db, questions: { id: number }[]) {
  const grouped = new Map<number, QuizOption[]>();
  if (questions.length === 0) return grouped;

  const options = db
    .select()
    .from(quizOptions)
    .where(
      inArray(
        quizOptions.questionId,
        questions.map((question) => question.id)
      )
    )
    .orderBy(quizOptions.id)
    .all();

  for (const option of options) {
    grouped.set(option.questionId, [
      ...(grouped.get(option.questionId) ?? []),
      option,
    ]);
  }
  return grouped;
}

export function getBestAttempt(db: Db, userId: number, quizId: number) {
  return db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
    )
    .orderBy(desc(quizAttempts.score))
    .limit(1)
    .get();
}

function calculateGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

type QuestionResult = {
  questionId: number;
  correct: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
};

function scoreQuestion(
  questionId: number,
  options: QuizOption[],
  selected: number | undefined
): QuestionResult {
  if (!selected) {
    return {
      questionId,
      correct: false,
      selectedOptionId: null,
      correctOptionId: null,
    };
  }
  const correctOptionId = options.find((o) => o.isCorrect)?.id ?? null;
  return {
    questionId,
    correct: selected === correctOptionId,
    selectedOptionId: selected,
    correctOptionId,
  };
}

/** The attempt and its answers land together, or not at all. */
function recordAttempt(
  db: Db,
  attempt: { userId: number; quizId: number; score: number; passed: boolean },
  questionResults: QuestionResult[]
) {
  return db.transaction((tx) => {
    const saved = tx.insert(quizAttempts).values(attempt).returning().get();

    for (const result of questionResults) {
      if (result.selectedOptionId !== null) {
        tx.insert(quizAnswers)
          .values({
            attemptId: saved.id,
            questionId: result.questionId,
            selectedOptionId: result.selectedOptionId,
          })
          .run();
      }
    }

    return saved;
  });
}

export type QuizTaker = { userId: number; quizId: number };

/** Scores the answers, records the attempt, and returns the result. */
export function computeResult(
  db: Db,
  { userId, quizId }: QuizTaker,
  selectedAnswers: Record<number, number>
) {
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
  if (!quiz) return null;

  const questions = questionsOf(db, quizId);
  const options = optionsByQuestion(db, questions);

  const questionResults = questions.map((q) =>
    scoreQuestion(q.id, options.get(q.id) ?? [], selectedAnswers[q.id])
  );
  const correct = questionResults.filter((r) => r.correct).length;
  const total = questions.length;

  const scoreValue = total > 0 ? correct / total : 0;
  const passed = scoreValue > 0.7;
  const grade = calculateGrade(scoreValue);

  const attempt = recordAttempt(
    db,
    { userId, quizId, score: scoreValue, passed },
    questionResults
  );

  return {
    attemptId: attempt.id,
    score: scoreValue,
    passed,
    grade,
    totalCorrect: correct,
    totalQuestions: total,
    questionResults,
  };
}
