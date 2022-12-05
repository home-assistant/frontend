import { html, LitElement, TemplateResult } from "lit";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import { fetchHassioAddonsInfo, HassioAddonInfo } from "../data/hassio/addon";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import { HaComboBox } from "./ha-combo-box";

const rowRenderer: ComboBoxLitRenderer<HassioAddonInfo> = (
  item
) => html`<mwc-list-item twoline graphic="icon">
  <span>${item.name}</span>
  <span slot="secondary">${item.slug}</span>
  ${item.icon
    ? html`<img slot="graphic" .src="/api/hassio/addons/${item.slug}/icon" />`
    : ""}
</mwc-list-item>`;

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

  public open() {
    this._comboBox?.open();
  }

  public focus() {
    this._comboBox?.focus();
  }

  protected firstUpdated() {
    this._getAddons();
  }

  protected render(): TemplateResult {
    if (!this._addons) {
      return html``;
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
          .sort((a, b) => stringCompare(a.name, b.name));
      } else {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.components.addon-picker.error.no_supervisor.title"
          ),
          text: this.hass.localize(
            "ui.components.addon-picker.error.no_supervisor.description"
          ),
        });
      }
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.components.addon-picker.error.fetch_addons.title"
        ),
        text: this.hass.localize(
          "ui.components.addon-picker.error.fetch_addons.description"
        ),
      });
    }
  }

  private get _value() {
    return this.value || "";
  }

  private _addonChanged(ev: PolymerChangedEvent<string>) {
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
