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

const dialogClosed = (el: TestDialogEditHome) =>
  (el as unknown as Record<"_dialogClosed", () => void>)._dialogClosed();

const save = (el: TestDialogEditHome) =>
  (el as unknown as Record<"_save", () => Promise<void>>)._save();

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

  it("clears the preview when the dialog closes", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    el.showDialog({ config: {}, saveConfig: vi.fn(), previewConfig });
    await el.updateComplete;

    dialogClosed(el);

    expect(previewConfig).toHaveBeenCalledWith(undefined);
  });

  it("does not clear the preview again when the dialog closes after a successful save", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const saveConfig = vi.fn().mockResolvedValue(undefined);
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;

    welcomeChanged(el, false);
    await el.updateComplete;
    expect(previewConfig).toHaveBeenCalledTimes(1);

    await save(el);
    // The dialog eventually closes once the save succeeds; simulate that.
    dialogClosed(el);

    // The panel's own post-save refresh already owns the regeneration, so
    // closing must not schedule a second, redundant one.
    expect(previewConfig).toHaveBeenCalledTimes(1);
    expect(previewConfig).not.toHaveBeenCalledWith(undefined);
  });

  it("still clears the preview on a later cancel after a reused dialog previously saved", async () => {
    const el = createDialog();
    const previewConfig = vi.fn();
    const saveConfig = vi.fn().mockResolvedValue(undefined);

    // First session on this dialog instance: save successfully.
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;
    await save(el);
    dialogClosed(el);
    // Flush the resulting _state: undefined transition before reopening, so
    // it doesn't coalesce with the next showDialog() into a single update
    // (which would mask the very guard this test isolates).
    await el.updateComplete;

    // Second session, same reused instance: cancel instead of saving.
    previewConfig.mockClear();
    el.showDialog({ config: {}, saveConfig, previewConfig });
    await el.updateComplete;
    dialogClosed(el);

    expect(previewConfig).toHaveBeenCalledWith(undefined);
  });
});
