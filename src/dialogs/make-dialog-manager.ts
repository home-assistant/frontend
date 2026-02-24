import type { LitElement } from "lit";
import { ancestorsWithProperty } from "../common/dom/ancestors-with-property";
import { deepActiveElement } from "../common/dom/deep-active-element";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import { nextRender } from "../common/util/render-status";
import type { ProvideHassElement } from "../mixins/provide-hass-lit-mixin";

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

export interface HassDialog<T = unknown> extends HTMLElement {
  showDialog(params: T);
  closeDialog?: (historyState?: any) => Promise<boolean> | boolean;
}

export interface HassDialogNext<T = unknown> extends HTMLElement {
  params?: T;
  closeDialog?: (historyState?: any) => Promise<boolean> | boolean;
}

export interface ShowDialogParams<T> {
  dialogTag: keyof HTMLElementTagNameMap;
  dialogImport: () => Promise<unknown>;
  dialogParams: T;
  addHistory?: boolean;
  parentElement?: LitElement;
}

export interface DialogClosedParams {
  dialog: string;
}

export interface DialogState {
  element: HTMLElement & ProvideHassElement;
  dialogTag: string;
  dialogParams: unknown;
  dialogImport?: () => Promise<unknown>;
  addHistory?: boolean;
}

interface LoadedDialogInfo {
  element: Promise<HassDialogNext | HassDialog> | null;
  closedFocusTargets?: Set<Element>;
}

type LoadedDialogsDict = Record<string, LoadedDialogInfo>;

const LOADED: LoadedDialogsDict = {};
const OPEN_DIALOG_STACK: DialogState[] = [];
export const FOCUS_TARGET = Symbol.for("HA focus target");

/**
 * Shows a dialog element, lazy-loading it if needed, and optionally integrates
 * dialog open/close behavior with browser history.
 *
 * @param element The host element that can provide `hass` and receives the dialog by default.
 * @param dialogTag The custom element tag name of the dialog.
 * @param dialogParams The params passed to the dialog via `showDialog()` or `params`.
 * @param dialogImport Optional lazy import used when the dialog has not been loaded yet.
 * @param parentElement Optional parent to append the dialog to instead of root element.
 * @param addHistory Whether to add/update browser history so back navigation closes dialogs.
 * @returns `true` if the dialog was shown (or could be shown), `false` if it could not be loaded.
 */
export const showDialog = async (
  element: LitElement & ProvideHassElement,
  dialogTag: string,
  dialogParams: unknown,
  dialogImport?: () => Promise<unknown>,
  parentElement?: LitElement,
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
        const dialogEl = document.createElement(dialogTag) as
          | HassDialogNext
          | HassDialog;

        if ("showDialog" in dialogEl) {
          // provide hass for legacy persistent dialogs
          element.provideHass(dialogEl);
        }

        dialogEl.addEventListener("dialog-closed", _handleClosed);
        dialogEl.addEventListener("dialog-closed", _handleClosedFocus);

        return dialogEl;
      }),
    };
  }

  if (addHistory) {
    const { history } = mainWindow;
    if (history.state?.dialog && !OPEN_DIALOG_STACK.length) {
      // theres is a dialog state in history, but no dialogs open
      // wait for history.back() to update the state
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
      return showDialog(
        element,
        dialogTag,
        dialogParams,
        dialogImport,
        parentElement,
        addHistory
      );
    }
    const dialogIndex = OPEN_DIALOG_STACK.findIndex(
      (state) => state.dialogTag === dialogTag
    );
    if (dialogIndex !== -1) {
      OPEN_DIALOG_STACK.splice(dialogIndex, 1);
    }
    OPEN_DIALOG_STACK.push({
      element,
      dialogTag,
      dialogParams,
      dialogImport,
      addHistory,
    });
    const newState = { dialog: dialogTag };
    if (history.state?.dialog) {
      // if a dialog is already open, replace the name
      history.replaceState(newState, "");
    } else {
      // if a dialog is not open, push a new state so back() will close the dialog
      history.replaceState({ ...history.state, opensDialog: true }, "");
      history.pushState(newState, "");
    }
  }

  // Get the focus targets after the dialog closes
  LOADED[dialogTag].closedFocusTargets = ancestorsWithProperty(
    deepActiveElement(),
    FOCUS_TARGET
  );

  let dialogElement: HassDialogNext | HassDialog | null;

  if (LOADED[dialogTag] && LOADED[dialogTag].element === null) {
    dialogElement = document.createElement(dialogTag) as HassDialogNext;
    dialogElement.addEventListener("dialog-closed", _handleClosed);
    dialogElement.addEventListener("dialog-closed", _handleClosedFocus);
    LOADED[dialogTag].element = Promise.resolve(dialogElement);
  } else {
    dialogElement = await LOADED[dialogTag].element;
  }

  if ("showDialog" in dialogElement!) {
    dialogElement.showDialog(dialogParams);
  } else {
    dialogElement!.params = dialogParams;
  }

  (parentElement || element).shadowRoot!.appendChild(dialogElement!);

  return true;
};

export const closeDialog = async (
  dialogTag: string,
  historyState?: any
): Promise<boolean> => {
  if (!(dialogTag in LOADED)) {
    return true;
  }
  const dialogElement = await LOADED[dialogTag].element;
  if (dialogElement && dialogElement.closeDialog) {
    return dialogElement.closeDialog(historyState) !== false;
  }
  return true;
};

// called on back()
export const closeLastDialog = async (historyState?: any) => {
  if (OPEN_DIALOG_STACK.length) {
    const lastDialog = OPEN_DIALOG_STACK.pop() as DialogState;
    const closed = await closeDialog(lastDialog.dialogTag, historyState);
    if (!closed) {
      // if the dialog was not closed, put it back on the stack
      OPEN_DIALOG_STACK.push(lastDialog);
    } else if (
      OPEN_DIALOG_STACK.length &&
      mainWindow.history.state?.opensDialog
    ) {
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
  for (let i = OPEN_DIALOG_STACK.length - 1; i >= 0; i--) {
    const closed =
      !OPEN_DIALOG_STACK[i] ||
      // eslint-disable-next-line no-await-in-loop
      (await closeDialog(OPEN_DIALOG_STACK[i].dialogTag));
    if (!closed) {
      return false;
    }
  }
  return true;
};

const _handleClosed = (ev: HASSDomEvent<DialogClosedParams>) => {
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

  // cleanup element
  if (ev.currentTarget && "params" in ev.currentTarget) {
    const dialogElement = ev.currentTarget as HassDialogNext;
    dialogElement.removeEventListener("dialog-closed", _handleClosed);
    dialogElement.removeEventListener("dialog-closed", _handleClosedFocus);
    LOADED[ev.detail.dialog].element = null;
  }
};

export const makeDialogManager = (element: LitElement & ProvideHassElement) => {
  element.addEventListener(
    "show-dialog",
    (e: HASSDomEvent<ShowDialogParams<unknown>>) => {
      const {
        dialogTag,
        dialogImport,
        dialogParams,
        addHistory,
        parentElement,
      } = e.detail;

      showDialog(
        element,
        dialogTag,
        dialogParams,
        dialogImport,
        parentElement,
        addHistory
      );
    }
  );
};

const _handleClosedFocus = async (ev: HASSDomEvent<DialogClosedParams>) => {
  if (!LOADED[ev.detail.dialog]) return;
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
