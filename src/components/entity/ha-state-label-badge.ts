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
import { domainIcon } from "../../common/entity/domain_icon";
import { stateIcon } from "../../common/entity/state_icon";
import { timerTimeRemaining } from "../../data/timer";
import { formatNumber } from "../../common/string/format_number";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { HomeAssistant } from "../../types";
import "../ha-label-badge";

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
          label="${this.hass!.localize("state_badge.default.error")}"
          icon="hass:alert"
          description="${this.hass!.localize(
            "state_badge.default.entity_not_found"
          )}"
        ></ha-label-badge>
      `;
    }

    const domain = computeStateDomain(entityState);

    return html`
      <ha-label-badge
        class="${classMap({
          [domain]: true,
          "has-unit_of_measurement":
            "unit_of_measurement" in entityState.attributes,
        })}"
        .value="${this._computeValue(domain, entityState)}"
        .icon="${this.icon
          ? this.icon
          : this._computeIcon(domain, entityState)}"
        .image="${this.icon
          ? ""
          : this.image
          ? this.image
          : entityState.attributes.entity_picture_local ||
            entityState.attributes.entity_picture}"
        .label="${this._computeLabel(
          domain,
          entityState,
          this._timerTimeRemaining
        )}"
        .description="${this.name ? this.name : computeStateName(entityState)}"
      ></ha-label-badge>
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
        return entityState.attributes.device_class === "moon__phase"
          ? null
          : entityState.state === UNKNOWN
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
        if (entityState.state === "pending") {
          return "hass:clock-fast";
        }
        if (entityState.state === "armed_away") {
          return "hass:nature";
        }
        if (entityState.state === "armed_home") {
          return "hass:home-variant";
        }
        if (entityState.state === "armed_night") {
          return "hass:weather-night";
        }
        if (entityState.state === "armed_custom_bypass") {
          return "hass:shield-home";
        }
        if (entityState.state === "triggered") {
          return "hass:alert-circle";
        }
        // state == 'disarmed'
        return domainIcon(domain, entityState);
      case "binary_sensor":
      case "device_tracker":
      case "updater":
      case "person":
      case "sun":
        return stateIcon(entityState);
      case "timer":
        return entityState.state === "active"
          ? "hass:timer-outline"
          : "hass:timer-off-outline";
      default:
        return entityState?.attributes.device_class === "moon__phase"
          ? stateIcon(entityState)
          : null;
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
