import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

const DEFAULT_THEME = "default";

const SEARCH_KEYS = [{ name: "primary", weight: 1 }];

@customElement("ha-theme-picker")
export class HaThemePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: "include-default", type: Boolean })
  public includeDefault = false;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: "no-theme-label" }) public noThemeLabel?: string;

  private _getThemeOptions = memoizeOne(
    (
      themes: Record<string, unknown>,
      locale: string,
      includeDefault: boolean
    ): PickerComboBoxItem[] => {
      const items: PickerComboBoxItem[] = [];

      if (includeDefault) {
        items.push({ id: DEFAULT_THEME, primary: "Home Assistant" });
      }

      const themeNames = Object.keys(themes).sort((a, b) =>
        caseInsensitiveStringCompare(a, b, locale)
      );
      for (const theme of themeNames) {
        items.push({ id: theme, primary: theme });
      }

      return items;
    }
  );

  private _getItems = () =>
    this._getThemeOptions(
      this.hass?.themes.themes || {},
      this.hass?.locale.language || "en",
      this.includeDefault
    );

  private _valueRenderer = (value: string): TemplateResult =>
    html`<span slot="headline"
      >${this._getItems().find((i) => i.id === value)?.primary ?? value}</span
    >`;

  protected render(): TemplateResult {
    return html`
      <ha-generic-picker
        .label=${this.label ??
        this.hass?.localize("ui.components.theme-picker.theme") ??
        "Theme"}
        .placeholder=${this.noThemeLabel ??
        this.hass?.localize("ui.components.theme-picker.no_theme")}
        .helper=${this.helper}
        .value=${this.value}
        .valueRenderer=${this._valueRenderer}
        .getItems=${this._getItems}
        .searchKeys=${SEARCH_KEYS}
        .disabled=${this.disabled}
        .required=${this.required}
        @value-changed=${this._changed}
        popover-placement="bottom"
      ></ha-generic-picker>
    `;
  }

  static styles = css`
    ha-generic-picker {
      width: 100%;
      display: block;
    }
  `;

  private _changed(ev: ValueChangedEvent<string | undefined>): void {
    ev.stopPropagation();
    this.value = ev.detail.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-theme-picker": HaThemePicker;
  }
}
