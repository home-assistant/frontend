import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./ha-select";
import type { HaSelectOption } from "./ha-select";

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
    const options: HaSelectOption[] = Object.keys(
      this.hass?.themes.themes || {}
    ).map((theme) => ({
      value: theme,
    }));

    if (this.includeDefault) {
      options.unshift({
        value: DEFAULT_THEME,
        label: "Home Assistant",
      });
    }

    if (!this.required) {
      options.unshift({
        value: "remove",
        label: this.hass!.localize("ui.components.theme-picker.no_theme"),
      });
    }

    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize("ui.components.theme-picker.theme")}
        .value=${this.value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        .options=${options}
      ></ha-select>
    `;
  }

  static styles = css`
    ha-select {
      width: 100%;
    }
  `;

  private _changed(ev: CustomEvent<{ value: string }>): void {
    if (!this.hass || ev.detail.value === "") {
      return;
    }
    this.value = ev.detail.value === "remove" ? undefined : ev.detail.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-theme-picker": HaThemePicker;
  }
}
