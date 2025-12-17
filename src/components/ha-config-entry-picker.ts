import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { ConfigEntry } from "../data/config_entries";
import { getConfigEntries } from "../data/config_entries";
import { domainToName } from "../data/integration";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-combo-box-item";
import "./ha-domain-icon";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

const SEARCH_KEYS = [
  { name: "primary", weight: 10 },
  { name: "secondary", weight: 8 },
  { name: "icon", weight: 5 },
];

@customElement("ha-config-entry-picker")
class HaConfigEntryPicker extends LitElement {
  public hass!: HomeAssistant;

  @property() public integration?: string;

  @property() public label?: string;

  @property() public value = "";

  @property() public helper?: string;

  @state() private _configEntries?: PickerComboBoxItem[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @query("ha-generic-picker") private _picker!: HaGenericPicker;

  public open() {
    this._picker?.open();
  }

  public focus() {
    this._picker?.focus();
  }

  protected firstUpdated() {
    this._getConfigEntries();
  }

  protected render() {
    if (!this._configEntries) {
      return nothing;
    }
    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .placeholder=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.config-entry-picker.config_entry")
          : this.label}
        show-label
        .value=${this.value}
        .required=${this.required}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .rowRenderer=${this._rowRenderer}
        .getItems=${this._getItems}
        .searchKeys=${SEARCH_KEYS}
        .valueRenderer=${this._valueRenderer}
        @value-changed=${this._valueChanged}
      ></ha-generic-picker>
    `;
  }

  private _rowRenderer: RenderItemFunction<PickerComboBoxItem> = (item) => html`
    <ha-combo-box-item type="button">
      <span slot="headline">${item.primary}</span>
      <span slot="supporting-text">${item.secondary}</span>
      <ha-domain-icon
        slot="start"
        .hass=${this.hass}
        .domain=${item.icon!}
        brand-fallback
      ></ha-domain-icon>
    </ha-combo-box-item>
  `;

  private async _getConfigEntries() {
    getConfigEntries(this.hass, {
      type: ["device", "hub", "service"],
      domain: this.integration,
    }).then((configEntries) => {
      this._configEntries = configEntries.map((entry: ConfigEntry) => {
        const domainName = domainToName(this.hass.localize, entry.domain);
        return {
          id: entry.entry_id,
          icon: entry.domain,
          primary:
            entry.title ||
            this.hass.localize(
              "ui.panel.config.integrations.config_entry.unnamed_entry"
            ),
          secondary: domainName,
          sorting_label: [entry.title, domainName].filter(Boolean).join("_"),
        };
      });
    });
  }

  private _valueRenderer = (itemId: string) => {
    const item = this._configEntries!.find((entry) => entry.id === itemId);
    return html`<span
      style="display: flex; align-items: center; gap: var(--ha-space-2);"
      slot="headline"
      >${item?.icon
        ? html`<ha-domain-icon
            .hass=${this.hass}
            .domain=${item.icon!}
            brand-fallback
          ></ha-domain-icon>`
        : nothing}${item?.primary || "Unknown"}</span
    >`;
  };

  private _getItems = () => this._configEntries!;

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (newValue !== this.value) {
      this._setValue(newValue);
    }
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-entry-picker": HaConfigEntryPicker;
  }
}
