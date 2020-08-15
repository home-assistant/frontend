import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
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
import "../../../../../components/ha-code-editor";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "../../../../../layouts/hass-subpage";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import { getConfigEntries } from "../../../../../data/config_entries";

@customElement("dynalite-config-panel")
class HaPanelDevDynalite extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  private entryData;

  @internalProperty() private _name = "";

  @internalProperty() private _host = "";

  @internalProperty() private _port = "";

  @internalProperty() private _active = "";

  @internalProperty() private _auto_discover = "";

  @internalProperty() private _poll_timer = "";

  @internalProperty() private _fade = "";

  @internalProperty() private _elevation!: string;

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

  protected render(): TemplateResult {
    console.error("xxx %s", this._name);
    return html`
      <hass-subpage>
        <div class="content">
          <ha-card header="${this.hass.localize(
            "ui.panel.config.dynalite.description_settings"
          )}">
          </ha-card>
          <ha-card
            header="${this.hass.localize(
              "ui.panel.config.dynalite.description_system"
            )}"
          >
            <div class="card-content">
              <paper-input
                class="flex"
                .label=${this.hass.localize("ui.panel.config.dynalite.name")}
                name="name"
                type="string"
                .value=${this._name}
                @value-changed=${this._handleChange}
              >
            </div>
            <div class="card-content">
              <paper-input
                class="flex"
                .label=${this.hass.localize("ui.panel.config.dynalite.host")}
                name="host"
                type="string"
                .value=${this._host}
                @value-changed=${this._handleChange}
              >
            </div>
            <div class="card-content">
              <paper-input
                class="flex"
                .label=${this.hass.localize("ui.panel.config.dynalite.port")}
                name="port"
                type="number"
                .value=${this._port}
                @value-changed=${this._handleChange}
              >
            </div>
            <div class="card-content">
			  <ha-settings-row>
				<span slot="heading"
				  >${this.hass.localize("ui.panel.config.dynalite.active")}</span
				>
				<ha-paper-dropdown-menu
				  label=${this.hass.localize("ui.panel.config.dynalite.active")}
				  dynamic-align=""
				>
				  <paper-listbox
					slot="dropdown-content"
					.selected=${this._active}
					name="active"
					@iron-select=${this._handleChange}
				  >
					  <paper-item>Enabled</paper-item>
					  <paper-item>Init Only</paper-item>
					  <paper-item>Disabled</paper-item>
				  </paper-listbox>
				</ha-paper-dropdown-menu>
			  </ha-settings-row>
            </div>
            <div class="card-content">
			  <ha-settings-row>
				<span slot="heading">
				  ${this.hass.localize("ui.panel.config.dynalite.auto_discover")}
				</span>
				<ha-switch
				  name="auto_discover"
				  .checked=${this._auto_discover}
				  @change=${this._handleChange}
				></ha-switch>
			  </ha-settings-row>
            </div>
            <div class="card-content">
              <paper-input
                class="flex"
                .label=${this.hass.localize("ui.panel.config.dynalite.fade")}
                name="fade"
                type="number"
                .value=${this._fade}
                @value-changed=${this._handleChange}
              >
            </div>
            <div class="card-actions">
              <mwc-button @click=${this._publish}
                >${this.hass.localize(
                  "ui.panel.config.dynalite.publish"
                )}</mwc-button
              >
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _handleChange(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    this[`_${target.name}`] = target.value;
  }

  private _publish(): void {
    if (!this.hass) {
      return;
    }
    this.hass.callService("dynalite", "publish", {
      topic: this.topic,
      payload_template: this.payload,
    });
  }

  private async _openOptionFlow() {
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("config_entry")) {
      return;
    }
    const configEntryId = searchParams.get("config_entry") as string;
    const configEntries = await getConfigEntries(this.hass);
    const configEntry = configEntries.find(
      (entry) => entry.entry_id === configEntryId
    );
    showOptionsFlowDialog(this, configEntry!);
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
        paper-input {
          min-width: 75px;
          flex-grow: 1;
          margin: 0 4px;
        }

        .content {
          padding: 24px 0 32px;
          max-width: 600px;
          margin: 0 auto;
          direction: ltr;
        }
        ha-card:first-child {
          margin-bottom: 16px;
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
