import {
  mdiClockMinusOutline,
  mdiClockOutline,
  mdiClockPlusOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { durationDataToSeconds } from "../../common/datetime/duration_to_seconds";
import { createDurationData } from "../../common/datetime/create_duration_data";
import {
  applyDurationSign,
  normalizeDuration,
} from "../../common/datetime/normalize_duration";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import type {
  DurationSelector,
  DurationSelectorMode,
} from "../../data/selector";
import {
  getDurationSelectorMode,
  getDurationSelectorUnits,
} from "../../data/selector";
import type { ValueChangedEvent } from "../../types";
import "../ha-duration-input";
import type { HaDurationData, HaDurationInput } from "../ha-duration-input";
import "../ha-input-helper-text";
import "../ha-select";
import type { HaSelectSelectEvent } from "../ha-select";

type OffsetType = "none" | "before" | "after";

const offsetTypeOf = (data?: HaDurationData): OffsetType => {
  const total = data ? durationDataToSeconds(data) : 0;
  if (!total) {
    return "none";
  }
  return total < 0 ? "before" : "after";
};

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

  @state() private _offsetType: OffsetType = "none";

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  private _data = memoizeOne(
    (value?: HaDurationData | string | number): HaDurationData | undefined =>
      createDurationData(value)
  );

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("value")) {
      const type = offsetTypeOf(this._data(this.value));
      if (type !== "none") {
        this._offsetType = type;
      }
    }
  }

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
      return this._renderInput(data, mode, this.label, this.helper);
    }

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
            aria-label=${ifDefined(this.label)}
            .value=${this._offsetType}
            .options=${this._offsetTypeOptions(this._localize)}
            .disabled=${this.disabled}
            @selected=${this._offsetTypeChanged}
          ></ha-select>
          ${
            this._offsetType === "none"
              ? nothing
              : html`<div
                  class="value-row"
                  role="group"
                  aria-labelledby="duration-label"
                  @value-changed=${this._durationChanged}
                >
                  <span id="duration-label" class="value-label"
                    >${this._localize(
                      "ui.components.selectors.duration.duration"
                    )}${this.required ? "*" : ""}</span
                  >
                  ${this._renderInput(data, mode)}
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
    mode: DurationSelectorMode,
    label?: string,
    helper?: string
  ) {
    return html`
      <ha-duration-input
        .label=${label}
        .helper=${helper}
        .data=${data}
        .disabled=${this.disabled}
        .required=${this.required || mode === "offset"}
        .enableDay=${this.selector.duration?.enable_day ?? false}
        .enableMillisecond=${this.selector.duration?.enable_millisecond ?? false}
        .allowNegative=${mode === "signed"}
        .enableSecond=${this.selector.duration?.enable_second ?? true}
      ></ha-duration-input>
    `;
  }

  private _durationChanged(ev: ValueChangedEvent<HaDurationData | undefined>) {
    ev.stopPropagation();
    this._fireValue(this._offsetType, ev.detail.value);
  }

  private _offsetTypeChanged(ev: HaSelectSelectEvent<OffsetType>) {
    ev.stopPropagation();
    this._fireValue(ev.detail.value ?? "none", this._data(this.value));
  }

  private _fireValue(type: OffsetType, data: HaDurationData = {}) {
    const { duration } = normalizeDuration(
      type === "none" ? {} : data,
      getDurationSelectorUnits(this.selector.duration)
    );
    const value = applyDurationSign(duration, type === "before");
    this._offsetType = type;
    fireEvent(this, "value-changed", { value });
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
