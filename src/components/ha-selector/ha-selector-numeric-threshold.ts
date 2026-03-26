import memoizeOne from "memoize-one";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiChartBellCurveCumulative } from "@mdi/js";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  NumericThresholdSelector,
  ThresholdMode,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-button-toggle-group";
import "../ha-input-helper-text";
import "../ha-select";
import "./ha-selector";

const iconThresholdAbove =
  "M 2 2 L 2 22 L 22 22 L 22 20 L 4 20 L 4 2 L 2 2 z M 17.976562 6 C 17.965863 6.00017 17.951347 6.0014331 17.935547 6.0019531 C 17.903847 6.0030031 17.862047 6.0043225 17.810547 6.0078125 C 17.707247 6.0148425 17.564772 6.0273144 17.388672 6.0527344 C 17.036572 6.1035743 16.54829 6.2035746 15.962891 6.3964844 C 14.788292 6.783584 13.232027 7.5444846 11.611328 9.0332031 C 10.753918 9.820771 9.8854345 10.808987 9.0449219 12.042969 C 7.881634 12.257047 7 13.274809 7 14.5 C 7 15.880699 8.1192914 17 9.5 17 C 10.880699 17 12 15.880699 12 14.5 C 12 13.732663 11.653544 13.046487 11.109375 12.587891 C 11.732682 11.74814 12.359503 11.061942 12.964844 10.505859 C 14.359842 9.2245207 15.662945 8.6023047 16.589844 8.296875 C 17.054643 8.1437252 17.426428 8.0689231 17.673828 8.0332031 C 17.797428 8.0153531 17.891466 8.0076962 17.947266 8.0039062 C 17.974966 8.0020263 17.992753 8.0003 18.001953 8 L 17.998047 6 L 17.976562 6 z";

const iconThresholdBelow =
  "M 2 2 L 2 22 L 22 22 L 22 20 L 4 20 L 4 2 L 2 2 z M 9.5 7 C 8.1192914 7 7 8.1192914 7 9.5 C 7 10.880699 8.1192914 12 9.5 12 C 9.598408 12 9.6955741 11.993483 9.7910156 11.982422 C 10.39444 12.754246 11.005767 13.410563 11.611328 13.966797 C 13.232027 15.455495 14.788292 16.216416 15.962891 16.603516 C 16.54829 16.796415 17.036572 16.896366 17.388672 16.947266 C 17.564772 16.972666 17.707247 16.985188 17.810547 16.992188 C 17.862047 16.995687 17.903847 16.997047 17.935547 16.998047 C 17.951347 16.998547 17.965863 16.9998 17.976562 17 L 17.998047 17 L 18.001953 15 C 17.992753 14.9997 17.974966 14.999947 17.947266 14.998047 C 17.891466 14.994247 17.797428 14.984597 17.673828 14.966797 C 17.426428 14.931097 17.054643 14.856325 16.589844 14.703125 C 15.662945 14.397725 14.359842 13.775439 12.964844 12.494141 C 12.496227 12.063656 12.015935 11.551532 11.533203 10.955078 C 11.826929 10.545261 12 10.042666 12 9.5 C 12 8.1192914 10.880699 7 9.5 7 z";

const iconThresholdBetween =
  "M 2 2 L 2 22 L 22 22 L 22 20 L 4 20 L 4 2 L 2 2 z M 16.5 4 C 15.119301 4 14 5.1192914 14 6.5 C 14 6.8572837 14.075904 7.196497 14.210938 7.5039062 C 13.503071 8.3427071 12.800578 9.3300361 12.130859 10.501953 C 11.718781 11.223082 11.287475 11.849823 10.845703 12.394531 C 10.457136 12.145771 9.9956073 12 9.5 12 C 8.1192914 12 7 13.119301 7 14.5 C 7 15.880699 8.1192914 17 9.5 17 C 10.880699 17 12 15.880699 12 14.5 C 12 14.38201 11.990422 14.26598 11.974609 14.152344 C 12.636605 13.409426 13.276156 12.531884 13.869141 11.494141 C 14.462491 10.455789 15.073208 9.5905169 15.681641 8.8613281 C 15.938115 8.9501682 16.213303 9 16.5 9 C 17.880699 9 19 7.8807086 19 6.5 C 19 5.1192914 17.880699 4 16.5 4 z";

