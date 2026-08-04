import memoizeOne from "memoize-one";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { join } from "lit/directives/join";
import { ensureArray } from "../common/array/ensure-array";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import {
  STRINGS_SEPARATOR_DOT,
  TIMESTAMP_STATE_DOMAINS,
} from "../common/const";
import { UNAVAILABLE, UNKNOWN } from "../data/entity/entity";
import {
  SENSOR_TIMESTAMP_DEVICE_CLASSES,
  SENSOR_DEVICE_CLASS_UPTIME,
} from "../data/sensor";
import type { UpdateEntity } from "../data/update";
import { computeUpdateStateDisplay } from "../data/update";
import "../panels/lovelace/components/hui-timestamp-display";
import type { HomeAssistant } from "../types";
import { computeDomain } from "../common/entity/compute_domain";

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

const TIMESTAMP_STATE_PROPS = ["last_updated", "last_changed"];

const TIMESTAMP_CONTENTS = [...TIMESTAMP_STATE_PROPS, "last_triggered"];

const TIMESTAMP_DOMAIN_CONTENTS = {
  calendar: ["start_time", "end_time"],
  input_datetime: ["timestamp"],
  sun: [
    "next_dawn",
    "next_dusk",
    "next_midnight",
    "next_noon",
    "next_rising",
    "next_setting",
  ],
};

export const stateContentHasTimestamp = (
  entityId?: string,
  stateObj?: HassEntity,
  content?: StateContent
): boolean => {
  const contentArray = ensureArray(content);
  if (content && contentArray.some((c) => TIMESTAMP_CONTENTS.includes(c))) {
    return true;
  }
  if (!entityId) {
    return false;
  }
  const domain = computeDomain(entityId);
  if (!content || contentArray.includes("state")) {
    if (TIMESTAMP_STATE_DOMAINS.has(domain)) {
      return true;
    }
    if (stateObj) {
      const sensorDeviceClass =
        domain === "sensor" ? stateObj.attributes.device_class : "";
      if (SENSOR_TIMESTAMP_DEVICE_CLASSES.includes(sensorDeviceClass)) {
        return true;
      }
    }
  }
  return (
    TIMESTAMP_DOMAIN_CONTENTS[domain] &&
    content &&
    contentArray.some((c) => TIMESTAMP_DOMAIN_CONTENTS[domain].includes(c))
  );
};

@customElement("state-display")
class StateDisplay extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: false }) public content?: StateContent;

  @property({ attribute: false }) public name?: string;

  @property({ attribute: false }) public timeFormat?: string;

  @property({ type: Boolean, attribute: "timestamp-tooltip" })
  public timestampTooltip = false;

  @property({ type: Boolean, attribute: "dash-unavailable" })
  public dashUnavailable?: boolean;

  protected createRenderRoot() {
    return this;
  }

  private _normalizeContent = memoizeOne(
    (content?: StateContent): StateContent | undefined =>
      content == null
        ? undefined
        : ensureArray(content).map((s) => {
            if (s === "last-updated") return "last_updated";
            if (s === "last-changed") return "last_changed";
            return s;
          })
  );

  private get _content(): StateContent {
    const domain = computeStateDomain(this.stateObj);
    return (
      this._normalizeContent(this.content) ??
      DEFAULT_STATE_CONTENT_DOMAINS[domain] ??
      "state"
    );
  }

  private _computeContent(
    content: string
  ): TemplateResult<1> | string | undefined {
    const stateObj = this.stateObj;
    const domain = computeStateDomain(stateObj);

    if (content === "state") {
      const noValue =
        stateObj.state === UNAVAILABLE || stateObj.state === UNKNOWN;
      if (this.dashUnavailable && noValue) {
        return "—";
      }
      if (
        (SENSOR_TIMESTAMP_DEVICE_CLASSES.includes(
          this.stateObj.attributes.device_class
        ) ||
          TIMESTAMP_STATE_DOMAINS.has(domain)) &&
        !noValue
      ) {
        return html`
          <hui-timestamp-display
            .hass=${this.hass}
            .ts=${new Date(stateObj.state)}
            .format=${
              this.timeFormat ||
              (this.stateObj.attributes.device_class ===
              SENSOR_DEVICE_CLASS_UPTIME
                ? "total"
                : "relative")
            }
            capitalize
          ></hui-timestamp-display>
        `;
      }

      return this.hass!.formatEntityState(stateObj);
    }
    if (content === "name" && this.name) {
      return html`${this.name}`;
    }
    if (content === "entity-id") {
      return stateObj.entity_id;
    }
    if (
      content === "device_name" ||
      content === "area_name" ||
      content === "floor_name"
    ) {
      const type = content.replace("_name", "") as "device" | "area" | "floor";
      return this.hass.formatEntityName(stateObj, { type }) || undefined;
    }

    let relativeDateTime: string | number | undefined;

    if (TIMESTAMP_STATE_PROPS.includes(content)) {
      relativeDateTime = stateObj[content];
    } else if (domain === "input_datetime" && content === "timestamp") {
      relativeDateTime = stateObj.attributes.timestamp * 1000;
    } else if (
      TIMESTAMP_CONTENTS.includes(content) ||
      TIMESTAMP_DOMAIN_CONTENTS[domain]?.includes(content)
    ) {
      relativeDateTime = stateObj.attributes[content];
    }

    if (relativeDateTime || relativeDateTime === 0) {
      return html`<hui-timestamp-display
        .hass=${this.hass}
        .ts=${new Date(relativeDateTime)}
        .format=${this.timeFormat}
        capitalize
        .tooltip=${this.timestampTooltip}
      ></hui-timestamp-display>`;
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

    return join(values, STRINGS_SEPARATOR_DOT);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-display": StateDisplay;
  }
}
