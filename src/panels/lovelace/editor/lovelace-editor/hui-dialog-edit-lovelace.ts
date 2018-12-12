import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import { Lovelace } from "../../types";

import { HomeAssistant } from "../../../../types";
import "./hui-edit-lovelace";

export class HuiDialogEditLovelace extends LitElement {
  public hass?: HomeAssistant;
  private _lovelace?: Lovelace;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _lovelace: {},
    };
  }

  public async showDialog(lovelace: Lovelace): Promise<void> {
    this._lovelace = lovelace;
    await this.updateComplete;
    (this.shadowRoot!.children[0] as any).showDialog();
  }

  protected render(): TemplateResult {
    return html`
      <hui-edit-lovelace .hass="${this.hass}" .lovelace="${this._lovelace}">
      </hui-edit-lovelace>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-lovelace": HuiDialogEditLovelace;
  }
}

customElements.define("hui-dialog-edit-lovelace", HuiDialogEditLovelace);
