import { useEffect } from "react";
import { Link, useFetcher, useNavigate } from "react-router";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";

type NextLesson = { id: number; title: string } | null;

/** Mark Complete, or Up Next once done; completing moves on to the next Lesson. */
export function LessonCompletion({
  lessonId,
  courseSlug,
  completed,
  nextLesson,
}: {
  lessonId: number;
  courseSlug: string;
  completed: boolean;
  nextLesson: NextLesson;
}) {
  const fetcher = useFetcher({ key: `mark-complete-${lessonId}` });
  const navigate = useNavigate();

  const isMarking =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "mark-complete";
  const justCompleted = fetcher.data?.success;

  useEffect(() => {
    if (justCompleted && nextLesson) {
      navigate(`/courses/${courseSlug}/lessons/${nextLesson.id}`);
    }
  }, [justCompleted, nextLesson, courseSlug, navigate]);

  if (completed || justCompleted) {
    return <CompletedBanner courseSlug={courseSlug} nextLesson={nextLesson} />;
  }

  return (
    <div className="mb-8">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="mark-complete" />
        {nextLesson ? (
          <Button disabled={isMarking}>
            {isMarking ? (
              "Completing..."
            ) : (
              <>
                Up next: {nextLesson.title}
                <ChevronRight className="ml-1 size-4" />
              </>
            )}
          </Button>
        ) : (
          <Button disabled={isMarking}>
            <CheckCircle2 className="mr-2 size-4" />
            {isMarking ? "Marking..." : "Mark as Complete"}
          </Button>
        )}
      </fetcher.Form>
    </div>
  );
}

function CompletedBanner({
  courseSlug,
  nextLesson,
}: {
  courseSlug: string;
  nextLesson: NextLesson;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="size-5" />
          <span className="font-medium">Lesson completed</span>
        </div>
        {nextLesson && (
          <Link to={`/courses/${courseSlug}/lessons/${nextLesson.id}`}>
            <Button variant="outline" size="sm">
              Up next: {nextLesson.title}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
