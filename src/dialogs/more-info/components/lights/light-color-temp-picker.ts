import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { rgb2hex } from "../../../../common/color/convert-color";
import {
  DEFAULT_MAX_KELVIN,
  DEFAULT_MIN_KELVIN,
  temperature2rgb,
} from "../../../../common/color/convert-light-color";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stateColorCss } from "../../../../common/entity/state_color";
import { throttle } from "../../../../common/util/throttle";
import "../../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../../data/entity";
import {
  LightColor,
  LightColorMode,
  LightEntity,
} from "../../../../data/light";
import { HomeAssistant } from "../../../../types";

declare global {
  interface HASSDomEvents {
    "color-changed": LightColor;
    "color-hovered": LightColor | undefined;
  }
}

export const generateColorTemperatureGradient = (min: number, max: number) => {
  const count = 10;

  const gradient: [number, string][] = [];

  const step = (max - min) / count;
  const percentageStep = 1 / count;

  for (let i = 0; i < count + 1; i++) {
    const value = min + step * i;

    const hex = rgb2hex(temperature2rgb(value));
    gradient.push([percentageStep * i, hex]);
  }

  return gradient
    .map(([stop, color]) => `${color} ${(stop as number) * 100}%`)
    .join(", ");
};

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

    const gradient = this._generateTemperatureGradient(minKelvin!, maxKelvin);
    const color = stateColorCss(this.stateObj);

    return html`
      <ha-control-slider
        inverted
        vertical
        .value=${this._ctPickerValue}
        .min=${minKelvin}
        .max=${maxKelvin}
        mode="cursor"
        @value-changed=${this._ctColorChanged}
        @slider-moved=${this._ctColorCursorMoved}
        .ariaLabel=${this.hass.localize(
          "ui.dialogs.more_info_control.light.color_temp"
        )}
        style=${styleMap({
          "--control-slider-color": color,
          "--gradient": gradient,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
      </ha-control-slider>
    `;
  }

  private _generateTemperatureGradient = memoizeOne(
    (min: number, max: number) => generateColorTemperatureGradient(min, max)
  );

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

        ha-control-slider {
          height: 45vh;
          max-height: 320px;
          min-height: 200px;
          --control-slider-thickness: 100px;
          --control-slider-border-radius: 24px;
          --control-slider-color: var(--primary-color);
          --control-slider-background: -webkit-linear-gradient(
            top,
            var(--gradient)
          );
          --control-slider-background-opacity: 1;
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
