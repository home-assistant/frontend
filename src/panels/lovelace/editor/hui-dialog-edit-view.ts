import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { LovelaceViewConfig } from "../../../data/lovelace";
import "./hui-edit-view";
import "./hui-migrate-config";

declare global {
  // for fire event
  interface HASSDomEvents {
    "reload-lovelace": undefined;
    "show-edit-view": EditViewDialogParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "reload-lovelace": HASSDomEvent<undefined>;
  }
}

let registeredDialog = false;
const dialogShowEvent = "show-edit-view";
const dialogTag = "hui-dialog-edit-view";

export interface EditViewDialogParams {
  viewConfig?: LovelaceViewConfig;
  add?: boolean;
  reloadLovelace: () => void;
}

const registerEditViewDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () => import("./hui-dialog-edit-view"),
  });

export const showEditViewDialog = (
  element: HTMLElement,
  editViewDialogParams: EditViewDialogParams
) => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerEditViewDialog(element);
  }
  fireEvent(element, dialogShowEvent, editViewDialogParams);
};

export class HuiDialogEditView extends LitElement {
  protected hass?: HomeAssistant;
  private _params?: EditViewDialogParams;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _params: {},
    };
  }

  public async showDialog(params: EditViewDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
    (this.shadowRoot!.children[0] as any).showDialog();
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    if (
      !this._params.add &&
      this._params.viewConfig &&
      !this._params.viewConfig.id
    ) {
      return html`
        <hui-migrate-config
          .hass="${this.hass}"
          @reload-lovelace="${this._params.reloadLovelace}"
        ></hui-migrate-config>
      `;
    }
    return html`
      <hui-edit-view
        .hass="${this.hass}"
        .viewConfig="${this._params.viewConfig}"
        .add="${this._params.add}"
        @reload-lovelace="${this._params.reloadLovelace}"
        @cancel-edit-view="${this._cancel}"
      >
      </hui-edit-view>
    `;
  }

  private _cancel() {
    this._params = {
      add: undefined,
      reloadLovelace: () => {
        return;
      },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-view": HuiDialogEditView;
  }
}

customElements.define(dialogTag, HuiDialogEditView);
