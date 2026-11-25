import { beforeEach, describe, expect, it } from "vitest";
import { courses, CourseStatus } from "~/db/schema";
import { FEATURED_COURSE_COUNT } from "../index.server";
import {
  addCategory,
  addCourse,
  addInstructor,
  addLessons,
  setUp,
} from "./fixtures";

let t: ReturnType<typeof setUp>;

beforeEach(() => {
  t = setUp();
});

// The base course is created now, so these dates sit after it.
function course(createdAt: string, status?: CourseStatus) {
  return addCourse(t.db, {
    instructorId: t.instructor.id,
    categoryId: t.category.id,
    createdAt,
    status,
  });
}

describe("featured courses", () => {
  it("are the newest published courses, newest first", () => {
    const oldest = course("2100-01-01T00:00:00.000Z");
    const newest = course("2100-04-01T00:00:00.000Z");
    const middle = course("2100-03-01T00:00:00.000Z");
    const third = course("2100-02-01T00:00:00.000Z");

    const ids = t.landingPage.overview().featuredCourses.map((c) => c.id);

    expect(FEATURED_COURSE_COUNT).toBe(3);
    expect(ids).toEqual([newest.id, middle.id, third.id]);
    expect(ids).not.toContain(oldest.id);
  });

  it("break a tie on creation time by the later id", () => {
    const first = course("2101-01-01T00:00:00.000Z");
    const second = course("2101-01-01T00:00:00.000Z");
    const ids = t.landingPage.overview().featuredCourses.map((c) => c.id);
    expect(ids.slice(0, 2)).toEqual([second.id, first.id]);
  });

  it("leave out drafts and archived courses", () => {
    course("2101-01-01T00:00:00.000Z", CourseStatus.Draft);
    course("2101-02-01T00:00:00.000Z", CourseStatus.Archived);
    const ids = t.landingPage.overview().featuredCourses.map((c) => c.id);
    expect(ids).toEqual([t.course.id]);
  });

  it("carry the instructor, category and the course's own lesson count", () => {
    const other = course("2101-01-01T00:00:00.000Z");
    addLessons(t.db, other.id, 2);
    addLessons(t.db, other.id, 1);
    addLessons(t.db, t.course.id, 4);

    const [first, second] = t.landingPage.overview().featuredCourses;

    expect(first).toEqual({
      id: other.id,
      title: other.title,
      slug: other.slug,
      description: other.description,
      coverImageUrl: null,
      instructorName: "Test Instructor",
      categoryName: "Programming",
      lessonCount: 3,
    });
    expect(second.lessonCount).toBe(4);
  });

  it("count no lessons for a course without any", () => {
    const [only] = t.landingPage.overview().featuredCourses;
    expect(only.lessonCount).toBe(0);
  });

  it("are empty when nothing is published", () => {
    const empty = setUp();
    empty.db.delete(courses).run();
    expect(empty.landingPage.overview()).toEqual({
      featuredCourses: [],
      stats: { courses: 0, lessons: 0, instructors: 0 },
    });
  });
});

describe("catalogue stats", () => {
  it("count published courses, their lessons and instructors", () => {
    const second = addCourse(t.db, {
      instructorId: addInstructor(t.db, "Second Instructor").id,
      categoryId: addCategory(t.db, "Design").id,
      createdAt: "2101-01-01T00:00:00.000Z",
    });
    const third = addCourse(t.db, {
      instructorId: addInstructor(t.db, "Third Instructor").id,
      categoryId: addCategory(t.db, "Data").id,
      createdAt: "2101-02-01T00:00:00.000Z",
    });
    course("2101-03-01T00:00:00.000Z");
    addLessons(t.db, t.course.id, 2);
    addLessons(t.db, second.id, 3);
    addLessons(t.db, third.id, 1);

    expect(t.landingPage.overview().stats).toEqual({
      courses: 4,
      lessons: 6,
      instructors: 3,
    });
  });

  it("ignore drafts, archived courses and their lessons", () => {
    const shy = addInstructor(t.db, "Draft Only");
    const unused = addCategory(t.db, "Unused");
    const draft = addCourse(t.db, {
      instructorId: shy.id,
      categoryId: unused.id,
      createdAt: "2101-01-01T00:00:00.000Z",
      status: CourseStatus.Draft,
    });
    const archived = course("2101-02-01T00:00:00.000Z", CourseStatus.Archived);
    addLessons(t.db, draft.id, 5);
    addLessons(t.db, archived.id, 5);
    addLessons(t.db, t.course.id, 1);

    expect(t.landingPage.overview().stats).toEqual({
      courses: 1,
      lessons: 1,
      instructors: 1,
    });
  });
});
