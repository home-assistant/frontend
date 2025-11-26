import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type { NumberSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../entity/ha-entity-picker";
import "../ha-button-toggle-group";
import "../ha-input-helper-text";
import "../ha-slider";
import "../ha-textfield";

@customElement("ha-selector-number")
export class HaNumberSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: NumberSelector;

  @property({ type: Number }) public value?: number | string;

  @property({ type: Number }) public placeholder?: number;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property({ type: Boolean }) public required = true;

  @property({ type: Boolean }) public disabled = false;

  @state() private _mode: "number" | "entity" = "number";

  private _valueStr = "";

  protected willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      if (
        this.selector.number?.entity?.domains.length &&
        typeof this.value === "string" &&
        this.selector.number?.entity?.domains.some((domain) =>
          (this.value as string).startsWith(`${domain}.`)
        )
      ) {
        this._mode = "entity";
      }
    }
    if (changedProps.has("value")) {
      if (this._valueStr === "" || this.value !== Number(this._valueStr)) {
        this._valueStr =
          this.value == null ||
          typeof this.value === "string" ||
          isNaN(this.value)
            ? ""
            : this.value.toString();
      }
    }
  }

  protected render() {
    const isBox =
      this.selector.number?.mode === "box" ||
      this.selector.number?.min === undefined ||
      this.selector.number?.max === undefined;

    const multiMode = Boolean(this.selector.number?.entity?.domains.length);

    let sliderStep;

    if (!isBox) {
      sliderStep = this.selector.number!.step ?? 1;
      if (sliderStep === "any") {
        sliderStep = 1;
        // divide the range of the slider by 100 steps
        const step =
          (this.selector.number!.max! - this.selector.number!.min!) / 100;
        // biggest step size is 1, round the step size to a division of 1
        while (sliderStep > step) {
          sliderStep /= 10;
        }
      }
    }

    const translationKey = this.selector.number?.translation_key;
    let unit = this.selector.number?.unit_of_measurement;
    if (isBox && unit && this.localizeValue && translationKey) {
      unit =
        this.localizeValue(`${translationKey}.unit_of_measurement.${unit}`) ||
        unit;
    }

    return html`
      ${this.label && !isBox && !multiMode
        ? html`${this.label}${this.required ? "*" : ""}`
        : nothing}
      ${multiMode
        ? html`<div class="multi-header">
            <span>${this.label}${this.required ? "*" : ""}</span>
            <ha-button-toggle-group
              size="small"
              .buttons=${this._toggleButtons(this.hass.localize)}
              .active=${this._mode}
              @value-changed=${this._modeChanged}
            ></ha-button-toggle-group>
          </div>`
        : nothing}
      <div class="input">
        ${multiMode && this._mode === "entity"
          ? html`<ha-entity-picker
              .hass=${this.hass}
              .includeDomains=${this.selector.number!.entity!.domains}
              .value=${this.value}
              .placeholder=${this.placeholder}
              .helper=${this.helper}
              .disabled=${this.disabled}
              .required=${this.required}
            ></ha-entity-picker>`
          : html`${!isBox
                ? html`
                    <ha-slider
                      labeled
                      .min=${this.selector.number!.min}
                      .max=${this.selector.number!.max}
                      .value=${this.value}
                      .step=${sliderStep}
                      .disabled=${this.disabled}
                      .required=${this.required}
                      @change=${this._handleSliderChange}
                      .withMarkers=${this.selector.number?.slider_ticks ||
                      false}
                    >
                    </ha-slider>
                  `
                : nothing}
              <ha-textfield
                .inputMode=${this.selector.number?.step === "any" ||
                (this.selector.number?.step ?? 1) % 1 !== 0
                  ? "decimal"
                  : "numeric"}
                .label=${!isBox ? undefined : this.label}
                .placeholder=${this.placeholder}
                class=${classMap({ single: isBox })}
                .min=${this.selector.number?.min}
                .max=${this.selector.number?.max}
                .value=${this._valueStr ?? ""}
                .step=${this.selector.number?.step ?? 1}
                helperPersistent
                .helper=${isBox ? this.helper : undefined}
                .disabled=${this.disabled}
                .required=${this.required}
                .suffix=${unit}
                type="number"
                autoValidate
                ?no-spinner=${!isBox}
                @input=${this._handleInputChange}
              >
              </ha-textfield>`}
      </div>
      ${!isBox && !(multiMode && this._mode === "entity") && this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : nothing}
    `;
  }

  private _toggleButtons = memoizeOne((localize: HomeAssistant["localize"]) => [
    {
      label: localize("ui.components.selectors.number.value"),
      value: "number",
    },
    {
      label: localize("ui.components.selectors.number.entity_value"),
      value: "entity",
    },
  ]);

  private _modeChanged(ev) {
    ev.stopPropagation();
    this._mode = ev.detail?.value || ev.target.value;
  }

  private _handleInputChange(ev) {
    ev.stopPropagation();
    this._valueStr = ev.target.value;
    const value =
      ev.target.value === "" || isNaN(ev.target.value)
        ? undefined
        : Number(ev.target.value);
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  private _handleSliderChange(ev) {
    ev.stopPropagation();
    const value = Number(ev.target.value);
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    .input {
      display: flex;
      justify-content: space-between;
      align-items: center;
      direction: ltr;
    }
    ha-slider {
      flex: 1;
      margin-right: var(--ha-space-4);
      margin-inline-end: var(--ha-space-4);
      margin-inline-start: 0;
    }
    ha-textfield {
      --ha-textfield-input-width: 40px;
    }
    .multi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--ha-space-2);
    }

    .single {
      --ha-textfield-input-width: unset;
      flex: 1;
    }
    ha-entity-picker {
      display: block;
      width: 100%;
    }
    ha-button-toggle-group {
      display: block;
      justify-self: end;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-number": HaNumberSelector;
  }
}
