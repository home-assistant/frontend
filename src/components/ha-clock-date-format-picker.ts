import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../common/array/ensure-array";
import { resolveTimeZone } from "../common/datetime/resolve-time-zone";
import { fireEvent } from "../common/dom/fire_event";
import {
  CLOCK_CARD_DATE_PARTS,
  formatClockCardDate,
} from "../panels/lovelace/cards/clock/clock-date-format";
import type { ClockCardDatePart } from "../panels/lovelace/cards/types";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./chips/ha-assist-chip";
import "./chips/ha-chip-set";
import "./chips/ha-input-chip";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import "./ha-input-helper-text";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import "./ha-sortable";

type ClockDatePartSection = "weekday" | "day" | "month" | "year" | "separator";

type ClockDateSeparatorPart = Extract<
  ClockCardDatePart,
  "separator-dash" | "separator-slash" | "separator-dot"
>;

const CLOCK_DATE_PART_SECTION_ORDER: readonly ClockDatePartSection[] = [
  "weekday",
  "day",
  "month",
  "year",
  "separator",
];

const CLOCK_DATE_SEPARATOR_VALUES: Record<ClockDateSeparatorPart, string> = {
  "separator-dash": "-",
  "separator-slash": "/",
  "separator-dot": ".",
};

const getClockDatePartSection = (
  part: ClockCardDatePart
): ClockDatePartSection => {
  if (part.startsWith("weekday-")) {
    return "weekday";
  }

  if (part.startsWith("day-")) {
    return "day";
  }

  if (part.startsWith("month-")) {
    return "month";
  }

  if (part.startsWith("year-")) {
    return "year";
  }

  return "separator";
};

interface ClockDatePartSectionData {
  id: ClockDatePartSection;
  title: string;
  items: PickerComboBoxItem[];
}

