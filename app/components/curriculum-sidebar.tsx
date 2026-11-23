import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import { cn } from "~/lib/utils";
import { LessonProgressStatus } from "~/db/schema";
import { CheckCircle2, ChevronDown, Circle, PlayCircle } from "lucide-react";

type CurriculumModule = {
  id: number;
  title: string;
  lessons: Array<{ id: number; title: string }>;
};

export function CurriculumSidebar({
  course,
  curriculum,
  currentLessonId,
  lessonProgressMap,
  enrolled,
}: {
  course: { id: number; title: string; slug: string };
  curriculum: CurriculumModule[];
  currentLessonId: number;
  lessonProgressMap: Record<number, string>;
  enrolled: boolean;
}) {
  const [expandedModules, toggleModule] = useExpandedModules(
    curriculum,
    currentLessonId
  );

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border lg:block">
      <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">
        <div className="border-b border-border p-4">
          <Link
            to={`/courses/${course.slug}`}
            className="text-sm font-semibold hover:text-primary"
          >
            {course.title}
          </Link>
        </div>

        <nav className="flex-1 p-2">
          {curriculum.map((mod) => (
            <ModuleSection
              key={mod.id}
              title={mod.title}
              expanded={expandedModules.has(mod.id)}
              onToggle={() => toggleModule(mod.id)}
            >
              <ModuleLessons
                courseSlug={course.slug}
                lessons={mod.lessons}
                currentLessonId={currentLessonId}
                lessonProgressMap={enrolled ? lessonProgressMap : {}}
              />
            </ModuleSection>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function ModuleSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            !expanded && "-rotate-90"
          )}
        />
        <span className="flex-1 text-left">{title}</span>
      </button>

      {expanded && children}
    </div>
  );
}

/** Starts with the current Lesson's Module open. */
function useExpandedModules(
  curriculum: CurriculumModule[],
  currentLessonId: number
) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(() => {
    const currentModuleId = curriculum.find((m) =>
      m.lessons.some((l) => l.id === currentLessonId)
    )?.id;
    const initial = new Set<number>();
    if (currentModuleId) initial.add(currentModuleId);
    return initial;
  });

  function toggleModule(moduleId: number) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }

  return [expandedModules, toggleModule] as const;
}

function ModuleLessons({
  courseSlug,
  lessons,
  currentLessonId,
  lessonProgressMap,
}: {
  courseSlug: string;
  lessons: CurriculumModule["lessons"];
  currentLessonId: number;
  lessonProgressMap: Record<number, string>;
}) {
  return (
    <ul className="ml-4 space-y-0.5 py-1">
      {lessons.map((l) => (
        <li key={l.id}>
          <Link
            to={`/courses/${courseSlug}/lessons/${l.id}`}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
              l.id === currentLessonId
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <LessonStatusIcon status={lessonProgressMap[l.id]} />
            <span className="truncate">{l.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LessonStatusIcon({ status }: { status: string | undefined }) {
  if (status === LessonProgressStatus.Completed) {
    return <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />;
  }
  if (status === LessonProgressStatus.InProgress) {
    return <PlayCircle className="size-3.5 shrink-0 text-blue-500" />;
  }
  return <Circle className="size-3.5 shrink-0" />;
}
