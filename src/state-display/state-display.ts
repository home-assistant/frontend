import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { ensureArray } from "../common/array/ensure-array";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import "../components/ha-relative-time";
import { isUnavailableState } from "../data/entity";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../data/sensor";
import { computeUpdateStateDisplay, UpdateEntity } from "../data/update";
import "../panels/lovelace/components/hui-timestamp-display";
import type { HomeAssistant } from "../types";

const TIMESTAMP_STATE_DOMAINS = ["button", "input_button", "scene"];

export const STATE_DISPLAY_SPECIAL_CONTENT = [
  "remaining_time",
  "install_status",
] as const;

// Special handling of state attributes per domain
export const STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS: Record<
  string,
  (typeof STATE_DISPLAY_SPECIAL_CONTENT)[number][]
> = {
  timer: ["remaining_time"],
  update: ["install_status"],
};

// Attributes that should not be shown if their value is 0 */
export const HIDDEN_ZERO_ATTRIBUTES_DOMAINS: Record<string, string[]> = {
  valve: ["current_position"],
  cover: ["current_position"],
  fan: ["percentage"],
  light: ["brightness"],
};

type StateContent = string | string[];

export const DEFAULT_STATE_CONTENT_DOMAINS: Record<string, StateContent> = {
  climate: ["state", "current_temperature"],
  cover: ["state", "current_position"],
  fan: "percentage",
  humidifier: ["state", "current_humidity"],
  light: "brightness",
  timer: "remaining_time",
  update: "install_status",
  valve: ["state", "current_position"],
};

@customElement("state-display")
class StateDisplay extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: false }) public content?: StateContent;

  @property({ attribute: false }) public name?: string;

  protected createRenderRoot() {
    return this;
  }

  private get _content(): StateContent {
    const domain = computeStateDomain(this.stateObj);
    return this.content ?? DEFAULT_STATE_CONTENT_DOMAINS[domain] ?? "state";
  }

  private _computeContent(
    content: string
  ): TemplateResult<1> | string | undefined {
    const stateObj = this.stateObj;
    const domain = computeStateDomain(stateObj);

    if (content === "state") {
      if (
        (stateObj.attributes.device_class === SENSOR_DEVICE_CLASS_TIMESTAMP ||
          TIMESTAMP_STATE_DOMAINS.includes(domain)) &&
        !isUnavailableState(stateObj.state)
      ) {
        return html`
          <hui-timestamp-display
            .hass=${this.hass}
            .ts=${new Date(stateObj.state)}
            format="relative"
            capitalize
          ></hui-timestamp-display>
        `;
      }

      return this.hass!.formatEntityState(stateObj);
    }
    if (content === "name") {
      return html`${this.name || stateObj.attributes.friendly_name}`;
    }
    // Check last-changed for backwards compatibility
    if (content === "last_changed" || content === "last-changed") {
      return html`
        <ha-relative-time
          .hass=${this.hass}
          .datetime=${stateObj.last_changed}
        ></ha-relative-time>
      `;
    }
    // Check last_updated for backwards compatibility
    if (content === "last_updated" || content === "last-updated") {
      return html`
        <ha-relative-time
          .hass=${this.hass}
          .datetime=${stateObj.last_updated}
        ></ha-relative-time>
      `;
    }
    if (content === "last_triggered") {
      return html`
        <ha-relative-time
          .hass=${this.hass}
          .datetime=${stateObj.attributes.last_triggered}
        ></ha-relative-time>
      `;
    }

    const specialContent = (STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS[domain] ??
      []) as string[];

    if (specialContent.includes(content)) {
      if (content === "install_status") {
        return html`
          ${computeUpdateStateDisplay(stateObj as UpdateEntity, this.hass!)}
        `;
      }
      if (content === "remaining_time") {
        import("./ha-timer-remaining-time");
        return html`
          <ha-timer-remaining-time
            .hass=${this.hass}
            .stateObj=${stateObj}
          ></ha-timer-remaining-time>
        `;
      }
    }

    const attribute = stateObj.attributes[content];

    if (
      attribute == null ||
      (HIDDEN_ZERO_ATTRIBUTES_DOMAINS[domain]?.includes(content) && !attribute)
    ) {
      return undefined;
    }
    return this.hass!.formatEntityAttributeValue(stateObj, content);
  }

  protected render() {
    const stateObj = this.stateObj;
    const contents = ensureArray(this._content);

    const values = contents
      .map((content) => this._computeContent(content))
      .filter(Boolean);

    if (!values.length) {
      return html`${this.hass!.formatEntityState(stateObj)}`;
    }

    return html`
      ${values.map(
        (value, index, array) =>
          html`${value}${index < array.length - 1 ? " ⸱ " : nothing}`
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-display": StateDisplay;
  }
}
