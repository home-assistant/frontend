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
  "timer_status",
  "install_status",
] as const;

export const STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS: Record<
  (typeof STATE_DISPLAY_SPECIAL_CONTENT)[number],
  string[]
> = {
  timer_status: ["timer"],
  install_status: ["update"],
};

@customElement("state-display")
class StateDisplay extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: false }) public content: string | string[] = "state";

  protected createRenderRoot() {
    return this;
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

    if (STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS[content]?.includes(domain)) {
      if (content === "install_status") {
        return html`
          ${computeUpdateStateDisplay(stateObj as UpdateEntity, this.hass!)}
        `;
      }
      if (content === "timer_status") {
        import("./state-display-timer");
        return html`
          <state-display-timer
            .hass=${this.hass}
            .stateObj=${stateObj}
          ></state-display-timer>
        `;
      }
    }

    if (stateObj.attributes[content] == null) {
      return undefined;
    }
    return this.hass!.formatEntityAttributeValue(stateObj, content);
  }

  protected render() {
    const stateObj = this.stateObj;
    const contents = ensureArray(this.content);

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
