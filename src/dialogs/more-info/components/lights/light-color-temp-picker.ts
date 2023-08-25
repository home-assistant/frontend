import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { throttle } from "../../../../common/util/throttle";
import "../../../../components/ha-temp-color-picker";
import {
  LightColor,
  LightColorMode,
  LightEntity,
} from "../../../../data/light";
import { HomeAssistant } from "../../../../types";
import {
  DEFAULT_MAX_KELVIN,
  DEFAULT_MIN_KELVIN,
} from "../../../../common/color/convert-light-color";

declare global {
  interface HASSDomEvents {
    "color-changed": LightColor;
    "color-hovered": LightColor | undefined;
  }
}

@customElement("light-color-temp-picker")
class LightColorTempPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() private _ctPickerValue?: number;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const minKelvin =
      this.stateObj.attributes.min_color_temp_kelvin ?? DEFAULT_MIN_KELVIN;
    const maxKelvin =
      this.stateObj.attributes.max_color_temp_kelvin ?? DEFAULT_MAX_KELVIN;

    return html`
      <ha-temp-color-picker
        @value-changed=${this._ctColorChanged}
        @cursor-moved=${this._ctColorCursorMoved}
        .min=${minKelvin}
        .max=${maxKelvin}
        .value=${this._ctPickerValue}
      >
      </ha-temp-color-picker>
    `;
  }

  public _updateSliderValues() {
    const stateObj = this.stateObj;

    if (stateObj.state === "on") {
      this._ctPickerValue =
        stateObj.attributes.color_mode === LightColorMode.COLOR_TEMP
          ? stateObj.attributes.color_temp_kelvin
          : undefined;
    } else {
      this._ctPickerValue = undefined;
    }
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!changedProps.has("stateObj")) {
      return;
    }

    this._updateSliderValues();
  }

  private _ctColorCursorMoved(ev: CustomEvent) {
    const ct = ev.detail.value;

    if (isNaN(ct) || this._ctPickerValue === ct) {
      return;
    }

    this._ctPickerValue = ct;

    fireEvent(this, "color-hovered", {
      color_temp_kelvin: ct,
    });

    this._throttleUpdateColorTemp();
  }

  private _throttleUpdateColorTemp = throttle(() => {
    this._updateColorTemp();
  }, 500);

  private _ctColorChanged(ev: CustomEvent) {
    const ct = ev.detail.value;

    fireEvent(this, "color-hovered", undefined);

    if (isNaN(ct) || this._ctPickerValue === ct) {
      return;
    }

    this._ctPickerValue = ct;

    this._updateColorTemp();
  }

  private _updateColorTemp() {
    const color_temp_kelvin = this._ctPickerValue!;

    this._applyColor({ color_temp_kelvin });
  }

  private _applyColor(color: LightColor, params?: Record<string, any>) {
    fireEvent(this, "color-changed", color);
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      ...color,
      ...params,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
        }

        ha-temp-color-picker {
          height: 45vh;
          max-height: 320px;
          min-height: 200px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "light-color-temp-picker": LightColorTempPicker;
  }
}
