import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { kelvinRangeFromEntityStates } from "../../common/color/color-temp-selector-range";
import {
  DEFAULT_MAX_KELVIN,
  DEFAULT_MIN_KELVIN,
  mired2kelvin,
} from "../../common/color/convert-light-color";
import { consumeEntityStates } from "../../common/decorators/consume-context-entry";
import { fireEvent, type HASSDomEvent } from "../../common/dom/fire_event";
import type { ColorTempSelector } from "../../data/selector";
import { generateColorTemperatureGradient } from "../../dialogs/more-info/components/lights/light-color-temp-picker";
import "../ha-labeled-slider";

@customElement("ha-selector-color_temp")
export class HaColorTempSelector extends LitElement {
  @property({ attribute: false }) public selector!: ColorTempSelector;

  @property() public value?: string | number;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_entity?: string | string[];
  };

  @state()
  @consumeEntityStates({ entityIdPath: ["context", "filter_entity"] })
  private _filterEntityStates?: Record<string, HassEntity>;

  private _rangeSettled = false;

  private _clampWhenRangeArrives = false;

  protected render() {
    const { min, max } = this._bounds();
    const gradient = this._generateTemperatureGradient(
      this.selector.color_temp?.unit ?? "mired",
      min,
      max
    );

    return html`
      <ha-labeled-slider
        style=${styleMap({
          "--ha-slider-background": `linear-gradient( to var(--float-end), ${gradient})`,
        })}
        labeled
        icon="mdi:thermometer"
        .caption=${this.label || ""}
        .min=${min}
        .max=${max}
        .value=${this.value}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .required=${this.required}
        @value-changed=${this._valueChanged}
      ></ha-labeled-slider>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    // The first pass is the value already stored on the action. Correcting it
    // here would change that action just by opening the editor.
    if (!this._rangeSettled) {
      this._rangeSettled = true;
      return;
    }
    if (changedProps.has("value")) {
      this._clampWhenRangeArrives = true;
    }

    const initialStates =
      !this._clampWhenRangeArrives &&
      changedProps.has("_filterEntityStates") &&
      changedProps.get("_filterEntityStates") === undefined &&
      !changedProps.has("value") &&
      !changedProps.has("context") &&
      !changedProps.has("selector");
    const relevant =
      changedProps.has("value") ||
      changedProps.has("context") ||
      changedProps.has("selector") ||
      changedProps.has("_filterEntityStates") ||
      changedProps.has("disabled");
    if (
      !relevant ||
      initialStates ||
      this.disabled ||
      this.selector.color_temp?.unit !== "kelvin"
    ) {
      return;
    }

    const range = kelvinRangeFromEntityStates(this._filterEntityStates);
    const numeric = this._numericValue();
    if (!range || numeric === undefined) {
      return;
    }
    this._clampWhenRangeArrives = false;
    const clamped = Math.min(range.max, Math.max(range.min, numeric));
    if (clamped !== numeric) {
      fireEvent(this, "value-changed", { value: clamped });
    }
  }

  private _bounds(): { min: number; max: number } {
    switch (this.selector.color_temp?.unit) {
      case "kelvin":
        return (
          kelvinRangeFromEntityStates(this._filterEntityStates) ?? {
            min: this.selector.color_temp?.min ?? DEFAULT_MIN_KELVIN,
            max: this.selector.color_temp?.max ?? DEFAULT_MAX_KELVIN,
          }
        );
      case "mired":
      default:
        return {
          min:
            this.selector.color_temp?.min ??
            this.selector.color_temp?.min_mireds ??
            153,
          max:
            this.selector.color_temp?.max ??
            this.selector.color_temp?.max_mireds ??
            500,
        };
    }
  }

  private _numericValue(): number | undefined {
    if (typeof this.value === "number") {
      return Number.isFinite(this.value) ? this.value : undefined;
    }
    if (typeof this.value !== "string" || this.value === "") {
      return undefined;
    }
    const numeric = Number(this.value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private _generateTemperatureGradient = memoizeOne(
    (unit: "kelvin" | "mired", min: number, max: number) => {
      let gradient;

      switch (unit) {
        case "kelvin":
          gradient = generateColorTemperatureGradient(min, max);
          break;
        case "mired":
          gradient = generateColorTemperatureGradient(
            mired2kelvin(min),
            mired2kelvin(max)
          );
      }

      return gradient;
    }
  );

  private _valueChanged(ev: HASSDomEvent<HASSDomEvents["value-changed"]>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: Number(ev.detail.value),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_temp": HaColorTempSelector;
  }
}
