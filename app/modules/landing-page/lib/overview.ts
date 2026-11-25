import { count, countDistinct, desc, eq, inArray } from "drizzle-orm";
import {
  categories,
  courses,
  CourseStatus,
  lessons,
  modules,
  users,
} from "~/db/schema";
import type { Db } from "./db";

// One for the hero spotlight, three for the "New courses" grid.
const NEWEST_COURSE_COUNT = 4;

export type FeaturedCourse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  instructorName: string;
  categoryName: string;
  lessonCount: number;
};

export type CatalogueStats = {
  courses: number;
  lessons: number;
  instructors: number;
};

export type LandingOverview = {
  /** The newest published course, or null when nothing is published. */
  spotlight: FeaturedCourse | null;
  /** The next newest, so the spotlight course is not shown twice. */
  newCourses: FeaturedCourse[];
  stats: CatalogueStats;
};

const published = eq(courses.status, CourseStatus.Published);

function newestPublishedCourses(database: Db) {
  return database
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      coverImageUrl: courses.coverImageUrl,
      instructorName: users.name,
      categoryName: categories.name,
    })
    .from(courses)
    .innerJoin(users, eq(courses.instructorId, users.id))
    .innerJoin(categories, eq(courses.categoryId, categories.id))
    .where(published)
    .orderBy(desc(courses.createdAt), desc(courses.id))
    .limit(NEWEST_COURSE_COUNT)
    .all();
}

function lessonCountsByCourse(database: Db, courseIds: number[]) {
  const rows = database
    .select({ courseId: modules.courseId, lessons: count(lessons.id) })
    .from(modules)
    .innerJoin(lessons, eq(lessons.moduleId, modules.id))
    .where(inArray(modules.courseId, courseIds))
    .groupBy(modules.courseId)
    .all();
  return new Map(rows.map((row) => [row.courseId, row.lessons]));
}

// An aggregate without GROUP BY always returns exactly one row.
function catalogueStats(database: Db): CatalogueStats {
  const [totals] = database
    .select({
      courses: countDistinct(courses.id),
      instructors: countDistinct(courses.instructorId),
    })
    .from(courses)
    .where(published)
    .all();
  const [lessonTotal] = database
    .select({ lessons: count(lessons.id) })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(published)
    .all();
  return { ...totals, lessons: lessonTotal.lessons };
}

/**
 * What the landing page shows: the newest published course in the
 * spotlight, the next newest beneath it, and the size of
 * the published catalogue. Drafts and archived courses count for nothing.
 */
export function getLandingOverview(database: Db): LandingOverview {
  const newest = newestPublishedCourses(database);
  const lessonCounts = lessonCountsByCourse(
    database,
    newest.map((course) => course.id)
  );
  const [spotlight = null, ...newCourses] = newest.map((course) => ({
    ...course,
    lessonCount: lessonCounts.get(course.id) ?? 0,
  }));
  return {
    spotlight,
    newCourses,
    stats: catalogueStats(database),
  };
}
