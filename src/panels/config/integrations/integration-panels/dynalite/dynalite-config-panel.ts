import "@material/mwc-button";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import type { PolymerChangedEvent } from "../../../../../polymer-types";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import "../../../../../components/ha-card";
import "../../../../../components/ha-menu-button";
import "../../../../../layouts/ha-app-layout";
import "../../../../../components/ha-settings-row";
import "../../../../../components/ha-paper-dropdown-menu";
import "../../../../../components/ha-switch";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";

@customElement("dynalite-config-panel")
class HaPanelConfigDynalite extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @internalProperty() private _name = "";

  @internalProperty() private _host = "";

  @internalProperty() private _port = "";

  @internalProperty() private _fade = "";

  @internalProperty() private _active = "";

  @internalProperty() private _auto_discover = "";

  @internalProperty() private _poll_timer = "";

  private _entryData;

  private _activeOptions = ["on", "init", "off"];

  private _activeIndex = 0;

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.localStr("description_settings")}</div>
          </app-toolbar>
        </app-header>

        <div class="content">
          <ha-card .header=${this.localStr("description_system")}>
            <div class="card-content">
              <ha-settings-row .narrow=${this.narrow}>
                <span slot="heading">${this.localStr("name")}</span>
                <span slot="description">${this.localStr("name_long")}</span>
                <paper-input
                  class="flex"
                  .label=${this.localStr("name")}
                  name="name"
                  type="string"
                  .value=${this._name}
                  @value-changed=${this._handleChange}
                ></paper-input>
              </ha-settings-row>
            </div>
            <div class="card-content">
              <ha-settings-row .narrow=${this.narrow}>
                <span slot="heading">${this.localStr("host")}</span>
                <span slot="description">${this.localStr("host_long")}</span>
                <paper-input
                  class="flex"
                  .label=${this.localStr("host")}
                  name="host"
                  type="string"
                  .value=${this._host}
                  @value-changed=${this._handleChange}
                ></paper-input>
              </ha-settings-row>
            </div>
            <div class="card-content">
              <ha-settings-row .narrow=${this.narrow}>
                <span slot="heading">${this.localStr("port")}</span>
                <span slot="description">${this.localStr("port_long")}</span>
                <paper-input
                  class="flex"
                  .label=${this.localStr("port")}
                  name="port"
                  type="number"
                  .value=${this._port}
                  @value-changed=${this._handleChange}
                ></paper-input>
              </ha-settings-row>
            </div>
            <div class="card-content">
              <ha-settings-row .narrow=${this.narrow}>
                <span slot="heading">${this.localStr("fade")}</span>
                <span slot="description">${this.localStr("fade_long")}</span>
                <paper-input
                  class="flex"
                  .label=${this.localStr("fade")}
                  name="fade"
                  type="number"
                  .value=${this._fade}
                  @value-changed=${this._handleChange}
                ></paper-input>
              </ha-settings-row>
            </div>
            <div class="card-content">
              <ha-settings-row .narrow=${this.narrow}>
                <span slot="heading">${this.localStr("active")}</span>
                <span slot="description">${this.localStr("active_long")}</span>
                <ha-paper-dropdown-menu
                  label=${this.localStr("active")}
                  dynamic-align
                >
                  <paper-listbox
                    slot="dropdown-content"
                    .selected=${this._activeIndex}
                    @iron-select=${this._handleActiveSelection}
                  >
                    ${this._activeOptions.map(
                      (option) =>
                        html`<paper-item .active_config=${option}
                          >${this.localStr("active_" + option)}</paper-item
                        >`
                    )}
                  </paper-listbox>
                </ha-paper-dropdown-menu>
              </ha-settings-row>
            </div>
            <div class="card-content">
              <ha-settings-row .narrow=${this.narrow}>
                <span slot="heading">${this.localStr("auto_discover")}</span>
                <span slot="description"
                  >${this.localStr("auto_discover_long")}</span
                >
                <ha-switch
                  .checked=${this._auto_discover}
                  @change=${this._handleAutoDiscoverChange}
                ></ha-switch>
              </ha-settings-row>
            </div>
            <div class="card-content">
              <ha-settings-row .narrow=${this.narrow}>
                <span slot="heading">${this.localStr("poll_timer")}</span>
                <span slot="description"
                  >${this.localStr("poll_timer_long")}</span
                >
                <paper-input
                  class="flex"
                  .label=${this.localStr("poll_timer")}
                  name="poll_timer"
                  type="number"
                  .value=${this._poll_timer}
                  @value-changed=${this._handleChange}
                ></paper-input>
              </ha-settings-row>
            </div>
            <div class="card-actions">
              <mwc-button @click=${this._publish}>
                ${this.localStr("publish")}
              </mwc-button>
            </div>
          </ha-card>
        </div>
      </ha-app-layout>
    `;
  }

  protected async firstUpdated() {
    const configEntryId = this._getConfigEntry();
    if (!configEntryId) return;
    const response = await this.hass.callWS({
      type: "dynalite/get_entry",
      entry_id: configEntryId,
    });
    this._entryData = (response as any).data;
    this._name = this._entryData.name;
    this._host = this._entryData.host;
    this._port = this._entryData.port;
    if (this._entryData.default) {
      this._fade = this._entryData.default.fade;
    }
    const activeMap = {
      on: 0,
      true: 0,
      init: 1,
      false: 2,
      off: 2,
    };
    this._activeIndex = activeMap[this._entryData.active];
    this._active = this._activeOptions[this._activeIndex];
    this._auto_discover = this._entryData.autodiscover;
    this._poll_timer = this._entryData.polltimer;
  }

  private localStr(item) {
    return this.hass.localize("ui.panel.config.dynalite." + item);
  }

  private _getConfigEntry() {
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("config_entry")) {
      return false;
    }
    return searchParams.get("config_entry") as string;
  }

  private _handleChange(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    this[`_${target.name}`] = target.value;
  }

  private _handleActiveSelection(ev: CustomEvent) {
    this._active = ev.detail.item.active_config;
  }

  private _handleAutoDiscoverChange(ev: CustomEvent) {
    this._auto_discover = (ev.currentTarget as any).checked;
  }

  private async _publish(): Promise<void> {
    if (!this.hass) {
      return;
    }
    this._entryData.name = this._name;
    this._entryData.host = this._host;
    this._entryData.port = this._port;
    this._entryData.default.fade = this._fade;
    this._entryData.active = this._active;
    this._entryData.autodiscover = this._auto_discover;
    this._entryData.polltimer = this._poll_timer;
    const configEntryId = this._getConfigEntry();
    if (!configEntryId) return;
    await this.hass.callWS({
      type: "dynalite/update_entry",
      entry_id: configEntryId,
      entry_data: JSON.stringify(this._entryData),
    });
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          display: block;
          max-width: 600px;
          margin: 0 auto;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .content > * {
          display: block;
          margin: 24px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dynalite-config-panel": HaPanelConfigDynalite;
  }
}
