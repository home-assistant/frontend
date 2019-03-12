import {
  html,
  css,
  LitElement,
  TemplateResult,
  CSSResult,
  customElement,
} from "lit-element";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";

import { haStyleDialog } from "../../../../resources/styles";

import "./hui-card-picker";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig } from "../../../../data/lovelace";

@customElement("hui-dialog-pick-card")
export class HuiDialogPickCard extends LitElement {
  public hass?: HomeAssistant;
  public cardPicked?: (cardConf: LovelaceCardConfig) => void;
  public closeDialog?: () => void;

  protected render(): TemplateResult | void {
    return html`
      <paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${this.hass!.localize("ui.panel.lovelace.editor.edit_card.header")}
        </h2>
        <paper-dialog-scrollable>
          <hui-card-picker
            .hass="${this.hass}"
            .cardPicked="${this.cardPicked}"
          ></hui-card-picker>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._skipPick}">MANUAL CARD</mwc-button>
        </div>
      </paper-dialog>
    `;
  }

  private _openedChanged(ev): void {
    if (!ev.detail.value) {
      this.closeDialog!();
    }
  }

  private _skipPick() {
    this.cardPicked!({ type: "" });
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          paper-dialog {
            max-height: 100%;
            height: 100%;
          }
        }

        @media all and (min-width: 660px) {
          paper-dialog {
            width: 650px;
          }
        }

        paper-dialog {
          max-width: 650px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-pick-card": HuiDialogPickCard;
  }
}
