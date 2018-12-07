import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import "./hui-edit-view";
import "./hui-migrate-config";
import { EditViewDialogParams } from "./show-edit-view-dialog";

declare global {
  // for fire event
  interface HASSDomEvents {
    "reload-lovelace": undefined;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "reload-lovelace": HASSDomEvent<undefined>;
  }
}

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
      !("id" in this._params.viewConfig)
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
        .reloadLovelace="${this._params.reloadLovelace}"
      >
      </hui-edit-view>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-view": HuiDialogEditView;
  }
}

customElements.define("hui-dialog-edit-view", HuiDialogEditView);
