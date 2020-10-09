import "@material/mwc-button";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-circular-progress";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
  PropertyValues,
} from "lit-element";
import "../../../../../components/ha-service-description";
import "@polymer/paper-input/paper-textarea";
import {
  InsteonDevice,
  Properties,
  fetchInsteonDevice,
  fetchInsteonProperties,
  changeProperty,
  writeProperties,
  loadProperties,
  resetProperties,
} from "../../../../../data/insteon";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../../types";
import { insteonDeviceTabs } from "./insteon-config-device-router";
import "./insteon-aldb-data-table";
import { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import type { HaFormSchema } from "../../../../../components/ha-form/ha-form";

@customElement("insteon-config-device-properties-page")
class InsteonConfigDevicePropertiesPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow?: boolean;

  @property() public isWide?: boolean;

  @property() public route?: Route;

  @property() private deviceId?: string;

  @internalProperty() private _device?: InsteonDevice;

  @internalProperty() private _properties?: Properties;

  @internalProperty() private _schema?: HaFormSchema;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.deviceId) {
      fetchInsteonDevice(this.hass, this.deviceId!).then((device) => {
        this._device = device;
      });
      fetchInsteonProperties(this.hass, this.deviceId!).then(
        (propertiesInfo) => {
          this._properties = propertiesInfo.properties;
          this._schema = propertiesInfo.schema;
        }
      );
    }
  }

  protected _dirty() {
    return false;
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow!}
        .route=${this.route!}
        .tabs=${insteonDeviceTabs}
        .backCallback=${() => this._handleBackTapped()}
      >
        ${this.narrow
          ? html`
              <span slot="header">
                ${this._device?.name}
              </span>
            `
          : ""}
        <div class="container">
          <div slot="header" class="header fullwidth">
            ${this.narrow
              ? ""
              : html`
                  <div>
                    <h1>${this._device?.name}</h1>
                  </div>
                  <div class="header-right">
                    <img
                      src="https://brands.home-assistant.io/insteon/logo.png"
                      referrerpolicy="no-referrer"
                      @load=${this._onImageLoad}
                      @error=${this._onImageError}
                    />
                  </div>
                `}
          </div>
          <div slot="header" class="header fullwidth">
            <div>
              ALDB Status:
              ${this.hass.localize(
                "ui.panel.config.insteon.device.aldb.status." +
                  this._device?.aldb_status
              )}
            </div>
            <div class="header-right">
              <mwc-button @click=${this._onLoadPropertiesClick}>
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.properties.actions.load"
                )}
              </mwc-button>
              <mwc-button
                .disabled=${!this._dirty()}
                @click=${this._onWritePropertiesClick}
              >
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.properties.actions.write"
                )}
              </mwc-button>
              <mwc-button
                .disabled=${!this._dirty()}
                @click=${this._onResetPropertiesClick}
              >
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.properties.actions.reset"
                )}
              </mwc-button>
            </div>
          </div>
          Properties will go here
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _onImageLoad(ev) {
    ev.target.style.display = "inline-block";
  }

  private _onImageError(ev) {
    ev.target.style.display = "none";
  }

  private async _onLoadPropertiesClick() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.insteon.device.properties.actions.warn_load"
      ),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: () => this._load(),
    });
  }

  private _load() {
    loadProperties(this.hass, this.deviceId!);
  }

  private async _onWritePropertiesClick() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.insteon.device.aldb.actions.warn_write"
      ),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: () => this._write(),
    });
  }

  private _write() {
    writeProperties(this.hass, this.deviceId!);
  }

  private async _onResetPropertiesClick() {
    resetProperties(this.hass, this.deviceId!);
    fetchInsteonProperties(this.hass, this.deviceId!).then((propertiesInfo) => {
      this._properties = propertiesInfo.properties;
    });
  }

  private async _handlePropertyChange(name: string, value: number | boolean) {
    changeProperty(this.hass, this.deviceId!, name, value);
  }

  private _handleBackTapped(): void {
    if (this._dirty()) {
      showConfirmationDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.common.editor.confirm_unsaved"
        ),
        confirmText: this.hass!.localize("ui.common.yes"),
        dismissText: this.hass!.localize("ui.common.no"),
        confirm: () => this._goBack(),
      });
    } else {
      history.back();
    }
  }

  private _goBack(): void {
    resetProperties(this.hass, this.deviceId!);
    history.back();
  }

  static get styles(): CSSResult {
    return css`
      insteon-aldb-data-table {
        width: 100%;
        height: 100%;
        --data-table-border-width: 0;
      }
      :host(:not([narrow])) insteon-aldb-data-table {
        height: 78vh;
        display: block;
      }
      .table-header {
        border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
        padding: 0 16px;
        display: flex;
        align-items: center;
      }
      .container {
        display: flex;
        flex-wrap: wrap;
        margin: auto;
        max-width: 1000px;
        margin-top: 32px;
        margin-bottom: 32px;
        height: 100px;
      }

      h1 {
        margin: 0;
        font-family: var(--paper-font-headline_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-headline_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-headline_-_font-size);
        font-weight: var(--paper-font-headline_-_font-weight);
        letter-spacing: var(--paper-font-headline_-_letter-spacing);
        line-height: var(--paper-font-headline_-_line-height);
        opacity: var(--dark-primary-opacity);
      }

      .header {
        display: flex;
        justify-content: space-between;
      }

      .fullwidth {
        padding: 8px;
        box-sizing: border-box;
      }
      .fullwidth {
        width: 100%;
        flex-grow: 1;
      }

      .header-right {
        align-self: center;
      }

      .header-right img {
        height: 30px;
      }

      .header-right {
        display: flex;
      }

      .header-right:first-child {
        width: 100%;
        justify-content: flex-end;
      }

      .header-right > *:not(:first-child) {
        margin-left: 16px;
      }

      :host([narrow]) .container {
        margin-top: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-config-device-properties-page": InsteonConfigDevicePropertiesPage;
  }
}
