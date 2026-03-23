import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { NumericThresholdSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-select";
import type { HaSelect } from "../ha-select";
import "./ha-selector";

type ThresholdType = "above" | "below" | "between" | "outside";

interface NumericThresholdValue {
  type: ThresholdType;
  lower_limit?: number | string;
  upper_limit?: number | string;
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

  protected render() {
    const type = this._type || "above";
    const showSingleValue = type === "above" || type === "below";
    const showRangeValues = type === "between" || type === "outside";

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
            .disabled=${this.disabled}
            @selected=${this._typeChanged}
            fixedMenuPosition
            naturalMenuWidth
          >
            <ha-list-item value="above">
              ${this.hass.localize(
                "ui.components.selectors.numeric_threshold.above"
              )}
            </ha-list-item>
            <ha-list-item value="below">
              ${this.hass.localize(
                "ui.components.selectors.numeric_threshold.below"
              )}
            </ha-list-item>
            <ha-list-item value="between">
              ${this.hass.localize(
                "ui.components.selectors.numeric_threshold.in_range"
              )}
            </ha-list-item>
            <ha-list-item value="outside">
              ${this.hass.localize(
                "ui.components.selectors.numeric_threshold.outside_range"
              )}
            </ha-list-item>
          </ha-select>

          ${showSingleValue
            ? html`
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{
                    choose: {
                      choices: {
                        number: {
                          selector: {
                            number: this.selector.numeric_threshold?.number,
                          },
                        },
                        entity: {
                          selector: {
                            entity: {
                              filter: this.selector.numeric_threshold?.entity,
                            },
                          },
                        },
                      },
                    },
                  }}
                  .value=${this.value?.value}
                  .disabled=${this.disabled}
                  .required=${this.required}
                  @value-changed=${this._valueChanged}
                  .label=${this.hass.localize(
                    "ui.components.selectors.numeric_threshold.value"
                  )}
                ></ha-selector>
              `
            : nothing}
          ${showRangeValues
            ? html`
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{
                    choose: {
                      choices: {
                        number: {
                          selector: {
                            number: this.selector.numeric_threshold?.number,
                          },
                        },
                        entity: {
                          selector: {
                            entity: {
                              filter: this.selector.numeric_threshold?.entity,
                            },
                          },
                        },
                      },
                    },
                  }}
                  .value=${this.value?.value_min}
                  .disabled=${this.disabled}
                  .required=${this.required}
                  @value-changed=${this._valueMinChanged}
                  .label=${this.hass.localize(
                    "ui.components.selectors.numeric_threshold.minimum_value"
                  )}
                ></ha-selector>
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{
                    choose: {
                      choices: {
                        number: {
                          selector: {
                            number: this.selector.numeric_threshold?.number,
                          },
                        },
                        entity: {
                          selector: {
                            entity: {
                              filter: this.selector.numeric_threshold?.entity,
                            },
                          },
                        },
                      },
                    },
                  }}
                  .value=${this.value?.value_max}
                  .disabled=${this.disabled}
                  .required=${this.required}
                  @value-changed=${this._valueMaxChanged}
                  .label=${this.hass.localize(
                    "ui.components.selectors.numeric_threshold.maximum_value"
                  )}
                ></ha-selector>
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
    const target = ev.target as HaSelect;
    if (!target.value || target.value === this._type) {
      return;
    }
    this._type = target.value as ThresholdType;

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

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newValue: NumericThresholdValue = {
      ...this.value,
      type: this._type || "above",
      value: ev.detail.value,
    };
    // Clean up range values when using single value
    delete newValue.value_min;
    delete newValue.value_max;
    fireEvent(this, "value-changed", { value: newValue });
  }

  private _valueMinChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newValue: NumericThresholdValue = {
      ...this.value,
      type: this._type || "between",
      value_min: ev.detail.value,
    };
    // Clean up single value when using range
    delete newValue.value;
    fireEvent(this, "value-changed", { value: newValue });
  }

  private _valueMaxChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newValue: NumericThresholdValue = {
      ...this.value,
      type: this._type || "between",
      value_max: ev.detail.value,
    };
    // Clean up single value when using range
    delete newValue.value;
    fireEvent(this, "value-changed", { value: newValue });
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
      gap: var(--ha-space-4);
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
