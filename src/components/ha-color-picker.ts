import { consume, type ContextType } from "@lit/context";
import { mdiInvertColorsOff, mdiPalette } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor, THEME_COLORS } from "../common/color/compute-color";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeKeys } from "../common/translations/localize";
import { localizeContext } from "../data/context";
import type { UiColorExtraOption } from "../data/selector";
import type { ValueChangedEvent } from "../types";
import "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import type { PickerValueRenderer } from "./ha-picker-field";

@customElement("ha-color-picker")
export class HaColorPicker extends LitElement {
  @property() public label?: string;

  @property() public helper?: string;

  @property() public value?: string;

  @property({ type: String, attribute: "default_color" })
  public defaultColor?: string;

  @property({ type: Boolean, attribute: "include_state" })
  public includeState = false;

  @property({ type: Boolean, attribute: "include_none" })
  public includeNone = false;

  @property({ attribute: false })
  public extraOptions?: UiColorExtraOption[];

  @property({ type: Boolean }) public disabled = false;

  private _extraOptionsColorMap = memoizeOne(
    (extraOptions?: UiColorExtraOption[]) => {
      if (!extraOptions) return undefined;
      const map = new Map<string, string>();
      for (const option of extraOptions) {
        if (option.display_color) {
          map.set(option.value, option.display_color);
        }
      }
      return map.size > 0 ? map : undefined;
    }
  );

  @property({ type: Boolean }) public required = false;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: ContextType<typeof localizeContext>;

  render() {
    const effectiveValue = this.value ?? this.defaultColor ?? "";

    return html`
      <ha-generic-picker
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
        .notFoundLabel=${this.localize?.(
          "ui.components.color-picker.no_colors_found"
        )}
        .getAdditionalItems=${this._getAdditionalItems}
      >
      </ha-generic-picker>
    `;
  }

  private _getAdditionalItems = (
    searchString?: string
  ): PickerComboBoxItem[] => {
    if (!searchString || searchString.trim() === "") {
      return [];
    }
    const colors = this._getColors(
      this.includeNone,
      this.includeState,
      this.extraOptions,
      this.defaultColor,
      this.value
    );
    const exactMatch = colors.find((color) => color.id === searchString);
    if (exactMatch) {
      return [];
    }
    return [
      {
        id: searchString,
        primary:
          this.localize?.("ui.components.color-picker.custom_color") ||
          "Custom color",
        secondary: searchString,
      },
    ];
  };

  private _getItems = () =>
    this._getColors(
      this.includeNone,
      this.includeState,
      this.extraOptions,
      this.defaultColor,
      this.value
    );

  private _getColors = memoizeOne(
    (
      includeNone: boolean,
      includeState: boolean,
      extraOptions: UiColorExtraOption[] | undefined,
      defaultColor: string | undefined,
      currentValue: string | undefined
    ): PickerComboBoxItem[] => {
      const items: PickerComboBoxItem[] = [];

      const defaultSuffix =
        this.localize?.("ui.components.color-picker.default") || "Default";

      const addDefaultSuffix = (label: string, isDefault: boolean) =>
        isDefault && defaultSuffix ? `${label} (${defaultSuffix})` : label;

      if (includeNone) {
        const noneLabel =
          this.localize?.("ui.components.color-picker.none") || "None";
        items.push({
          id: "none",
          primary: addDefaultSuffix(noneLabel, defaultColor === "none"),
          icon_path: mdiInvertColorsOff,
        });
      }

      if (includeState) {
        const stateLabel =
          this.localize?.("ui.components.color-picker.state") || "State";
        items.push({
          id: "state",
          primary: addDefaultSuffix(stateLabel, defaultColor === "state"),
          icon_path: mdiPalette,
        });
      }

      if (extraOptions) {
        extraOptions.forEach((option) => {
          items.push({
            id: option.value,
            primary: addDefaultSuffix(
              option.label,
              defaultColor === option.value
            ),
            ...(option.icon ? { icon: option.icon } : {}),
          });
        });
      }

      Array.from(THEME_COLORS).forEach((color) => {
        const themeLabel =
          this.localize?.(
            `ui.components.color-picker.colors.${color}` as LocalizeKeys
          ) || color;
        items.push({
          id: color,
          primary: addDefaultSuffix(themeLabel, defaultColor === color),
        });
      });

      const knownIds = new Set(items.map((item) => item.id));

      const hasValue = currentValue && currentValue.length > 0;

      if (hasValue && !knownIds.has(currentValue!)) {
        items.push({
          id: currentValue!,
          primary: currentValue!,
        });
      }

      return items;
    }
  );

  private _renderItemIcon(item: PickerComboBoxItem) {
    if (item.icon_path) {
      return html`<ha-svg-icon
        slot="start"
        .path=${item.icon_path}
      ></ha-svg-icon>`;
    }
    if (item.icon) {
      return html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`;
    }
    const color =
      this._extraOptionsColorMap(this.extraOptions)?.get(item.id) ?? item.id;
    return html`<span slot="start">${this._renderColorCircle(color)}</span>`;
  }

  private _rowRenderer: (
    item: PickerComboBoxItem,
    index?: number
  ) => ReturnType<typeof html> = (item) => html`
    <ha-combo-box-item type="button" compact>
      ${this._renderItemIcon(item)}
      <span slot="headline">${item.primary}</span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
    </ha-combo-box-item>
  `;

  private _valueRenderer: PickerValueRenderer = (value: string) => {
    if (value === "none") {
      return html`
        <ha-svg-icon slot="start" .path=${mdiInvertColorsOff}></ha-svg-icon>
        <span slot="headline">
          ${this.localize?.("ui.components.color-picker.none") || "None"}
        </span>
      `;
    }
    if (value === "state") {
      return html`
        <ha-svg-icon slot="start" .path=${mdiPalette}></ha-svg-icon>
        <span slot="headline">
          ${this.localize?.("ui.components.color-picker.state") || "State"}
        </span>
      `;
    }

    const extraOption = this.extraOptions?.find((o) => o.value === value);
    const label =
      extraOption?.label ||
      this.localize?.(
        `ui.components.color-picker.colors.${value}` as LocalizeKeys
      ) ||
      value;

    const color =
      this._extraOptionsColorMap(this.extraOptions)?.get(value) ?? value;
    const startSlot = extraOption?.icon
      ? html`<ha-icon slot="start" .icon=${extraOption.icon}></ha-icon>`
      : html`<span slot="start">${this._renderColorCircle(color)}</span>`;

    return html`
      ${startSlot}
      <span slot="headline">${label}</span>
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

  private _valueChanged(ev: ValueChangedEvent<string | undefined>) {
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
