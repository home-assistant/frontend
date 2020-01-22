import { HASSDomEvent, ValidHassDomEvent } from "../common/dom/fire_event";
import { ProvideHassElement } from "../mixins/provide-hass-lit-mixin";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-dialog": ShowDialogParams<unknown>;
    "close-dialog": undefined;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "show-dialog": HASSDomEvent<ShowDialogParams<unknown>>;
  }
}

interface HassDialog<T = HASSDomEvents[ValidHassDomEvent]> extends HTMLElement {
  showDialog(params: T);
}

interface ShowDialogParams<T> {
  dialogTag: keyof HTMLElementTagNameMap;
  dialogImport: () => Promise<unknown>;
  dialogParams: T;
}

const LOADED = {};

export const showDialog = async (
  element: HTMLElement & ProvideHassElement,
  root: ShadowRoot | HTMLElement,
  dialogImport: () => Promise<unknown>,
  dialogTag: string,
  dialogParams: unknown
) => {
  if (!(dialogTag in LOADED)) {
    LOADED[dialogTag] = dialogImport().then(() => {
      const dialogEl = document.createElement(dialogTag) as HassDialog;
      element.provideHass(dialogEl);
      root.appendChild(dialogEl);
      return dialogEl;
    });
  }
  const dialogElement = await LOADED[dialogTag];
  dialogElement.showDialog(dialogParams);
};

export const makeDialogManager = (
  element: HTMLElement & ProvideHassElement,
  root: ShadowRoot | HTMLElement
) => {
  element.addEventListener(
    "show-dialog",
    async (e: HASSDomEvent<ShowDialogParams<unknown>>) => {
      const { dialogTag, dialogImport, dialogParams } = e.detail;
      showDialog(element, root, dialogImport, dialogTag, dialogParams);
    }
  );
};
