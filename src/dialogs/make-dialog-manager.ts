import { HASSDomEvent, ValidHassDomEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import { ProvideHassElement } from "../mixins/provide-hass-lit-mixin";
import { HaButtonMenu } from "../components/ha-button-menu";
import { HaDialog } from "../components/ha-dialog";

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
  oldState: null | DialogState;
  dialogParams?: unknown;
}

interface LoadedDialogInfo {
  element: Promise<HassDialog>;
  closedFocusTarget: Element | null;
  closedFocusDialog: HaDialog | null;
}

interface LoadedDialogsDict {
  [tag: string]: LoadedDialogInfo;
}

const LOADED: LoadedDialogsDict = {};

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
    LOADED[dialogTag] = {
      element: dialogImport().then(() => {
        const dialogEl = document.createElement(dialogTag) as HassDialog;
        element.provideHass(dialogEl);
        return dialogEl;
      }),
      closedFocusTarget: null,
      closedFocusDialog: null,
    };
  }

  // Go down all components to find the active element,
  // but keep the original focus target if dialog is being replaced
  if (mainWindow.history.state?.replaced) {
    LOADED[dialogTag].closedFocusTarget =
      LOADED[mainWindow.history.state.dialog].closedFocusTarget;
    LOADED[dialogTag].closedFocusDialog =
      LOADED[mainWindow.history.state.dialog].closedFocusDialog;
  } else {
    let focusedDialog: LoadedDialogInfo["closedFocusDialog"] = null;
    let focusedElement = document.activeElement;
    while (focusedElement?.shadowRoot?.activeElement) {
      focusedElement = focusedElement.shadowRoot.activeElement;

      // Detect when focus is slotted into certain components
      const slotRoot = focusedElement.assignedSlot?.getRootNode();
      if (slotRoot instanceof ShadowRoot) {
        const slotHost = slotRoot.host;
        if (slotHost instanceof HaButtonMenu) {
          // Use trigger button since popup menu will be hidden again
          focusedElement = slotHost.querySelector('[slot="trigger"]');
          break;
        } else if (slotHost instanceof HaDialog) {
          // Focus will return inside another dialog
          focusedDialog = slotHost;
        }
      }
    }
    LOADED[dialogTag].closedFocusTarget = focusedElement;
    LOADED[dialogTag].closedFocusDialog = focusedDialog;
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
    } catch (err: any) {
      // dialogParams could not be cloned, probably contains callback
      mainWindow.history.pushState(
        { dialog: dialogTag, dialogParams: null, open: true },
        ""
      );
    }
  }

  const dialogElement = await LOADED[dialogTag].element;
  dialogElement.addEventListener("dialog-closed", _handleClosedFocus);

  // Append it again so it's the last element in the root,
  // so it's guaranteed to be on top of the other elements
  root.appendChild(dialogElement);
  dialogElement.showDialog(dialogParams);
};

export const replaceDialog = (dialogElement: HassDialog) => {
  mainWindow.history.replaceState(
    { ...mainWindow.history.state, replaced: true },
    ""
  );
  dialogElement.removeEventListener("dialog-closed", _handleClosedFocus);
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
  const focusTarget = LOADED[ev.detail.dialog].closedFocusTarget;
  const focusDialog = LOADED[ev.detail.dialog].closedFocusDialog;

  // If target is in another dialog, make sure it is fully rendered before trying
  await focusDialog?.updateComplete;
  if (focusTarget instanceof HTMLElement) focusTarget.focus();

  // Check if focusing was successful
  let focusedElement = document.activeElement;
  let focusSuccess = focusTarget === focusedElement;
  while (!focusSuccess && focusedElement?.shadowRoot?.activeElement) {
    focusedElement = focusedElement.shadowRoot.activeElement;
    focusSuccess = focusTarget === focusedElement;
  }

  if (!focusSuccess) {
    // Let dialog handle fallback if it exists
    focusDialog?.focus();

    if (__DEV__) {
      // eslint-disable-next-line
      console.warn(
        "Tried to focus %o after closing dialog, but active element is %o",
        focusTarget,
        focusedElement
      );
    }
  }
};
