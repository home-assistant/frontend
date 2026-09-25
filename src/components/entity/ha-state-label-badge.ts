import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import { mdiAlert } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { arrayLiteralIncludes } from "../../common/array/literal-includes";
import secondsToDuration from "../../common/datetime/seconds_to_duration";
import {
  consumeEntityRegistryEntry,
  consumeLocalize,
} from "../../common/decorators/consume-context-entry";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { unitFromParts, valueFromParts } from "../../common/entity/value_parts";
import { FIXED_DOMAIN_STATES } from "../../common/entity/get_states";
import type { LocalizeFunc } from "../../common/translations/localize";
import { formattersContext } from "../../data/context";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity/entity";
import type { EntityRegistryDisplayEntry } from "../../data/entity/entity_registry";
import { timerTimeRemaining } from "../../data/timer";
import "../ha-label-badge";
import "../ha-state-icon";

// Define the domains whose states have special truncated strings
const TRUNCATED_DOMAINS = [
  "alarm_control_panel",
  "device_tracker",
  "person",
] as const satisfies readonly (keyof typeof FIXED_DOMAIN_STATES)[];

type TruncatedDomain = (typeof TRUNCATED_DOMAINS)[number];
type TruncatedKey = {
  [T in TruncatedDomain]: `${T}.${(typeof FIXED_DOMAIN_STATES)[T][number]}`;
}[TruncatedDomain];

const getTruncatedKey = (domainKey: string, stateKey: string) => {
  if (
    arrayLiteralIncludes(TRUNCATED_DOMAINS)(domainKey) &&
    arrayLiteralIncludes(FIXED_DOMAIN_STATES[domainKey])(stateKey)
  ) {
    return `${domainKey}.${stateKey}` as TruncatedKey;
  }
  return null;
};

