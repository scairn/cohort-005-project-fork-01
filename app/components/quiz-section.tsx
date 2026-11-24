import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { HelpCircle, RotateCcw, Trophy } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  QuizResultCard,
  type QuizQuestion,
  type QuizResult,
} from "~/components/quiz-result";

type Quiz = {
  id: number;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
};

type Answers = Record<number, number>;

type QuizSectionProps = {
  quiz: Quiz;
  bestAttempt: { score: number; passed: boolean } | null;
  quizResult: QuizResult | null;
  quizFetcher: ReturnType<typeof useFetcher>;
  isSubmitting: boolean;
};

export function QuizSection({
  quiz,
  bestAttempt,
  quizResult,
  quizFetcher,
  isSubmitting,
}: QuizSectionProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Answers>({});
  const [showQuiz, setShowQuiz] = useState(!bestAttempt?.passed);
  const [retaking, setRetaking] = useState(false);

  useQuizResultToast(retaking ? null : quizResult);

  if (quizResult && !retaking) {
    return (
      <QuizResultCard
        quiz={quiz}
        quizResult={quizResult}
        onRetake={() => {
          setSelectedAnswers({});
          setRetaking(true);
        }}
      />
    );
  }

  if (!showQuiz && bestAttempt?.passed) {
    return (
      <QuizPassedSummary
        title={quiz.title}
        bestScore={bestAttempt.score}
        onRetake={() => setShowQuiz(true)}
      />
    );
  }

  return (
    <QuizForm
      quiz={quiz}
      quizFetcher={quizFetcher}
      isSubmitting={isSubmitting}
      selectedAnswers={selectedAnswers}
      onSelect={(questionId, optionId) =>
        setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }))
      }
      onSubmit={() => setRetaking(false)}
    />
  );
}

function useQuizResultToast(quizResult: QuizResult | null) {
  useEffect(() => {
    if (!quizResult) return;
    const score = Math.round(quizResult.score * 100);
    if (quizResult.passed) {
      toast.success(`Quiz passed! Score: ${score}%`);
    } else {
      toast.error(`Quiz not passed. Score: ${score}%`);
    }
  }, [quizResult]);
}

function QuizPassedSummary({
  title,
  bestScore,
  onRetake,
}: {
  title: string;
  bestScore: number;
  onRetake: () => void;
}) {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-green-600" />
            <span className="font-medium">{title}</span>
            <span className="text-sm text-muted-foreground">
              — Best score: {Math.round(bestScore * 100)}%
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onRetake}>
            <RotateCcw className="mr-2 size-4" />
            Retake
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuizForm({
  quiz,
  quizFetcher,
  isSubmitting,
  selectedAnswers,
  onSelect,
  onSubmit,
}: {
  quiz: Quiz;
  quizFetcher: ReturnType<typeof useFetcher>;
  isSubmitting: boolean;
  selectedAnswers: Answers;
  onSelect: (questionId: number, optionId: number) => void;
  onSubmit: () => void;
}) {
  const allAnswered = quiz.questions.every(
    (q) => selectedAnswers[q.id] !== undefined
  );

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">{quiz.title}</h2>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Answer all questions and submit. Passing score:{" "}
          {Math.round(quiz.passingScore * 100)}%.
        </p>

        <quizFetcher.Form method="post" onSubmit={onSubmit}>
          <input type="hidden" name="intent" value="submit-quiz" />
          <input type="hidden" name="quizId" value={quiz.id} />

          <div className="space-y-6">
            {quiz.questions.map((question, qIndex) => (
              <QuestionChoices
                key={question.id}
                number={qIndex + 1}
                question={question}
                selected={selectedAnswers[question.id]}
                onSelect={(optionId) => onSelect(question.id, optionId)}
              />
            ))}
          </div>

          <QuizSubmit allAnswered={allAnswered} isSubmitting={isSubmitting} />
        </quizFetcher.Form>
      </CardContent>
    </Card>
  );
}

function QuestionChoices({
  number,
  question,
  selected,
  onSelect,
}: {
  number: number;
  question: QuizQuestion;
  selected: number | undefined;
  onSelect: (optionId: number) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-3 font-medium">
        {number}. {question.questionText}
      </p>
      <div className="space-y-2">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted"
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.id}
              checked={selected === option.id}
              onChange={() => onSelect(option.id)}
              className="size-4 accent-primary"
            />
            <span className="text-sm">{option.optionText}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function QuizSubmit({
  allAnswered,
  isSubmitting,
}: {
  allAnswered: boolean;
  isSubmitting: boolean;
}) {
  return (
    <div className="mt-6">
      <Button type="submit" disabled={!allAnswered || isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Quiz"}
      </Button>
      {!allAnswered && (
        <p className="mt-2 text-sm text-muted-foreground">
          Please answer all questions before submitting.
        </p>
      )}
    </div>
  );
}
