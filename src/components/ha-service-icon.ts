import { consume } from "@lit/context";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { Connection, HassConfig } from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { transform } from "../common/decorators/transform";
import { configContext, connectionContext } from "../data/context";
import {
  DEFAULT_SERVICE_ICON,
  FALLBACK_DOMAIN_ICONS,
  serviceIcon,
} from "../data/icons";
import "./ha-icon";
import "./ha-svg-icon";

@customElement("ha-service-icon")
export class HaServiceIcon extends LitElement {
  @property() public service?: string;

  @property() public icon?: string;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<{ config: HassConfig }, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _config?: HassConfig;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<{ connection: Connection }, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection?: Connection;

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
      changedProps.has("service") ||
      changedProps.has("_connection") ||
      changedProps.has("_config")
    ) {
      this._loadIcon();
    }
  }

  private async _loadIcon(): Promise<void> {
    if (this.icon || !this.service || !this._connection || !this._config) {
      this._resolvedIcon = undefined;
      return;
    }
    const request = ++this._iconRequest;
    const icon = await serviceIcon(
      this._connection,
      this._config,
      this.service
    );
    if (request === this._iconRequest) {
      this._resolvedIcon = icon || null;
    }
  }

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.service) {
      return nothing;
    }

    if (!this._connection || !this._config) {
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
    const domain = computeDomain(this.service!);

    return html`
      <ha-svg-icon
        .path=${FALLBACK_DOMAIN_ICONS[domain] || DEFAULT_SERVICE_ICON}
      ></ha-svg-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-icon": HaServiceIcon;
  }
}