@customElement("ha-state-label-badge")
export class HaStateLabelBadge extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters?: ContextType<typeof formattersContext>;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state()
  @consumeEntityRegistryEntry({ entityIdPath: ["state", "entity_id"] })
  private _entry?: EntityRegistryDisplayEntry;

  @property({ attribute: false }) public state?: HassEntity;

  @property() public name?: string;

  @property() public icon?: string;

  @property() public image?: string;

  @property({ attribute: "show-name", type: Boolean }) public showName = false;

  @state() private _timerTimeRemaining?: number;

  private _connected?: boolean;

  private _updateRemaining?: number;

  public connectedCallback(): void {
    super.connectedCallback();
    this._connected = true;
    this._startInterval(this.state);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._connected = false;
    this._clearInterval();
  }

  protected render(): TemplateResult {
    const entityState = this.state;

    if (!entityState) {
      return html`
        <ha-label-badge
          class="warning"
          label=${this._localize("state_badge.default.error")}
          description=${this._localize("state_badge.default.entity_not_found")}
        >
          <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>
        </ha-label-badge>
      `;
    }

    // Rendering priority inside badge:
    // 1. Icon directly defined in badge config
    // 2. Image directly defined in badge config
    // 3. Image taken from entity picture
    // 4. Icon determined via entity state
    // 5. Value string as fallback
    const domain = computeStateDomain(entityState);
    const entry = this._entry;

    const showIcon =
      this.icon || this._computeShowIcon(domain, entityState, entry);
    const image = this.icon
      ? ""
      : this.image
        ? this.image
        : entityState.attributes.entity_picture_local ||
          entityState.attributes.entity_picture;
    const value =
      !image && !showIcon
        ? this._computeValue(domain, entityState, entry)
        : undefined;

    return html`
      <ha-label-badge
        class=${classMap({
          [domain]: true,
          "has-unit_of_measurement":
            "unit_of_measurement" in entityState.attributes,
        })}
        .image=${image}
        .label=${this._computeLabel(
          domain,
          entityState,
          this._timerTimeRemaining
        )}
        .description=${
          this.showName
            ? (this.name ?? computeStateName(entityState))
            : undefined
        }
      >
        ${
          !image && showIcon
            ? html`<ha-state-icon
                .icon=${this.icon}
                .stateObj=${entityState}
              ></ha-state-icon>`
            : ""
        }
        ${
          value && !image && !showIcon
            ? html`<span class=${value && value.length > 4 ? "big" : ""}
                >${value}</span
              >`
            : ""
        }
      </ha-label-badge>
    `;
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (this._connected && changedProperties.has("state")) {
      this._startInterval(this.state);
    }
  }

  private _computeValue(
    domain: string,
    entityState: HassEntity,
    entry?: EntityRegistryDisplayEntry
  ) {
    switch (domain) {
      case "alarm_control_panel":
      case "binary_sensor":
      case "device_tracker":
      case "person":
      case "scene":
      case "sun":
      case "timer":
        return null;
      case "sensor":
        if (entry?.platform === "moon") {
          return null;
        }
        break;
      default:
        break;
    }
    if (entityState.state === UNAVAILABLE || entityState.state === UNKNOWN) {
      return "—";
    }
    if (!this._formatters) {
      return null;
    }
    return valueFromParts(
      this._formatters.formatEntityStateToParts(entityState)
    );
  }

  private _computeShowIcon(
    domain: string,
    entityState: HassEntity,
    entry?: EntityRegistryDisplayEntry
  ): boolean {
    if (entityState.state === UNAVAILABLE) {
      return false;
    }
    switch (domain) {
      case "alarm_control_panel":
      case "binary_sensor":
      case "device_tracker":
      case "person":
      case "scene":
      case "sun":
        return true;
      case "timer":
        return true;
      case "sensor":
        return entry?.platform === "moon";
      default:
        return false;
    }
  }

  private _computeLabel(
    domain: string,
    entityState: HassEntity,
    _timerTimeRemaining = 0
  ) {
    // For unavailable states or certain domains, use a special translation that is truncated to fit within the badge label
    if (entityState.state === UNAVAILABLE || entityState.state === UNKNOWN) {
      return this._localize(`state_badge.default.${entityState.state}`);
    }
    const domainStateKey = getTruncatedKey(domain, entityState.state);
    if (domainStateKey) {
      return this._localize(`state_badge.${domainStateKey}`);
    }
    // Person and device tracker state can be zone name
    if (domain === "person" || domain === "device_tracker") {
      return entityState.state;
    }
    if (domain === "timer") {
      return secondsToDuration(_timerTimeRemaining);
    }
    if (!this._formatters) {
      return null;
    }
    return (
      unitFromParts(this._formatters.formatEntityStateToParts(entityState)) ||
      null
    );
  }

  private _clearInterval() {
    if (this._updateRemaining) {
      clearInterval(this._updateRemaining);
      this._updateRemaining = undefined;
    }
  }

  private _startInterval(stateObj) {
    this._clearInterval();
    if (stateObj && computeStateDomain(stateObj) === "timer") {
      this._calculateTimerRemaining(stateObj);

      if (stateObj.state === "active") {
        this._updateRemaining = window.setInterval(
          () => this._calculateTimerRemaining(this.state),
          1000
        );
      }
    }
  }

  private _calculateTimerRemaining(stateObj) {
    this._timerTimeRemaining = timerTimeRemaining(stateObj);
  }

  static styles = css`
    :host {
      cursor: pointer;
    }
    .big {
      font-size: var(--ha-font-size-xs);
    }
    ha-label-badge {
      --ha-label-badge-color: var(--label-badge-red);
    }
    ha-label-badge.has-unit_of_measurement {
      --ha-label-badge-label-text-transform: none;
    }

    ha-label-badge.binary_sensor {
      --ha-label-badge-color: var(--label-badge-blue);
    }

    .red {
      --ha-label-badge-color: var(--label-badge-red);
    }

    .blue {
      --ha-label-badge-color: var(--label-badge-blue);
    }

    .green {
      --ha-label-badge-color: var(--label-badge-green);
    }

    .yellow {
      --ha-label-badge-color: var(--label-badge-yellow);
    }

    .grey {
      --ha-label-badge-color: var(--label-badge-grey);
    }

    .warning {
      --ha-label-badge-color: var(--label-badge-yellow);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-label-badge": HaStateLabelBadge;
  }
}
