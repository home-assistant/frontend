import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomeFrontendSystemData } from "../../../../src/data/frontend";
import type { EditHomeDialogParams } from "../../../../src/panels/home/dialogs/show-dialog-edit-home";
import type { HomeAssistant } from "../../../../src/types";
import {
  buildHomeConfig,
  type EditorState,
} from "../../../../src/panels/home/dialogs/dialog-edit-home";
import { createMockHass } from "../../../fixtures/hass";

describe("buildHomeConfig", () => {
  const emptyState: EditorState = {
    favorite_entities: [],
    show_suggested_entities: true,
    show_welcome_message: true,
    shortcuts: [],
  };

  it("omits empty favorite_entities and shortcuts arrays", () => {
    const result = buildHomeConfig({}, emptyState);
    expect(result.favorite_entities).toBeUndefined();
    expect(result.shortcuts).toBeUndefined();
  });

  it("clears previously saved favorite_entities and shortcuts when the draft is emptied", () => {
    const baseConfig: HomeFrontendSystemData = {
      favorite_entities: ["light.old"],
      shortcuts: [{ type: "custom", path: "/lovelace/0" }],
    };
    const result = buildHomeConfig(baseConfig, emptyState);
    expect(result.favorite_entities).toBeUndefined();
    expect(result.shortcuts).toBeUndefined();
  });

  it("keeps non-empty favorite_entities and shortcuts arrays", () => {
    const state: EditorState = {
      ...emptyState,
      favorite_entities: ["light.kitchen"],
      shortcuts: [{ type: "custom", path: "/lovelace/0" }],
    };
    const result = buildHomeConfig({}, state);
    expect(result.favorite_entities).toEqual(["light.kitchen"]);
    expect(result.shortcuts).toEqual([{ type: "custom", path: "/lovelace/0" }]);
  });

  it("maps show_welcome_message=false to hide_welcome_message=true", () => {
    const state: EditorState = { ...emptyState, show_welcome_message: false };
    expect(buildHomeConfig({}, state).hide_welcome_message).toBe(true);
  });

  it("maps show_welcome_message=true to hide_welcome_message=undefined", () => {
    const state: EditorState = { ...emptyState, show_welcome_message: true };
    expect(buildHomeConfig({}, state).hide_welcome_message).toBeUndefined();
  });

  it("maps show_suggested_entities=false to hide_suggested_entities=true", () => {
    const state: EditorState = {
      ...emptyState,
      show_suggested_entities: false,
    };
    expect(buildHomeConfig({}, state).hide_suggested_entities).toBe(true);
  });

  it("preserves base config fields the editor does not manage", () => {
    const baseConfig: HomeFrontendSystemData = {
      welcome_banner_dismissed: true,
    };
    expect(
      buildHomeConfig(baseConfig, emptyState).welcome_banner_dismissed
    ).toBe(true);
  });
});

interface TestDialogEditHome extends HTMLElement {
  hass: HomeAssistant;
  updateComplete: Promise<boolean>;
  isDirtyState: boolean;
  showDialog(params: EditHomeDialogParams): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
}

const welcomeChanged = (el: TestDialogEditHome, showWelcomeMessage: boolean) =>
  (
    el as unknown as Record<"_welcomeChanged", (ev: CustomEvent) => void>
  )._welcomeChanged(
    new CustomEvent("value-changed", {
      detail: { value: { show_welcome_message: showWelcomeMessage } },
    })
  );

const suggestedChanged = (
  el: TestDialogEditHome,
  showSuggestedEntities: boolean
) =>
  (
    el as unknown as Record<"_suggestedChanged", (ev: CustomEvent) => void>
  )._suggestedChanged(
    new CustomEvent("value-changed", {
      detail: { value: { show_suggested_entities: showSuggestedEntities } },
    })
  );

const favoriteEntitiesChanged = (
  el: TestDialogEditHome,
  favoriteEntities: string[]
) =>
  (
    el as unknown as Record<
      "_favoriteEntitiesChanged",
      (ev: CustomEvent) => void
    >
  )._favoriteEntitiesChanged(
    new CustomEvent("value-changed", {
      detail: { value: favoriteEntities },
    })
  );

