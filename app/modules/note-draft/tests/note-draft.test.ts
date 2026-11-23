import { describe, expect, it } from "vitest";
import { describeNoteDraft } from "~/modules/note-draft";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("describeNoteDraft", () => {
  it("is blank with nothing to save before the Student writes", () => {
    expect(describeNoteDraft("", null)).toEqual({
      length: 0,
      max: MAX_NOTE_LENGTH,
      tooLong: false,
      state: "blank",
      canSave: false,
    });
  });

  it("treats whitespace alone as blank", () => {
    const draft = describeNoteDraft("   \n ", null);
    expect(draft.state).toBe("blank");
    expect(draft.canSave).toBe(false);
  });

  it("is unsaved and saveable once the Student types a first note", () => {
    const draft = describeNoteDraft("Result types", null);
    expect(draft.state).toBe("unsaved");
    expect(draft.canSave).toBe(true);
    expect(draft.length).toBe(12);
  });

  it("is saved when the box matches the stored body", () => {
    const draft = describeNoteDraft("Result types", "Result types");
    expect(draft.state).toBe("saved");
    expect(draft.canSave).toBe(false);
  });

  it("ignores surrounding whitespace the server would trim", () => {
    const draft = describeNoteDraft("  Result types \n", "Result types");
    expect(draft.state).toBe("saved");
    expect(draft.length).toBe(12);
  });

  it("is unsaved and saveable after editing a saved note", () => {
    const draft = describeNoteDraft("Result types, again", "Result types");
    expect(draft.state).toBe("unsaved");
    expect(draft.canSave).toBe(true);
  });

  it("cannot save a saved note cleared to nothing", () => {
    const draft = describeNoteDraft("", "Result types");
    expect(draft.state).toBe("unsaved");
    expect(draft.canSave).toBe(false);
  });

  it("allows exactly the maximum length", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), null);
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("refuses one character over the maximum", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null);
    expect(draft.tooLong).toBe(true);
    expect(draft.canSave).toBe(false);
    expect(draft.length).toBe(MAX_NOTE_LENGTH + 1);
  });
});
