import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResultGroup,
  html,
  nothing,
  LitElement,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { HomeAssistant } from "../types";
import "./ha-select";

const DEFAULT_THEME = "default";

@customElement("ha-theme-picker")
export class HaThemePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() includeDefault?: boolean = false;

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
              <mwc-list-item value="remove">
                ${this.hass!.localize("ui.components.theme-picker.no_theme")}
              </mwc-list-item>
            `
          : nothing}
        ${this.includeDefault
          ? html`
              <mwc-list-item .value=${DEFAULT_THEME}>
                Home Assistant
              </mwc-list-item>
            `
          : nothing}
        ${Object.keys(this.hass!.themes.themes)
          .sort()
          .map(
            (theme) =>
              html`<mwc-list-item .value=${theme}>${theme}</mwc-list-item>`
          )}
      </ha-select>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-select {
        width: 100%;
      }
    `;
  }

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
