import { mdiFlash, mdiFlashOff } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../common/entity/compute_domain";
import { stateActive } from "../common/entity/state_active";
import { stateColorCss } from "../common/entity/state_color";
import "../components/ha-control-button";
import "../components/ha-control-switch";
import { UNAVAILABLE, UNKNOWN } from "../data/entity";
import { forwardHaptic } from "../data/haptics";
import type { HomeAssistant } from "../types";

@customElement("ha-state-control-toggle")
export class HaStateControlToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: false }) public iconPathOn?: string;

  @property({ attribute: false }) public iconPathOff?: string;

  private _valueChanged(ev) {
    const checked = ev.target.checked as boolean;

    if (checked) {
      this._turnOn();
    } else {
      this._turnOff();
    }
  }

  private _turnOn() {
    this._callService(true);
  }

  private _turnOff() {
    this._callService(false);
  }

  private async _callService(turnOn): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    forwardHaptic("light");
    const stateDomain = computeDomain(this.stateObj.entity_id);
    let serviceDomain;
    let service;

    if (stateDomain === "group") {
      serviceDomain = "homeassistant";
      service = turnOn ? "turn_on" : "turn_off";
    } else {
      serviceDomain = stateDomain;
      service = turnOn ? "turn_on" : "turn_off";
    }

    await this.hass.callService(serviceDomain, service, {
      entity_id: this.stateObj.entity_id,
    });
  }

  protected render(): TemplateResult {
    const onColor = stateColorCss(this.stateObj, "on");
    const offColor = stateColorCss(this.stateObj, "off");

    const isOn = this.stateObj.state === "on";
    const isOff = this.stateObj.state === "off";

    if (
      this.stateObj.attributes.assumed_state ||
      this.stateObj.state === UNKNOWN
    ) {
      return html`
        <div class="buttons">
          <ha-control-button
            .label=${this.hass.localize("ui.card.common.turn_on")}
            @click=${this._turnOn}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOn,
            })}
            style=${styleMap({
              "--color": onColor,
            })}
          >
            <ha-svg-icon .path=${this.iconPathOn || mdiFlash}></ha-svg-icon>
          </ha-control-button>
          <ha-control-button
            .label=${this.hass.localize("ui.card.common.turn_off")}
            @click=${this._turnOff}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOff,
            })}
            style=${styleMap({
              "--color": offColor,
            })}
          >
            <ha-svg-icon .path=${this.iconPathOff || mdiFlashOff}></ha-svg-icon>
          </ha-control-button>
        </div>
      `;
    }

    return html`
      <ha-control-switch
        touch-action="none"
        .pathOn=${this.iconPathOn || mdiFlash}
        .pathOff=${this.iconPathOff || mdiFlashOff}
        vertical
        reversed
        .checked=${isOn}
        .showHandle=${stateActive(this.stateObj)}
        @change=${this._valueChanged}
        .label=${this.hass.localize("ui.card.common.toggle")}
        style=${styleMap({
          "--control-switch-on-color": onColor,
          "--control-switch-off-color": offColor,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
      </ha-control-switch>
    `;
  }

  static styles = css`
    ha-control-switch {
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      --control-switch-thickness: 130px;
      --control-switch-border-radius: 36px;
      --control-switch-padding: 6px;
      --mdc-icon-size: 24px;
    }
    .buttons {
      display: flex;
      flex-direction: column;
      width: 130px;
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      padding: 6px;
      box-sizing: border-box;
    }
    ha-control-button {
      flex: 1;
      width: 100%;
      --control-button-border-radius: 36px;
      --mdc-icon-size: 24px;
    }
    ha-control-button.active {
      --control-button-icon-color: white;
      --control-button-background-color: var(--color);
      --control-button-focus-color: var(--color);
      --control-button-background-opacity: 1;
    }
    ha-control-button:not(:last-child) {
      margin-bottom: 6px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-toggle": HaStateControlToggle;
  }
}
