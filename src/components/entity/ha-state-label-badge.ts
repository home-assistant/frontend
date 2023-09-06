import { mdiAlert } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { arrayLiteralIncludes } from "../../common/array/literal-includes";
import secondsToDuration from "../../common/datetime/seconds_to_duration";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { FIXED_DOMAIN_STATES } from "../../common/entity/get_states";
import {
  formatNumber,
  getNumberFormatOptions,
  isNumericState,
} from "../../common/number/format_number";
import { isUnavailableState, UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import { timerTimeRemaining } from "../../data/timer";
import { HomeAssistant } from "../../types";
import "../ha-label-badge";
import "../ha-state-icon";

// Define the domains whose states have special truncated strings
const TRUNCATED_DOMAINS = [
  "alarm_control_panel",
  "device_tracker",
  "person",
] as const satisfies ReadonlyArray<keyof typeof FIXED_DOMAIN_STATES>;

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
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public state?: HassEntity;

  @property() public name?: string;

  @property() public icon?: string;

  @property() public image?: string;

  @property() public showName?: boolean;

  @state() private _timerTimeRemaining?: number;

  private _connected?: boolean;

  private _updateRemaining?: number;

  public connectedCallback(): void {
    super.connectedCallback();
    this._connected = true;
    this.startInterval(this.state);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._connected = false;
    this.clearInterval();
  }

  protected render(): TemplateResult {
    const entityState = this.state;

    if (!entityState) {
      return html`
        <ha-label-badge
          class="warning"
          label=${this.hass!.localize("state_badge.default.error")}
          description=${this.hass!.localize(
            "state_badge.default.entity_not_found"
          )}
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
    const entry = this.hass?.entities[entityState.entity_id];

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
        .description=${this.showName === false
          ? undefined
          : this.name ?? computeStateName(entityState)}
      >
        ${!image && showIcon
          ? html`<ha-state-icon
              .icon=${this.icon}
              .state=${entityState}
            ></ha-state-icon>`
          : ""}
        ${value && !image && !showIcon
          ? html`<span class=${value && value.length > 4 ? "big" : ""}
              >${value}</span
            >`
          : ""}
      </ha-label-badge>
    `;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (this._connected && changedProperties.has("state")) {
      this.startInterval(this.state);
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
      case "updater":
        return null;
      // @ts-expect-error we don't break and go to default
      case "sensor":
        if (entry?.platform === "moon") {
          return null;
        }
      // eslint-disable-next-line: disable=no-fallthrough
      default:
        return entityState.state === UNKNOWN ||
          entityState.state === UNAVAILABLE
          ? "—"
          : isNumericState(entityState)
          ? formatNumber(
              entityState.state,
              this.hass!.locale,
              getNumberFormatOptions(entityState, entry)
            )
          : this.hass!.formatEntityState(entityState);
    }
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
      case "updater":
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
    if (isUnavailableState(entityState.state)) {
      return this.hass!.localize(`state_badge.default.${entityState.state}`);
    }
    const domainStateKey = getTruncatedKey(domain, entityState.state);
    if (domainStateKey) {
      return this.hass!.localize(`state_badge.${domainStateKey}`);
    }
    // Person and device tracker state can be zone name
    if (domain === "person" || domain === "device_tracker") {
      return entityState.state;
    }
    if (domain === "timer") {
      return secondsToDuration(_timerTimeRemaining);
    }
    return entityState.attributes.unit_of_measurement || null;
  }

  private clearInterval() {
    if (this._updateRemaining) {
      clearInterval(this._updateRemaining);
      this._updateRemaining = undefined;
    }
  }

  private startInterval(stateObj) {
    this.clearInterval();
    if (stateObj && computeStateDomain(stateObj) === "timer") {
      this.calculateTimerRemaining(stateObj);

      if (stateObj.state === "active") {
        this._updateRemaining = window.setInterval(
          () => this.calculateTimerRemaining(this.state),
          1000
        );
      }
    }
  }

  private calculateTimerRemaining(stateObj) {
    this._timerTimeRemaining = timerTimeRemaining(stateObj);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        cursor: pointer;
      }
      .big {
        font-size: 70%;
      }
      ha-label-badge {
        --ha-label-badge-color: var(--label-badge-red);
      }
      ha-label-badge.has-unit_of_measurement {
        --ha-label-badge-label-text-transform: none;
      }

      ha-label-badge.binary_sensor,
      ha-label-badge.updater {
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-label-badge": HaStateLabelBadge;
  }
}
