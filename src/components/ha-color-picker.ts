import { mdiInvertColorsOff, mdiPalette } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor, THEME_COLORS } from "../common/color/compute-color";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import type { LocalizeKeys } from "../common/translations/localize";
import type { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-md-divider";
import "./ha-select";
import type { HaSelect } from "./ha-select";

@customElement("ha-color-picker")
export class HaColorPicker extends LitElement {
  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public value?: string;

  @property({ type: String, attribute: "default_color" })
  public defaultColor?: string;

  @property({ type: Boolean, attribute: "include_state" })
  public includeState = false;

  @property({ type: Boolean, attribute: "include_none" })
  public includeNone = false;

  @property({ type: Boolean }) public disabled = false;

  @query("ha-select") private _select?: HaSelect;

  connectedCallback(): void {
    super.connectedCallback();
    // Refresh layout options when the field is connected to the DOM to ensure current value displayed
    this._select?.layoutOptions();
  }

  private _valueSelected(ev) {
    ev.stopPropagation();
    if (!this.isConnected) return;
    const value = ev.target.value;
    this.value = value === this.defaultColor ? undefined : value;
    fireEvent(this, "value-changed", {
      value: this.value,
    });
  }

  render() {
    const value = this.value || this.defaultColor || "";

    const isCustom = !(
      THEME_COLORS.has(value) ||
      value === "none" ||
      value === "state"
    );

    return html`
      <ha-select
        .icon=${Boolean(value)}
        .label=${this.label}
        .value=${value}
        .helper=${this.helper}
        .disabled=${this.disabled}
        @closed=${stopPropagation}
        @selected=${this._valueSelected}
        fixedMenuPosition
        naturalMenuWidth
        .clearable=${!this.defaultColor}
      >
        ${value
          ? html`
              <span slot="icon">
                ${value === "none"
                  ? html`
                      <ha-svg-icon path=${mdiInvertColorsOff}></ha-svg-icon>
                    `
                  : value === "state"
                    ? html`<ha-svg-icon path=${mdiPalette}></ha-svg-icon>`
                    : this._renderColorCircle(value || "grey")}
              </span>
            `
          : nothing}
        ${this.includeNone
          ? html`
              <ha-list-item value="none" graphic="icon">
                ${this.hass.localize("ui.components.color-picker.none")}
                ${this.defaultColor === "none"
                  ? ` (${this.hass.localize("ui.components.color-picker.default")})`
                  : nothing}
                <ha-svg-icon
                  slot="graphic"
                  path=${mdiInvertColorsOff}
                ></ha-svg-icon>
              </ha-list-item>
            `
          : nothing}
        ${this.includeState
          ? html`
              <ha-list-item value="state" graphic="icon">
                ${this.hass.localize("ui.components.color-picker.state")}
                ${this.defaultColor === "state"
                  ? ` (${this.hass.localize("ui.components.color-picker.default")})`
                  : nothing}
                <ha-svg-icon slot="graphic" path=${mdiPalette}></ha-svg-icon>
              </ha-list-item>
            `
          : nothing}
        ${this.includeState || this.includeNone
          ? html`<ha-md-divider role="separator" tabindex="-1"></ha-md-divider>`
          : nothing}
        ${Array.from(THEME_COLORS).map(
          (color) => html`
            <ha-list-item .value=${color} graphic="icon">
              ${this.hass.localize(
                `ui.components.color-picker.colors.${color}` as LocalizeKeys
              ) || color}
              ${this.defaultColor === color
                ? ` (${this.hass.localize("ui.components.color-picker.default")})`
                : nothing}
              <span slot="graphic">${this._renderColorCircle(color)}</span>
            </ha-list-item>
          `
        )}
        ${isCustom
          ? html`
              <ha-list-item .value=${value} graphic="icon">
                ${value}
                <span slot="graphic">${this._renderColorCircle(value)}</span>
              </ha-list-item>
            `
          : nothing}
      </ha-select>
    `;
  }

  private _renderColorCircle(color: string) {
    return html`
      <span
        class="circle-color"
        style=${styleMap({
          "--circle-color": computeCssColor(color),
        })}
      ></span>
    `;
  }

  static styles = css`
    .circle-color {
      display: block;
      background-color: var(--circle-color, var(--divider-color));
      border: 1px solid var(--outline-color);
      border-radius: var(--ha-border-radius-pill);
      width: 20px;
      height: 20px;
      box-sizing: border-box;
    }
    ha-select {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-color-picker": HaColorPicker;
  }
}
