import { consume } from "@lit/context";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
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

    const icon = serviceIcon(this._connection, this._config, this.service).then(
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
