import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Layers,
  LineChart,
  User,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { CourseImage } from "~/components/course-image";
import { cn } from "~/lib/utils";
import type {
  CatalogueStats,
  FeaturedCourse,
} from "~/modules/landing-page/index.server";

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

export function LandingHero({
  stats,
  spotlight,
  signedIn,
}: {
  stats: CatalogueStats;
  spotlight: FeaturedCourse | null;
  signedIn: boolean;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] size-[36rem] rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-400/10"
      />
      <div
        className={cn(
          "relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:py-28",
          spotlight && "lg:grid-cols-[1.15fr_1fr]"
        )}
      >
        <div>
          <HeroCopy />
          <HeroActions signedIn={signedIn} />
          {/* Zeros in large type read as an unfinished site, not a figure. */}
          {stats.courses > 0 && <HeroFigures stats={stats} />}
        </div>
        {spotlight && <Spotlight course={spotlight} />}
      </div>
    </section>
  );
}

function HeroCopy() {
  return (
    <>
      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="size-1.5 rounded-full bg-indigo-500" />
        Self-paced courses for developers
      </p>
      <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
        Learn to code,
        <br />
        <span className="text-indigo-600 dark:text-indigo-400">
          at your own pace.
        </span>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Structured courses built by experienced instructors. Track your
        progress, take quizzes, and build real-world skills.
      </p>
    </>
  );
}

function HeroActions({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      <Button asChild size="lg">
        <Link to="/courses">
          Browse Courses
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        {signedIn ? (
          <Link to="/dashboard">Go to your dashboard</Link>
        ) : (
          <Link to="/signup">Create a free account</Link>
        )}
      </Button>
    </div>
  );
}

function HeroFigures({ stats }: { stats: CatalogueStats }) {
  const figures = [
    { value: stats.courses, label: plural(stats.courses, "course", "courses") },
    { value: stats.lessons, label: plural(stats.lessons, "lesson", "lessons") },
    {
      value: stats.instructors,
      label: plural(stats.instructors, "instructor", "instructors"),
    },
  ];
  return (
    <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="border-l-2 border-indigo-500/60 pl-4"
        >
          <dt className="sr-only">{figure.label}</dt>
          <dd className="text-3xl font-bold tabular-nums">{figure.value}</dd>
          <dd aria-hidden className="text-sm text-muted-foreground">
            {figure.label}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Spotlight({ course }: { course: FeaturedCourse }) {
  return (
    <div className="relative w-full max-w-md lg:justify-self-end">
      <div
        aria-hidden
        className="absolute inset-0 translate-x-4 translate-y-4 rotate-2 rounded-2xl bg-indigo-500/15 dark:bg-indigo-400/15"
      />
      <Link
        to={`/courses/${course.slug}`}
        className="group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-xl transition-transform hover:-translate-y-1"
      >
        <CourseImage
          src={course.coverImageUrl}
          alt={course.title}
          className="aspect-video w-full object-cover"
        />
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Newest course · {course.categoryName}
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-snug group-hover:underline">
            {course.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {course.description}
          </p>
          <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
            <CourseByline course={course} iconClassName="size-4" />
          </div>
        </div>
      </Link>
    </div>
  );
}

const FEATURES = [
  {
    icon: Layers,
    title: "Structured, not scattered",
    body: "Every course is broken into modules and short lessons, so you always know what comes next.",
  },
  {
    icon: LineChart,
    title: "Progress that sticks",
    body: "Pick up exactly where you left off. Completed lessons and video position are saved as you go.",
  },
  {
    icon: CheckCircle2,
    title: "Check what you learned",
    body: "Quizzes at the end of lessons tell you whether it landed before you move on.",
  },
];

export function LandingFeatures() {
  return (
    <section className="border-y border-border bg-muted/50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="max-w-xl text-3xl font-bold tracking-tight">
          Built for finishing courses, not just starting them
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-indigo-500/10">
                <feature.icon className="size-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturedCourses({ courses }: { courses: FeaturedCourse[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New courses</h2>
          <p className="mt-2 text-muted-foreground">
            The latest additions to the catalogue
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/courses">
            View all
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </section>
  );
}

function CourseCard({ course }: { course: FeaturedCourse }) {
  return (
    <Link to={`/courses/${course.slug}`} className="group">
      <Card className="h-full overflow-hidden pt-0 transition-shadow group-hover:shadow-md">
        <CourseImage
          src={course.coverImageUrl}
          alt={course.title}
          className="aspect-video w-full object-cover"
        />
        <CardHeader>
          <p className="text-xs font-medium text-muted-foreground">
            {course.categoryName}
          </p>
          <h3 className="font-semibold leading-snug group-hover:text-primary">
            {course.title}
          </h3>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {course.description}
          </p>
        </CardContent>
        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
          <CourseByline course={course} iconClassName="size-3" />
        </CardFooter>
      </Card>
    </Link>
  );
}

function CourseByline({
  course,
  iconClassName,
}: {
  course: FeaturedCourse;
  iconClassName: string;
}) {
  return (
    <>
      <span className="flex items-center gap-1.5">
        <User className={iconClassName} />
        {course.instructorName}
      </span>
      <span className="flex items-center gap-1.5">
        <BookOpen className={iconClassName} />
        {course.lessonCount} {plural(course.lessonCount, "lesson", "lessons")}
      </span>
    </>
  );
}

export function LandingFooter({ signedIn }: { signedIn: boolean }) {
  const linkClass =
    "text-muted-foreground transition-colors hover:text-foreground";
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 text-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/" className="text-base font-bold tracking-tight">
            Cadence
          </Link>
          <p className="mt-1 text-muted-foreground">
            Learn to code, at your own pace.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/courses" className={linkClass}>
            Courses
          </Link>
          {signedIn ? (
            <Link to="/dashboard" className={linkClass}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className={linkClass}>
                Log In
              </Link>
              <Link to="/signup" className={linkClass}>
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
