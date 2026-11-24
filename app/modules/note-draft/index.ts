import { describe } from "./lib/note-draft";

export type { NoteDraft, NoteDraftState } from "./lib/note-draft";

/**
 * What the Lesson page's note editor shows for the text in the box, given the
 * body already saved (null when the Student has not written a Note yet).
 */
export function describeNoteDraft(draft: string, savedBody: string | null) {
  return describe(draft, savedBody);
}