@customElement("ha-clock-date-format-picker")
export class HaClockDateFormatPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public label?: string;

  @property() public value?: string[] | string;

  @property() public helper?: string;

  @query("ha-generic-picker", true) private _picker?: HaGenericPicker;

  private _editIndex?: number;

  protected render() {
    const value = this._value;

    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-generic-picker
        .hass=${this.hass}
        .disabled=${this.disabled}
        .required=${this.required && !value.length}
        .value=${this._getPickerValue()}
        .sections=${this._getSections(this.hass.locale.language)}
        .getItems=${this._getItems}
        @value-changed=${this._pickerValueChanged}
      >
        <div slot="field" class="container">
          <ha-sortable
            no-style
            @item-moved=${this._moveItem}
            .disabled=${this.disabled}
            handle-selector="button.primary.action"
            filter=".add"
          >
            <ha-chip-set>
              ${repeat(
                this._value,
                (_item, idx) => idx,
                (item: string, idx) => {
                  const label = this._getItemLabel(
                    item,
                    this.hass.locale.language
                  );
                  const isValid = !!label;

                  return html`
                    <ha-input-chip
                      data-idx=${idx}
                      @remove=${this._removeItem}
                      @click=${this._editItem}
                      .label=${label || item}
                      .selected=${!this.disabled}
                      .disabled=${this.disabled}
                      class=${!isValid ? "invalid" : ""}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiDragHorizontalVariant}
                      ></ha-svg-icon>
                    </ha-input-chip>
                  `;
                }
              )}
              ${this.disabled
                ? nothing
                : html`
                    <ha-assist-chip
                      @click=${this._addItem}
                      .disabled=${this.disabled}
                      label=${this.hass.localize("ui.common.add")}
                      class="add"
                    >
                      <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
                    </ha-assist-chip>
                  `}
            </ha-chip-set>
          </ha-sortable>
        </div>
      </ha-generic-picker>
      ${this._renderHelper()}
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`
          <ha-input-helper-text .disabled=${this.disabled}>
            ${this.helper}
          </ha-input-helper-text>
        `
      : nothing;
  }

  private async _addItem(ev: Event) {
    ev.stopPropagation();

    if (this.disabled) {
      return;
    }

    this._editIndex = undefined;
    await this.updateComplete;
    await this._picker?.open();
  }

  private async _editItem(ev: Event) {
    ev.stopPropagation();

    if (this.disabled) {
      return;
    }

    const idx = parseInt(
      (ev.currentTarget as HTMLElement).dataset.idx || "",
      10
    );
    this._editIndex = idx;
    await this.updateComplete;
    await this._picker?.open();
  }

  private get _value() {
    return !this.value ? [] : ensureArray(this.value);
  }

  private _toValue = memoizeOne((value: string[]): typeof this.value => {
    if (value.length === 0) {
      return undefined;
    }

    if (value.length === 1) {
      return value[0];
    }

    return value;
  });

  private _buildSections = memoizeOne(
    (language: string): ClockDatePartSectionData[] => {
      const itemsBySection: Record<ClockDatePartSection, PickerComboBoxItem[]> =
        {
          weekday: [],
          day: [],
          month: [],
          year: [],
          separator: [],
        };

      const previewDate = new Date();
      const previewTimeZone = resolveTimeZone(
        this.hass.locale.time_zone,
        this.hass.config.time_zone
      );

      CLOCK_CARD_DATE_PARTS.forEach((part) => {
        const section = getClockDatePartSection(part);
        const label =
          this.hass.localize(
            `ui.panel.lovelace.editor.card.clock.date.parts.${part}`
          ) || part;

        const secondary =
          section === "separator"
            ? CLOCK_DATE_SEPARATOR_VALUES[part as ClockDateSeparatorPart]
            : formatClockCardDate(
                previewDate,
                { parts: [part] },
                language,
                previewTimeZone
              );

        itemsBySection[section].push({
          id: part,
          primary: label,
          secondary,
          sorting_label: label,
        });
      });

      return CLOCK_DATE_PART_SECTION_ORDER.map((section) => ({
        id: section,
        title:
          this.hass.localize(
            `ui.panel.lovelace.editor.card.clock.date.sections.${section}`
          ) || section,
        items: itemsBySection[section],
      })).filter((section) => section.items.length > 0);
    }
  );

  private _getSections = memoizeOne(
    (_language: string): { id: string; label: string }[] =>
      this._buildSections(_language).map((section) => ({
        id: section.id,
        label: section.title,
      }))
  );

  private _getItems = (
    searchString?: string,
    section?: string
  ): (PickerComboBoxItem | string)[] => {
    const normalizedSearch = searchString?.trim().toLowerCase();

    const sections = this._buildSections(this.hass.locale.language)
      .map((sectionData) => {
        if (!normalizedSearch) {
          return sectionData;
        }

        return {
          ...sectionData,
          items: sectionData.items.filter(
            (item) =>
              item.primary.toLowerCase().includes(normalizedSearch) ||
              item.secondary?.toLowerCase().includes(normalizedSearch) ||
              item.id.toLowerCase().includes(normalizedSearch)
          ),
        };
      })
      .filter((sectionData) => sectionData.items.length > 0);

    if (section) {
      return (
        sections.find((candidate) => candidate.id === section)?.items || []
      );
    }

    const groupedItems: (PickerComboBoxItem | string)[] = [];

    sections.forEach((sectionData) => {
      groupedItems.push(sectionData.title, ...sectionData.items);
    });

    return groupedItems;
  };

  private _getItemLabel = memoizeOne(
    (value: string, language: string): string | undefined => {
      const sections = this._buildSections(language);

      for (const section of sections) {
        const item = section.items.find((candidate) => candidate.id === value);

        if (item) {
          return `${section.title} [${item.primary}]`;
        }
      }

      return undefined;
    }
  );

  private _getPickerValue(): string | undefined {
    if (this._editIndex != null) {
      return this._value[this._editIndex];
    }

    return undefined;
  }

  private async _moveItem(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const value = this._value;
    const newValue = value.concat();
    const element = newValue.splice(oldIndex, 1)[0];
    newValue.splice(newIndex, 0, element);

    this._setValue(newValue);
  }

  private async _removeItem(ev: Event) {
    ev.stopPropagation();
    const value = [...this._value];
    const idx = parseInt((ev.target as HTMLElement).dataset.idx || "", 10);
    value.splice(idx, 1);
    this._setValue(value);
  }

  private _pickerValueChanged(ev: ValueChangedEvent<string>): void {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (this.disabled || !value) {
      return;
    }

    const newValue = [...this._value];

    if (this._editIndex != null) {
      newValue[this._editIndex] = value;
      this._editIndex = undefined;
    } else {
      newValue.push(value);
    }

    this._setValue(newValue);

    if (this._picker) {
      this._picker.value = undefined;
    }
  }

  private _setValue(value: string[]) {
    const newValue = this._toValue(value);
    this.value = newValue;

    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static styles = css`
    :host {
      position: relative;
      width: 100%;
    }

    .container {
      position: relative;
      background-color: var(--mdc-text-field-fill-color, whitesmoke);
      border-radius: var(--ha-border-radius-sm);
      border-end-end-radius: var(--ha-border-radius-square);
      border-end-start-radius: var(--ha-border-radius-square);
    }

    .container:after {
      display: block;
      content: "";
      position: absolute;
      pointer-events: none;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      width: 100%;
      background-color: var(
        --mdc-text-field-idle-line-color,
        rgba(0, 0, 0, 0.42)
      );
      transform:
        height 180ms ease-in-out,
        background-color 180ms ease-in-out;
    }

    :host([disabled]) .container:after {
      background-color: var(
        --mdc-text-field-disabled-line-color,
        rgba(0, 0, 0, 0.42)
      );
    }

    .container:focus-within:after {
      height: 2px;
      background-color: var(--mdc-theme-primary);
    }

    label {
      display: block;
      margin: 0 0 var(--ha-space-2);
    }

    .add {
      order: 1;
    }

    ha-chip-set {
      padding: var(--ha-space-2);
    }

    .invalid {
      text-decoration: line-through;
    }

    .sortable-fallback {
      display: none;
      opacity: 0;
    }

    .sortable-ghost {
      opacity: 0.4;
    }

    .sortable-drag {
      cursor: grabbing;
    }

    ha-input-helper-text {
      display: block;
      margin: var(--ha-space-2) 0 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-clock-date-format-picker": HaClockDateFormatPicker;
  }
}
