import { eq } from "drizzle-orm";
import { quizzes } from "~/db/schema";
import type { Db } from "./db";
import { flattenCourseLessons } from "./course";
import {
  calculateWatchProgress,
  getLastWatchPosition,
  getLessonProgress,
  getLessonProgressForCourse,
  markLessonInProgress,
} from "./progress";
import {
  getBestAttempt,
  getQuizByLessonId,
  getQuizWithQuestions,
} from "./quiz";

export type LessonQuiz = {
  id: number;
  title: string;
  passingScore: number;
  questions: Array<{
    id: number;
    questionText: string;
    questionType: string;
    position: number;
    options: Array<{ id: number; optionText: string }>;
  }>;
};

type OpenedLesson = {
  id: number;
  videoUrl: string | null;
  durationMinutes: number | null;
};

export type LessonProgressView = {
  lessonStatus: string | null;
  lastWatchPosition: number;
  watchProgress: number;
  lessonProgressMap: Record<number, string>;
};

/** What the page shows for someone whose progress is not recorded. */
export const NO_PROGRESS: LessonProgressView = {
  lessonStatus: null,
  lastWatchPosition: 0,
  watchProgress: 0,
  lessonProgressMap: {},
};

/**
 * Records that the Student opened the Lesson (in progress, unless already
 * completed) and returns their progress on it and across the Course.
 */
export function openLesson(
  db: Db,
  userId: number,
  { lesson, courseId }: { lesson: OpenedLesson; courseId: number }
): LessonProgressView {
  const lessonId = lesson.id;
  let lastWatchPosition = 0;
  let watchProgress = 0;
  const lessonProgressMap: Record<number, string> = {};

  markLessonInProgress(db, userId, lessonId);
  const progress = getLessonProgress(db, userId, lessonId);
  const lessonStatus: string | null = progress?.status ?? null;

  for (const record of getLessonProgressForCourse(db, userId, courseId)) {
    lessonProgressMap[record.lessonId] = record.status;
  }

  if (lesson.videoUrl) {
    lastWatchPosition = getLastWatchPosition(db, userId, lessonId);
    const videoDurationSeconds = (lesson.durationMinutes ?? 0) * 60;
    if (videoDurationSeconds > 0) {
      watchProgress = calculateWatchProgress(
        db,
        { userId, lessonId },
        videoDurationSeconds
      );
    }
  }

  return { lessonStatus, lastWatchPosition, watchProgress, lessonProgressMap };
}

/** The Lessons either side of this one, across Module boundaries. */
export function neighbours(
  course: Parameters<typeof flattenCourseLessons>[0],
  lessonId: number
) {
  const allLessons = flattenCourseLessons(course);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  return { prevLesson, nextLesson };
}

/** The Lesson's quiz without its answers, and the person's best attempt. */
export function lessonQuiz(db: Db, lessonId: number, userId: number | null) {
  const quizRecord = getQuizByLessonId(db, lessonId);
  let quiz: LessonQuiz | null = null;
  let bestAttempt: { score: number; passed: boolean } | null = null;

  if (quizRecord) {
    const quizData = getQuizWithQuestions(db, quizRecord.id);
    if (quizData) {
      // Strip isCorrect from options so answers aren't leaked to the client
      quiz = {
        id: quizData.id,
        title: quizData.title,
        passingScore: quizData.passingScore,
        questions: quizData.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          position: q.position,
          options: q.options.map((o) => ({
            id: o.id,
            optionText: o.optionText,
          })),
        })),
      };
    }

    if (userId) {
      const best = getBestAttempt(db, userId, quizRecord.id);
      if (best) {
        bestAttempt = { score: best.score, passed: best.passed };
      }
    }
  }

  return { quiz, bestAttempt };
}

export function getQuizById(db: Db, quizId: number) {
  return db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
}
