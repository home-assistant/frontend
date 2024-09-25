import { mdiInvertColorsOff, mdiPalette } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor, THEME_COLORS } from "../common/color/compute-color";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { LocalizeKeys } from "../common/translations/localize";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import "./ha-md-divider";

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

  _valueSelected(ev) {
    const value = ev.target.value;
    this.value = value === this.defaultColor ? undefined : value;
    fireEvent(this, "value-changed", {
      value: this.value,
    });
  }

  render() {
    const value = this.value || this.defaultColor;

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
                    : this.renderColorCircle(value || "grey")}
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
              <span slot="graphic">${this.renderColorCircle(color)}</span>
            </ha-list-item>
          `
        )}
      </ha-select>
    `;
  }

  private renderColorCircle(color: string) {
    return html`
      <span
        class="circle-color"
        style=${styleMap({
          "--circle-color": computeCssColor(color),
        })}
      ></span>
    `;
  }

  static get styles() {
    return css`
      .circle-color {
        display: block;
        background-color: var(--circle-color, var(--divider-color));
        border-radius: 10px;
        width: 20px;
        height: 20px;
        box-sizing: border-box;
      }
      ha-select {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-color-picker": HaColorPicker;
  }
}
