import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { join } from "lit/directives/join";
import { ensureArray } from "../common/array/ensure-array";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/ha-relative-time";
import { isUnavailableState } from "../data/entity";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../data/sensor";
import type { UpdateEntity } from "../data/update";
import { computeUpdateStateDisplay } from "../data/update";
import "../panels/lovelace/components/hui-timestamp-display";
import type { HomeAssistant } from "../types";
import { computeDeviceName } from "../common/entity/compute_device_name";

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

  @property({ type: Boolean, attribute: "dash-unavailable" })
  public dashUnavailable?: boolean;

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
      if (this.dashUnavailable && isUnavailableState(stateObj.state)) {
        return "—";
      }
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

    // Resolve entity hierarchy once for all content types that need it
    const { deviceReg, areaReg, floorReg } = this._resolveEntityHierarchy(
      stateObj.entity_id
    );

    if (content === "name") {
      return html`${this.name || computeStateName(stateObj)}`;
    }
    if (content === "area") {
      return html`${areaReg?.name?.trim() || ""}`;
    }
    if (content === "device") {
      return html`${deviceReg ? computeDeviceName(deviceReg) : ""}`;
    }
    if (content === "floor") {
      return html`${floorReg?.name?.trim() || ""}`;
    }

    let relativeDateTime: string | Date | undefined;

    // Check last-changed for backwards compatibility
    if (content === "last_changed" || content === "last-changed") {
      relativeDateTime = stateObj.last_changed;
    }
    // Check last_updated for backwards compatibility
    if (content === "last_updated" || content === "last-updated") {
      relativeDateTime = stateObj.last_updated;
    }
    if (domain === "input_datetime" && content === "timestamp") {
      relativeDateTime = new Date(stateObj.attributes.timestamp * 1000);
    }

    if (
      content === "last_triggered" ||
      (domain === "calendar" &&
        (content === "start_time" || content === "end_time")) ||
      (domain === "sun" &&
        (content === "next_dawn" ||
          content === "next_dusk" ||
          content === "next_midnight" ||
          content === "next_noon" ||
          content === "next_rising" ||
          content === "next_setting"))
    ) {
      relativeDateTime = stateObj.attributes[content];
    }

    if (relativeDateTime) {
      return html`
        <ha-relative-time
          .hass=${this.hass}
          .datetime=${relativeDateTime}
          capitalize
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

    return join(values, " · ");
  }

  private _resolveEntityHierarchy(entityId: string) {
    const entityReg = this.hass.entities?.[entityId];
    const deviceReg = entityReg?.device_id
      ? this.hass.devices?.[entityReg.device_id]
      : undefined;
    const areaId = entityReg?.area_id || deviceReg?.area_id;
    const areaReg = areaId ? this.hass.areas?.[areaId] : undefined;
    const floorReg = areaReg?.floor_id
      ? this.hass.floors?.[areaReg.floor_id]
      : undefined;

    return {
      deviceReg,
      areaReg,
      floorReg,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-display": StateDisplay;
  }
}
