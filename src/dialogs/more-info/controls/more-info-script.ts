import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";

import { HomeAssistant } from "../../../types";
import format_date_time from "../../../common/datetime/format_date_time";

@customElement("more-info-script")
class MoreInfoScript extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult | void {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div>
        ${this.hass.localize(
          "ui.dialogs.more_info_control.script.last_triggered"
        )}:
        ${this.stateObj.attributes.last_triggered
          ? format_date_time(
              new Date(this.stateObj.attributes.last_triggered),
              this.hass.language
            )
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
