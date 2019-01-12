import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";

import "./hui-card-picker";
import { HomeAssistant } from "../../../../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { LovelaceCardConfig } from "../../../../data/lovelace";

export class HuiDialogPickCard extends hassLocalizeLitMixin(LitElement) {
  public hass?: HomeAssistant;
  public cardPicked?: (cardConf: LovelaceCardConfig) => void;
  public closeDialog?: () => void;

  static get properties(): PropertyDeclarations {
    return {};
  }

  protected render(): TemplateResult | void {
    return html`
      <paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>${this.localize("ui.panel.lovelace.editor.edit_card.header")}</h2>
        <paper-dialog-scrollable>
          <hui-card-picker
            .hass="${this.hass}"
            .cardPicked="${this.cardPicked}"
          ></hui-card-picker>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <paper-button @click="${this._skipPick}">SKIP</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  private _openedChanged(ev) {
    if (!ev.detail.value) {
      this.closeDialog!();
    }
  }

  private _skipPick() {
    this.cardPicked!({ type: "" });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-pick-card": HuiDialogPickCard;
  }
}

customElements.define("hui-dialog-pick-card", HuiDialogPickCard);
