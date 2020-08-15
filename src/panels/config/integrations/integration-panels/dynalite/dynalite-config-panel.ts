import "@material/mwc-button";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";
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
import { getConfigEntries } from "../../../../../data/config_entries";

@customElement("dynalite-config-panel")
class HaPanelDevDynalite extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  private entryData;

  @internalProperty() _activeOptions: string[] = ["Enabled", "Off", "Disabled"];

  @internalProperty() private _name = "";

  @internalProperty() private _host = "";

  @internalProperty() private _port = "";

  @internalProperty() private _active = "";

  @internalProperty() private _auto_discover = "";

  @internalProperty() private _poll_timer = "";

  @internalProperty() private _fade = "";

  protected async firstUpdated() {
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("config_entry")) {
      return;
    }
    const configEntryId = searchParams.get("config_entry") as string;
    const response = await this.hass.connection.sendMessagePromise({
      type: "dynalite/get_entry",
      entry_id: configEntryId,
    });
    this.entryData = response.data;
    console.error("Message success!", JSON.stringify(this.entryData));
    this._name = this.entryData.name;
    this._host = this.entryData.host;
    this._port = this.entryData.port;
    this._active = this.entryData.active;
    this._auto_discover = this.entryData.autodiscover;
    if (this.entryData.default) {
      this._fade = this.entryData.default.fade;
    }
    console.log("XXX %s %s", this.entryData, this._name);
    console.log("XXX %s %s", this.entryData.xxx, this._host);
  }

  private localStr(item) {
    return this.hass.localize("ui.panel.config.dynalite." + item);
  }

  protected render(): TemplateResult {
    console.error("xxx %s", this._name);
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
          <ha-card header="${this.localStr("description_system")}">
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
                >
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
                >
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
                >
			  </ha-settings-row>
            </div>
            <div class="card-content">
			  <ha-settings-row .narrow=${this.narrow}>
				<span slot="heading">${this.localStr("active")}</span>
				<span slot="description">${this.localStr("active_long")}</span>
				<ha-paper-dropdown-menu label=${this.localStr("active")} dynamic-align>
				  <paper-listbox
					slot="dropdown-content"
					.selected=${this._active}
					name="active"
                    @iron-select=${this._handleThemeSelection}
				  >
					<paper-item .abcdcba="1">Enabled</paper-item>
					<paper-item .abcdcba="2">Init Only</paper-item>
					<paper-item .abcdcba="3">Disabled</paper-item>
				  </paper-listbox>
				</ha-paper-dropdown-menu>
			  </ha-settings-row>
            </div>
            <div class="card-content">
			  <ha-settings-row .narrow=${this.narrow}>
				<span slot="heading">${this.localStr("auto_discover")}</span>
				<span slot="description">${this.localStr("auto_discover_long")}</span>
				<ha-switch
				  name="auto_discover"
				  .checked=${this._auto_discover}
				  @change=${this._handleChange}
				></ha-switch>
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
                >
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

  private _handleChange(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    this[`_${target.name}`] = target.value;
    console.log("XXX setting %s to %s", target.name, target.value);
  }

  languageSelectionChanged(newVal) {
    // Only fire event if language was changed. This prevents select updates when
    // responding to hass changes.
    console.log("XXX ZZZ %s", JSON.stringify(newVal));
    if (newVal !== this.hass.language) {
      this.fire("hass-language-select", { language: newVal });
    }
  }

  private _handleThemeSelection(ev: CustomEvent) {
    console.log("XXX YYY event = %s", ev.detail.item);
    return;
    const theme = ev.detail.item.theme;
    if (theme === "Backend-selected") {
      if (this.hass.selectedTheme?.theme) {
        fireEvent(this, "settheme", { theme: "" });
      }
      return;
    }
    fireEvent(this, "settheme", { theme });
  }

  private _publish(): void {
    console.log("XXX publish - name=%s", this._name);
    console.log("XXX publish - active=%s", this._active);
    if (!this.hass) {
      return;
    }
    return;
    this.hass.callService("dynalite", "publish", {
      topic: this.topic,
      payload_template: this.payload,
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
    "developer-tools-dynalite": HaPanelDevDynalite;
  }
}
