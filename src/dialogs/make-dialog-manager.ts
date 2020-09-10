import { HASSDomEvent, ValidHassDomEvent } from "../common/dom/fire_event";
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
  dialogImport?: () => Promise<unknown>
) => {
  if (!(dialogTag in LOADED)) {
    if (!dialogImport) {
      return;
    }
    LOADED[dialogTag] = dialogImport().then(() => {
      const dialogEl = document.createElement(dialogTag) as HassDialog;
      element.provideHass(dialogEl);
      root.appendChild(dialogEl);
      return dialogEl;
    });
  }

  history.replaceState(
    {
      dialog: dialogTag,
      open: false,
      oldState:
        history.state?.open && history.state?.dialog !== dialogTag
          ? history.state
          : null,
    },
    ""
  );
  try {
    history.pushState(
      { dialog: dialogTag, dialogParams: dialogParams, open: true },
      ""
    );
  } catch (err) {
    // dialogParams could not be cloned, probably contains callback
    history.pushState(
      { dialog: dialogTag, dialogParams: null, open: true },
      ""
    );
  }

  const dialogElement = await LOADED[dialogTag];
  dialogElement.showDialog(dialogParams);
};

export const closeDialog = async (dialogTag: string): Promise<boolean> => {
  if (!(dialogTag in LOADED)) {
    return true;
  }
  const dialogElement = await LOADED[dialogTag];
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
