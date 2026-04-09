import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import { configContext, connectionContext, uiContext } from "../data/context";
import {
  DEFAULT_DOMAIN_ICON,
  domainIcon,
  FALLBACK_DOMAIN_ICONS,
} from "../data/icons";
import { brandsUrl } from "../util/brands-url";
import "./ha-icon";

@customElement("ha-domain-icon")
export class HaDomainIcon extends LitElement {
  @property() public domain?: string;

  @property({ attribute: false }) public deviceClass?: string;

  @property({ attribute: false }) public state?: string;

  @property() public icon?: string;

  @property({ attribute: "brand-fallback", type: Boolean })
  public brandFallback?: boolean;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig?: ContextType<typeof configContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: uiContext, subscribe: true })
  private _hassUi?: ContextType<typeof uiContext>;

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.domain) {
      return nothing;
    }

    if (!this._connection || !this._hassConfig) {
      return this._renderFallback();
    }

    const icon = domainIcon(
      this._connection.connection,
      this._hassConfig.config,
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
      const image = brandsUrl(
        {
          domain: this.domain!,
          type: "icon",
          darkOptimized: this._hassUi?.themes.darkMode,
        },
        this._hassConfig?.auth.data.hassUrl
      );
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
