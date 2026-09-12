import { consume, type ContextType } from "@lit/context";
import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../common/array/ensure-array";
import { resolveTimeZone } from "../common/datetime/resolve-time-zone";
import { fireEvent } from "../common/dom/fire_event";
import { configContext, internationalizationContext } from "../data/context";
import {
  DATE_FORMAT_PARTS,
  formatDateFromParts,
} from "../panels/lovelace/cards/date-format";
import type { DateFormatPart } from "../panels/lovelace/cards/types";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./chips/ha-assist-chip";
import "./chips/ha-chip-set";
import "./chips/ha-input-chip";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import "./ha-input-helper-text";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import "./ha-sortable";

type DateFormatPartSection = "weekday" | "day" | "month" | "year" | "separator";

type DateFormatSeparatorPart = Extract<
  DateFormatPart,
  "separator-dash" | "separator-slash" | "separator-dot" | "separator-new-line"
>;

const DATE_FORMAT_PART_SECTION_ORDER: readonly DateFormatPartSection[] = [
  "day",
  "month",
  "year",
  "weekday",
  "separator",
];

const DATE_FORMAT_SEPARATOR_VALUES: Record<DateFormatSeparatorPart, string> = {
  "separator-dash": "-",
  "separator-slash": "/",
  "separator-dot": ".",
  "separator-new-line": "",
};

