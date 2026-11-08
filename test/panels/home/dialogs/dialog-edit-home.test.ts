import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveShortcutItems,
  type ShortcutItem,
} from "../../../../src/data/home_shortcuts";
import type { EditHomeDialogParams } from "../../../../src/panels/home/dialogs/show-dialog-edit-home";
import type { HomeAssistant } from "../../../../src/types";
import "../../../../src/panels/home/dialogs/dialog-edit-home";
import { createMockHass } from "../../../fixtures/hass";

interface TestDialogEditHome extends HTMLElement {
  hass: HomeAssistant;
  updateComplete: Promise<boolean>;
  isDirtyState: boolean;
  showDialog(params: EditHomeDialogParams): void;
  closeDialog(): boolean;
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

const shortcutsChanged = (el: TestDialogEditHome, shortcuts: ShortcutItem[]) =>
  (
    el as unknown as Record<"_shortcutsChanged", (ev: CustomEvent) => void>
  )._shortcutsChanged(
    new CustomEvent("value-changed", { detail: { value: shortcuts } })
  );

// What home-shortcuts-editor emits when toggling the "light" summary from a
// config with no stored shortcuts: the full resolved list, with the toggled
// item's `hidden` set to true or left as an explicit `undefined` key.
const lightShortcutHidden = (hidden: true | undefined): ShortcutItem[] =>
  resolveShortcutItems([]).map((item) =>
    item.type === "summary" && item.key === "light" ? { ...item, hidden } : item
  );

const dialogClosed = (el: TestDialogEditHome) =>
  (el as unknown as Record<"_dialogClosed", () => void>)._dialogClosed();

const save = (el: TestDialogEditHome) =>
  (el as unknown as Record<"_save", () => Promise<void>>)._save();

const session = (el: TestDialogEditHome) =>
  (el as unknown as Record<"_session", { draft: unknown } | undefined>)
    ._session;

const isOpen = (el: TestDialogEditHome) =>
  (el as unknown as Record<"_open", boolean>)._open;

const isSubmitting = (el: TestDialogEditHome) =>
  (el as unknown as Record<"_submitting", boolean>)._submitting;

const saveButton = (el: TestDialogEditHome) =>
  el.shadowRoot!.querySelector('ha-button[slot="primaryAction"]') as
    (HTMLElement & { disabled: boolean }) | null;

const preventScrimClose = (el: TestDialogEditHome) =>
  (
    el.shadowRoot!.querySelector("ha-dialog") as unknown as {
      preventScrimClose: boolean;
    }
  ).preventScrimClose;

// Our own header X, slotted over ha-dialog's default one, which would
// close through wa-dialog directly and bypass closeDialog().
const headerCloseButton = (el: TestDialogEditHome) =>
  el.shadowRoot!.querySelector(
    'ha-icon-button[slot="headerNavigationIcon"]'
  ) as (HTMLElement & { disabled: boolean }) | null;

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

