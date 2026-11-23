import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraftState = "blank" | "unsaved" | "saved";

export type NoteDraft = {
  /** Characters that would be stored: the server trims before saving. */
  length: number;
  max: number;
  tooLong: boolean;
  state: NoteDraftState;
  canSave: boolean;
};

export function describe(draft: string, savedBody: string | null): NoteDraft {
  const trimmed = draft.trim();
  const length = trimmed.length;
  const tooLong = length > MAX_NOTE_LENGTH;
  const changed = trimmed !== (savedBody ?? "");

  const state: NoteDraftState = !changed
    ? savedBody === null
      ? "blank"
      : "saved"
    : "unsaved";

  return {
    length,
    max: MAX_NOTE_LENGTH,
    tooLong,
    state,
    canSave: changed && length > 0 && !tooLong,
  };
}
