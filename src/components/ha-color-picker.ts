import { mdiInvertColorsOff, mdiPalette } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor, THEME_COLORS } from "../common/color/compute-color";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeKeys } from "../common/translations/localize";
import type { HomeAssistant } from "../types";
import "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import type { PickerValueRenderer } from "./ha-picker-field";

@customElement("ha-color-picker")
export class HaColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public value?: string;

  @property({ type: String, attribute: "default_color" })
  public defaultColor?: string;

  @property({ type: Boolean, attribute: "include_state" })
  public includeState = false;

  @property({ type: Boolean, attribute: "include_none" })
  public includeNone = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  render() {
    const effectiveValue = this.value ?? this.defaultColor ?? "";

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .disabled=${this.disabled}
        .required=${this.required}
        .hideClearIcon=${!this.value && !!this.defaultColor}
        .label=${this.label}
        .helper=${this.helper}
        .value=${effectiveValue}
        .getItems=${this._getItems}
        .rowRenderer=${this._rowRenderer}
        .valueRenderer=${this._valueRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _getItems = () =>
    this._getColors(
      this.includeNone,
      this.includeState,
      this.defaultColor,
      this.value
    );

  private _getColors = (
    includeNone: boolean,
    includeState: boolean,
    defaultColor: string | undefined,
    currentValue: string | undefined
  ): PickerComboBoxItem[] => {
    const items: PickerComboBoxItem[] = [];

    const defaultSuffix = this.hass.localize(
      "ui.components.color-picker.default"
    );

    const addDefaultSuffix = (label: string, isDefault: boolean) =>
      isDefault && defaultSuffix ? `${label} (${defaultSuffix})` : label;

    if (includeNone) {
      const noneLabel =
        this.hass.localize("ui.components.color-picker.none") || "None";
      items.push({
        id: "none",
        primary: addDefaultSuffix(noneLabel, defaultColor === "none"),
        icon_path: mdiInvertColorsOff,
        sorting_label: noneLabel,
      });
    }

    if (includeState) {
      const stateLabel =
        this.hass.localize("ui.components.color-picker.state") || "State";
      items.push({
        id: "state",
        primary: addDefaultSuffix(stateLabel, defaultColor === "state"),
        icon_path: mdiPalette,
        sorting_label: stateLabel,
      });
    }

    Array.from(THEME_COLORS).forEach((color) => {
      const themeLabel =
        this.hass.localize(
          `ui.components.color-picker.colors.${color}` as LocalizeKeys
        ) || color;
      items.push({
        id: color,
        primary: addDefaultSuffix(themeLabel, defaultColor === color),
        sorting_label: themeLabel,
      });
    });

    const isSpecial =
      currentValue === "none" ||
      currentValue === "state" ||
      THEME_COLORS.has(currentValue || "");

    const hasValue = currentValue && currentValue.length > 0;

    if (hasValue && !isSpecial) {
      items.push({
        id: currentValue!,
        primary: currentValue!,
        sorting_label: currentValue!,
      });
    }

    return items;
  };

  private _rowRenderer: (
    item: PickerComboBoxItem,
    index?: number
  ) => ReturnType<typeof html> = (item) => html`
    <ha-combo-box-item type="button" compact>
      ${item.id === "none"
        ? html`<ha-svg-icon
            slot="start"
            .path=${mdiInvertColorsOff}
          ></ha-svg-icon>`
        : item.id === "state"
          ? html`<ha-svg-icon slot="start" .path=${mdiPalette}></ha-svg-icon>`
          : html`<span slot="start">
              ${this._renderColorCircle(item.id)}
            </span>`}
      <span slot="headline">${item.primary}</span>
    </ha-combo-box-item>
  `;

  private _valueRenderer: PickerValueRenderer = (value: string) => {
    if (value === "none") {
      return html`
        <ha-svg-icon slot="start" .path=${mdiInvertColorsOff}></ha-svg-icon>
        <span slot="headline">
          ${this.hass.localize("ui.components.color-picker.none")}
        </span>
      `;
    }
    if (value === "state") {
      return html`
        <ha-svg-icon slot="start" .path=${mdiPalette}></ha-svg-icon>
        <span slot="headline">
          ${this.hass.localize("ui.components.color-picker.state")}
        </span>
      `;
    }

    return html`
      <span slot="start">${this._renderColorCircle(value)}</span>
      <span slot="headline">
        ${this.hass.localize(
          `ui.components.color-picker.colors.${value}` as LocalizeKeys
        ) || value}
      </span>
    `;
  };

  private _renderColorCircle(color: string) {
    return html`
      <span
        style=${styleMap({
          "--circle-color": computeCssColor(color),
          display: "block",
          "background-color": "var(--circle-color, var(--divider-color))",
          border: "1px solid var(--outline-color)",
          "border-radius": "var(--ha-border-radius-pill)",
          width: "20px",
          height: "20px",
          "box-sizing": "border-box",
        })}
      ></span>
    `;
  }

  private _valueChanged(ev: CustomEvent<{ value?: string }>) {
    ev.stopPropagation();
    const selected = ev.detail.value;
    const normalized =
      selected && selected === this.defaultColor
        ? undefined
        : (selected ?? undefined);
    this.value = normalized;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-color-picker": HaColorPicker;
  }
}
