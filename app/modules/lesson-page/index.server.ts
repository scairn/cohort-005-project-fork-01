import { db } from "~/db";
import type { Db } from "./lib/db";
import {
  getCourseWithDetails,
  getLessonById,
  getModuleById,
  getUserById,
} from "./lib/course";
import { markLessonComplete } from "./lib/progress";
import {
  getCommentById,
  getLessonThread,
  renderThread,
} from "./lib/discussion";
import { computeResult } from "./lib/quiz";
import {
  getQuizById,
  lessonQuiz,
  neighbours,
  openLesson,
} from "./lib/lesson-view";

export { NO_PROGRESS } from "./lib/lesson-view";
export type { LessonProgressView, LessonQuiz } from "./lib/lesson-view";

/**
 * The data behind the Lesson page, bound to a database. The route uses
 * `lessonPage`; tests build their own against a test database.
 * Permission checks stay in the route: nothing here asks who may see what.
 */
export function createLessonPage(database: Db) {
  return {
    course: (courseId: number) => getCourseWithDetails(database, courseId),
    lesson: (lessonId: number) => getLessonById(database, lessonId),
    module: (moduleId: number) => getModuleById(database, moduleId),
    user: (userId: number) => getUserById(database, userId),
    neighbours,
    /** Records the visit and returns the Student's progress. */
    openLesson: (userId: number, opened: Parameters<typeof openLesson>[2]) =>
      openLesson(database, userId, opened),
    completeLesson: (userId: number, lessonId: number, now: Date) =>
      markLessonComplete(database, { userId, lessonId }, now),
    /** The Lesson's comments, nested and rendered to sanitised HTML. */
    discussion: (lessonId: number) =>
      renderThread(getLessonThread(database, lessonId)),
    comment: (commentId: number) => getCommentById(database, commentId),
    quiz: (lessonId: number, userId: number | null) =>
      lessonQuiz(database, lessonId, userId),
    quizById: (quizId: number) => getQuizById(database, quizId),
    submitQuiz: (
      taker: Parameters<typeof computeResult>[1],
      selectedAnswers: Record<number, number>
    ) => computeResult(database, taker, selectedAnswers),
  };
}

// Pure so a route importing this only for its loader doesn't pull the
// database into the client bundle (see `~/db`).
export const lessonPage = /* @__PURE__ */ createLessonPage(db);
