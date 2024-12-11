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
  element: HTMLElement & ProvideHassElement;
  root: ShadowRoot | HTMLElement;
  dialogTag: string;
  dialogParams: unknown;
  dialogImport?: () => Promise<unknown>;
  addHistory?: boolean;
}

interface LoadedDialogInfo {
  element: Promise<HassDialog>;
  closedFocusTargets?: Set<Element>;
}

interface LoadedDialogsDict {
  [tag: string]: LoadedDialogInfo;
}

const LOADED: LoadedDialogsDict = {};
const OPEN_DIALOG_STACK: DialogState[] = [];
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
        dialogEl.addEventListener("dialog-closed", _handleClosed);
        dialogEl.addEventListener("dialog-closed", _handleClosedFocus);
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
  if (addHistory) {
    OPEN_DIALOG_STACK.push({
      element,
      root,
      dialogTag,
      dialogParams,
      dialogImport,
      addHistory,
    });
    const newState = { dialog: dialogTag };
    if (state?.dialog) {
      // if the dialog is already open, replace the name
      mainWindow.history.replaceState(newState, "");
    } else {
      // if the dialog is not open, push a new state so back() will close the dialog
      mainWindow.history.replaceState({ ...state, opensDialog: true }, "");
      mainWindow.history.pushState(newState, "");
    }
  }

  const dialogElement = await LOADED[dialogTag].element;

  // Append it again so it's the last element in the root,
  // so it's guaranteed to be on top of the other elements
  root.appendChild(dialogElement);
  dialogElement.showDialog(dialogParams);

  return true;
};

export const showDialogFromHistory = async (dialogTag: string) => {
  const dialogState = OPEN_DIALOG_STACK.find(
    (state) => state.dialogTag === dialogTag
  );
  if (dialogState) {
    showDialog(
      dialogState.element,
      dialogState.root,
      dialogTag,
      dialogState.dialogParams,
      dialogState.dialogImport,
      false
    );
  } else {
    // remove the dialog from history if already closed
    mainWindow.history.back();
  }
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

// called on back()
export const closeLastDialog = async () => {
  if (OPEN_DIALOG_STACK.length) {
    const lastDialog = OPEN_DIALOG_STACK.pop();
    const closed = await closeDialog(lastDialog!.dialogTag);
    if (!closed) {
      // if the dialog was not closed, put it back on the stack
      OPEN_DIALOG_STACK.push(lastDialog!);
    }
    if (OPEN_DIALOG_STACK.length && mainWindow.history.state?.opensDialog) {
      // if there are more dialogs open, push a new state so back() will close the next top dialog
      mainWindow.history.pushState(
        { dialog: OPEN_DIALOG_STACK[OPEN_DIALOG_STACK.length - 1].dialogTag },
        ""
      );
    }
    return closed;
  }
  return true;
};

export const closeAllDialogs = async () => {
  while (OPEN_DIALOG_STACK.length) {
    // eslint-disable-next-line no-await-in-loop
    const closed = await closeLastDialog();
    if (!closed) {
      return false;
    }
  }
  return true;
};

const _handleClosed = async (ev: HASSDomEvent<DialogClosedParams>) => {
  // If not closed by navigating back, remove the open state from history
  const dialogIndex = OPEN_DIALOG_STACK.findIndex(
    (state) => state.dialogTag === ev.detail.dialog
  );
  if (dialogIndex !== -1) {
    OPEN_DIALOG_STACK.splice(dialogIndex, 1);
  }
  if (mainWindow.history.state?.dialog === ev.detail.dialog) {
    if (OPEN_DIALOG_STACK.length) {
      // if there are more dialogs open, set the top one in history
      mainWindow.history.replaceState(
        { dialog: OPEN_DIALOG_STACK[OPEN_DIALOG_STACK.length - 1].dialogTag },
        ""
      );
    } else if (dialogIndex !== -1) {
      // if the dialog is the last one and it was indeed open, go back
      mainWindow.history.back();
    }
  }
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
