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

  @property({ attribute: false }) public stateValue?: string;

  @property() public icon?: string;

  protected render() {
    const overrideIcon =
      this.icon ||
      (this.stateObj && this.hass?.entities[this.stateObj.entity_id]?.icon) ||
      this.stateObj?.attributes.icon;
    if (overrideIcon) {
      return html`<ha-icon .icon=${overrideIcon}></ha-icon>`;
    }
    if (!this.stateObj) {
      return nothing;
    }
    if (!this.hass) {
      return this._renderFallback();
    }
    const icon = entityIcon(this.hass, this.stateObj, this.stateValue).then(
      (icn) => {
        if (icn) {
          return html`<ha-icon .icon=${icn}></ha-icon>`;
        }
        return this._renderFallback();
      }
    );
    return html`${until(icon)}`;
  }

  private _renderFallback() {
    return html`<ha-svg-icon
      .path=${stateIconPath(this.stateObj)}
    ></ha-svg-icon>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-icon": HaStateIcon;
  }
}
