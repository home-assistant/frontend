import { Constructor, LitElement } from "lit-element";
import { HASSDomEvent, ValidHassDomEvent } from "../../common/dom/fire_event";

interface RegisterDialogParams {
  dialogShowEvent: keyof HASSDomEvents;
  dialogTag: keyof HTMLElementTagNameMap;
  dialogImport: () => Promise<unknown>;
}

interface HassDialog<T = HASSDomEvents[ValidHassDomEvent]> extends HTMLElement {
  showDialog(params: T);
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "register-dialog": RegisterDialogParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "register-dialog": HASSDomEvent<RegisterDialogParams>;
  }
}

export const dialogManagerMixin = (superClass: Constructor<LitElement>) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("register-dialog", (e) =>
        this.registerDialog(e.detail)
      );
    }

    private registerDialog({
      dialogShowEvent,
      dialogTag,
      dialogImport,
    }: RegisterDialogParams) {
      let loaded: Promise<HassDialog<unknown>>;

      this.addEventListener(dialogShowEvent, (showEv) => {
        if (!loaded) {
          loaded = dialogImport().then(() => {
            const dialogEl = document.createElement(dialogTag) as HassDialog;
            this.shadowRoot!.appendChild(dialogEl);
            (this as any).provideHass(dialogEl);
            return dialogEl;
          });
        }
        loaded.then((dialogEl) =>
          dialogEl.showDialog((showEv as HASSDomEvent<unknown>).detail)
        );
      });
    }
  };
