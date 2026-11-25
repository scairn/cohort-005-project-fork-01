import { beforeEach, describe, expect, it } from "vitest";
import { courses, CourseStatus } from "~/db/schema";
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

// Every course the page shows, spotlight first.
function shown() {
  const { spotlight, newCourses } = t.landingPage.overview();
  return [spotlight, ...newCourses].flatMap((c) => (c ? [c.id] : []));
}

describe("featured courses", () => {
  it("spotlight the newest published course and list the next three", () => {
    const oldest = course("2100-01-01T00:00:00.000Z");
    const newest = course("2100-05-01T00:00:00.000Z");
    const second = course("2100-04-01T00:00:00.000Z");
    const fourth = course("2100-02-01T00:00:00.000Z");
    const third = course("2100-03-01T00:00:00.000Z");

    const { spotlight, newCourses } = t.landingPage.overview();

    expect(spotlight?.id).toBe(newest.id);
    expect(newCourses.map((c) => c.id)).toEqual([
      second.id,
      third.id,
      fourth.id,
    ]);
    expect(shown()).not.toContain(oldest.id);
  });

  it("break a tie on creation time by the later id", () => {
    const first = course("2101-01-01T00:00:00.000Z");
    const second = course("2101-01-01T00:00:00.000Z");
    expect(shown().slice(0, 2)).toEqual([second.id, first.id]);
  });

  it("leave out drafts and archived courses", () => {
    course("2101-01-01T00:00:00.000Z", CourseStatus.Draft);
    course("2101-02-01T00:00:00.000Z", CourseStatus.Archived);
    expect(shown()).toEqual([t.course.id]);
  });

  it("carry the instructor, category and the course's own lesson count", () => {
    const other = course("2101-01-01T00:00:00.000Z");
    addLessons(t.db, other.id, 2);
    addLessons(t.db, other.id, 1);
    addLessons(t.db, t.course.id, 4);

    const { spotlight, newCourses } = t.landingPage.overview();

    expect(spotlight).toEqual({
      id: other.id,
      title: other.title,
      slug: other.slug,
      description: other.description,
      coverImageUrl: null,
      instructorName: "Test Instructor",
      categoryName: "Programming",
      lessonCount: 3,
    });
    expect(newCourses[0].lessonCount).toBe(4);
  });

  it("count no lessons for a course without any", () => {
    expect(t.landingPage.overview().spotlight?.lessonCount).toBe(0);
  });

  it("are empty when nothing is published", () => {
    const empty = setUp();
    empty.db.delete(courses).run();
    expect(empty.landingPage.overview()).toEqual({
      spotlight: null,
      newCourses: [],
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
