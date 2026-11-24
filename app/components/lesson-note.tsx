import { useState } from "react";
import { useFetcher } from "react-router";
import { Check, Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { cn, formatRelativeTime } from "~/lib/utils";
import {
  describeNoteDraft,
  type NoteDraft,
  type NoteDraftState,
} from "~/modules/note-draft";

// Laid out like CommentThread (same card, header and form footer) so the two
// writing surfaces on the Lesson page read as one design.
export function LessonNote({
  note,
}: {
  note: { body: string; updatedAt: string } | null;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [body, setBody] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const error = fetcher.state === "idle" ? fetcher.data?.error : undefined;
  const draft = describeNoteDraft(body, note?.body ?? null);

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <LessonNoteHeader />

        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a note for this lesson..."
            aria-labelledby="lesson-note-heading"
            className="resize-y"
          />

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !draft.canSave}
            >
              {isSaving ? "Saving..." : "Save note"}
            </Button>

            <span aria-live="polite">
              {error ? (
                <span className="text-sm text-destructive">{error}</span>
              ) : (
                <NoteStatus state={draft.state} updatedAt={note?.updatedAt} />
              )}
            </span>

            <CharacterCount draft={draft} />
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function LessonNoteHeader() {
  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <NotebookPen className="size-5 text-primary" />
        <h2 id="lesson-note-heading" className="text-xl font-semibold">
          Your notes
        </h2>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <Lock className="size-3" />
          Private
        </span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Jot down what you want to remember. Only you can see these, and they are
        collected on your Saved page.
      </p>
    </>
  );
}

function NoteStatus({
  state,
  updatedAt,
}: {
  state: NoteDraftState;
  updatedAt: string | undefined;
}) {
  if (state === "unsaved") {
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  }
  if (state === "saved" && updatedAt) {
    return (
      <span
        suppressHydrationWarning
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <Check className="size-3.5 text-green-600" />
        Saved {formatRelativeTime(updatedAt)}
      </span>
    );
  }
  return null;
}

function CharacterCount({ draft }: { draft: NoteDraft }) {
  return (
    <span
      className={cn(
        "ml-auto text-xs",
        draft.tooLong ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {draft.length} / {draft.max}
    </span>
  );
}
