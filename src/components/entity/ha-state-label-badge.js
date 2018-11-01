import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../ha-label-badge";

import computeStateDomain from "../../common/entity/compute_state_domain";
import computeStateName from "../../common/entity/compute_state_name";
import domainIcon from "../../common/entity/domain_icon";
import stateIcon from "../../common/entity/state_icon";
import timerTimeRemaining from "../../common/entity/timer_time_remaining";
import attributeClassNames from "../../common/entity/attribute_class_names";
import secondsToDuration from "../../common/datetime/seconds_to_duration";

import EventsMixin from "../../mixins/events-mixin";
import LocalizeMixin from "../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaStateLabelBadge extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      :host {
        cursor: pointer;
      }

      ha-label-badge {
        --ha-label-badge-color: var(--label-badge-red, #DF4C1E);
      }
      ha-label-badge.has-unit_of_measurement {
        --ha-label-badge-label-text-transform: none;
      }

      ha-label-badge.binary_sensor,
      ha-label-badge.updater {
        --ha-label-badge-color: var(--label-badge-blue, #039be5);
      }

      .red {
        --ha-label-badge-color: var(--label-badge-red, #DF4C1E);
      }

      .blue {
        --ha-label-badge-color: var(--label-badge-blue, #039be5);
      }

      .green {
        --ha-label-badge-color: var(--label-badge-green, #0DA035);
      }

      .yellow {
        --ha-label-badge-color: var(--label-badge-yellow, #f4b400);
      }

      .grey {
        --ha-label-badge-color: var(--label-badge-grey, var(--paper-grey-500));
      }
    </style>

    <ha-label-badge class$="[[computeClassNames(state)]]" value="[[computeValue(localize, state)]]" icon="[[computeIcon(state)]]" image="[[computeImage(state)]]" label="[[computeLabel(localize, state, _timerTimeRemaining)]]" description="[[computeDescription(state)]]"></ha-label-badge>
`;
  }

  static get properties() {
    return {
      hass: Object,
      state: {
        type: Object,
        observer: "stateChanged",
      },
      _timerTimeRemaining: {
        type: Number,
        value: 0,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.startInterval(this.state);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearInterval();
  }

  ready() {
    super.ready();
    this.addEventListener("click", (ev) => this.badgeTap(ev));
  }

  badgeTap(ev) {
    ev.stopPropagation();
    this.fire("hass-more-info", { entityId: this.state.entity_id });
  }

  computeClassNames(state) {
    const classes = [computeStateDomain(state)];
    classes.push(attributeClassNames(state, ["unit_of_measurement"]));
    return classes.join(" ");
  }

  computeValue(localize, state) {
    const domain = computeStateDomain(state);
    switch (domain) {
      case "binary_sensor":
      case "device_tracker":
      case "updater":
      case "sun":
      case "alarm_control_panel":
      case "timer":
        return null;
      case "sensor":
      default:
        return state.state === "unknown"
          ? "-"
          : localize(`component.${domain}.state.${state.state}`) || state.state;
    }
  }

  computeIcon(state) {
    if (state.state === "unavailable") {
      return null;
    }
    const domain = computeStateDomain(state);
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
          return "hass:security-home";
        }
        if (state.state === "triggered") {
          return "hass:alert-circle";
        }
        // state == 'disarmed'
        return domainIcon(domain, state.state);
      case "binary_sensor":
      case "device_tracker":
      case "updater":
        return stateIcon(state);
      case "sun":
        return state.state === "above_horizon"
          ? domainIcon(domain)
          : "hass:brightness-3";
      case "timer":
        return state.state === "active" ? "hass:timer" : "hass:timer-off";
      default:
        return null;
    }
  }

  computeImage(state) {
    return state.attributes.entity_picture || null;
  }

  computeLabel(localize, state, _timerTimeRemaining) {
    const domain = computeStateDomain(state);
    if (
      state.state === "unavailable" ||
      ["device_tracker", "alarm_control_panel"].includes(domain)
    ) {
      // Localize the state with a special state_badge namespace, which has variations of
      // the state translations that are truncated to fit within the badge label. Translations
      // are only added for device_tracker and alarm_control_panel.
      return (
        localize(`state_badge.${domain}.${state.state}`) ||
        localize(`state_badge.default.${state.state}`) ||
        state.state
      );
    }
    if (domain === "timer") {
      return secondsToDuration(_timerTimeRemaining);
    }
    return state.attributes.unit_of_measurement || null;
  }

  computeDescription(state) {
    return computeStateName(state);
  }

  stateChanged(stateObj) {
    this.updateStyles();
    this.startInterval(stateObj);
  }

  clearInterval() {
    if (this._updateRemaining) {
      clearInterval(this._updateRemaining);
      this._updateRemaining = null;
    }
  }

  startInterval(stateObj) {
    this.clearInterval();
    if (computeStateDomain(stateObj) === "timer") {
      this.calculateTimerRemaining(stateObj);

      if (stateObj.state === "active") {
        this._updateRemaining = setInterval(
          () => this.calculateTimerRemaining(this.state),
          1000
        );
      }
    }
  }

  calculateTimerRemaining(stateObj) {
    this._timerTimeRemaining = timerTimeRemaining(stateObj);
  }
}

customElements.define("ha-state-label-badge", HaStateLabelBadge);
