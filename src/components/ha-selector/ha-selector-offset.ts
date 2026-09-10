import {
  mdiClockMinusOutline,
  mdiClockOutline,
  mdiClockPlusOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { durationValueToData } from "../../common/datetime/duration_value_to_data";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import type {
  OffsetSelector,
  OffsetSelectorValue,
  OffsetType,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-duration-input";
import type { HaDurationData, HaDurationInput } from "../ha-duration-input";
import "../ha-input-helper-text";
import "../ha-select";

const OFFSET_TYPES: { value: OffsetType; iconPath: string }[] = [
  { value: "none", iconPath: mdiClockOutline },
  { value: "before", iconPath: mdiClockMinusOutline },
  { value: "after", iconPath: mdiClockPlusOutline },
];

const DEFAULT_DURATION: HaDurationData = { hours: 0, minutes: 0, seconds: 0 };

const isOffsetValue = (value: unknown): value is OffsetSelectorValue =>
  typeof value === "object" && value !== null && "type" in value;

@customElement("ha-selector-offset")
export class HaOffsetSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: OffsetSelector;

  @property({ attribute: false }) public value?: OffsetSelectorValue;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @query("ha-duration-input", true) private _durationInput?: HaDurationInput;

  public reportValidity(): boolean {
    return this._durationInput?.reportValidity() ?? true;
  }

  private get _value(): OffsetSelectorValue | undefined {
    return isOffsetValue(this.value) ? this.value : undefined;
  }

  private _duration = memoizeOne(durationValueToData);

  private _typeOptions = memoizeOne((localize: LocalizeFunc) =>
    OFFSET_TYPES.map(({ value, iconPath }) => ({
      value,
      iconPath,
      label: localize(`ui.components.selectors.offset.${value}`),
    }))
  );

  protected render() {
    const type = this._value?.type ?? "none";
    return html`
      <div class="container">
        ${
          this.label
            ? html`<label>${this.label}${this.required ? "*" : ""}</label>`
            : nothing
        }
        <div class="inputs">
          <ha-select
            .value=${type}
            .options=${this._typeOptions(this.hass.localize)}
            .disabled=${this.disabled}
            @selected=${this._typeChanged}
          ></ha-select>
          ${
            type !== "none"
              ? html`<div class="value-row">
                  <span class="value-label"
                    >${this.hass.localize(
                      "ui.components.selectors.offset.duration"
                    )}${this.required ? "*" : ""}</span
                  >
                  <ha-duration-input
                    .data=${this._duration(this._value?.duration)}
                    .disabled=${this.disabled}
                    .required=${this.required}
                    .enableDay=${this.selector.offset?.enable_day}
                    .enableMillisecond=${
                      this.selector.offset?.enable_millisecond
                    }
                    @value-changed=${this._durationChanged}
                  ></ha-duration-input>
                </div>`
              : nothing
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

  private _durationChanged(ev: CustomEvent<{ value?: HaDurationData }>) {
    ev.stopPropagation();
    const type = this._value?.type;
    if (!type || type === "none") {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { type, duration: ev.detail.value ?? DEFAULT_DURATION },
    });
  }

  private _typeChanged(ev: CustomEvent<{ value?: string }>) {
    ev.stopPropagation();
    const type = ev.detail.value as OffsetType | undefined;
    if (!type || type === this._value?.type) {
      return;
    }
    fireEvent(this, "value-changed", {
      value:
        type === "none"
          ? { type }
          : {
              type,
              duration:
                this._duration(this._value?.duration) ?? DEFAULT_DURATION,
            },
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
      font-weight: var(--ha-font-weight-medium);
      margin-bottom: var(--ha-space-1);
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
    "ha-selector-offset": HaOffsetSelector;
  }
}
