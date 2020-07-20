import { HassEntity } from "home-assistant-js-websocket";
import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-relative-time";
import { HomeAssistant } from "../../../types";

@customElement("more-info-script")
class MoreInfoScript extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div>
        ${this.hass.localize(
          "ui.dialogs.more_info_control.script.last_triggered"
        )}:
        ${this.stateObj.attributes.last_triggered
          ? html`
              <ha-relative-time
                .hass=${this.hass}
                .datetime=${this.stateObj.attributes.last_triggered}
              ></ha-relative-time>
            `
          : this.hass.localize("ui.components.relative_time.never")}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-script": MoreInfoScript;
  }
}
