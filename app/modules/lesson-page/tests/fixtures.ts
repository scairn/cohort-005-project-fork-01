import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { QuestionType } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createLessonPage } from "../index.server";

// The curriculum and quizzes are written by the instructor pages, not this
// module, so the fixtures insert them directly.

export function setUp() {
  const db = createTestDb();
  const base = seedBaseData(db);
  return { db, ...base, lessonPage: createLessonPage(db) };
}

export function addModule(db: TestDb, courseId: number, position: number) {
  return db
    .insert(schema.modules)
    .values({ courseId, title: `Module ${position}`, position })
    .returning()
    .get();
}

export function addLesson(
  db: TestDb,
  moduleId: number,
  fields: { position: number; videoUrl?: string; durationMinutes?: number }
) {
  return db
    .insert(schema.lessons)
    .values({
      moduleId,
      title: `Lesson ${moduleId}.${fields.position}`,
      ...fields,
    })
    .returning()
    .get();
}

export function addWatchEvent(
  db: TestDb,
  event: {
    userId: number;
    lessonId: number;
    positionSeconds: number;
    createdAt: string;
  }
) {
  db.insert(schema.videoWatchEvents)
    .values({ ...event, eventType: "progress" })
    .run();
}

/**
 * A quiz with one multiple-choice and one true/false question. Returns the
 * question ids and the id of each right and wrong option.
 */
export function addQuiz(db: TestDb, lessonId: number) {
  const quiz = db
    .insert(schema.quizzes)
    .values({ lessonId, title: "Check yourself", passingScore: 0.7 })
    .returning()
    .get();

  const question = (questionType: QuestionType, position: number) => {
    const row = db
      .insert(schema.quizQuestions)
      .values({
        quizId: quiz.id,
        questionText: `Q${position}`,
        questionType,
        position,
      })
      .returning()
      .get();
    const option = (optionText: string, isCorrect: boolean) =>
      db
        .insert(schema.quizOptions)
        .values({ questionId: row.id, optionText, isCorrect })
        .returning()
        .get().id;
    const wrong = option("wrong", false);
    const right = option("right", true);
    return { id: row.id, right, wrong };
  };

  // Inserted second-first so position, not insertion order, decides order.
  const second = question(QuestionType.TrueFalse, 2);
  const first = question(QuestionType.MultipleChoice, 1);
  return { quiz, first, second };
}

/** A question with only wrong options (or none), so nothing is correct. */
export function addQuestionWithNoRightOption(
  db: TestDb,
  quizId: number,
  { position, wrongOptions }: { position: number; wrongOptions: number }
) {
  const question = db
    .insert(schema.quizQuestions)
    .values({
      quizId,
      questionText: `Q${position}`,
      questionType: QuestionType.MultipleChoice,
      position,
    })
    .returning()
    .get();
  for (let i = 0; i < wrongOptions; i++) {
    db.insert(schema.quizOptions)
      .values({
        questionId: question.id,
        optionText: "wrong",
        isCorrect: false,
      })
      .run();
  }
  return question;
}

/** A quiz of `count` multiple-choice questions, each with one right option. */
export function addLongQuiz(db: TestDb, lessonId: number, count: number) {
  const quiz = db
    .insert(schema.quizzes)
    .values({ lessonId, title: "Long quiz", passingScore: 0.7 })
    .returning()
    .get();
  const questions = Array.from({ length: count }, (_, i) => {
    const row = db
      .insert(schema.quizQuestions)
      .values({
        quizId: quiz.id,
        questionText: `L${i}`,
        questionType: QuestionType.MultipleChoice,
        position: i,
      })
      .returning()
      .get();
    const right = db
      .insert(schema.quizOptions)
      .values({ questionId: row.id, optionText: "right", isCorrect: true })
      .returning()
      .get().id;
    return { id: row.id, right };
  });
  return { quiz, questions };
}

export function addOtherCourse(
  db: TestDb,
  instructorId: number,
  categoryId: number
) {
  return db
    .insert(schema.courses)
    .values({
      title: "Other",
      slug: "other",
      description: "Other course",
      salesCopy: markdown("Other"),
      instructorId,
      categoryId,
      status: schema.CourseStatus.Published,
    })
    .returning()
    .get();
}