  it("still reverts the preview when closing without any edit", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig });
    await el.updateComplete;

    dialogClosed(el);

    // The panel ignores it when nothing is previewed.
    expect(previewConfig).toHaveBeenCalledTimes(1);
    expect(previewConfig).toHaveBeenCalledWith(undefined);
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

  it("clears the preview on close after editing back to the original content", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    welcomeChanged(el, true);
    await el.updateComplete;

    // Clean again, but the panel is still showing a preview pushed by this
    // session along the way: closing must still revert it.
    expect(el.isDirtyState).toBe(false);
    expect(el.closeDialog()).toBe(true);
    dialogClosed(el);

    expect(previewConfig).toHaveBeenLastCalledWith(undefined);
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

  it("still reverts the preview when the dialog closes after a successful save", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const saveConfig = vi.fn().mockResolvedValue(true);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    expect(previewConfig).toHaveBeenCalledTimes(1);

    await save(el);
    expect(isOpen(el)).toBe(false);
    expect(isSubmitting(el)).toBe(false);
    dialogClosed(el);

    // The panel already cleared its preview on save, so this is a no-op.
    expect(previewConfig).toHaveBeenCalledTimes(2);
    expect(previewConfig).toHaveBeenLastCalledWith(undefined);
  });

  it("stays open after a failed save and can then be cancelled", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const saveConfig = vi.fn().mockResolvedValue(false);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    previewConfig.mockClear();

    await save(el);

    expect(isOpen(el)).toBe(true);
    expect(isSubmitting(el)).toBe(false);

    expect(el.closeDialog()).toBe(true);
    expect(isOpen(el)).toBe(false);
    dialogClosed(el);

    expect(previewConfig).toHaveBeenCalledWith(undefined);
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

    await save(el);

    expect(saveConfig).toHaveBeenCalledTimes(2);
    expect(saveConfig).toHaveBeenNthCalledWith(2, {
      hide_welcome_message: true,
    });
    expect(isOpen(el)).toBe(false);
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

  it("ignores editor changes while a save is pending", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    const draftAtSave = session(el)!.draft;
    previewConfig.mockClear();

    const savePromise = save(el);

    // Every editor is disabled while saving; a change still reaching a
    // handler must neither alter the draft being saved nor the preview.
    welcomeChanged(el, true);
    suggestedChanged(el, false);
    favoriteEntitiesChanged(el, ["light.kitchen"]);
    shortcutsChanged(el, lightShortcutHidden(true));
    await el.updateComplete;

    expect(session(el)!.draft).toBe(draftAtSave);
    expect(previewConfig).not.toHaveBeenCalled();

    pendingSave.resolve(true);
    await savePromise;
    expect(isOpen(el)).toBe(false);
  });

  it("does not let a pending save resurrect state if the session was torn down without closeDialog()", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;

    const savePromise = save(el);
    // closeDialog() refuses mid-save, so this bypasses it on purpose to
    // exercise _save()'s defensive params-identity guard: the completion
    // must not put the torn-down _params/_session back.
    dialogClosed(el);
    await el.updateComplete;

    pendingSave.resolve(true);
    await savePromise;

    expect(
      (el as unknown as Record<"_session", unknown>)._session
    ).toBeUndefined();
  });

  it("refuses to close while a save is pending", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;

    const savePromise = save(el);

    expect(el.closeDialog()).toBe(false);
    expect(isOpen(el)).toBe(true);

    pendingSave.resolve(true);
    await savePromise;
    expect(isOpen(el)).toBe(false);
  });

  it("disables the header close button while a save is pending", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const pendingSave = deferred<boolean>();
    const saveConfig = vi.fn(() => pendingSave.promise);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    expect(headerCloseButton(el)?.disabled).toBe(false);

    const savePromise = save(el);
    await el.updateComplete;
    expect(headerCloseButton(el)?.disabled).toBe(true);

    // A synthetic click still reaches the listener on a disabled button:
    // closeDialog() must refuse on its own.
    headerCloseButton(el)!.click();
    expect(isOpen(el)).toBe(true);

    pendingSave.resolve(false);
    await savePromise;
    await el.updateComplete;
    expect(headerCloseButton(el)?.disabled).toBe(false);
  });

  it("closes through closeDialog() and reverts the preview when the header close button is clicked", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    previewConfig.mockClear();

    headerCloseButton(el)!.click();
    expect(isOpen(el)).toBe(false);
    dialogClosed(el);

    expect(previewConfig).toHaveBeenCalledWith(undefined);
  });

  it("stays clean after hiding then showing a shortcut with no stored shortcuts", async () => {
    const el = createDialog();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig: vi.fn() });
    await el.updateComplete;

    shortcutsChanged(el, lightShortcutHidden(true));
    await el.updateComplete;
    expect(el.isDirtyState).toBe(true);
    expect(saveButton(el)?.disabled).toBe(false);

    shortcutsChanged(el, lightShortcutHidden(undefined));
    await el.updateComplete;
    expect(el.isDirtyState).toBe(false);
    expect(saveButton(el)?.disabled).toBe(true);
    expect(preventScrimClose(el)).toBe(false);
  });
});
