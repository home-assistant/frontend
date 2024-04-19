import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { DEFAULT_SERVICE_ICON, FIXED_DOMAIN_ICONS } from "../common/const";
import { computeDomain } from "../common/entity/compute_domain";
import { serviceIcon } from "../data/icons";
import { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-svg-icon";

@customElement("ha-service-icon")
export class HaServiceIcon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public service?: string;

  @property() public icon?: string;

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.service) {
      return nothing;
    }

    if (!this.hass) {
      return this._renderFallback();
    }

    const icon = serviceIcon(this.hass, this.service).then((icn) => {
      if (icn) {
        return html`<ha-icon .icon=${icn}></ha-icon>`;
      }
      return this._renderFallback();
    });

    return html`${until(icon)}`;
  }

  private _renderFallback() {
    const domain = computeDomain(this.service!);

    return html`
      <ha-svg-icon
        .path=${FIXED_DOMAIN_ICONS[domain] || DEFAULT_SERVICE_ICON}
      ></ha-svg-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-icon": HaServiceIcon;
  }
}
