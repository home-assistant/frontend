import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-toggle-button/paper-toggle-button";

import { STATES_OFF } from "../../common/const";
import computeStateDomain from "../../common/entity/compute_state_domain";
import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { HassEntity } from "home-assistant-js-websocket";

class HaEntityToggle extends LitElement {
  // hass is not a property so that we only re-render on stateObj changes
  public hass?: HomeAssistant;
  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult | void {
    if (!this.stateObj) {
      return html`
        <paper-toggle-button disabled></paper-toggle-button>
      `;
    }

    const isOn = this._isOn;

    if (this.stateObj.attributes.assumed_state) {
      return html`
        <paper-icon-button
          icon="hass:flash-off"
          @click=${this._turnOff}
          ?state-active=${!isOn}
        ></paper-icon-button>
        <paper-icon-button
          icon="hass:flash"
          @click=${this._turnOn}
          ?state-active=${isOn}
        ></paper-icon-button>
      `;
    }

    return html`
      <paper-toggle-button
        .checked=${isOn}
        @change=${this._toggleChanged}
      ></paper-toggle-button>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.addEventListener("click", (ev) => ev.stopPropagation());
  }

  private get _isOn(): boolean {
    return (
      this.stateObj !== undefined && !STATES_OFF.includes(this.stateObj.state)
    );
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

    await this.hass.callService(serviceDomain, service, {
      entity_id: this.stateObj.entity_id,
    });

    setTimeout(() => {
      // If after 2 seconds we have not received a state update
      // reset the switch to it's original state.
      if (this.stateObj === currentState) {
        this.requestUpdate();
      }
    }, 2000);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        white-space: nowrap;
        min-width: 38px;
      }
      paper-icon-button {
        color: var(
          --paper-icon-button-inactive-color,
          var(--primary-text-color)
        );
        transition: color 0.5s;
      }
      paper-icon-button[state-active] {
        color: var(--paper-icon-button-active-color, var(--primary-color));
      }
      paper-toggle-button {
        cursor: pointer;
        --paper-toggle-button-label-spacing: 0;
        padding: 13px 5px;
        margin: -4px -5px;
      }
    `;
  }
}

customElements.define("ha-entity-toggle", HaEntityToggle);
