import { consume } from "@lit/context";
import { initialState } from "@lit/task";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { Connection, HassConfig } from "home-assistant-js-websocket";
import { AsyncValueTask } from "../common/controllers/async-value-task";
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

  private _iconTask = new AsyncValueTask(this, {
    task: ([icon, connection, config, service]) => {
      if (icon || !connection || !config || !service) {
        return initialState;
      }
      return serviceIcon(connection, config, service);
    },
    args: () =>
      [this.icon, this._connection, this._config, this.service] as const,
  });

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.service) {
      return nothing;
    }

    // Render the static icon while the icon is being resolved, so the icon
    // does not pop in.
    if (!this._connection || !this._config || !this._iconTask.resolved) {
      return this._renderFallback();
    }
    return this._iconTask.value
      ? html`<ha-icon .icon=${this._iconTask.value}></ha-icon>`
      : this._renderFallback();
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