const getDateFormatPartSection = (
  part: DateFormatPart
): DateFormatPartSection => {
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

interface DateFormatPartSectionData {
  id: DateFormatPartSection;
  title: string;
  items: PickerComboBoxItem[];
}

/**
 * Filters out sections whose group already has a value in `value`, so only
 * one non-separator value per group can be selected in the picker. The whole
 * group of the item at `excludeIndex` (the one being edited) stays
 * selectable, even if that group has more than one value in `value` (e.g. a
 * pre-existing config authored outside the picker via YAML).
 * The separator group is always kept.
 */
export const getAvailableDateFormatPartSections = (
  sections: DateFormatPartSectionData[],
  value: string[],
  excludeIndex?: number
): DateFormatPartSectionData[] => {
  const editedItem = excludeIndex != null ? value[excludeIndex] : undefined;
  const editedSection = editedItem
    ? getDateFormatPartSection(editedItem as DateFormatPart)
    : undefined;

  const usedSections = new Set<DateFormatPartSection>();

  value.forEach((item) => {
    const section = getDateFormatPartSection(item as DateFormatPart);

    if (section !== "separator" && section !== editedSection) {
      usedSections.add(section);
    }
  });

  return sections.filter(
    (sectionData) =>
      sectionData.id === "separator" || !usedSections.has(sectionData.id)
  );
};

interface DateFormatPartValueItem {
  key: string;
  item: string;
  idx: number;
}

@customElement("ha-date-format-parts-picker")
export class HaDateFormatPartsPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public label?: string;

  @property() public value?: string[] | string;

  @property() public helper?: string;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @query("ha-generic-picker", true) private _picker?: HaGenericPicker;

  @state() private _editIndex?: number;

  protected render() {
    const value = this._value;
    const valueItems = this._getValueItems(value);
    const sections = this._buildSections();
    const pickerSections = getAvailableDateFormatPartSections(
      sections,
      value,
      this._editIndex
    );

    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-generic-picker
        .hass=${this.hass}
        .disabled=${this.disabled}
        .required=${this.required && !value.length}
        .value=${this._getPickerValue()}
        .sections=${this._getSectionHeaders(pickerSections)}
        .getItems=${this._getItems(pickerSections)}
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
                valueItems,
                (entry: DateFormatPartValueItem) => entry.key,
                ({ item, idx }) => this._renderValueChip(item, idx, sections)
              )}
              ${
                this.disabled
                  ? nothing
                  : html`
                      <ha-assist-chip
                        @click=${this._addItem}
                        .disabled=${this.disabled}
                        label=${this._i18n.localize("ui.common.add")}
                        class="add"
                      >
                        <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
                      </ha-assist-chip>
                    `
              }
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

  private _getValueItems = memoizeOne(
    (value: string[]): DateFormatPartValueItem[] => {
      const occurrences = new Map<string, number>();

      return value.map((item, idx) => {
        const occurrence = occurrences.get(item) ?? 0;
        occurrences.set(item, occurrence + 1);

        return {
          key: `${item}:${occurrence}`,
          item,
          idx,
        };
      });
    }
  );

  private _renderValueChip(
    item: string,
    idx: number,
    sections: DateFormatPartSectionData[]
  ) {
    const label = this._getItemLabel(item, sections);
    const isValid = !!label;

    return html`
      <ha-input-chip
        data-idx=${idx}
        @remove=${this._removeItem}
        @click=${this._editItem}
        .label=${label ?? item}
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
      (ev.currentTarget as HTMLElement).dataset.idx ?? "",
      10
    );
    this._editIndex = idx;
    await this.updateComplete;
    await this._picker?.open();
  }

  private get _value() {
    return !this.value ? [] : ensureArray(this.value);
  }

  private _toValue = memoizeOne((value: string[]): string[] | undefined =>
    value.length === 0 ? undefined : value
  );

  private _buildSections(): DateFormatPartSectionData[] {
    const itemsBySection: Record<DateFormatPartSection, PickerComboBoxItem[]> =
      {
        weekday: [],
        day: [],
        month: [],
        year: [],
        separator: [],
      };

    const previewDate = new Date();
    const previewTimeZone = resolveTimeZone(
      this._i18n.locale.time_zone,
      this._hassConfig.config.time_zone
    );

    DATE_FORMAT_PARTS.forEach((part) => {
      const section = getDateFormatPartSection(part);
      const label =
        this._i18n.localize(
          `ui.panel.lovelace.editor.date_format.parts.${part}`
        ) ?? part;

      const secondary =
        section === "separator"
          ? DATE_FORMAT_SEPARATOR_VALUES[part as DateFormatSeparatorPart]
          : formatDateFromParts(
              previewDate,
              { parts: [part] },
              this._i18n.locale.language,
              previewTimeZone
            );

      itemsBySection[section].push({
        id: part,
        primary: label,
        secondary,
        sorting_label: label,
      });
    });

    return DATE_FORMAT_PART_SECTION_ORDER.map((section) => ({
      id: section,
      title:
        this._i18n.localize(
          `ui.panel.lovelace.editor.date_format.sections.${section}`
        ) ?? section,
      items: itemsBySection[section],
    })).filter((section) => section.items.length > 0);
  }

  private _getSectionHeaders(
    sections: DateFormatPartSectionData[]
  ): { id: string; label: string }[] {
    return sections.map((section) => ({
      id: section.id,
      label: section.title,
    }));
  }

  private _getItems = memoizeOne(
    (sections: DateFormatPartSectionData[]) =>
      (
        searchString?: string,
        section?: string
      ): (PickerComboBoxItem | string)[] => {
        const normalizedSearch = searchString?.trim().toLowerCase();

        const filteredSections = sections
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
            filteredSections.find((candidate) => candidate.id === section)
              ?.items || []
          );
        }

        const groupedItems: (PickerComboBoxItem | string)[] = [];

        filteredSections.forEach((sectionData) => {
          groupedItems.push(sectionData.title, ...sectionData.items);
        });

        return groupedItems;
      }
  );

  private _getItemLabel(
    value: string,
    sections: DateFormatPartSectionData[]
  ): string | undefined {
    for (const section of sections) {
      const item = section.items.find((candidate) => candidate.id === value);

      if (item) {
        if (section.id === "separator") {
          if (value === "separator-new-line") {
            return item.primary;
          }

          return item.secondary ?? item.primary;
        }

        return `${item.secondary} [${item.primary} ${section.title}]`;
      }
    }

    return undefined;
  }

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
    ev.preventDefault();
    ev.stopPropagation();

    const idx = parseInt(
      (ev.currentTarget as HTMLElement).dataset.idx ?? "",
      10
    );

    if (Number.isNaN(idx)) {
      return;
    }

    const value = [...this._value];
    value.splice(idx, 1);

    if (this._editIndex !== undefined) {
      if (this._editIndex === idx) {
        this._editIndex = undefined;
      } else if (this._editIndex > idx) {
        this._editIndex -= 1;
      }
    }

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
      transition:
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
    "ha-date-format-parts-picker": HaDateFormatPartsPicker;
  }
}
