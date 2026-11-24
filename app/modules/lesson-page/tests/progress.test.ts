import { beforeEach, describe, expect, it } from "vitest";
import { LessonProgressStatus } from "~/db/schema";
import { NO_PROGRESS } from "../index.server";
import {
  addLesson,
  addModule,
  addOtherCourse,
  addWatchEvent,
  setUp,
} from "./fixtures";

let t: ReturnType<typeof setUp>;
let lesson: ReturnType<typeof addLesson>;
let other: ReturnType<typeof addLesson>;
const NOW = new Date("2026-03-01T12:00:00.000Z");

beforeEach(() => {
  t = setUp();
  const mod = addModule(t.db, t.course.id, 1);
  lesson = addLesson(t.db, mod.id, { position: 1 });
  other = addLesson(t.db, mod.id, { position: 2 });
});

function open(target = lesson, userId = t.user.id) {
  return t.lessonPage.openLesson(userId, {
    lesson: target,
    courseId: t.course.id,
  });
}

describe("openLesson", () => {
  it("marks a first visit in progress", () => {
    const progress = open();
    expect(progress.lessonStatus).toBe(LessonProgressStatus.InProgress);
    expect(progress.lessonProgressMap).toEqual({
      [lesson.id]: LessonProgressStatus.InProgress,
    });
  });

  it("does not move a completed lesson back to in progress", () => {
    t.lessonPage.completeLesson(t.user.id, lesson.id, NOW);
    expect(open().lessonStatus).toBe(LessonProgressStatus.Completed);
  });

  it("maps progress across every lesson in the course", () => {
    t.lessonPage.completeLesson(t.user.id, other.id, NOW);
    expect(open().lessonProgressMap).toEqual({
      [lesson.id]: LessonProgressStatus.InProgress,
      [other.id]: LessonProgressStatus.Completed,
    });
  });

  it("keeps each person's progress separate", () => {
    t.lessonPage.completeLesson(t.instructor.id, other.id, NOW);
    expect(open().lessonProgressMap).toEqual({
      [lesson.id]: LessonProgressStatus.InProgress,
    });
  });

  it("ignores progress in another course", () => {
    const other = addOtherCourse(t.db, t.instructor.id, t.category.id);
    const elsewhere = addLesson(t.db, addModule(t.db, other.id, 1).id, {
      position: 1,
    });
    t.lessonPage.completeLesson(t.user.id, elsewhere.id, NOW);
    expect(open().lessonProgressMap).toEqual({
      [lesson.id]: LessonProgressStatus.InProgress,
    });
  });

  it("has no video state for a lesson without a video", () => {
    addWatchEvent(t.db, {
      userId: t.user.id,
      lessonId: lesson.id,
      positionSeconds: 30,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const progress = open();
    expect(progress.lastWatchPosition).toBe(0);
    expect(progress.watchProgress).toBe(0);
  });

  describe("with a ten-minute video", () => {
    let video: ReturnType<typeof addLesson>;
    beforeEach(() => {
      const mod = addModule(t.db, t.course.id, 2);
      video = addLesson(t.db, mod.id, {
        position: 1,
        videoUrl: "https://youtu.be/x",
        durationMinutes: 10,
      });
    });

    const watch = (
      positionSeconds: number,
      createdAt: string,
      userId?: number
    ) =>
      addWatchEvent(t.db, {
        userId: userId ?? t.user.id,
        lessonId: video.id,
        positionSeconds,
        createdAt,
      });

    it("resumes from the latest position and reports the furthest point", () => {
      watch(300, "2026-01-01T00:00:00.000Z");
      watch(120, "2026-01-02T00:00:00.000Z");
      watch(60, "2026-01-02T00:00:00.000Z", t.instructor.id);
      const progress = open(video);
      expect(progress.lastWatchPosition).toBe(120);
      expect(progress.watchProgress).toBe(50);
    });

    it("caps progress at 100%", () => {
      watch(900, "2026-01-01T00:00:00.000Z");
      expect(open(video).watchProgress).toBe(100);
    });

    it("starts at zero before any watching", () => {
      const progress = open(video);
      expect(progress.lastWatchPosition).toBe(0);
      expect(progress.watchProgress).toBe(0);
    });
  });

  it("reports no progress for a video without a duration", () => {
    const mod = addModule(t.db, t.course.id, 3);
    const video = addLesson(t.db, mod.id, {
      position: 1,
      videoUrl: "https://youtu.be/y",
    });
    addWatchEvent(t.db, {
      userId: t.user.id,
      lessonId: video.id,
      positionSeconds: 45,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const progress = open(video);
    expect(progress.lastWatchPosition).toBe(45);
    expect(progress.watchProgress).toBe(0);
  });
});

describe("completeLesson", () => {
  it("completes a lesson never opened, with a completion time", () => {
    const row = t.lessonPage.completeLesson(t.user.id, lesson.id, NOW);
    expect(row.status).toBe(LessonProgressStatus.Completed);
    expect(row.completedAt).toBe(NOW.toISOString());
  });

  it("completes a lesson in progress without adding a row", () => {
    open();
    const row = t.lessonPage.completeLesson(t.user.id, lesson.id, NOW);
    expect(row.completedAt).toBe(NOW.toISOString());
    const progress = open();
    expect(progress.lessonStatus).toBe(LessonProgressStatus.Completed);
    expect(progress.lessonProgressMap).toEqual({
      [lesson.id]: LessonProgressStatus.Completed,
    });
  });
});

it("NO_PROGRESS is empty", () => {
  expect(NO_PROGRESS).toEqual({
    lessonStatus: null,
    lastWatchPosition: 0,
    watchProgress: 0,
    lessonProgressMap: {},
  });
});
