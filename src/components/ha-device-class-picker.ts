import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { internationalizationContext } from "../data/context";
import { DOMAIN_DEVICE_CLASSES } from "../data/device_classes";
import { computeDeviceClassName } from "../data/entity/device_class";
import { computeUnitDeviceClasses } from "../data/sensor/unit_of_measurement";
import type { FuseWeightedKey } from "../resources/fuseMultiTerm";
import type {
  HomeAssistantInternationalization,
  ValueChangedEvent,
} from "../types";
import "./chips/ha-chip-set";
import "./chips/ha-input-chip";
import "./ha-combo-box-item";
import "./ha-generic-picker";
import {
  DEFAULT_ROW_RENDERER_CONTENT,
  type PickerComboBoxItem,
} from "./ha-picker-combo-box";

export const getDeviceClassOptions = (
  domain: string,
  localize: LocalizeFunc
): PickerComboBoxItem[] =>
  (DOMAIN_DEVICE_CLASSES[domain] ?? []).map((deviceClass) => {
    const primary = computeDeviceClassName(localize, domain, deviceClass);
    return { id: deviceClass, primary, sorting_label: primary };
  });

// The reason line of a device class that does not support the unit names the
// unit, so searching it would match every disabled device class
const UNIT_FILTER_SEARCH_KEYS: FuseWeightedKey[] = [
  { name: "primary", weight: 10 },
  { name: "id", weight: 3 },
];

// The default row does not fade out a disabled device class
const rowRenderer: RenderItemFunction<PickerComboBoxItem> = (item) => html`
  <ha-combo-box-item .disabled=${!!item.disabled}>
    ${DEFAULT_ROW_RENDERER_CONTENT(item)}
  </ha-combo-box-item>
`;

@customElement("ha-device-class-picker")
export class HaDeviceClassPicker extends LitElement {
  @property() public domain?: string;

  @property({ attribute: false }) public value?: string | string[];

  @property({ type: Boolean }) public multiple = false;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  /** Unit of measurement: device classes that do not support it are listed last and disabled */
  @property() public unit?: string;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  private _loadedDomain?: string;

  protected willUpdate() {
    if (!this.domain || !this._i18n || this._loadedDomain === this.domain) {
      return;
    }
    this._loadedDomain = this.domain;
    this._i18n.loadBackendTranslation("entity_component", this.domain);
  }

  private get _value(): string[] {
    return this.value ? ensureArray(this.value) : [];
  }

  private _deviceClassName(deviceClass: string): string {
    return this._i18n && this.domain
      ? computeDeviceClassName(this._i18n.localize, this.domain, deviceClass)
      : deviceClass;
  }

  private _options = memoizeOne(
    (
      domain: string | undefined,
      localize: LocalizeFunc | undefined,
      unit: string | undefined,
      language: string | undefined
    ): PickerComboBoxItem[] => {
      if (!domain || !localize) {
        return [];
      }
      const options = getDeviceClassOptions(domain, localize);
      const fitting = computeUnitDeviceClasses(domain, unit);
      if (!fitting) {
        return options;
      }
      // Device classes of the unit first, then those that accept any unit
      const rank = (deviceClass: string) =>
        fitting.matching.includes(deviceClass)
          ? 0
          : fitting.unrestricted.includes(deviceClass)
            ? 1
            : 2;
      const notSupported = localize(
        "ui.components.device-class-picker.unit_not_supported",
        { unit }
      );
      return options
        .map((option) =>
          rank(option.id) === 2
            ? { ...option, secondary: notSupported, disabled: true }
            : option
        )
        .sort(
          (a, b) =>
            rank(a.id) - rank(b.id) ||
            caseInsensitiveStringCompare(a.primary, b.primary, language)
        );
    }
  );

  // The options are sorted here when the unit filters them
  private get _filtered(): boolean {
    return computeUnitDeviceClasses(this.domain, this.unit) !== undefined;
  }

  private _availableOptions = memoizeOne(
    (options: PickerComboBoxItem[], selected: string[]) =>
      options.filter((option) => !selected.includes(option.id))
  );

  private _getItems = () => {
    const options = this._options(
      this.domain,
      this._i18n?.localize,
      this.unit,
      this._i18n?.language
    );
    return this.multiple
      ? this._availableOptions(options, this._value)
      : options;
  };

  private _valueRenderer = (value: string) =>
    html`<span slot="headline">${this._deviceClassName(value)}</span>`;

  private _notFoundLabel = (search: string) => {
    const term = html`<b>'${search}'</b>`;
    return this._i18n
      ? this._i18n.localize("ui.components.device-class-picker.no_match", {
          term,
        })
      : html`No device classes found for ${term}`;
  };

  protected render() {
    const localize = this._i18n?.localize;
    const emptyLabel = localize?.(
      "ui.components.device-class-picker.no_device_classes"
    );
    const filtered = this._filtered;
    const searchKeys = filtered ? UNIT_FILTER_SEARCH_KEYS : undefined;

    if (this.multiple) {
      const value = this._value;
      return html`
        ${
          value.length
            ? html`
                <ha-chip-set>
                  ${repeat(
                    value,
                    (deviceClass) => deviceClass,
                    (deviceClass) => {
                      const label = this._deviceClassName(deviceClass);
                      return html`
                        <ha-input-chip
                          .item=${deviceClass}
                          .label=${label}
                          .disabled=${this.disabled}
                          @remove=${this._removeItem}
                          selected
                        >
                          ${label}
                        </ha-input-chip>
                      `;
                    }
                  )}
                </ha-chip-set>
              `
            : nothing
        }
        <ha-generic-picker
          .helper=${this.helper}
          .disabled=${this.disabled}
          .required=${this.required && !value.length}
          .value=${""}
          .addButtonLabel=${
            this.label ?? localize?.("ui.components.device-class-picker.add")
          }
          .getItems=${this._getItems}
          .notFoundLabel=${this._notFoundLabel}
          .emptyLabel=${emptyLabel}
          .noSort=${filtered}
          .searchKeys=${searchKeys}
          .rowRenderer=${rowRenderer}
          @value-changed=${this._itemAdded}
        ></ha-generic-picker>
      `;
    }

    return html`
      <ha-generic-picker
        .label=${
          this.label ??
          localize?.("ui.components.device-class-picker.device_class")
        }
        .value=${this.value as string | undefined}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .getItems=${this._getItems}
        .valueRenderer=${this._valueRenderer}
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${emptyLabel}
        .noSort=${filtered}
        .searchKeys=${searchKeys}
        .rowRenderer=${rowRenderer}
        @value-changed=${this._valueChanged}
      ></ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value || undefined });
  }

  private _itemAdded(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    const deviceClass = ev.detail.value;
    if (!deviceClass || this._value.includes(deviceClass)) {
      return;
    }
    this._setValue([...this._value, deviceClass]);
  }

  private _removeItem(ev: Event) {
    ev.stopPropagation();
    const deviceClass = (ev.currentTarget as HTMLElement & { item: string })
      .item;
    this._setValue(this._value.filter((item) => item !== deviceClass));
  }

  private _setValue(value: string[]) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-generic-picker {
      display: block;
      width: 100%;
    }
    ha-chip-set {
      padding: 8px 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-class-picker": HaDeviceClassPicker;
  }
}