const dialogClosed = (el: TestDialogEditHome) =>
  (el as unknown as Record<"_dialogClosed", () => void>)._dialogClosed();

const save = (el: TestDialogEditHome) =>
  (el as unknown as Record<"_save", () => Promise<void>>)._save();

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("<dialog-edit-home> live preview lifecycle", () => {
  // Tracked so afterEach() can always disconnect it, even when a test fails
  // an assertion before reaching its own cleanup: DirtyStateProviderMixin
  // registers the connected instance in a module-level map that only
  // disconnectedCallback() clears, and that leak is visible globally via
  // window.isDirtyState for the rest of this file's run otherwise.
  let activeDialog: TestDialogEditHome | undefined;

  const createDialog = () => {
    activeDialog = document.createElement(
      "dialog-edit-home"
    ) as unknown as TestDialogEditHome;
    activeDialog.hass = createMockHass();
    activeDialog.connectedCallback();
    return activeDialog;
  };

  afterEach(() => {
    activeDialog?.disconnectedCallback();
    activeDialog = undefined;
  });

  it("does not preview the initial showDialog() state", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig });
    await el.updateComplete;

    expect(previewConfig).not.toHaveBeenCalled();
  });

  it("previews the transformed draft after an editor state change", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;

    expect(previewConfig).toHaveBeenCalledTimes(1);
    expect(previewConfig).toHaveBeenCalledWith({ hide_welcome_message: true });
  });

  it("clears the preview when the dialog closes after an edit", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    previewConfig.mockClear();

    dialogClosed(el);

    expect(previewConfig).toHaveBeenCalledWith(undefined);
  });

  it("does not call previewConfig when closing without any edit", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig });
    await el.updateComplete;

    dialogClosed(el);

    expect(previewConfig).not.toHaveBeenCalled();
  });

  it("reports not dirty when an array field is edited back to matching content via a new array reference", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig });
    await el.updateComplete;

    favoriteEntitiesChanged(el, ["light.kitchen"]);
    await el.updateComplete;
    expect(el.isDirtyState).toBe(true);

    // A brand new array literal with the same contents as the original
    // baseline (empty), not the same reference: isDirtyState must compare
    // by content, not by reference, or this would incorrectly read dirty.
    favoriteEntitiesChanged(el, []);
    await el.updateComplete;
    expect(el.isDirtyState).toBe(false);
  });

  it("still clears the preview on a later cancel after a reused, edited session", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const saveConfig = vi.fn().mockResolvedValue(true);

    // First session: save successfully.
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;
    welcomeChanged(el, false);
    await el.updateComplete;
    await save(el);
    dialogClosed(el);
    await el.updateComplete;

    // Second session, same reused instance: edit, then cancel.
    previewConfig.mockClear();
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;
    welcomeChanged(el, false);
    await el.updateComplete;
    dialogClosed(el);

    expect(previewConfig).toHaveBeenCalledWith(undefined);
  });

  it("does not clear the preview again when the dialog closes after a successful save", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const saveConfig = vi.fn().mockResolvedValue(true);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    expect(previewConfig).toHaveBeenCalledTimes(1);

    await save(el);
    dialogClosed(el);

    expect(previewConfig).toHaveBeenCalledTimes(1);
    expect(previewConfig).not.toHaveBeenCalledWith(undefined);
  });

  it("keeps the dialog open with the draft intact when a save fails, and allows retrying", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const saveConfig = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    previewConfig.mockClear();

    await save(el);

    expect(previewConfig).not.toHaveBeenCalled();
    expect(el.isDirtyState).toBe(true);

    const retryPromise = save(el);
    await retryPromise;
    dialogClosed(el);

    expect(saveConfig).toHaveBeenCalledTimes(2);
    expect(previewConfig).not.toHaveBeenCalledWith(undefined);
  });

  it("does not start a second save while one is already in flight", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;

    const firstSave = save(el);
    const secondSave = save(el); // should be a no-op: already submitting

    pendingSave.resolve(true);
    await firstSave;
    await secondSave;

    expect(saveConfig).toHaveBeenCalledTimes(1);
  });

  it("does not close or discard a newer edit made while an earlier save from the same session is still in flight", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;

    const savePromise = save(el); // captures the welcome-message-off draft

    suggestedChanged(el, false);
    await el.updateComplete;

    pendingSave.resolve(true);
    await savePromise;

    // The stale completion must not close the dialog or mark it clean: the
    // newer edit is still live, and isDirtyState reflects it against what
    // was actually persisted (welcome message off only), not the original
    // baseline.
    expect(el.isDirtyState).toBe(true);

    const retrySave = deferred<boolean>();
    saveConfig.mockImplementationOnce(() => retrySave.promise);
    const retryPromise = save(el);
    retrySave.resolve(true);
    await retryPromise;
    dialogClosed(el);

    expect(saveConfig).toHaveBeenCalledTimes(2);
    expect(previewConfig).not.toHaveBeenCalledWith(undefined);
  });

  it("rebases the clean baseline to what was actually persisted when a stale save resolves after editing back to the original content", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false); // draft now differs from the original baseline
    await el.updateComplete;

    const savePromise = save(el); // captures the welcome-message-off draft

    welcomeChanged(el, true); // edited back to the original content mid-save
    await el.updateComplete;

    pendingSave.resolve(true);
    await savePromise;

    // The backend now holds "welcome message off" (what was actually
    // saved), but the screen shows "welcome message on" (the original
    // baseline). isDirtyState must reflect that real mismatch, not the
    // coincidence that the screen matches where editing started.
    expect(el.isDirtyState).toBe(true);
  });

  it("does not let a stale save from a closed session mark a newly reopened, edited session as saved", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;

    const savePromise = save(el); // session 1's save starts, still in flight

    dialogClosed(el);
    await el.updateComplete;
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;

    pendingSave.resolve(true);
    await savePromise;

    expect(el.isDirtyState).toBe(true);
  });

  it("does not let a stale save resurrect state after the dialog was fully closed (e.g. a scrim/Esc close)", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;

    const savePromise = save(el);
    // Simulate a scrim/Esc close slipping through while submitting:
    // reachable because preventScrimClose only checks isDirtyState, which
    // an edit made during the save's await can momentarily clear before
    // this continuation resumes (see the "edit during save" test above for
    // that exact sequence). _dialogClosed() already resets _params/_session
    // to undefined here; the question is whether the stale completion puts
    // them back.
    dialogClosed(el);
    await el.updateComplete;

    pendingSave.resolve(true);
    await savePromise;

    expect(
      (el as unknown as Record<"_session", unknown>)._session
    ).toBeUndefined();
  });

  it("clears the preview when the dialog closes mid-save even if the screen matches the original baseline", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false); // draft differs from the original baseline
    await el.updateComplete;

    const savePromise = save(el); // captures that draft, save now in flight

    // Edited back to the original content mid-save: isDirtyState reads
    // false again here, so a scrim/Esc close is no longer blocked by
    // preventScrimClose.
    welcomeChanged(el, true);
    await el.updateComplete;
    previewConfig.mockClear();

    // Simulate that scrim/Esc close slipping through while the save is
    // still pending.
    dialogClosed(el);

    expect(previewConfig).toHaveBeenCalledWith(undefined);

    // The pending save resolves after the dialog already closed; the
    // params-identity guard (tested above) keeps it from undoing this.
    pendingSave.resolve(true);
    await savePromise;
  });

  it("closes normally when a stale save's rebased draft matches what was actually persisted", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false); // draft = B
    await el.updateComplete;

    const savePromise = save(el); // captures B

    suggestedChanged(el, false); // draft = C (B plus this change)
    await el.updateComplete;
    suggestedChanged(el, true); // back to B, matching what's being saved
    await el.updateComplete;

    pendingSave.resolve(true);
    await savePromise;

    // The rebased draft matches what was actually persisted: nothing left
    // to save, so the dialog must close normally instead of staying open
    // with Save disabled and nothing left to do.
    expect((el as unknown as Record<"_open", boolean>)._open).toBe(false);
    expect(el.isDirtyState).toBe(false);
  });
});
