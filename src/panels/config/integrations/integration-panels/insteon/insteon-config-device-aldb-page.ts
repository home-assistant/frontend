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
  fetchInsteonDevice,
  ALDBRecord,
  ALDBInfo,
  fetchInsteonALDB,
} from "../../../../../data/insteon";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../../types";
import { IronAutogrowTextareaElement } from "@polymer/iron-autogrow-textarea";
import { insteonDeviceTabs } from "./insteon-config-device-router";
import "./insteon-aldb-data-table";
import { HASSDomEvent } from "../../../../../common/dom/fire_event";
import {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { showInsteonALDBRecordDialog } from "./show-dialog-insteon-aldb-record";
import { Schema } from "js-yaml";
import type { HaFormSchema } from "../../../../../components/ha-form/ha-form";

@customElement("insteon-config-device-aldb-page")
class InsteonConfigDeviceALDBPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow?: boolean;

  @property() public isWide?: boolean;

  @property() public route?: Route;

  @property() private _device_id?: string;

  @property() private _device?: InsteonDevice;

  @property() private _records?: ALDBRecord[];

  @property() private _schema?: HaFormSchema;

  @property() private _show_write = false;

  @property() private _data?: { [key: string]: any };

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.route && this.route.path && this.route.path !== "") {
      this._device_id = this.route.path.substring(1);
    } else {
      this._device_id = undefined;
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("hass") && this._device_id) {
      fetchInsteonDevice(this.hass, this._device_id!).then((device) => {
        this._device = device;
      });
      fetchInsteonALDB(this.hass, this._device_id!).then((aldbInfo) => {
        this._records = aldbInfo.records;
        this._schema = aldbInfo.schema;
      });
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow!}
        .route=${this.route!}
        .tabs=${insteonDeviceTabs}
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
                `}
            <div class="header-right">
              <img
                src="https://brands.home-assistant.io/insteon/logo.png"
                referrerpolicy="no-referrer"
                @load=${this._onImageLoad}
                @error=${this._onImageError}
              />
            </div>
          </div>
          <div slot="header" class="header fullwidth">
            <div>
              ALDB Status: ${this._device?.aldb_status}
            </div>
            <div class="header-right">
              <mwc-button @click=${this._onLoadALDBClick}>
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.aldb.actions.load"
                )}
              </mwc-button>
              <mwc-button
                .disabled=${!this._show_write}
                @click=${this._onLoadALDBClick}
              >
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.aldb.actions.write"
                )}
              </mwc-button>
            </div>
          </div>
          <insteon-aldb-data-table
            .hass=${this.hass}
            .narrow=${this.narrow}
            .records=${this._records}
            @row-click=${this._handleRowClicked}
          ></insteon-aldb-data-table>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _stepDataChanged(ev: CustomEvent): void {
    this._data = ev.detail.value;
  }

  private _onImageLoad(ev) {
    ev.target.style.display = "inline-block";
  }

  private _onImageError(ev) {
    ev.target.style.display = "none";
  }

  private _onLoadALDBClick() {}

  private async _handleDialogResponse(text: string) {
    await showConfirmationDialog(this, {
      title: "The title",
      text: text,
      confirmText: "We good",
      dismissText: "We not good",
    });
  }

  private async _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const id = ev.detail.id;
    const record = this._records!.find((rec) => rec.mem_addr === id);
    showInsteonALDBRecordDialog(this, {
      schema: this._schema!,
      record: record!,
      callback: async (text) => await this._handleDialogResponse(text),
    });
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
    "insteon-config-device-aldb-page": InsteonConfigDeviceALDBPage;
  }
}
