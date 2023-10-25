import "@material/mwc-list/mwc-list-item";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { ConfigEntry, getConfigEntries } from "../data/config_entries";
import { domainToName } from "../data/integration";
import { ValueChangedEvent, HomeAssistant } from "../types";
import { brandsUrl } from "../util/brands-url";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";

export interface ConfigEntryExtended extends ConfigEntry {
  localized_domain_name?: string;
}

@customElement("ha-config-entry-picker")
class HaConfigEntryPicker extends LitElement {
  public hass!: HomeAssistant;

  @property() public integration?: string;

  @property() public label?: string;

  @property() public value = "";

  @property() public helper?: string;

  @state() private _configEntries?: ConfigEntryExtended[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @query("ha-combo-box") private _comboBox!: HaComboBox;

  public open() {
    this._comboBox?.open();
  }

  public focus() {
    this._comboBox?.focus();
  }

  protected firstUpdated() {
    this._getConfigEntries();
  }

  private _rowRenderer: ComboBoxLitRenderer<ConfigEntryExtended> = (item) =>
    html`<mwc-list-item twoline graphic="icon">
      <span
        >${item.title ||
        this.hass.localize(
          "ui.panel.config.integrations.config_entry.unnamed_entry"
        )}</span
      >
      <span slot="secondary">${item.localized_domain_name}</span>
      <img
        alt=""
        slot="graphic"
        src=${brandsUrl({
          domain: item.domain,
          type: "icon",
          darkOptimized: this.hass.themes?.darkMode,
        })}
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
        @error=${this._onImageError}
        @load=${this._onImageLoad}
      />
    </mwc-list-item>`;

  protected render() {
    if (!this._configEntries) {
      return nothing;
    }
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.config-entry-picker.config_entry")
          : this.label}
        .value=${this._value}
        .required=${this.required}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .renderer=${this._rowRenderer}
        .items=${this._configEntries}
        item-value-path="entry_id"
        item-id-path="entry_id"
        item-label-path="title"
        @value-changed=${this._valueChanged}
      ></ha-combo-box>
    `;
  }

  private _onImageLoad(ev) {
    ev.target.style.visibility = "initial";
  }

  private _onImageError(ev) {
    ev.target.style.visibility = "hidden";
  }

  private async _getConfigEntries() {
    getConfigEntries(this.hass, {
      type: ["device", "hub", "service"],
      domain: this.integration,
    }).then((configEntries) => {
      this._configEntries = configEntries
        .map(
          (entry: ConfigEntry): ConfigEntryExtended => ({
            ...entry,
            localized_domain_name: domainToName(
              this.hass.localize,
              entry.domain
            ),
          })
        )
        .sort((conf1, conf2) =>
          caseInsensitiveStringCompare(
            conf1.localized_domain_name + conf1.title,
            conf2.localized_domain_name + conf2.title,
            this.hass.locale.language
          )
        );
    });
  }

  private get _value() {
    return this.value || "";
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
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
    "ha-config-entry-picker": HaConfigEntryPicker;
  }
}
