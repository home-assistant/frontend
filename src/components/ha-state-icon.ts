import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { DEFAULT_DOMAIN_ICON, FIXED_DOMAIN_ICONS } from "../common/const";
import { computeStateDomain } from "../common/entity/compute_state_domain";
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
    const domain = computeStateDomain(this.stateObj!);

    return html`
      <ha-svg-icon
        .path=${FIXED_DOMAIN_ICONS[domain] || DEFAULT_DOMAIN_ICON}
      ></ha-svg-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-icon": HaStateIcon;
  }
}
