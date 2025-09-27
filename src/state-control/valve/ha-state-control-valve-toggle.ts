import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../common/entity/state_color";
import "../../components/ha-control-button";
import "../../components/ha-control-switch";
import "../../components/ha-state-icon";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { forwardHaptic } from "../../data/haptics";
import type { HomeAssistant } from "../../types";

@customElement("ha-state-control-valve-toggle")
export class HaStateControlValveToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

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

    await this.hass.callService(
      "valve",
      turnOn ? "open_valve" : "close_valve",
      {
        entity_id: this.stateObj.entity_id,
      }
    );
  }

  protected render(): TemplateResult {
    const onColor = stateColorCss(this.stateObj, "open");
    const offColor = stateColorCss(this.stateObj, "closed");

    const isOn =
      this.stateObj.state === "open" ||
      this.stateObj.state === "closing" ||
      this.stateObj.state === "opening";
    const isOff = this.stateObj.state === "closed";

    if (
      this.stateObj.attributes.assumed_state ||
      this.stateObj.state === UNKNOWN
    ) {
      return html`
        <div class="buttons">
          <ha-control-button
            .label=${this.hass.localize("ui.card.valve.open_valve")}
            @click=${this._turnOn}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOn,
            })}
            style=${styleMap({
              "--color": onColor,
            })}
          >
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${this.stateObj}
              stateValue="open"
            ></ha-state-icon>
          </ha-control-button>
          <ha-control-button
            .label=${this.hass.localize("ui.card.valve.close_valve")}
            @click=${this._turnOff}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOff,
            })}
            style=${styleMap({
              "--color": offColor,
            })}
          >
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${this.stateObj}
              stateValue="closed"
            ></ha-state-icon>
          </ha-control-button>
        </div>
      `;
    }

    return html`
      <ha-control-switch
        touch-action="none"
        vertical
        reversed
        .checked=${isOn}
        @change=${this._valueChanged}
        .label=${isOn
          ? this.hass.localize("ui.card.valve.close_valve")
          : this.hass.localize("ui.card.valve.open_valve")}
        style=${styleMap({
          "--control-switch-on-color": onColor,
          "--control-switch-off-color": offColor,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
        <ha-state-icon
          slot="icon-on"
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          stateValue="open"
        ></ha-state-icon>
        <ha-state-icon
          slot="icon-off"
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          stateValue="closed"
        ></ha-state-icon>
      </ha-control-switch>
    `;
  }

  static styles = css`
    ha-control-switch {
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      --control-switch-thickness: 130px;
      --control-switch-border-radius: var(--ha-border-radius-6xl);
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
      --control-button-border-radius: var(--ha-border-radius-6xl);
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
    "ha-state-control-valve-toggle": HaStateControlValveToggle;
  }
}
