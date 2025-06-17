import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import {
  DEFAULT_DOMAIN_ICON,
  domainIcon,
  FALLBACK_DOMAIN_ICONS,
} from "../data/icons";
import type { HomeAssistant } from "../types";
import { brandsUrl } from "../util/brands-url";
import "./ha-icon";

@customElement("ha-domain-icon")
export class HaDomainIcon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public domain?: string;

  @property({ type: String, attribute: "device-class" })
  public deviceClass?: string;

  @property({ type: String, attribute: "state" }) public state?: string;

  @property() public icon?: string;

  @property({ attribute: "brand-fallback", type: Boolean })
  public brandFallback?: boolean;

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.domain) {
      return nothing;
    }

    if (!this.hass) {
      return this._renderFallback();
    }

    const icon = domainIcon(
      this.hass,
      this.domain,
      this.deviceClass,
      this.state
    ).then((icn) => {
      if (icn) {
        return html`<ha-icon .icon=${icn}></ha-icon>`;
      }
      return this._renderFallback();
    });

    return html`${until(icon)}`;
  }

  private _renderFallback() {
    if (this.domain && this.domain in FALLBACK_DOMAIN_ICONS) {
      return html`
        <ha-svg-icon .path=${FALLBACK_DOMAIN_ICONS[this.domain!]}></ha-svg-icon>
      `;
    }
    if (this.brandFallback) {
      const image = brandsUrl({
        domain: this.domain!,
        type: "icon",
        darkOptimized: this.hass.themes?.darkMode,
      });
      return html`
        <img
          alt=""
          src=${image}
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
        />
      `;
    }
    return html`<ha-svg-icon .path=${DEFAULT_DOMAIN_ICON}></ha-svg-icon>`;
  }

  static styles = css`
    img {
      width: var(--mdc-icon-size, 24px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-domain-icon": HaDomainIcon;
  }
}
