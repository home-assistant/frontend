import "@material/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-relative-time";
import { triggerAutomation } from "../../../data/automation";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

@customElement("more-info-automation")
class MoreInfoAutomation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render(): TemplateResult {
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
        <mwc-button
          @click=${this.handleAction}
          .disabled=${UNAVAILABLE_STATES.includes(this.stateObj!.state)}
        >
          ${this.hass.localize("ui.card.automation.trigger")}
        </mwc-button>
      </div>
    `;
  }

  private handleAction() {
    triggerAutomation(this.hass, this.stateObj!.entity_id);
  }

  static get styles(): CSSResult {
    return css`
      .flex {
        display: flex;
        justify-content: space-between;
      }
      .actions {
        margin: 8px 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-automation": MoreInfoAutomation;
  }
}
