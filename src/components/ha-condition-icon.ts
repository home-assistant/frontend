import { consume, type ContextType } from "@lit/context";
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
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import { computeDomain } from "../common/entity/compute_domain";
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
  @consume({ context: connectionContext, subscribe: true })
  protected _connection?: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  protected _config?: ContextType<typeof configContext>;

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.condition) {
      return nothing;
    }

    if (!this._connection || !this._config) {
      return this._renderFallback();
    }

    const icon = conditionIcon(
      this._connection.connection,
      this._config.config,
      this.condition
    ).then((icn) => {
      if (icn) {
        return html`<ha-icon .icon=${icn}></ha-icon>`;
      }
      return this._renderFallback();
    });

    return html`${until(icon)}`;
  }

  private _renderFallback() {
    const domain = computeDomain(this.condition!);

    return html`
      <ha-svg-icon
        .path=${CONDITION_ICONS[this.condition!] ||
        FALLBACK_DOMAIN_ICONS[domain]}
      ></ha-svg-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-condition-icon": HaConditionIcon;
  }
}
