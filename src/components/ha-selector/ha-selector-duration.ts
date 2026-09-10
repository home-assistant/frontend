import {
  mdiClockMinusOutline,
  mdiClockOutline,
  mdiClockPlusOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { durationDataToSeconds } from "../../common/datetime/duration_to_seconds";
import { normalizeDuration } from "../../common/datetime/normalize_duration";
import { durationValueToData } from "../../common/datetime/duration_value_to_data";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { DurationSelector } from "../../data/selector";
import { getDurationSelectorMode } from "../../data/selector";
import type { ValueChangedEvent } from "../../types";
import "../ha-duration-input";
import type { HaDurationData, HaDurationInput } from "../ha-duration-input";
import "../ha-input-helper-text";
import "../ha-select";
import type { HaSelectSelectEvent } from "../ha-select";

type OffsetType = "none" | "before" | "after";

const OFFSET_TYPES: { value: OffsetType; iconPath: string }[] = [
  { value: "none", iconPath: mdiClockOutline },
  { value: "before", iconPath: mdiClockMinusOutline },
  { value: "after", iconPath: mdiClockPlusOutline },
];

@customElement("ha-selector-duration")
export class HaTimeDuration extends LitElement {
  @property({ attribute: false }) public selector!: DurationSelector;

  @property({ attribute: false }) public value?:
    HaDurationData | string | number;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @query("ha-duration-input") private _input?: HaDurationInput;

  @state() private _pendingOffsetType?: OffsetType;

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  private _data = memoizeOne(durationValueToData);

  private _offsetTypeOptions = memoizeOne((localize: LocalizeFunc) =>
    OFFSET_TYPES.map(({ value, iconPath }) => ({
      value,
      iconPath,
      label: localize(`ui.components.selectors.duration.offset.${value}`),
    }))
  );

  protected render() {
    const mode = getDurationSelectorMode(this.selector.duration);
    const data = this._data(this.value);

    if (mode !== "offset") {
      return this._renderInput(
        data,
        this.label,
        this.helper,
        mode === "signed"
      );
    }

    const offsetType = this._offsetType(data);
    return html`
      <div class="container">
        ${
          this.label
            ? html`<label id="label"
                >${this.label}${this.required ? "*" : ""}</label
              >`
            : nothing
        }
        <div
          class="inputs"
          role="group"
          aria-labelledby=${ifDefined(this.label ? "label" : undefined)}
        >
          <ha-select
            .value=${offsetType}
            .options=${this._offsetTypeOptions(this._localize)}
            .disabled=${this.disabled}
            @selected=${this._offsetTypeChanged}
          ></ha-select>
          ${
            offsetType === "none"
              ? nothing
              : html`<div
                  class="value-row"
                  role="group"
                  aria-labelledby="duration-label"
                >
                  <span id="duration-label" class="value-label"
                    >${this._localize(
                      "ui.components.selectors.duration.duration"
                    )}${this.required ? "*" : ""}</span
                  >
                  ${this._renderInput(
                    data && this._components(data),
                    undefined
                  )}
                </div>`
          }
        </div>
        ${
          this.helper
            ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
            : nothing
        }
      </div>
    `;
  }

  private _renderInput(
    data: HaDurationData | undefined,
    label: string | undefined,
    helper?: string,
    allowNegative = false
  ) {
    return html`
      <ha-duration-input
        .label=${label}
        .helper=${helper}
        .data=${data}
        .disabled=${this.disabled}
        .required=${this.required}
        .enableDay=${this.selector.duration?.enable_day}
        .enableMillisecond=${this.selector.duration?.enable_millisecond}
        .allowNegative=${allowNegative}
        .enableSecond=${this.selector.duration?.enable_second ?? true}
        @value-changed=${this._durationChanged}
      ></ha-duration-input>
    `;
  }

  private _offsetType(data?: HaDurationData): OffsetType {
    if (data?.negative !== undefined) {
      return data.negative ? "before" : "after";
    }
    const { negative, ...components } = data
      ? normalizeDuration(data)
      : { negative: false };
    if (durationDataToSeconds(components) === 0) {
      return this._pendingOffsetType ?? "none";
    }
    return negative ? "before" : "after";
  }

  private _components(data: HaDurationData): HaDurationData {
    const { negative: _negative, ...components } = normalizeDuration(data);
    return components;
  }

  private _zeroDuration(): HaDurationData {
    const config = this.selector.duration;
    const value: HaDurationData = { hours: 0, minutes: 0 };
    if (config?.enable_day) value.days = 0;
    if (config?.enable_second ?? true) value.seconds = 0;
    if (config?.enable_millisecond) value.milliseconds = 0;
    return value;
  }

  private _withOffsetType(
    type: OffsetType,
    data?: HaDurationData
  ): HaDurationData {
    if (type === "none") {
      return this._zeroDuration();
    }
    const components = this._components(data ?? this._zeroDuration());
    return type === "before" ? { negative: true, ...components } : components;
  }

  private _durationChanged(ev: ValueChangedEvent<HaDurationData | undefined>) {
    if (getDurationSelectorMode(this.selector.duration) !== "offset") {
      return;
    }
    ev.stopPropagation();
    const type = this._offsetType(this._data(this.value));
    this._pendingOffsetType = type;
    fireEvent(this, "value-changed", {
      value: this._withOffsetType(type, ev.detail.value),
    });
  }

  private _offsetTypeChanged(ev: HaSelectSelectEvent<OffsetType>) {
    ev.stopPropagation();
    const type = ev.detail.value;
    const data = this._data(this.value);
    if (!type || type === this._offsetType(data)) {
      return;
    }
    this._pendingOffsetType = type;
    fireEvent(this, "value-changed", {
      value: this._withOffsetType(type, data),
    });
  }

  static styles = css`
    .container {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    label {
      display: block;
      font-size: var(--ha-font-size-s);
      line-height: var(--ha-line-height-condensed);
      color: var(--ha-color-text-primary);
      padding-inline-start: var(--ha-space-1);
    }

    .inputs,
    .value-row {
      --ha-input-padding-bottom: 0;
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    .value-label {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }

    ha-select {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-duration": HaTimeDuration;
  }
}
