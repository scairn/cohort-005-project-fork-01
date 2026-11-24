import { beforeEach, describe, expect, it } from "vitest";
import { addLesson, addModule, addOtherCourse, setUp } from "./fixtures";

let t: ReturnType<typeof setUp>;

beforeEach(() => {
  t = setUp();
});

describe("course", () => {
  it("lists modules and their lessons in position order", () => {
    const second = addModule(t.db, t.course.id, 2);
    const first = addModule(t.db, t.course.id, 1);
    const b = addLesson(t.db, first.id, { position: 2 });
    const a = addLesson(t.db, first.id, { position: 1 });
    const c = addLesson(t.db, second.id, { position: 1 });

    const course = t.lessonPage.course(t.course.id);
    expect(course?.title).toBe("Test Course");
    expect(course?.instructorName).toBe("Test Instructor");
    expect(course?.categoryName).toBe("Programming");
    expect(
      course?.modules.map((m) => [m.id, m.lessons.map((l) => l.id)])
    ).toEqual([
      [first.id, [a.id, b.id]],
      [second.id, [c.id]],
    ]);
  });

  it("leaves out another course's modules and lessons", () => {
    const mod = addModule(t.db, t.course.id, 1);
    const mine = addLesson(t.db, mod.id, { position: 1 });
    const other = addOtherCourse(t.db, t.instructor.id, t.category.id);
    addLesson(t.db, addModule(t.db, other.id, 1).id, { position: 1 });
    const course = t.lessonPage.course(t.course.id);
    expect(course?.modules.map((m) => m.lessons.map((l) => l.id))).toEqual([
      [mine.id],
    ]);
  });

  it("has no modules for an empty course", () => {
    expect(t.lessonPage.course(t.course.id)?.modules).toEqual([]);
  });

  it("is null for an unknown course", () => {
    expect(t.lessonPage.course(t.course.id + 100)).toBeNull();
  });

  it("looks up a lesson, module and user by id", () => {
    const mod = addModule(t.db, t.course.id, 1);
    const lesson = addLesson(t.db, mod.id, { position: 1 });
    expect(t.lessonPage.lesson(lesson.id)?.title).toBe(lesson.title);
    expect(t.lessonPage.module(mod.id)?.title).toBe("Module 1");
    expect(t.lessonPage.person(t.instructor.id)?.name).toBe("Test Instructor");
  });
});

describe("neighbours", () => {
  it("crosses module boundaries and stops at the ends", () => {
    const m1 = addModule(t.db, t.course.id, 1);
    const m2 = addModule(t.db, t.course.id, 2);
    const a = addLesson(t.db, m1.id, { position: 1 });
    const b = addLesson(t.db, m1.id, { position: 2 });
    const c = addLesson(t.db, m2.id, { position: 1 });
    const course = t.lessonPage.course(t.course.id);
    if (!course) throw new Error("course missing");

    expect(t.lessonPage.neighbours(course, a.id)).toEqual({
      prevLesson: null,
      nextLesson: {
        id: b.id,
        title: b.title,
        moduleId: m1.id,
        moduleTitle: "Module 1",
      },
    });
    expect(t.lessonPage.neighbours(course, c.id)).toEqual({
      prevLesson: {
        id: b.id,
        title: b.title,
        moduleId: m1.id,
        moduleTitle: "Module 1",
      },
      nextLesson: null,
    });
    expect(t.lessonPage.neighbours(course, b.id).nextLesson?.id).toBe(c.id);
  });
});