const iconThresholdOutside =
  "M 2 2 L 2 22 L 22 22 L 22 20 L 4 20 L 4 19.046875 C 4.226574 19.041905 4.4812768 19.028419 4.7597656 19 C 5.8832145 18.8854 7.4011147 18.537974 9.0019531 17.609375 L 8.8847656 17.408203 C 9.320466 17.777433 9.8841605 18 10.5 18 C 11.880699 18 13 16.880699 13 15.5 C 13 14.119301 11.880699 13 10.5 13 C 9.1192914 13 8 14.119301 8 15.5 C 8 15.654727 8.0141099 15.806171 8.0410156 15.953125 L 7.9980469 15.876953 C 6.6882482 16.636752 5.4555097 16.918066 4.5566406 17.009766 C 4.3512557 17.030705 4.166436 17.040275 4 17.044922 L 4 2 L 2 2 z M 21.976562 4 C 21.965863 4.00017 21.951347 4.0014331 21.935547 4.0019531 C 21.903847 4.0030031 21.862047 4.0043225 21.810547 4.0078125 C 21.707247 4.0148425 21.564772 4.0273144 21.388672 4.0527344 C 21.036572 4.1035743 20.54829 4.2035846 19.962891 4.3964844 C 19.34193 4.6011277 18.613343 4.9149715 17.826172 5.3808594 C 17.441793 5.1398775 16.987134 5 16.5 5 C 15.119301 5 14 6.1192914 14 7.5 C 14 8.8807086 15.119301 10 16.5 10 C 17.880699 10 19 8.8807086 19 7.5 C 19 7.3403872 18.983669 7.1845035 18.955078 7.0332031 C 19.569666 6.6795942 20.126994 6.4493921 20.589844 6.296875 C 21.054643 6.1437252 21.426428 6.0689231 21.673828 6.0332031 C 21.797428 6.0153531 21.891466 6.0076962 21.947266 6.0039062 C 21.974966 6.0020263 21.992753 6.0003 22.001953 6 L 21.998047 4 L 21.976562 4 z";

type ThresholdType = "above" | "below" | "between" | "outside" | "any";

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

const DEFAULT_TYPE: Record<ThresholdMode, ThresholdType> = {
  crossed: "above",
  changed: "any",
  is: "above",
};

