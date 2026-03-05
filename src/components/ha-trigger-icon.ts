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
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { computeDomain } from "../common/entity/compute_domain";
import { FALLBACK_DOMAIN_ICONS, triggerIcon } from "../data/icons";
import { mdiHomeAssistant } from "../resources/home-assistant-logo-svg";
import type { HomeAssistant } from "../types";
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
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger?: string;

  @property() public icon?: string;

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.trigger) {
      return nothing;
    }

    if (!this.hass) {
      return this._renderFallback();
    }

    const icon = triggerIcon(this.hass, this.trigger).then((icn) => {
      if (icn) {
        return html`<ha-icon .icon=${icn}></ha-icon>`;
      }
      return this._renderFallback();
    });

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
