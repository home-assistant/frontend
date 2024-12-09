import type { HASSDomEvent, ValidHassDomEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import type { ProvideHassElement } from "../mixins/provide-hass-lit-mixin";
import { ancestorsWithProperty } from "../common/dom/ancestors-with-property";
import { deepActiveElement } from "../common/dom/deep-active-element";
import { nextRender } from "../common/util/render-status";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-dialog": ShowDialogParams<unknown>;
    "close-dialog": undefined;
    "dialog-closed": DialogClosedParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "show-dialog": HASSDomEvent<ShowDialogParams<unknown>>;
    "dialog-closed": HASSDomEvent<DialogClosedParams>;
  }
}

export interface HassDialog<T = HASSDomEvents[ValidHassDomEvent]>
  extends HTMLElement {
  showDialog(params: T);
  closeDialog?: () => boolean | void;
}

interface ShowDialogParams<T> {
  dialogTag: keyof HTMLElementTagNameMap;
  dialogImport: () => Promise<unknown>;
  dialogParams: T;
  addHistory?: boolean;
}

export interface DialogClosedParams {
  dialog: string;
}

export interface DialogState {
  dialog: string;
  open: boolean;
  dialogParams?: unknown;
  nextState?: DialogState;
}

interface LoadedDialogInfo {
  element: Promise<HassDialog>;
  closedFocusTargets?: Set<Element>;
}

interface LoadedDialogsDict {
  [tag: string]: LoadedDialogInfo;
}

const LOADED: LoadedDialogsDict = {};
export const FOCUS_TARGET = Symbol.for("HA focus target");

export const showDialog = async (
  element: HTMLElement & ProvideHassElement,
  root: ShadowRoot | HTMLElement,
  dialogTag: string,
  dialogParams: unknown,
  dialogImport?: () => Promise<unknown>,
  addHistory = true
): Promise<boolean> => {
  if (!(dialogTag in LOADED)) {
    if (!dialogImport) {
      if (__DEV__) {
        // eslint-disable-next-line
        console.warn(
          "Asked to show dialog that's not loaded and can't be imported"
        );
      }
      return false;
    }
    LOADED[dialogTag] = {
      element: dialogImport().then(() => {
        const dialogEl = document.createElement(dialogTag) as HassDialog;
        element.provideHass(dialogEl);
        return dialogEl;
      }),
    };
  }

  // Get the focus targets after the dialog closes
  LOADED[dialogTag].closedFocusTargets = ancestorsWithProperty(
    deepActiveElement(),
    FOCUS_TARGET
  );

  const { state } = mainWindow.history;
  // if the same dialog is already open, don't push state
  if (addHistory && state?.dialog !== dialogTag) {
    const nextState = { dialog: dialogTag, dialogParams, open: true };
    mainWindow.history.replaceState({ ...state, nextState }, "");
    try {
      mainWindow.history.pushState(nextState, "");
    } catch (err: any) {
      // dialogParams could not be cloned, probably contains callback
      mainWindow.history.pushState({ ...nextState, dialogParams: null }, "");
    }
  }

  const dialogElement = await LOADED[dialogTag].element;
  dialogElement.addEventListener("dialog-closed", _handleClosedFocus);

  // Append it again so it's the last element in the root,
  // so it's guaranteed to be on top of the other elements
  root.appendChild(dialogElement);
  dialogElement.showDialog(dialogParams);

  return true;
};

export const closeDialog = async (dialogTag: string): Promise<boolean> => {
  if (!(dialogTag in LOADED)) {
    return true;
  }
  const dialogElement = await LOADED[dialogTag].element;
  if (dialogElement.closeDialog) {
    return dialogElement.closeDialog() !== false;
  }
  return true;
};

export const makeDialogManager = (
  element: HTMLElement & ProvideHassElement,
  root: ShadowRoot | HTMLElement
) => {
  element.addEventListener(
    "show-dialog",
    (e: HASSDomEvent<ShowDialogParams<unknown>>) => {
      const { dialogTag, dialogImport, dialogParams, addHistory } = e.detail;
      showDialog(
        element,
        root,
        dialogTag,
        dialogParams,
        dialogImport,
        addHistory
      );
    }
  );
};

const _handleClosedFocus = async (ev: HASSDomEvent<DialogClosedParams>) => {
  const closedFocusTargets = LOADED[ev.detail.dialog].closedFocusTargets;
  delete LOADED[ev.detail.dialog].closedFocusTargets;
  if (!closedFocusTargets) return;

  // Undo whatever the browser focused to provide easy checking
  let focusedElement = deepActiveElement();
  if (focusedElement instanceof HTMLElement) focusedElement.blur();

  // Make sure backdrop is fully updated before trying (especially needed for underlay dialogs)
  await nextRender();

  // Try all targets in order and stop when one works
  for (const focusTarget of closedFocusTargets) {
    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus();
      focusedElement = deepActiveElement();
      if (focusedElement && focusedElement !== document.body) return;
    }
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      "Failed to focus any targets after closing dialog: %o",
      closedFocusTargets
    );
  }
};
