import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { stateIconPath } from "../common/entity/state_icon_path";
import { entityIcon } from "../data/icons";
import { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-svg-icon";

@customElement("ha-state-icon")
export class HaStateIcon extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property() public icon?: string;

  protected render() {
    if (this.icon || this.stateObj?.attributes.icon) {
      return html`<ha-icon
        .icon=${this.icon || this.stateObj?.attributes.icon}
      ></ha-icon>`;
    }
    if (!this.stateObj) {
      return nothing;
    }
    let icon = this.hass
      ? entityIcon(this.hass, this.stateObj).then((icn) => {
          if (icn) {
            return html`<ha-icon .icon=${icn}></ha-icon>`;
          }
          icon = undefined;
          return new Promise(() => {});
        })
      : undefined;
    return icon
      ? html`${until(
          icon,
          html`<ha-svg-icon
            .path=${stateIconPath(this.stateObj)}
          ></ha-svg-icon>`
        )}`
      : html`<ha-svg-icon .path=${stateIconPath(this.stateObj)}></ha-svg-icon>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-state-icon": HaStateIcon;
  }
}
