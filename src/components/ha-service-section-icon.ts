import { consume } from "@lit/context";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import type { Connection, HassConfig } from "home-assistant-js-websocket";
import { transform } from "../common/decorators/transform";
import { configContext, connectionContext } from "../data/context";
import { serviceSectionIcon } from "../data/icons";
import "./ha-icon";
import "./ha-svg-icon";

@customElement("ha-service-section-icon")
export class HaServiceSectionIcon extends LitElement {
  @property() public service?: string;

  @property() public section?: string;

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

    if (!this.service || !this.section) {
      return nothing;
    }

    if (!this._connection || !this._config) {
      return this._renderFallback();
    }

    const icon = serviceSectionIcon(
      this._connection,
      this._config,
      this.service,
      this.section
    ).then((icn) => {
      if (icn) {
        return html`<ha-icon .icon=${icn}></ha-icon>`;
      }
      return this._renderFallback();
    });

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
