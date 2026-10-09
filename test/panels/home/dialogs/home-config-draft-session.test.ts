import { describe, expect, it } from "vitest";
import type { EditorState } from "../../../../src/panels/home/dialogs/dialog-edit-home";
import { HomeConfigDraftSession } from "../../../../src/panels/home/dialogs/home-config-draft-session";

const stateA: EditorState = {
  favorite_entities: [],
  show_suggested_entities: true,
  show_welcome_message: true,
  shortcuts: [],
};

const stateB: EditorState = {
  ...stateA,
  show_welcome_message: false,
};

describe("HomeConfigDraftSession", () => {
  it("starts clean with the initial draft as both draft and baseline", () => {
    const session = HomeConfigDraftSession.start(stateA);
    expect(session.draft).toEqual(stateA);
    expect(session.generation).toBe(0);
    expect(session.isDirty).toBe(false);
  });

  it("becomes dirty and bumps the generation when the draft changes", () => {
    const session = HomeConfigDraftSession.start(stateA).withDraft(stateB);
    expect(session.draft).toEqual(stateB);
    expect(session.generation).toBe(1);
    expect(session.isDirty).toBe(true);
  });

  it("becomes clean again when the draft is edited back to the baseline content", () => {
    const session = HomeConfigDraftSession.start(stateA)
      .withDraft(stateB)
      .withDraft(stateA);
    expect(session.generation).toBe(2);
    expect(session.isDirty).toBe(false);
  });

  it("marks a non-stale save as fully applied: draft becomes the new baseline", () => {
    const session = HomeConfigDraftSession.start(stateA).withDraft(stateB);
    const { session: updated, stale } = session.withSaved(
      session.generation,
      stateB
    );
    expect(stale).toBe(false);
    expect(updated.draft).toEqual(stateB);
    expect(updated.isDirty).toBe(false);
  });

  it("marks a save as stale when the draft changed again after it started, keeping the newer draft", () => {
    const session = HomeConfigDraftSession.start(stateA).withDraft(stateB);
    const savedGeneration = session.generation;
    const savedDraft = session.draft;
    const stateC: EditorState = { ...stateA, show_suggested_entities: false };
    const editedDuringSave = session.withDraft(stateC);

    const { session: updated, stale } = editedDuringSave.withSaved(
      savedGeneration,
      savedDraft
    );
    expect(stale).toBe(true);
    // The live draft is untouched by the stale completion...
    expect(updated.draft).toEqual(stateC);
    // ...but the baseline rebases to what was actually persisted, so
    // isDirty reflects "does the screen differ from what's truly saved".
    expect(updated.isDirty).toBe(true);
  });

  it("reports not dirty after a stale save if the current draft happens to match what was persisted", () => {
    const session = HomeConfigDraftSession.start(stateA).withDraft(stateB);
    const savedGeneration = session.generation;
    const savedDraft = session.draft;
    const editedBackDuringSave = session.withDraft(stateA).withDraft(stateB);

    const { session: updated, stale } = editedBackDuringSave.withSaved(
      savedGeneration,
      savedDraft
    );
    expect(stale).toBe(true);
    expect(updated.isDirty).toBe(false);
  });

  it("compares array fields by content, not by reference (a round-trip edit produces a new array)", () => {
    const withFavorite: EditorState = {
      ...stateA,
      favorite_entities: ["light.kitchen"],
    };
    const session = HomeConfigDraftSession.start(withFavorite)
      .withDraft({
        ...withFavorite,
        favorite_entities: ["light.kitchen", "light.hallway"],
      })
      // A brand new array literal with the same contents as the baseline's,
      // not the same reference as withFavorite.favorite_entities.
      .withDraft({ ...withFavorite, favorite_entities: ["light.kitchen"] });

    expect(session.isDirty).toBe(false);
  });
});
