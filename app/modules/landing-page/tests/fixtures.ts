import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus, UserRole } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createLandingPage } from "../index.server";

// Courses, modules and lessons are written by the instructor pages, not by a
// module. Once a course-authoring module owns those writes, use it here.

export function setUp() {
  const db = createTestDb();
  const base = seedBaseData(db);
  return { db, ...base, landingPage: createLandingPage(db) };
}

let next = 0;

export function addInstructor(db: TestDb, name: string) {
  return db
    .insert(schema.users)
    .values({
      name,
      email: `${name.toLowerCase().replaceAll(" ", "-")}@example.com`,
      role: UserRole.Instructor,
    })
    .returning()
    .get();
}

export function addCategory(db: TestDb, name: string) {
  return db
    .insert(schema.categories)
    .values({ name, slug: name.toLowerCase().replaceAll(" ", "-") })
    .returning()
    .get();
}

export function addCourse(
  db: TestDb,
  fields: {
    instructorId: number;
    categoryId: number;
    createdAt: string;
    status?: CourseStatus;
  }
) {
  next += 1;
  return db
    .insert(schema.courses)
    .values({
      title: `Course ${next}`,
      slug: `course-${next}`,
      description: `About course ${next}`,
      salesCopy: markdown("Sales copy."),
      ...fields,
      status: fields.status ?? CourseStatus.Published,
    })
    .returning()
    .get();
}

/** Adds a module to the course holding `lessonCount` lessons. */
export function addLessons(db: TestDb, courseId: number, lessonCount: number) {
  const mod = db
    .insert(schema.modules)
    .values({ courseId, title: "Module", position: 1 })
    .returning()
    .get();
  for (let position = 1; position <= lessonCount; position++) {
    db.insert(schema.lessons)
      .values({ moduleId: mod.id, title: `Lesson ${position}`, position })
      .run();
  }
}
