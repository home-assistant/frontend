import { consume, type ContextType } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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

  // undefined: not resolved yet (render nothing, as the old `until` did).
  // null: resolved, but no icon found (render the fallback).
  @state() private _resolvedIcon?: string | null;

  // Resolving the icon in render() created a new promise (and a `until()`
  // directive chain) on every render. Resolve it into state instead, guarded so
  // only the latest resolution wins.
  private _iconRequest = 0;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (
      changedProps.has("icon") ||
      changedProps.has("domain") ||
      changedProps.has("deviceClass") ||
      changedProps.has("state") ||
      changedProps.has("_connection") ||
      changedProps.has("_hassConfig")
    ) {
      this._loadIcon();
    }
  }

  private async _loadIcon(): Promise<void> {
    if (this.icon || !this.domain || !this._connection || !this._hassConfig) {
      this._resolvedIcon = undefined;
      return;
    }
    const request = ++this._iconRequest;
    const icon = await domainIcon(
      this._connection.connection,
      this._hassConfig.config,
      this.domain,
      this.deviceClass,
      this.state
    );
    if (request === this._iconRequest) {
      this._resolvedIcon = icon || null;
    }
  }

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

    if (this._resolvedIcon === undefined) {
      return nothing;
    }

    if (this._resolvedIcon) {
      return html`<ha-icon .icon=${this._resolvedIcon}></ha-icon>`;
    }

    return this._renderFallback();
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
