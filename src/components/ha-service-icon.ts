import { consume, type ContextType } from "@lit/context";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import { computeDomain } from "../common/entity/compute_domain";
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
  private _hassConfig?: ContextType<typeof configContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.service) {
      return nothing;
    }

    if (!this._connection || !this._hassConfig) {
      return this._renderFallback();
    }

    const icon = serviceIcon(
      this._connection.connection,
      this._hassConfig.config,
      this.service
    ).then((icn) => {
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
