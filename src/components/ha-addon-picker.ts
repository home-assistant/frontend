import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { fetchHassioAddonsInfo } from "../data/hassio/addon";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-alert";
import "./ha-app-icon";
import "./ha-combo-box-item";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

const SEARCH_KEYS = [
  { name: "primary", weight: 10 },
  { name: "secondary", weight: 8 },
  { name: "search_labels.description", weight: 6 },
  { name: "search_labels.repository", weight: 5 },
];

interface AddonPickerItem extends PickerComboBoxItem {
  slug: string;
  hasIcon: boolean;
}

const rowRenderer: RenderItemFunction<AddonPickerItem> = (item) => html`
  <ha-combo-box-item type="button">
    <span slot="headline">${item.primary}</span>
    <span slot="supporting-text">${item.secondary}</span>
    ${
      item.hasIcon
        ? html`<ha-app-icon
            slot="start"
            .slug=${item.slug}
            .hasIcon=${item.hasIcon}
          ></ha-app-icon>`
        : nothing
    }
  </ha-combo-box-item>
`;

@customElement("ha-addon-picker")
class HaAddonPicker extends LitElement {
  public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value = "";

  @property() public helper?: string;

  @state() private _addons?: AddonPickerItem[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @query("ha-generic-picker") private _genericPicker!: HaGenericPicker;

  @state() private _error?: string;

  public open() {
    this._genericPicker?.open();
  }

  public focus() {
    this._genericPicker?.focus();
  }

  protected firstUpdated() {
    this._getApps();
  }

  protected render() {
    const label =
      this.label === undefined && this.hass
        ? this.hass.localize("ui.components.app-picker.app")
        : this.label;

    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    if (!this._addons) {
      return nothing;
    }

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${label}
        .valueRenderer=${this._valueRenderer}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .value=${this.value}
        .getItems=${this._getItems}
        .searchKeys=${SEARCH_KEYS}
        .rowRenderer=${rowRenderer}
        @value-changed=${this._addonChanged}
      >
      </ha-generic-picker>
    `;
  }

  private async _getApps() {
    try {
      if (isComponentLoaded(this.hass.config, "hassio")) {
        const addonsInfo = await fetchHassioAddonsInfo(this.hass);
        this._addons = addonsInfo.addons
          .filter((addon) => addon.version)
          .map((addon) => ({
            id: addon.slug,
            slug: addon.slug,
            hasIcon: addon.icon,
            primary: addon.name,
            secondary: addon.slug,
            search_labels: {
              description: addon.description || null,
              repository: addon.repository || null,
            },
            sorting_label: [addon.name, addon.slug].filter(Boolean).join("_"),
          }));
      } else {
        this._error = this.hass.localize(
          "ui.components.app-picker.error.no_supervisor"
        );
      }
    } catch (_err: any) {
      this._error = this.hass.localize(
        "ui.components.app-picker.error.fetch_apps"
      );
    }
  }

  private _getItems = () => this._addons!;

  private get _value() {
    return this.value || "";
  }

  private _addonChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (newValue !== this._value) {
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

  private _valueRenderer = (itemId: string) => {
    const item = this._addons!.find((addon) => addon.id === itemId);
    return html`${
        item?.hasIcon
          ? html`<ha-app-icon
              slot="start"
              .slug=${item.slug}
              .hasIcon=${item.hasIcon}
              .alt=${item.primary ?? "Unknown"}
            ></ha-app-icon>`
          : nothing
      }<span slot="headline">${item?.primary || "Unknown"}</span>`;
  };

  static styles = css`
    ha-app-icon {
      --ha-app-icon-size: var(--ha-space-8);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-addon-picker": HaAddonPicker;
  }
}
