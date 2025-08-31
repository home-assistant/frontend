import { mdiMinus, mdiPlus } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import { moreInfoControlStyle } from "../components/more-info-control-style";
import "../../../components/ha-icon-button";
import "../components/ha-more-info-state-header";

@customElement("more-info-input_number")
class MoreInfoInputNumber extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _currentValue?: number;

  private _updateScheduled = false;

  protected updated(changedProps: PropertyValues<this>) {
    if (changedProps.has("stateObj")) {
      this._currentValue = this.stateObj?.state
        ? Number(this.stateObj.state)
        : undefined;
    }
  }

  private _setValue(ev: Event) {
    const target = ev.target as HTMLInputElement;
    let value = Number(target.value);
    if (this.stateObj) {
      const min = this.stateObj.attributes.min ?? 0;
      const max = this.stateObj.attributes.max ?? 100;
      value = Math.min(Math.max(value, min), max);
    }
    this._currentValue = value;

    if (!this._updateScheduled) {
      this._updateScheduled = true;
      requestAnimationFrame(() => {
        this._updateScheduled = false;
        this.hass.callService("input_number", "set_value", {
          entity_id: this.stateObj!.entity_id,
          value: this._currentValue,
        });
      });
    }
  }

  private _increment() {
    if (!this.stateObj) return;
    const step = Number(this.stateObj.attributes.step) || 1;
    let newValue = (this._currentValue ?? 0) + step;
    if (this.stateObj.attributes.max !== undefined) {
      newValue = Math.min(newValue, this.stateObj.attributes.max);
    }
    this._updateValue(newValue);
  }

  private _decrement() {
    if (!this.stateObj) return;
    const step = Number(this.stateObj.attributes.step) || 1;
    let newValue = (this._currentValue ?? 0) - step;
    if (this.stateObj.attributes.min !== undefined) {
      newValue = Math.max(newValue, this.stateObj.attributes.min);
    }
    this._updateValue(newValue);
  }

  private _updateValue(value: number) {
    this._currentValue = value;
    this.hass.callService("input_number", "set_value", {
      entity_id: this.stateObj!.entity_id,
      value,
    });
  }

  protected render() {
    if (!this.hass || !this.stateObj) return nothing;

    const min = this.stateObj.attributes.min ?? 0;
    const max = this.stateObj.attributes.max ?? 100;
    const step = this.stateObj.attributes.step ?? 1;
    const mode = this.stateObj.attributes.mode ?? "slider";

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .stateOverride=${this._currentValue}
      ></ha-more-info-state-header>

      <div class="controls">
        ${mode === "slider"
          ? html`
              <input
                type="range"
                .min=${min}
                .max=${max}
                .step=${step}
                .value=${this._currentValue ?? min}
                @input=${this._setValue}
              />
              <div class="value-label">${this._currentValue}</div>
            `
          : html`
              <div class="box-control">
                <ha-icon-button
                  class="increment"
                  .label=${this.hass.localize(
                    "ui.card.counter.actions.increment"
                  )}
                  @click=${this._increment}
                >
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                </ha-icon-button>
                <input
                  class="value-input"
                  type="number"
                  .min=${min}
                  .max=${max}
                  .step=${step}
                  .value=${this._currentValue ?? min}
                  @change=${this._setValue}
                />
                <ha-icon-button
                  class="decrement"
                  .label=${this.hass.localize(
                    "ui.card.counter.actions.decrement"
                  )}
                  @click=${this._decrement}
                >
                  <ha-svg-icon .path=${mdiMinus}></ha-svg-icon>
                </ha-icon-button>
              </div>
            `}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        .controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 0;
        }
        input[type="range"] {
          width: 100%;
          margin: 8px 0;
        }
        .value-label {
          margin-top: 4px;
          font-size: 1.2em;
          font-weight: bold;
        }

        .box-control {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 48px;
          width: 100%;
        }

        .box-control .value-input {
          width: 80%;
          text-align: center;
          font-size: 1.2em;
          font-weight: bold;
          margin: 2px 0;
        }

        .box-control ha-icon-button {
          --mdc-icon-size: 28px;
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-input_number": MoreInfoInputNumber;
  }
}
