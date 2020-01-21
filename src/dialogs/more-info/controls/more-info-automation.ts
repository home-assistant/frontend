import {
  LitElement,
  html,
  TemplateResult,
  CSSResult,
  css,
  property,
  customElement,
} from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";
import "@material/mwc-button";

import "../../../components/ha-relative-time";

import { HomeAssistant } from "../../../types";

@customElement("more-info-automation")
class MoreInfoAutomation extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult | void {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div class="flex">
        <div>${this.hass.localize("ui.card.automation.last_triggered")}:</div>
        <ha-relative-time
          .hass=${this.hass}
          .datetime=${this.stateObj.attributes.last_triggered}
        ></ha-relative-time>
      </div>

      <div class="actions">
        <mwc-button @click=${this.handleAction}>
          ${this.hass.localize("ui.card.automation.trigger")}
        </mwc-button>
      </div>
    `;
  }

  private handleAction() {
    this.hass.callService("automation", "trigger", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static get styles(): CSSResult {
    return css`
      .flex {
        display: flex;
        justify-content: space-between;
      }
      .actions {
        margin: 36px 0 8px 0;
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-automation": MoreInfoAutomation;
  }
}
