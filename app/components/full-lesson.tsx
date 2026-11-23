import { useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { formatDuration } from "~/lib/utils";
import { LessonProgressStatus } from "~/db/schema";
import { Clock, Github } from "lucide-react";
import type { Route } from "../routes/+types/courses.$slug.lessons.$lessonId";
import { CommentThread } from "~/components/comment-thread";
import { LessonNote } from "~/components/lesson-note";
import { YouTubePlayer } from "~/components/youtube-player";
import { CurriculumSidebar } from "~/components/curriculum-sidebar";
import { LessonBreadcrumb } from "~/components/lesson-breadcrumb";
import { BookmarkToggle } from "~/components/bookmark-toggle";
import { QuizSection } from "~/components/quiz-section";
import { LessonCompletion } from "~/components/lesson-completion";
import { useAutoplay } from "~/components/use-autoplay";
import { LessonPager } from "~/components/lesson-pager";

type LessonLoaderData = Route.ComponentProps["loaderData"];
type FullLessonData = Extract<LessonLoaderData, { view: "full" }>;

export function FullLesson({ data }: { data: FullLessonData }) {
  const { course, curriculum, module: mod, lesson, enrolled } = data;

  return (
    <div className="flex">
      <CurriculumSidebar
        course={course}
        curriculum={curriculum}
        currentLessonId={lesson.id}
        lessonProgressMap={data.lessonProgressMap}
        enrolled={enrolled}
      />

      <div className="flex-1 p-6 lg:p-8">
        <LessonBreadcrumb
          course={course}
          mod={mod}
          lessonTitle={lesson.title}
        />

        <div className="mx-auto max-w-4xl">
          <LessonTitle
            lesson={lesson}
            canBookmark={data.currentUserId !== null}
            bookmarked={data.bookmarked}
          />
          <LessonBody data={data} />
          <LessonActivities data={data} />

          {/* Questions & Discussion — confidential to people with access */}
          <CommentThread
            comments={data.comments}
            currentUserId={data.currentUserId}
            canModerate={data.canModerate}
            canPost
            instructorName={data.instructorName}
          />

          <LessonPager
            course={course}
            prevLesson={data.prevLesson}
            nextLesson={data.nextLesson}
          />
        </div>
      </div>
    </div>
  );
}

function LessonBody({ data }: { data: FullLessonData }) {
  const { lesson, contentHtml, enrolled, currentUserId } = data;
  const [autoplay, toggleAutoplay] = useAutoplay();

  return (
    <>
      {lesson.videoUrl && (
        <YouTubePlayer
          videoUrl={lesson.videoUrl}
          lessonId={lesson.id}
          title={lesson.title}
          startPosition={data.lastWatchPosition}
          durationMinutes={lesson.durationMinutes}
          watchProgress={data.watchProgress}
          trackingEnabled={enrolled && !!currentUserId}
          autoplay={autoplay}
          onToggleAutoplay={toggleAutoplay}
        />
      )}

      {/* Note — under the video, so the Student can write while they watch */}
      {currentUserId && <LessonNote note={data.note} />}

      {contentHtml && (
        <div
          className="prose prose-neutral dark:prose-invert mb-8 max-w-none"
          // oxlint-disable-next-line react/no-danger -- the instructor wrote this Markdown
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}

      {!contentHtml && !lesson.videoUrl && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            No content has been added to this lesson yet.
          </CardContent>
        </Card>
      )}
    </>
  );
}

/** The quiz and Mark Complete: only for an enrolled, signed-in Student. */
function LessonActivities({ data }: { data: FullLessonData }) {
  const { lesson, quiz } = data;
  const quizFetcher = useFetcher({ key: `quiz-${lesson.id}` });

  if (!data.enrolled || !data.currentUserId) return null;

  return (
    <>
      {quiz && (
        <QuizSection
          quiz={quiz}
          bestAttempt={data.bestAttempt}
          quizResult={quizFetcher.data?.quizResult ?? null}
          quizFetcher={quizFetcher}
          isSubmitting={quizFetcher.state !== "idle"}
        />
      )}
      <LessonCompletion
        lessonId={lesson.id}
        courseSlug={data.course.slug}
        completed={data.lessonStatus === LessonProgressStatus.Completed}
        nextLesson={data.nextLesson}
      />
    </>
  );
}

function LessonTitle({
  lesson,
  canBookmark,
  bookmarked,
}: {
  lesson: FullLessonData["lesson"];
  canBookmark: boolean;
  bookmarked: boolean;
}) {
  return (
    <>
      {/* Lesson Title */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        {canBookmark && <BookmarkToggle bookmarked={bookmarked} />}
      </div>
      <div className="mb-6 flex items-center gap-3">
        {lesson.durationMinutes && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {formatDuration(lesson.durationMinutes, true, false, false)}
          </div>
        )}
        {lesson.githubRepoUrl && (
          <a
            href={lesson.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Github className="mr-1.5 size-4" />
              Open Code
            </Button>
          </a>
        )}
      </div>
    </>
  );
}
