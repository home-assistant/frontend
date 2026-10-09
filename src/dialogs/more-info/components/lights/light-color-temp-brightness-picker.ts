import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { throttle } from "../../../../common/util/throttle";
import "../../../../components/ha-color-temp-brightness-picker";
import { apiContext } from "../../../../data/context";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import type { LightEntity } from "../../../../data/light";
import { LightColorMode } from "../../../../data/light";

@customElement("light-color-temp-brightness-picker")
class LightColorTempBrightnessPicker extends LitElement {
  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() private _value?: [number, number];

  @state() private _isInteracting?: boolean;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    return html`
      <ha-color-temp-brightness-picker
        .value=${this._value}
        .minKelvin=${this.stateObj.attributes.min_color_temp_kelvin}
        .maxKelvin=${this.stateObj.attributes.max_color_temp_kelvin}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        @cursor-moved=${this._cursorMoved}
        @value-changed=${this._valueChanged}
      >
      </ha-color-temp-brightness-picker>
    `;
  }

  private _updateValues() {
    const stateObj = this.stateObj;

    if (stateObj.state !== "on") {
      this._value = undefined;
      return;
    }

    const kelvin =
      stateObj.attributes.color_mode === LightColorMode.COLOR_TEMP
        ? stateObj.attributes.color_temp_kelvin
        : undefined;
    const brightness = stateObj.attributes.brightness;

    this._value =
      kelvin != null && brightness != null
        ? [kelvin, Math.max(Math.round((brightness * 100) / 255), 1)]
        : undefined;
  }

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);

    if (this._isInteracting || !changedProps.has("stateObj")) {
      return;
    }

    this._updateValues();
  }

  private _cursorMoved(ev: CustomEvent) {
    const value = ev.detail.value;

    this._isInteracting = value !== undefined;

    if (value === undefined) {
      return;
    }

    this._value = value;

    this._throttleUpdateLight();
  }

  private _throttleUpdateLight = throttle(() => {
    this._updateLight();
  }, 500);

  private _valueChanged(ev: CustomEvent) {
    const value = ev.detail.value;

    if (value === undefined) {
      return;
    }

    this._value = value;

    this._throttleUpdateLight.cancel();
    this._updateLight();
  }

  private _updateLight() {
    const [color_temp_kelvin, brightness_pct] = this._value!;

    this._api.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      color_temp_kelvin,
      brightness_pct,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        ha-color-temp-brightness-picker {
          height: 45vh;
          max-height: 320px;
          min-height: 200px;
          aspect-ratio: 1;
          max-width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "light-color-temp-brightness-picker": LightColorTempBrightnessPicker;
  }
}
