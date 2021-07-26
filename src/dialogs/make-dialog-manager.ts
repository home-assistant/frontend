import { HASSDomEvent, ValidHassDomEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import { ProvideHassElement } from "../mixins/provide-hass-lit-mixin";

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
}

export interface DialogClosedParams {
  dialog: string;
}

export interface DialogState {
  dialog: string;
  open: boolean;
  oldState: null | DialogState;
  dialogParams?: unknown;
}

const LOADED = {};

export const showDialog = async (
  element: HTMLElement & ProvideHassElement,
  root: ShadowRoot | HTMLElement,
  dialogTag: string,
  dialogParams: unknown,
  dialogImport?: () => Promise<unknown>,
  addHistory = true
) => {
  if (!(dialogTag in LOADED)) {
    if (!dialogImport) {
      if (__DEV__) {
        // eslint-disable-next-line
        console.warn(
          "Asked to show dialog that's not loaded and can't be imported"
        );
      }
      return;
    }
    LOADED[dialogTag] = dialogImport().then(() => {
      const dialogEl = document.createElement(dialogTag) as HassDialog;
      element.provideHass(dialogEl);
      return dialogEl;
    });
  }

  if (addHistory) {
    mainWindow.history.replaceState(
      {
        dialog: dialogTag,
        open: false,
        oldState:
          mainWindow.history.state?.open &&
          mainWindow.history.state?.dialog !== dialogTag
            ? mainWindow.history.state
            : null,
      },
      ""
    );
    try {
      mainWindow.history.pushState(
        { dialog: dialogTag, dialogParams: dialogParams, open: true },
        ""
      );
    } catch (err) {
      // dialogParams could not be cloned, probably contains callback
      mainWindow.history.pushState(
        { dialog: dialogTag, dialogParams: null, open: true },
        ""
      );
    }
  }
  const dialogElement = await LOADED[dialogTag];
  // Append it again so it's the last element in the root,
  // so it's guaranteed to be on top of the other elements
  root.appendChild(dialogElement);
  dialogElement.showDialog(dialogParams);
};

export const replaceDialog = () => {
  mainWindow.history.replaceState(
    { ...mainWindow.history.state, replaced: true },
    ""
  );
};

export const closeDialog = async (dialogTag: string): Promise<boolean> => {
  if (!(dialogTag in LOADED)) {
    return true;
  }
  const dialogElement: HassDialog = await LOADED[dialogTag];
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
      const { dialogTag, dialogImport, dialogParams } = e.detail;
      showDialog(element, root, dialogTag, dialogParams, dialogImport);
    }
  );
};