@customElement("ha-selector-numeric_threshold")
export class HaNumericThresholdSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: NumericThresholdSelector;

  @property({ attribute: false }) public value?: NumericThresholdValue;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _type?: ThresholdType;

  private _getMode(): ThresholdMode {
    return this.selector.numeric_threshold?.mode ?? "crossed";
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("value") || changedProperties.has("selector")) {
      const mode = this._getMode();
      this._type = this.value?.type || DEFAULT_TYPE[mode];
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (
      (changedProperties.has("value") || changedProperties.has("selector")) &&
      !this.value
    ) {
      const mode = this._getMode();
      const type = DEFAULT_TYPE[mode];
      fireEvent(this, "value-changed", { value: { type } });
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
    const mode = this._getMode();
    const type = this._type || DEFAULT_TYPE[mode];
    const showSingleValue = type === "above" || type === "below";
    const showRangeValues = type === "between" || type === "outside";
    const unitOptions = this._getUnitOptions();

    const typeOptions = this._buildTypeOptions(this.hass.localize, mode);

    const choiceToggleButtons = [
      {
        label: this.hass.localize(
          "ui.components.selectors.numeric_threshold.number"
        ),
        value: "number",
      },
      {
        label: this.hass.localize(
          "ui.components.selectors.numeric_threshold.entity"
        ),
        value: "entity",
      },
    ];

    // Value-row label for single-value types (above/below).
    const singleValueLabel = this.hass.localize(
      `ui.components.selectors.numeric_threshold.${mode}.${type as "above" | "below"}`
    );

    // Determine which type-select label to use per mode
    const typeSelectLabel = this.hass.localize(
      `ui.components.selectors.numeric_threshold.${mode}.type`
    );

    return html`
      <div class="container">
        ${this.label
          ? html`<label>${this.label}${this.required ? "*" : ""}</label>`
          : nothing}
        <div class="inputs">
          <ha-select
            .label=${typeSelectLabel}
            .value=${type}
            .options=${typeOptions}
            .disabled=${this.disabled}
            @selected=${this._typeChanged}
          ></ha-select>

          ${showSingleValue
            ? this._renderValueRow(
                singleValueLabel,
                this.value?.value,
                this._valueChanged,
                this._valueChoiceChanged,
                this._unitChanged,
                unitOptions,
                choiceToggleButtons
              )
            : nothing}
          ${showRangeValues
            ? html`
                ${this._renderValueRow(
                  this.hass.localize(
                    "ui.components.selectors.numeric_threshold.from"
                  ),
                  this.value?.value_min,
                  this._valueMinChanged,
                  this._valueMinChoiceChanged,
                  this._unitMinChanged,
                  unitOptions,
                  choiceToggleButtons
                )}
                ${this._renderValueRow(
                  this.hass.localize(
                    "ui.components.selectors.numeric_threshold.to"
                  ),
                  this.value?.value_max,
                  this._valueMaxChanged,
                  this._valueMaxChoiceChanged,
                  this._unitMaxChanged,
                  unitOptions,
                  choiceToggleButtons
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

  private _buildTypeOptions = memoizeOne(
    (localize: HomeAssistant["localize"], mode: ThresholdMode) => {
      const baseOptions = (
        [
          { value: "above", iconPath: iconThresholdAbove },
          { value: "below", iconPath: iconThresholdBelow },
          { value: "between", iconPath: iconThresholdBetween },
          { value: "outside", iconPath: iconThresholdOutside },
        ] as const
      ).map(({ value, iconPath }) => ({
        value,
        iconPath,
        label: localize(
          `ui.components.selectors.numeric_threshold.${mode}.${value}`
        ),
      }));

      if (mode !== "changed") {
        return baseOptions;
      }

      return [
        {
          value: "any",
          iconPath: mdiChartBellCurveCumulative,
          label: localize(
            "ui.components.selectors.numeric_threshold.changed.any"
          ),
        },
        ...baseOptions,
      ];
    }
  );

  private _renderUnitSelect(
    entry: ThresholdValueEntry | undefined,
    handler: (ev: CustomEvent) => void,
    unitOptions: readonly string[]
  ) {
    if (unitOptions.length <= 1) {
      return nothing;
    }
    const mappedUnitOptions = unitOptions.map((unit) => ({
      value: unit,
      label: unit,
    }));
    const unitLabel = this.hass.localize(
      "ui.components.selectors.numeric_threshold.unit"
    );
    return html`
      <ha-select
        class="unit-selector"
        .label=${unitLabel}
        .value=${entry?.unit_of_measurement || unitOptions[0]}
        .options=${mappedUnitOptions}
        .disabled=${this.disabled}
        @selected=${handler}
      ></ha-select>
    `;
  }

  private _renderValueRow(
    rowLabel: string,
    entry: ThresholdValueEntry | undefined,
    onValueChanged: (ev: CustomEvent) => void,
    onChoiceChanged: (ev: CustomEvent) => void,
    onUnitChanged: (ev: CustomEvent) => void,
    unitOptions: readonly string[] | undefined,
    choiceToggleButtons: { label: string; value: string }[]
  ) {
    const activeChoice = entry?.active_choice ?? "number";
    const isEntity = activeChoice === "entity";
    const showUnit = !isEntity && !!unitOptions && unitOptions.length > 1;
    const innerValue = isEntity ? entry?.entity : entry?.number;
    const effectiveUnit = entry?.unit_of_measurement || unitOptions?.[0];
    const numberSelector = {
      number: {
        ...this.selector.numeric_threshold?.number,
        ...(effectiveUnit ? { unit_of_measurement: effectiveUnit } : {}),
      },
    };
    const entitySelector = {
      entity: {
        filter: this._getEntityFilter(),
      },
    };
    const innerSelector = isEntity ? entitySelector : numberSelector;
    return html`
      <div class="value-row">
        <div class="value-header">
          ${rowLabel
            ? html`<span class="value-label"
                >${rowLabel}${this.required ? "*" : ""}</span
              >`
            : nothing}
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
          ${showUnit
            ? this._renderUnitSelect(entry, onUnitChanged, unitOptions!)
            : nothing}
        </div>
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
    // "any" type has no value fields

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _choiceChanged(
    field: "value" | "value_min" | "value_max",
    ev: CustomEvent
  ) {
    ev.stopPropagation();
    const choice = ev.detail?.value as string;
    const defaultUnit = this._getUnitOptions()?.[0];
    const entry: ThresholdValueEntry = {
      ...this.value?.[field],
      active_choice: choice,
    };
    if (choice !== "entity" && !entry.unit_of_measurement && defaultUnit) {
      entry.unit_of_measurement = defaultUnit;
    }
    const defaultType = field === "value" ? "above" : "between";
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || defaultType,
        [field]: entry,
        ...(field === "value"
          ? { value_min: undefined, value_max: undefined }
          : { value: undefined }),
      },
    });
  }

  private _valueChoiceChanged = (ev: CustomEvent) =>
    this._choiceChanged("value", ev);

  private _valueMinChoiceChanged = (ev: CustomEvent) =>
    this._choiceChanged("value_min", ev);

  private _valueMaxChoiceChanged = (ev: CustomEvent) =>
    this._choiceChanged("value_max", ev);

  // Called when the inner number/entity selector value changes
  private _entryChanged(
    field: "value" | "value_min" | "value_max",
    ev: CustomEvent
  ) {
    ev.stopPropagation();
    const activeChoice = this.value?.[field]?.active_choice ?? "number";
    const defaultUnit = this._getUnitOptions()?.[0];
    const entry: ThresholdValueEntry = {
      ...this.value?.[field],
      active_choice: activeChoice,
      [activeChoice]: ev.detail.value,
    };
    if (
      activeChoice !== "entity" &&
      !entry.unit_of_measurement &&
      defaultUnit
    ) {
      entry.unit_of_measurement = defaultUnit;
    }
    const defaultType = field === "value" ? "above" : "between";
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || defaultType,
        [field]: entry,
        ...(field === "value"
          ? { value_min: undefined, value_max: undefined }
          : { value: undefined }),
      },
    });
  }

  private _valueChanged = (ev: CustomEvent) => this._entryChanged("value", ev);

  private _valueMinChanged = (ev: CustomEvent) =>
    this._entryChanged("value_min", ev);

  private _valueMaxChanged = (ev: CustomEvent) =>
    this._entryChanged("value_max", ev);

  private _unitFieldChanged(
    field: "value" | "value_min" | "value_max",
    ev: CustomEvent
  ) {
    const unit = ev.detail?.value;
    if (unit === this.value?.[field]?.unit_of_measurement) return;
    const activeChoice = this.value?.[field]?.active_choice ?? "number";
    const defaultType = field === "value" ? "above" : "between";
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        type: this._type || defaultType,
        [field]: {
          ...this.value?.[field],
          active_choice: activeChoice,
          unit_of_measurement: unit || undefined,
        },
      },
    });
  }

  private _unitChanged = (ev: CustomEvent) =>
    this._unitFieldChanged("value", ev);

  private _unitMinChanged = (ev: CustomEvent) =>
    this._unitFieldChanged("value_min", ev);

  private _unitMaxChanged = (ev: CustomEvent) =>
    this._unitFieldChanged("value_max", ev);

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

    .inputs,
    .value-row {
      --ha-input-padding-bottom: 0;
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
      align-items: flex-start;
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
      margin-bottom: var(--ha-space-5);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-numeric_threshold": HaNumericThresholdSelector;
  }
}
