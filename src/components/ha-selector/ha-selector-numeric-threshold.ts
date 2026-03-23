import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  mdiArrowCollapseVertical,
  mdiArrowExpandVertical,
  mdiGreaterThan,
  mdiLessThan,
} from "@mdi/js";
import { fireEvent } from "../../common/dom/fire_event";
import type { NumericThresholdSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-button-toggle-group";
import "../ha-select";
import "./ha-selector";

type ThresholdType = "above" | "below" | "between" | "outside";

interface ThresholdValueEntry {
  active_choice?: string;
  number?: number;
  entity?: string;
  unit_of_measurement?: string;
}

interface NumericThresholdValue {
  type: ThresholdType;
  value?: ThresholdValueEntry;
  value_min?: ThresholdValueEntry;
  value_max?: ThresholdValueEntry;
}

@customElement("ha-selector-numeric_threshold")
export class HaNumericThresholdSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: NumericThresholdSelector;

  @property({ attribute: false }) public value?: NumericThresholdValue;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _type?: ThresholdType;

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("value")) {
      this._type = this.value?.type || "above";
    }
  }

  private _getUnitOptions() {
    return this.selector.numeric_threshold?.unit_of_measurement;
  }

  private _getEntityFilter() {
    const baseFilter = this.selector.numeric_threshold?.entity;
    const configuredUnits =
      this.selector.numeric_threshold?.unit_of_measurement;

    if (!configuredUnits) {
      return baseFilter;
    }

    if (Array.isArray(baseFilter)) {
      return baseFilter.map((f) => ({
        ...f,
        unit_of_measurement: configuredUnits,
      }));
    }

    if (baseFilter) {
      return { ...baseFilter, unit_of_measurement: configuredUnits };
    }

    return { unit_of_measurement: configuredUnits };
  }

  protected render() {
    const type = this._type || "above";
    const showSingleValue = type === "above" || type === "below";
    const showRangeValues = type === "between" || type === "outside";
    const unitOptions = this._getUnitOptions();

    const typeOptions = [
      {
        value: "above",
        label: this.hass.localize(
          "ui.components.selectors.numeric_threshold.above"
        ),
        iconPath: mdiGreaterThan,
      },
      {
        value: "below",
        label: this.hass.localize(
          "ui.components.selectors.numeric_threshold.below"
        ),
        iconPath: mdiLessThan,
      },
      {
        value: "between",
        label: this.hass.localize(
          "ui.components.selectors.numeric_threshold.in_range"
        ),
        iconPath: mdiArrowCollapseVertical,
      },
      {
        value: "outside",
        label: this.hass.localize(
          "ui.components.selectors.numeric_threshold.outside_range"
        ),
        iconPath: mdiArrowExpandVertical,
      },
    ];

    const mappedUnitOptions = unitOptions?.map((unit) => ({
      value: unit,
      label: unit,
    }));

    const unitLabel = this.hass.localize(
      "ui.components.selectors.numeric_threshold.unit" as any
    );

    const choiceToggleButtons = [
      {
        label: this.hass.localize(
          "ui.components.selectors.numeric_threshold.number" as any
        ),
        value: "number",
      },
      {
        label: this.hass.localize(
          "ui.components.selectors.numeric_threshold.entity" as any
        ),
        value: "entity",
      },
    ];

    const _numberSelector = (unit?: string) => {
      const effectiveUnit = unit || unitOptions?.[0];
      return {
        number: {
          ...this.selector.numeric_threshold?.number,
          ...(effectiveUnit ? { unit_of_measurement: effectiveUnit } : {}),
        },
      };
    };

    const _entitySelector = {
      entity: {
        filter: this._getEntityFilter(),
      },
    };

    const _unitSelect = (
      entry: ThresholdValueEntry | undefined,
      handler: (ev: CustomEvent) => void
    ) =>
      unitOptions && unitOptions.length > 1
        ? html`
            <ha-select
              class="unit-selector"
              .label=${unitLabel}
              .value=${entry?.unit_of_measurement || unitOptions[0]}
              .options=${mappedUnitOptions}
              .disabled=${this.disabled}
              @selected=${handler}
            ></ha-select>
          `
        : nothing;

    const _valueRow = (
      rowLabel: string,
      entry: ThresholdValueEntry | undefined,
      onValueChanged: (ev: CustomEvent) => void,
      onChoiceChanged: (ev: CustomEvent) => void,
      onUnitChanged: (ev: CustomEvent) => void
    ) => {
      const activeChoice = entry?.active_choice ?? "number";
      const isEntity = activeChoice === "entity";
      const showUnit = !isEntity && !!unitOptions && unitOptions.length > 1;
      const innerValue = isEntity ? entry?.entity : entry?.number;
      const innerSelector = isEntity
        ? _entitySelector
        : _numberSelector(entry?.unit_of_measurement);
      return html`
        <div class="value-row">
          <div class="value-header">
            <span class="value-label"
              >${rowLabel}${this.required ? "*" : ""}</span
            >
            <ha-button-toggle-group
              size="small"
              .buttons=${choiceToggleButtons}
              .active=${activeChoice}
              .disabled=${this.disabled}
              @value-changed=${onChoiceChanged}
            ></ha-button-toggle-group>
          </div>
          <div class="value-inputs">
            <ha-selector
              class="value-selector"
              .hass=${this.hass}
              .selector=${innerSelector}
              .value=${innerValue}
              .disabled=${this.disabled}
              .required=${this.required}
              @value-changed=${onValueChanged}
            ></ha-selector>
            ${showUnit ? _unitSelect(entry, onUnitChanged) : nothing}
          </div>
        </div>
      `;
    };

    return html`
      <div class="container">
        ${this.label
          ? html`<label>${this.label}${this.required ? "*" : ""}</label>`
          : nothing}
        <div class="inputs">
          <ha-select
            .label=${this.hass.localize(
              "ui.components.selectors.numeric_threshold.type"
            )}
            .value=${type}
            .options=${typeOptions}
            .disabled=${this.disabled}
            @selected=${this._typeChanged}
          ></ha-select>

          ${showSingleValue
            ? _valueRow(
                this.hass.localize(
                  type === "above"
                    ? "ui.components.selectors.numeric_threshold.above"
                    : "ui.components.selectors.numeric_threshold.below"
                ),
                this.value?.value,
                this._valueChanged,
                this._valueChoiceChanged,
                this._unitChanged
              )
            : nothing}
          ${showRangeValues
            ? html`
                ${_valueRow(
                  this.hass.localize(
                    "ui.components.selectors.numeric_threshold.from"
                  ),
                  this.value?.value_min,
                  this._valueMinChanged,
                  this._valueMinChoiceChanged,
                  this._unitMinChanged
                )}
                ${_valueRow(
                  this.hass.localize(
                    "ui.components.selectors.numeric_threshold.to"
                  ),
                  this.value?.value_max,
                  this._valueMaxChanged,
                  this._valueMaxChoiceChanged,
                  this._unitMaxChanged
                )}
              `
            : nothing}
        </div>
        ${this.helper
          ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
          : nothing}
      </div>
    `;
  }

  private _typeChanged(ev: CustomEvent) {
    const value = ev.detail?.value;
    if (!value || value === this._type) {
      return;
    }
    this._type = value as ThresholdType;

    const newValue: NumericThresholdValue = {
      type: this._type,
    };

    // Preserve values when switching between similar types
    if (this._type === "above" || this._type === "below") {
      newValue.value = this.value?.value ?? this.value?.value_min;
    } else if (this._type === "between" || this._type === "outside") {
      newValue.value_min = this.value?.value_min ?? this.value?.value;
      newValue.value_max = this.value?.value_max;
    }

    fireEvent(this, "value-changed", { value: newValue });
  }

  // Called when the number/entity toggle is switched
  private _valueChoiceChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const choice = ev.detail?.value as string;
    const defaultUnit = this._getUnitOptions()?.[0];
    const entry: ThresholdValueEntry = {
      ...this.value?.value,
      active_choice: choice,
    };
    if (choice !== "entity" && !entry.unit_of_measurement && defaultUnit) {
      entry.unit_of_measurement = defaultUnit;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.value, type: this._type || "above", value: entry },
    });
  }

  private _valueMinChoiceChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const choice = ev.detail?.value as string;
    const defaultUnit = this._getUnitOptions()?.[0];
    const entry: ThresholdValueEntry = {
      ...this.value?.value_min,
      active_choice: choice,
    };
    if (choice !== "entity" && !entry.unit_of_measurement && defaultUnit) {
      entry.unit_of_measurement = defaultUnit;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || "between",
        value_min: entry,
        value: undefined,
      },
    });
  }

  private _valueMaxChoiceChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const choice = ev.detail?.value as string;
    const defaultUnit = this._getUnitOptions()?.[0];
    const entry: ThresholdValueEntry = {
      ...this.value?.value_max,
      active_choice: choice,
    };
    if (choice !== "entity" && !entry.unit_of_measurement && defaultUnit) {
      entry.unit_of_measurement = defaultUnit;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || "between",
        value_max: entry,
        value: undefined,
      },
    });
  }

  // Called when the inner number/entity selector value changes
  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const activeChoice = this.value?.value?.active_choice ?? "number";
    const defaultUnit = this._getUnitOptions()?.[0];
    const entry: ThresholdValueEntry = {
      ...this.value?.value,
      [activeChoice]: ev.detail.value,
    };
    if (
      activeChoice !== "entity" &&
      !entry.unit_of_measurement &&
      defaultUnit
    ) {
      entry.unit_of_measurement = defaultUnit;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || "above",
        value: entry,
        value_min: undefined,
        value_max: undefined,
      },
    });
  }

  private _valueMinChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const activeChoice = this.value?.value_min?.active_choice ?? "number";
    const defaultUnit = this._getUnitOptions()?.[0];
    const entry: ThresholdValueEntry = {
      ...this.value?.value_min,
      [activeChoice]: ev.detail.value,
    };
    if (
      activeChoice !== "entity" &&
      !entry.unit_of_measurement &&
      defaultUnit
    ) {
      entry.unit_of_measurement = defaultUnit;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || "between",
        value_min: entry,
        value: undefined,
      },
    });
  }

  private _valueMaxChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const activeChoice = this.value?.value_max?.active_choice ?? "number";
    const defaultUnit = this._getUnitOptions()?.[0];
    const entry: ThresholdValueEntry = {
      ...this.value?.value_max,
      [activeChoice]: ev.detail.value,
    };
    if (
      activeChoice !== "entity" &&
      !entry.unit_of_measurement &&
      defaultUnit
    ) {
      entry.unit_of_measurement = defaultUnit;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || "between",
        value_max: entry,
        value: undefined,
      },
    });
  }

  private _unitChanged(ev: CustomEvent) {
    const unit = ev.detail?.value;
    if (unit === this.value?.value?.unit_of_measurement) return;
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || "above",
        value: { ...this.value?.value, unit_of_measurement: unit || undefined },
      },
    });
  }

  private _unitMinChanged(ev: CustomEvent) {
    const unit = ev.detail?.value;
    if (unit === this.value?.value_min?.unit_of_measurement) return;
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || "between",
        value_min: {
          ...this.value?.value_min,
          unit_of_measurement: unit || undefined,
        },
      },
    });
  }

  private _unitMaxChanged(ev: CustomEvent) {
    const unit = ev.detail?.value;
    if (unit === this.value?.value_max?.unit_of_measurement) return;
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || "between",
        value_max: {
          ...this.value?.value_max,
          unit_of_measurement: unit || undefined,
        },
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
      font-weight: 500;
      margin-bottom: var(--ha-space-1);
    }

    .inputs {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    .value-row {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    .value-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .value-label {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }

    .value-inputs {
      display: flex;
      gap: var(--ha-space-2);
      align-items: flex-end;
    }

    .value-selector {
      flex: 1;
      display: block;
    }

    .unit-selector {
      width: 120px;
    }

    ha-select {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-numeric_threshold": HaNumericThresholdSelector;
  }
}
