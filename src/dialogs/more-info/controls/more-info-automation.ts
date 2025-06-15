import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-relative-time";
import { triggerAutomationActions } from "../../../data/automation";
import { isUnavailableState } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-button";

@customElement("more-info-automation")
class MoreInfoAutomation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    return html`
      <hr />
      <div class="flex">
        <div>${this.hass.localize("ui.card.automation.last_triggered")}:</div>
        <ha-relative-time
          .hass=${this.hass}
          .datetime=${this.stateObj.attributes.last_triggered}
          capitalize
        ></ha-relative-time>
      </div>

      <div class="actions">
        <ha-button
          appearance="plain"
          size="small"
          @click=${this._runActions}
          .disabled=${isUnavailableState(this.stateObj!.state)}
        >
          ${this.hass.localize("ui.card.automation.trigger")}
        </ha-button>
      </div>
    `;
  }

  private _runActions() {
    triggerAutomationActions(this.hass, this.stateObj!.entity_id);
  }

  static styles = css`
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
    hr {
      border-color: var(--divider-color);
      border-bottom: none;
      margin: 16px 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-automation": MoreInfoAutomation;
  }
}
