import { beforeEach, describe, expect, it } from "vitest";
import { createComment, deleteComment } from "~/lib/comments.server";
import { fakeNotifications } from "~/lib/notifications.fake.server";
import { UserRole } from "~/db/schema";
import * as schema from "~/db/schema";
import { addLesson, addModule, setUp } from "./fixtures";

let t: ReturnType<typeof setUp>;
let lessonId: number;
const NOW = new Date("2026-03-01T12:00:00.000Z");

beforeEach(() => {
  t = setUp();
  const mod = addModule(t.db, t.course.id, 1);
  lessonId = addLesson(t.db, mod.id, { position: 1 }).id;
});

async function post(
  userId: number,
  body: string,
  parentId: number | null = null
) {
  const created = await createComment(
    t.db,
    userId,
    lessonId,
    parentId,
    body,
    NOW,
    fakeNotifications()
  );
  if (!created.ok) throw new Error(created.error);
  return created.comment.id;
}

function remove(commentId: number, userId: number) {
  return deleteComment(t.db, commentId, userId, true, NOW, fakeNotifications());
}

describe("discussion", () => {
  it("is empty for a lesson nobody has asked about", async () => {
    expect(await t.lessonPage.discussion(lessonId)).toEqual([]);
  });

  it("nests replies, renders bodies and labels the instructor", async () => {
    const question = await post(t.user.id, "Why **Result**?");
    await post(t.instructor.id, "It keeps errors typed.", question);

    const [thread] = await t.lessonPage.discussion(lessonId);
    expect(thread.bodyHtml).toContain("<strong>Result</strong>");
    expect(thread.author).toMatchObject({
      id: t.user.id,
      isInstructor: false,
      isPlatformAdmin: false,
    });
    expect(thread.replies).toHaveLength(1);
    expect(thread.replies[0].author.isInstructor).toBe(true);
    expect(thread.replies[0].bodyHtml).toContain("It keeps errors typed.");
  });

  it("labels a platform admin", async () => {
    const admin = t.db
      .insert(schema.users)
      .values({ name: "Ada", email: "ada@example.com", role: UserRole.Admin })
      .returning()
      .get();
    await post(admin.id, "Welcome all");
    const [thread] = await t.lessonPage.discussion(lessonId);
    expect(thread.author.isPlatformAdmin).toBe(true);
  });

  it("keeps a deleted question that has replies, with its body blanked", async () => {
    const question = await post(t.user.id, "Original question");
    await post(t.instructor.id, "An answer", question);
    await remove(question, t.user.id);

    const [thread] = await t.lessonPage.discussion(lessonId);
    expect(thread).toMatchObject({
      deleted: true,
      body: "",
      bodyHtml: "",
      editedAt: null,
    });
    expect(thread.replies).toHaveLength(1);
  });

  it("drops a deleted question with no replies, and deleted replies", async () => {
    const lonely = await post(t.user.id, "Never mind");
    const question = await post(t.user.id, "Still here");
    const reply = await post(t.instructor.id, "Oops", question);
    await remove(lonely, t.user.id);
    await remove(reply, t.instructor.id);

    const threads = await t.lessonPage.discussion(lessonId);
    expect(threads.map((c) => c.id)).toEqual([question]);
    expect(threads[0].replies).toEqual([]);
  });

  it("finds a comment by id", async () => {
    const id = await post(t.user.id, "Hello there");
    expect(t.lessonPage.comment(id)?.lessonId).toBe(lessonId);
    expect(t.lessonPage.comment(id + 100)).toBeUndefined();
  });
});
