import { mdiMinus, mdiPlus, mdiSlider } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import type { HomeAssistant } from "../../../types";
import { moreInfoControlStyle } from "../components/more-info-control-style";
import "../../../components/ha-state-label-badge";
import "../../../components/ha-icon-button";

import type { InputNumberEntity } from "../../../data/input_number";

@customElement("more-info-input_number")
class MoreInfoInputNumber extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public stateObj?: InputNumberEntity;

  @state() private _currentValue?: number;

  protected updated(changedProps: PropertyValues<this>) {
    if (changedProps.has("stateObj")) {
      this._currentValue = this.stateObj?.state
        ? Number(this.stateObj.state)
        : undefined;
    }
  }

  private _setValue(ev: Event) {
    const target = ev.target as HTMLInputElement;
    const value = Number(target.value);
    this._currentValue = value;
    this.hass.callService("input_number", "set_value", {
      entity_id: this.stateObj!.entity_id,
      value,
    });
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

    const mode = this.stateObj.attributes.mode ?? "slider"; // slider or box

    return html`
      <div class="controls">
        ${mode === "slider"
          ? html`
              <ha-icon-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.input_number.slider",
                )}
              >
                <ha-svg-icon .path=${mdiSlider}></ha-svg-icon>
              </ha-icon-button>
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
              <div class="button-bar">
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.dialogs.more_info_control.input_number.decrement",
                  )}
                  @click=${this._decrement}
                >
                  <ha-svg-icon .path=${mdiMinus}></ha-svg-icon>
                </ha-icon-button>
                <div class="value-box">${this._currentValue}</div>
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.dialogs.more_info_control.input_number.increment",
                  )}
                  @click=${this._increment}
                >
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
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
        .value-label,
        .value-box {
          margin-top: 4px;
          font-size: 1.2em;
          font-weight: bold;
        }
        .button-bar {
          display: flex;
          align-items: center;
          gap: 16px;
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
