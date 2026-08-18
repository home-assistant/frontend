import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consume } from "@lit/context";
import { ensureArray } from "../../common/array/ensure-array";
import { transform } from "../../common/decorators/transform";
import { fireEvent } from "../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { internationalizationContext } from "../../data/context";
import type { DeviceClassSelector, SelectOption } from "../../data/selector";
import type { FrontendLocaleData } from "../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
} from "../../types";
import "../chips/ha-chip-set";
import "../chips/ha-input-chip";
import "../ha-checkbox";
import "../ha-dropdown-item";
import "../ha-formfield";
import "../ha-generic-picker";
import "../ha-input-helper-text";
import "../ha-select";
import "../ha-select-box";
import "../ha-sortable";
import "../radio/ha-radio-group";
import "../radio/ha-radio-option";

@customElement("ha-selector-device_class")
export class HaDeviceClassSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale!: FrontendLocaleData;

  @property({ attribute: false }) public selector!: DeviceClassSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    this._move(oldIndex!, newIndex);
  }

  private _move(index: number, newIndex: number) {
    const value = this.value as string[];
    const newValue = value.concat();
    const element = newValue.splice(index, 1)[0];
    newValue.splice(newIndex, 0, element);
    this.value = newValue;
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _localizeDeviceClass = (
    domain: string,
    device_class: string
  ): string => {
    return (
      this.hass?.localize?.(
        `component.${domain}.entity_component.${device_class}.name`
      ) ?? ""
    );
  };

  private _getDeviceClasses = (): SelectOption[] => {
    const DEVICE_CLASS_MAPPING = {
      sensor: ["temperature", "humidity"],
    };

    const domain = this.selector.device_class?.domain || "";
    const domainClasses = DEVICE_CLASS_MAPPING[domain] ?? [];

    return domainClasses.map((domainClass: string) => ({
      value: domainClass,
      label: "",
    }));
  };

  protected render() {
    const options = this._getDeviceClasses();

    options.forEach((device_class) => {
      const localizedLabel = this._localizeDeviceClass(
        this.selector.device_class?.domain || "",
        device_class.value
      );
      if (localizedLabel) {
        device_class.label = localizedLabel;
      }
    });

    options.sort((a, b) =>
      caseInsensitiveStringCompare(a.label, b.label, this._locale.language)
    );

    if (this.selector.device_class?.multiple) {
      const value =
        !this.value || this.value === "" ? [] : ensureArray(this.value);

      return html`
        ${
          value?.length
            ? html`
                <ha-sortable
                  no-style
                  @item-moved=${this._itemMoved}
                  handle-selector="button.primary.action"
                >
                  <ha-chip-set>
                    ${repeat(
                      value,
                      (item) => item,
                      (item, idx) => {
                        const label =
                          options.find((option) => option.value === item)
                            ?.label || item;
                        return html`
                          <ha-input-chip
                            .idx=${idx}
                            @remove=${this._removeItem}
                            .label=${label}
                            .title=${label}
                            selected
                          >
                            ${
                              options.find((option) => option.value === item)
                                ?.label || item
                            }
                          </ha-input-chip>
                        `;
                      }
                    )}
                  </ha-chip-set>
                </ha-sortable>
              `
            : nothing
        }

        <ha-generic-picker
          no-sort
          .hass=${this.hass}
          .helper=${this.helper}
          .disabled=${this.disabled}
          .required=${this.required && !value.length}
          .value=${""}
          .addButtonLabel=${this.label}
          .getItems=${this._getItems(options, value, true)}
          allowCustomValue="false"
          @value-changed=${this._comboBoxValueChanged}
        ></ha-generic-picker>
      `;
    }

    return html`
      <ha-select
        .label=${this.label ?? ""}
        .value=${
          ["string", "number"].includes(typeof this.value)
            ? (this.value as string | number)
            : ""
        }
        .helper=${this.helper ?? ""}
        .disabled=${this.disabled}
        .required=${this.required}
        clearable
        @selected=${this._selectChanged}
        .options=${options}
      >
      </ha-select>
    `;
  }

  private _getItems = memoizeOne(
    (options: SelectOption[], value?: string[], multiple = false) => {
      const filteredOptions = options.filter((option) =>
        !option.disabled && !multiple ? true : !value?.includes(option.value)
      );

      return () =>
        filteredOptions.map((option) => ({
          id: option.value,
          primary: option.label,
          sorting_label: option.label,
        }));
    }
  );

  private _selectChanged(ev) {
    ev.stopPropagation();
    // Additional handling for reset of select elements
    if (ev.detail?.value === undefined && this.value !== undefined) {
      fireEvent(this, "value-changed", {
        value: undefined,
      });
      return;
    }
    this._valueChanged(ev);
  }

  private _valueChanged(ev) {
    const value = ev.detail?.value ?? ev.target.value;
    if (this.disabled || value === undefined || value === (this.value ?? "")) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: value,
    });
  }

  private async _removeItem(ev) {
    ev.stopPropagation();
    const value: string[] = [...ensureArray(this.value!)];
    value.splice(ev.target.idx, 1);

    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _comboBoxValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (this.disabled || newValue === "") {
      return;
    }

    if (!this.selector.select?.multiple) {
      fireEvent(this, "value-changed", {
        value: newValue,
      });
      return;
    }

    const currentValue = !this.value ? [] : ensureArray(this.value);

    if (newValue !== undefined && currentValue.includes(newValue)) {
      return;
    }

    fireEvent(this, "value-changed", {
      value: [...currentValue, newValue],
    });
  }

  static styles = css`
    :host {
      position: relative;
    }
    ha-select,
    ha-formfield {
      display: block;
    }

    ha-checkbox {
      display: flex;
      min-height: 40px;
      justify-content: center;
    }
    ha-dropdown-item[disabled] {
      --mdc-theme-text-primary-on-background: var(--disabled-text-color);
    }
    ha-chip-set {
      padding: 8px 0;
    }

    .label {
      display: block;
      margin: 0 0 8px;
    }

    ha-select-box + ha-input-helper-text {
      margin-top: 4px;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-device_class": HaDeviceClassSelector;
  }
}
