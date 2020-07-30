import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import secondsToDuration from "../../common/datetime/seconds_to_duration";
import { computeStateDisplay } from "../../common/entity/compute_state_display";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { domainIcon } from "../../common/entity/domain_icon";
import { stateIcon } from "../../common/entity/state_icon";
import { timerTimeRemaining } from "../../common/entity/timer_time_remaining";
import { HomeAssistant } from "../../types";
import "../ha-label-badge";

@customElement("ha-state-label-badge")
export class HaStateLabelBadge extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public state?: HassEntity;

  @property() public name?: string;

  @property() public icon?: string;

  @property() public image?: string;

  @internalProperty() private _timerTimeRemaining?: number;

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
    const state = this.state;

    if (!state) {
      return html`
        <ha-label-badge
          class="warning"
          label="${this.hass!.localize("state_badge.default.error")}"
          icon="hass:alert"
          description="${this.hass!.localize(
            "state_badge.default.entity_not_found"
          )}"
        ></ha-label-badge>
      `;
    }

    const domain = computeStateDomain(state);

    return html`
      <ha-label-badge
        class="${classMap({
          [domain]: true,
          "has-unit_of_measurement": "unit_of_measurement" in state.attributes,
        })}"
        .value="${this._computeValue(domain, state)}"
        .icon="${this.icon ? this.icon : this._computeIcon(domain, state)}"
        .image="${this.icon
          ? ""
          : this.image
          ? this.image
          : state.attributes.entity_picture_local || state.attributes.entity_picture}"
        .label="${this._computeLabel(domain, state, this._timerTimeRemaining)}"
        .description="${this.name ? this.name : computeStateName(state)}"
      ></ha-label-badge>
    `;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (this._connected && changedProperties.has("state")) {
      this.startInterval(this.state);
    }
  }

  private _computeValue(domain: string, state: HassEntity) {
    switch (domain) {
      case "binary_sensor":
      case "device_tracker":
      case "person":
      case "updater":
      case "sun":
      case "alarm_control_panel":
      case "timer":
        return null;
      case "sensor":
      default:
        return state.state === "unknown"
          ? "-"
          : state.attributes.unit_of_measurement
          ? state.state
          : computeStateDisplay(
              this.hass!.localize,
              state,
              this.hass!.language
            );
    }
  }

  private _computeIcon(domain: string, state: HassEntity) {
    if (state.state === "unavailable") {
      return null;
    }
    switch (domain) {
      case "alarm_control_panel":
        if (state.state === "pending") {
          return "hass:clock-fast";
        }
        if (state.state === "armed_away") {
          return "hass:nature";
        }
        if (state.state === "armed_home") {
          return "hass:home-variant";
        }
        if (state.state === "armed_night") {
          return "hass:weather-night";
        }
        if (state.state === "armed_custom_bypass") {
          return "hass:shield-home";
        }
        if (state.state === "triggered") {
          return "hass:alert-circle";
        }
        // state == 'disarmed'
        return domainIcon(domain, state.state);
      case "binary_sensor":
      case "device_tracker":
      case "updater":
      case "person":
        return stateIcon(state);
      case "sun":
        return state.state === "above_horizon"
          ? domainIcon(domain)
          : "hass:brightness-3";
      case "timer":
        return state.state === "active"
          ? "hass:timer-outline"
          : "hass:timer-off-outline";
      default:
        return null;
    }
  }

  private _computeLabel(domain, state, _timerTimeRemaining) {
    if (
      state.state === "unavailable" ||
      ["device_tracker", "alarm_control_panel", "person"].includes(domain)
    ) {
      // Localize the state with a special state_badge namespace, which has variations of
      // the state translations that are truncated to fit within the badge label. Translations
      // are only added for device_tracker, alarm_control_panel and person.
      return (
        this.hass!.localize(`state_badge.${domain}.${state.state}`) ||
        this.hass!.localize(`state_badge.default.${state.state}`) ||
        state.state
      );
    }
    if (domain === "timer") {
      return secondsToDuration(_timerTimeRemaining);
    }
    return state.attributes.unit_of_measurement || null;
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

  static get styles(): CSSResult {
    return css`
      :host {
        cursor: pointer;
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
        --ha-label-badge-color: var(--label-badge-yellow, #fce588);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-label-badge": HaStateLabelBadge;
  }
}
