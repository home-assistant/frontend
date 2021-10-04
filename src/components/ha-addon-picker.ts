import { mdiCheck } from "@mdi/js";
import { html, LitElement, TemplateResult } from "lit";
import { ComboBoxLitRenderer } from "lit-vaadin-helpers";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import { HassioAddonInfo } from "../data/hassio/addon";
import { fetchHassioSupervisorInfo } from "../data/hassio/supervisor";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import { HaComboBox } from "./ha-combo-box";

// eslint-disable-next-line lit/prefer-static-styles
const rowRenderer: ComboBoxLitRenderer<HassioAddonInfo> = (item) => html`<style>
    paper-item {
      padding: 0;
      margin: -10px;
      margin-left: 0px;
    }
    #content {
      display: flex;
      align-items: center;
    }
    :host([selected]) paper-item {
      margin-left: 0;
    }
    ha-svg-icon {
      padding-left: 2px;
      margin-right: -2px;
      color: var(--secondary-text-color);
    }
    :host(:not([selected])) ha-svg-icon {
      display: none;
    }
    :host([selected]) paper-icon-item {
      margin-left: 0;
    }
  </style>
  <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
  <paper-item>
    <paper-item-body two-line>
      ${item.name}
      <span secondary>${item.slug}</span>
    </paper-item-body>
  </paper-item>`;

@customElement("ha-addon-picker")
class HaAddonPicker extends LitElement {
  public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value = "";

  @state() private _addons?: HassioAddonInfo[];

  @property({ type: Boolean }) public disabled = false;

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
        const supervisorInfo = await fetchHassioSupervisorInfo(this.hass);
        this._addons = supervisorInfo.addons.sort((a, b) =>
          stringCompare(a.name, b.name)
        );
      } else {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.componencts.addon-picker.error.no_supervisor.title"
          ),
          text: this.hass.localize(
            "ui.componencts.addon-picker.error.no_supervisor.description"
          ),
        });
      }
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.componencts.addon-picker.error.fetch_addons.title"
        ),
        text: this.hass.localize(
          "ui.componencts.addon-picker.error.fetch_addons.description"
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
