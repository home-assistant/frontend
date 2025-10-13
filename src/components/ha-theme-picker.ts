import type { TemplateResult } from "lit";
import { css, html, nothing, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import type { HomeAssistant } from "../types";
import "./ha-select";
import "./ha-list-item";

const DEFAULT_THEME = "default";

@customElement("ha-theme-picker")
export class HaThemePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property({ attribute: "include-default", type: Boolean })
  public includeDefault = false;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  protected render(): TemplateResult {
    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize("ui.components.theme-picker.theme")}
        .value=${this.value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${!this.required
          ? html`
              <ha-list-item value="remove">
                ${this.hass!.localize("ui.components.theme-picker.no_theme")}
              </ha-list-item>
            `
          : nothing}
        ${this.includeDefault
          ? html`
              <ha-list-item .value=${DEFAULT_THEME}>
                Home Assistant
              </ha-list-item>
            `
          : nothing}
        ${Object.keys(this.hass!.themes.themes)
          .sort()
          .map(
            (theme) =>
              html`<ha-list-item .value=${theme}>${theme}</ha-list-item>`
          )}
      </ha-select>
    `;
  }

  static styles = css`
    ha-select {
      width: 100%;
    }
  `;

  private _changed(ev): void {
    if (!this.hass || ev.target.value === "") {
      return;
    }
    this.value = ev.target.value === "remove" ? undefined : ev.target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-theme-picker": HaThemePicker;
  }
}
