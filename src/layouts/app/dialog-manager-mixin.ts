import { Constructor, LitElement } from "lit-element";
import { HASSDomEvent, ValidHassDomEvent } from "../../common/dom/fire_event";
import { HassBaseEl } from "./hass-base-mixin";

interface RegisterDialogParams {
  dialogShowEvent: keyof HASSDomEvents;
  dialogTag: keyof HTMLElementTagNameMap;
  dialogImport: () => Promise<unknown>;
}

interface ShowDialogParams<T> {
  dialogTag: keyof HTMLElementTagNameMap;
  dialogImport: () => Promise<unknown>;
  dialogParams: T;
}

interface HassDialog<T = HASSDomEvents[ValidHassDomEvent]> extends HTMLElement {
  showDialog(params: T);
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "register-dialog": RegisterDialogParams;
    "show-dialog": ShowDialogParams<unknown>;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "register-dialog": HASSDomEvent<RegisterDialogParams>;
    "show-dialog": HASSDomEvent<ShowDialogParams<unknown>>;
  }
}

const LOADED = {};

export const dialogManagerMixin = (
  superClass: Constructor<LitElement & HassBaseEl>
) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      // deprecated
      this.addEventListener("register-dialog", (e) =>
        this.registerDialog(e.detail)
      );
      this.addEventListener(
        "show-dialog",
        async (e: HASSDomEvent<ShowDialogParams<unknown>>) => {
          const { dialogTag, dialogImport, dialogParams } = e.detail;
          this._showDialog(dialogImport, dialogTag, dialogParams);
        }
      );
    }

    private registerDialog({
      dialogShowEvent,
      dialogTag,
      dialogImport,
    }: RegisterDialogParams) {
      this.addEventListener(dialogShowEvent, (showEv) => {
        this._showDialog(
          dialogImport,
          dialogTag,
          (showEv as HASSDomEvent<unknown>).detail
        );
      });
    }

    private async _showDialog(
      dialogImport: () => Promise<unknown>,
      dialogTag: string,
      dialogParams: unknown
    ) {
      if (!(dialogTag in LOADED)) {
        LOADED[dialogTag] = dialogImport().then(() => {
          const dialogEl = document.createElement(dialogTag) as HassDialog;
          this.provideHass(dialogEl);
          this.shadowRoot!.appendChild(dialogEl);
          return dialogEl;
        });
      }
      const element = await LOADED[dialogTag];
      element.showDialog(dialogParams);
    }
  };
