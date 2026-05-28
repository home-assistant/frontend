import {
  mdiAvTimer,
  mdiCalendar,
  mdiClockOutline,
  mdiCodeBraces,
  mdiDevices,
  mdiFormatListBulleted,
  mdiGestureDoubleTap,
  mdiMapMarker,
  mdiMapMarkerRadius,
  mdiMessageAlert,
  mdiMicrophoneMessage,
  mdiNfcVariant,
  mdiNumeric,
  mdiStateMachine,
  mdiSwapHorizontal,
  mdiWeatherSunny,
  mdiWebhook,
} from "@mdi/js";
import { consume } from "@lit/context";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import type { Connection, HassConfig } from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { transform } from "../common/decorators/transform";
import { configContext, connectionContext } from "../data/context";
import { FALLBACK_DOMAIN_ICONS, triggerIcon } from "../data/icons";
import { mdiHomeAssistant } from "../resources/home-assistant-logo-svg";
import "./ha-icon";
import "./ha-svg-icon";

export const TRIGGER_ICONS = {
  calendar: mdiCalendar,
  device: mdiDevices,
  event: mdiGestureDoubleTap,
  state: mdiStateMachine,
  geo_location: mdiMapMarker,
  homeassistant: mdiHomeAssistant,
  mqtt: mdiSwapHorizontal,
  numeric_state: mdiNumeric,
  sun: mdiWeatherSunny,
  conversation: mdiMicrophoneMessage,
  tag: mdiNfcVariant,
  template: mdiCodeBraces,
  time: mdiClockOutline,
  time_pattern: mdiAvTimer,
  webhook: mdiWebhook,
  persistent_notification: mdiMessageAlert,
  zone: mdiMapMarkerRadius,
  list: mdiFormatListBulleted,
};

@customElement("ha-trigger-icon")
export class HaTriggerIcon extends LitElement {
  @property() public trigger?: string;

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

    if (!this.trigger) {
      return nothing;
    }

    if (!this._connection || !this._config) {
      return this._renderFallback();
    }

    const icon = triggerIcon(this._connection, this._config, this.trigger).then(
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
    const domain = computeDomain(this.trigger!);

    return html`
      <ha-svg-icon
        .path=${TRIGGER_ICONS[this.trigger!] || FALLBACK_DOMAIN_ICONS[domain]}
      ></ha-svg-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-trigger-icon": HaTriggerIcon;
  }
}
