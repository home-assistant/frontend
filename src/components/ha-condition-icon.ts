import {
  mdiAmpersand,
  mdiClockOutline,
  mdiCodeBraces,
  mdiDevices,
  mdiGateOr,
  mdiIdentifier,
  mdiMapMarkerRadius,
  mdiNotEqualVariant,
  mdiNumeric,
  mdiStateMachine,
  mdiWeatherSunny,
} from "@mdi/js";
import { consume } from "@lit/context";
import { initialState } from "@lit/task";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HassConfig, Connection } from "home-assistant-js-websocket";
import { AsyncValueTask } from "../common/controllers/async-value-task";
import { computeDomain } from "../common/entity/compute_domain";
import { transform } from "../common/decorators/transform";
import { configContext, connectionContext } from "../data/context";
import { conditionIcon, FALLBACK_DOMAIN_ICONS } from "../data/icons";
import "./ha-icon";
import "./ha-svg-icon";

export const CONDITION_ICONS = {
  device: mdiDevices,
  and: mdiAmpersand,
  or: mdiGateOr,
  not: mdiNotEqualVariant,
  state: mdiStateMachine,
  numeric_state: mdiNumeric,
  sun: mdiWeatherSunny,
  template: mdiCodeBraces,
  time: mdiClockOutline,
  trigger: mdiIdentifier,
  zone: mdiMapMarkerRadius,
};

@customElement("ha-condition-icon")
export class HaConditionIcon extends LitElement {
  @property() public condition?: string;

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
    task: ([icon, connection, config, condition]) => {
      if (icon || !connection || !config || !condition) {
        return initialState;
      }
      return conditionIcon(connection, config, condition);
    },
    args: () =>
      [this.icon, this._connection, this._config, this.condition] as const,
  });

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.condition) {
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
    const domain = computeDomain(this.condition!);

    return html`
      <ha-svg-icon
        .path=${
          CONDITION_ICONS[this.condition!] || FALLBACK_DOMAIN_ICONS[domain]
        }
      ></ha-svg-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-condition-icon": HaConditionIcon;
  }
}
