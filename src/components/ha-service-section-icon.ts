import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-svg-icon";
import { serviceSectionIcon } from "../data/icons";

@customElement("ha-service-section-icon")
export class HaServiceSectionIcon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public service?: string;

  @property() public section?: string;

  @property() public icon?: string;

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.service || !this.section) {
      return nothing;
    }

    if (!this.hass) {
      return this._renderFallback();
    }

    const icon = serviceSectionIcon(this.hass, this.service, this.section).then(
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
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-section-icon": HaServiceSectionIcon;
  }
}
