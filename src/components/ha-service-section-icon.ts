import { consume } from "@lit/context";
import { initialState } from "@lit/task";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { Connection, HassConfig } from "home-assistant-js-websocket";
import { AsyncValueTask } from "../common/controllers/async-value-task";
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

  private _iconTask = new AsyncValueTask(this, {
    task: ([icon, connection, config, service, section]) => {
      if (icon || !connection || !config || !service || !section) {
        return initialState;
      }
      return serviceSectionIcon(connection, config, service, section);
    },
    args: () =>
      [
        this.icon,
        this._connection,
        this._config,
        this.service,
        this.section,
      ] as const,
  });

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

    if (!this._iconTask.resolved) {
      return nothing;
    }
    return this._iconTask.value
      ? html`<ha-icon .icon=${this._iconTask.value}></ha-icon>`
      : this._renderFallback();
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
