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
import secondsToDuration from "../../common/datetime/seconds_to_duration";
import { computeStateDisplay } from "../../common/entity/compute_state_display";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { stateIcon } from "../../common/entity/state_icon";
import { formatNumber } from "../../common/number/format_number";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { timerTimeRemaining } from "../../data/timer";
import { HomeAssistant } from "../../types";
import "../ha-label-badge";
import "../ha-icon";

@customElement("ha-state-label-badge")
export class HaStateLabelBadge extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public state?: HassEntity;

  @property() public name?: string;

  @property() public icon?: string;

  @property() public image?: string;

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

    const domain = computeStateDomain(entityState);

    const value = this._computeValue(domain, entityState);
    const icon = this.icon ? this.icon : this._computeIcon(domain, entityState);
    const image = icon
      ? ""
      : this.image
      ? this.image
      : entityState.attributes.entity_picture_local ||
        entityState.attributes.entity_picture;

    // Rendering priority inside badge:
    // 1. Icon
    // 2. Image
    // 3. Value string as fallback
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
        .description=${this.name ?? computeStateName(entityState)}
      >
        ${!image && icon ? html`<ha-icon .icon=${icon}></ha-icon>` : ""}
        ${value && !icon && !image
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

  private _computeValue(domain: string, entityState: HassEntity) {
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
        if (entityState.attributes.device_class === "moon__phase") {
          return null;
        }
      // eslint-disable-next-line: disable=no-fallthrough
      default:
        return entityState.state === UNKNOWN ||
          entityState.state === UNAVAILABLE
          ? "-"
          : entityState.attributes.unit_of_measurement
          ? formatNumber(entityState.state, this.hass!.locale)
          : computeStateDisplay(
              this.hass!.localize,
              entityState,
              this.hass!.locale
            );
    }
  }

  private _computeIcon(domain: string, entityState: HassEntity) {
    if (entityState.state === UNAVAILABLE) {
      return null;
    }
    switch (domain) {
      case "alarm_control_panel":
      case "binary_sensor":
      case "device_tracker":
      case "updater":
      case "person":
      case "scene":
      case "sun":
        return stateIcon(entityState);
      case "timer":
        return entityState.state === "active"
          ? "hass:timer-outline"
          : "hass:timer-off-outline";
      case "sensor":
        return entityState.attributes.device_class === "moon__phase"
          ? stateIcon(entityState)
          : null;
      default:
        return null;
    }
  }

  private _computeLabel(domain, entityState, _timerTimeRemaining) {
    if (
      entityState.state === UNAVAILABLE ||
      ["device_tracker", "alarm_control_panel", "person"].includes(domain)
    ) {
      // Localize the state with a special state_badge namespace, which has variations of
      // the state translations that are truncated to fit within the badge label. Translations
      // are only added for device_tracker, alarm_control_panel and person.
      return (
        this.hass!.localize(`state_badge.${domain}.${entityState.state}`) ||
        this.hass!.localize(`state_badge.default.${entityState.state}`) ||
        entityState.state
      );
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
        --ha-label-badge-color: var(--label-badge-red, #df4c1e);
      }
      ha-label-badge.has-unit_of_measurement {
        --ha-label-badge-label-text-transform: none;
      }

      ha-label-badge.binary_sensor,
      ha-label-badge.updater {
        --ha-label-badge-color: var(--label-badge-blue, #039be5);
      }

      .red {
        --ha-label-badge-color: var(--label-badge-red, #df4c1e);
      }

      .blue {
        --ha-label-badge-color: var(--label-badge-blue, #039be5);
      }

      .green {
        --ha-label-badge-color: var(--label-badge-green, #0da035);
      }

      .yellow {
        --ha-label-badge-color: var(--label-badge-yellow, #f4b400);
      }

      .grey {
        --ha-label-badge-color: var(--label-badge-grey, var(--paper-grey-500));
      }

      .warning {
        --ha-label-badge-color: var(--label-badge-yellow, #f4b400);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-label-badge": HaStateLabelBadge;
  }
}
