import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import { fetchHassioAddonsInfo, HassioAddonInfo } from "../data/hassio/addon";
import { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-alert";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-list-item";

const rowRenderer: ComboBoxLitRenderer<HassioAddonInfo> = (item) =>
  html`<ha-list-item twoline graphic="icon">
    <span>${item.name}</span>
    <span slot="secondary">${item.slug}</span>
    ${item.icon
      ? html`<img
          alt=""
          slot="graphic"
          .src="/api/hassio/addons/${item.slug}/icon"
        />`
      : ""}
  </ha-list-item>`;

@customElement("ha-addon-picker")
class HaAddonPicker extends LitElement {
  public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value = "";

  @property() public helper?: string;

  @state() private _addons?: HassioAddonInfo[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @query("ha-combo-box") private _comboBox!: HaComboBox;

  @state() private _error?: string;

  public open() {
    this._comboBox?.open();
  }

  public focus() {
    this._comboBox?.focus();
  }

  protected firstUpdated() {
    this._getAddons();
  }

  protected render() {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    if (!this._addons) {
      return nothing;
    }
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.addon-picker.addon")
          : this.label}
        .value=${this._value}
        .required=${this.required}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .renderer=${rowRenderer}
        .items=${this._addons}
        item-value-path="slug"
        item-id-path="slug"
        item-label-path="name"
        @value-changed=${this._addonChanged}
      ></ha-combo-box>
    `;
  }

  private async _getAddons() {
    try {
      if (isComponentLoaded(this.hass, "hassio")) {
        const addonsInfo = await fetchHassioAddonsInfo(this.hass);
        this._addons = addonsInfo.addons
          .filter((addon) => addon.version)
          .sort((a, b) =>
            stringCompare(a.name, b.name, this.hass.locale.language)
          );
      } else {
        this._error = this.hass.localize(
          "ui.components.addon-picker.error.no_supervisor"
        );
      }
    } catch (err: any) {
      this._error = this.hass.localize(
        "ui.components.addon-picker.error.fetch_addons"
      );
    }
  }

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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-addon-picker": HaAddonPicker;
  }
}
