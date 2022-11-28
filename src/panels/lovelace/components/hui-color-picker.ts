import "@material/mwc-list/mwc-list-item";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import {
  computeRgbColor,
  THEME_COLORS,
} from "../../../common/color/compute-color";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import "../../../components/ha-select";
import { HomeAssistant } from "../../../types";

@customElement("hui-color-picker")
export class HuiColorPicker extends LitElement {
  @property() public label?: string;

  @property() public helper?: string;

  @property() public hass!: HomeAssistant;

  @property() public value?: string;

  @property({ type: Boolean }) public disabled = false;

  _valueSelected(ev) {
    const value = ev.target.value;
    if (value) {
      fireEvent(this, "value-changed", {
        value: value !== "default" ? value : undefined,
      });
    }
  }

  render() {
    return html`
      <ha-select
        .icon=${Boolean(this.value)}
        .label=${this.label}
        .value=${this.value || "default"}
        .helper=${this.helper}
        .disabled=${this.disabled}
        @closed=${stopPropagation}
        @selected=${this._valueSelected}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${this.value
          ? html`
              <span slot="icon">
                ${this.renderColorCircle(this.value || "grey")}
              </span>
            `
          : null}
        <mwc-list-item value="default">
          ${this.hass.localize(
            `ui.panel.lovelace.editor.color-picker.default_color`
          )}
        </mwc-list-item>
        ${Array.from(THEME_COLORS).map(
          (color) => html`
            <mwc-list-item .value=${color} graphic="icon">
              ${this.hass.localize(
                `ui.panel.lovelace.editor.color-picker.colors.${color}`
              ) || color}
              <span slot="graphic">${this.renderColorCircle(color)}</span>
            </mwc-list-item>
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
          "--circle-color": computeRgbColor(color),
        })}
      ></span>
    `;
  }

  static get styles() {
    return css`
      .circle-color {
        display: block;
        background-color: rgb(var(--circle-color));
        border-radius: 10px;
        width: 20px;
        height: 20px;
      }
      ha-select {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-color-picker": HuiColorPicker;
  }
}
