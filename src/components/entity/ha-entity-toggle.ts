import { mdiFlash, mdiFlashOff } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import { STATES_OFF } from "../../common/const";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { isUnavailableState, UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { forwardHaptic } from "../../data/haptics";
import { HomeAssistant } from "../../types";
import "../ha-formfield";
import "../ha-icon-button";
import "../ha-switch";

const isOn = (stateObj?: HassEntity) =>
  stateObj !== undefined &&
  !STATES_OFF.includes(stateObj.state) &&
  !isUnavailableState(stateObj.state);

export class HaEntityToggle extends LitElement {
  // hass is not a property so that we only re-render on stateObj changes
  public hass?: HomeAssistant;

  @property() public stateObj?: HassEntity;

  @property() public label?: string;

  @state() private _isOn = false;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html` <ha-switch disabled></ha-switch> `;
    }

    if (
      this.stateObj.attributes.assumed_state ||
      this.stateObj.state === UNKNOWN
    ) {
      return html`
        <ha-icon-button
          .label=${`Turn ${computeStateName(this.stateObj)} off`}
          .path=${mdiFlashOff}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          @click=${this._turnOff}
          class=${!this._isOn && this.stateObj.state !== UNKNOWN
            ? "state-active"
            : ""}
        ></ha-icon-button>
        <ha-icon-button
          .label=${`Turn ${computeStateName(this.stateObj)} on`}
          .path=${mdiFlash}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          @click=${this._turnOn}
          class=${this._isOn ? "state-active" : ""}
        ></ha-icon-button>
      `;
    }

    const switchTemplate = html`<ha-switch
      aria-label=${`Toggle ${computeStateName(this.stateObj)} ${
        this._isOn ? "off" : "on"
      }`}
      .checked=${this._isOn}
      .disabled=${this.stateObj.state === UNAVAILABLE}
      @change=${this._toggleChanged}
    ></ha-switch>`;

    if (!this.label) {
      return switchTemplate;
    }

    return html`
      <ha-formfield .label=${this.label}>${switchTemplate}</ha-formfield>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.addEventListener("click", (ev) => ev.stopPropagation());
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj")) {
      this._isOn = isOn(this.stateObj);
    }
  }

  private _toggleChanged(ev) {
    const newVal = ev.target.checked;

    if (newVal !== this._isOn) {
      this._callService(newVal);
    }
  }

  private _turnOn() {
    this._callService(true);
  }

  private _turnOff() {
    this._callService(false);
  }

  // We will force a re-render after a successful call to re-sync the toggle
  // with the state. It will be out of sync if our service call did not
  // result in the entity to be turned on. Since the state is not changing,
  // the resync is not called automatic.
  private async _callService(turnOn): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    forwardHaptic("light");
    const stateDomain = computeStateDomain(this.stateObj);
    let serviceDomain;
    let service;

    if (stateDomain === "lock") {
      serviceDomain = "lock";
      service = turnOn ? "unlock" : "lock";
    } else if (stateDomain === "cover") {
      serviceDomain = "cover";
      service = turnOn ? "open_cover" : "close_cover";
    } else if (stateDomain === "group") {
      serviceDomain = "homeassistant";
      service = turnOn ? "turn_on" : "turn_off";
    } else {
      serviceDomain = stateDomain;
      service = turnOn ? "turn_on" : "turn_off";
    }

    const currentState = this.stateObj;

    // Optimistic update.
    this._isOn = turnOn;

    await this.hass.callService(serviceDomain, service, {
      entity_id: this.stateObj.entity_id,
    });

    setTimeout(async () => {
      // If after 2 seconds we have not received a state update
      // reset the switch to it's original state.
      if (this.stateObj === currentState) {
        this._isOn = isOn(this.stateObj);
      }
    }, 2000);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        white-space: nowrap;
        min-width: 38px;
      }
      ha-icon-button {
        --mdc-icon-button-size: 40px;
        color: var(--ha-icon-button-inactive-color, var(--primary-text-color));
        transition: color 0.5s;
      }
      ha-icon-button.state-active {
        color: var(--ha-icon-button-active-color, var(--primary-color));
      }
      ha-switch {
        padding: 13px 5px;
      }
    `;
  }
}

customElements.define("ha-entity-toggle", HaEntityToggle);
