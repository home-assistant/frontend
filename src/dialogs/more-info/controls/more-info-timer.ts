import "@material/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-attributes";
import { TimerEntity } from "../../../data/timer";
import { HomeAssistant } from "../../../types";

@customElement("more-info-timer")
class MoreInfoTimer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: TimerEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <ha-attributes
        .stateObj=${this.stateObj}
        extra-filters="remaining"
      ></ha-attributes>
      <div class="actions">
        ${this.stateObj.state === "idle" || this.stateObj.state === "paused"
          ? html`
              <mwc-button .action=${"start"} @click=${this._handleActionClick}>
                ${this.hass!.localize("ui.card.timer.actions.start")}
              </mwc-button>
            `
          : ""}
        ${this.stateObj.state === "active"
          ? html`
              <mwc-button
                .action=${"pause"}
                @click="${this._handleActionClick}"
              >
                ${this.hass!.localize("ui.card.timer.actions.pause")}
              </mwc-button>
            `
          : ""}
        ${this.stateObj.state === "active" || this.stateObj.state === "paused"
          ? html`
              <mwc-button
                .action=${"cancel"}
                @click="${this._handleActionClick}"
              >
                ${this.hass!.localize("ui.card.timer.actions.cancel")}
              </mwc-button>
              <mwc-button
                .action=${"finish"}
                @click="${this._handleActionClick}"
              >
                ${this.hass!.localize("ui.card.timer.actions.finish")}
              </mwc-button>
            `
          : ""}
      </div>
    `;
  }

  private _handleActionClick(e: MouseEvent): void {
    const action = (e.currentTarget as any).action;
    this.hass.callService("timer", action, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static get styles(): CSSResult {
    return css`
      .actions {
        margin: 0 8px;
        padding-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-timer": MoreInfoTimer;
  }
}
