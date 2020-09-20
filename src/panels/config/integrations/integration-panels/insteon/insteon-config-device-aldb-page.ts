import "@material/mwc-fab";
import { mdiPlus } from "@mdi/js";
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
  fetchInsteonALDB,
  changeALDBRecord,
  createALDBRecord,
  writeALDB,
  loadALDB,
  resetALDB,
  addDefaultLinks,
} from "../../../../../data/insteon";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../../types";
import { insteonDeviceTabs } from "./insteon-config-device-router";
import "./insteon-aldb-data-table";
import { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { RowClickedEvent } from "../../../../../components/data-table/ha-data-table";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { showInsteonALDBRecordDialog } from "./show-dialog-insteon-aldb-record";
import type { HaFormSchema } from "../../../../../components/ha-form/ha-form";

@customElement("insteon-config-device-aldb-page")
class InsteonConfigDeviceALDBPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow?: boolean;

  @property() public isWide?: boolean;

  @property() public route?: Route;

  @property() private deviceId?: string;

  @internalProperty() private _device?: InsteonDevice;

  @internalProperty() private _records?: ALDBRecord[];

  @internalProperty() private _schema?: HaFormSchema;

  @internalProperty() private _showHideUnused = "show_unused";

  @internalProperty() private _showUnused = false;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.deviceId) {
      fetchInsteonDevice(this.hass, this.deviceId!).then((device) => {
        this._device = device;
      });
      fetchInsteonALDB(this.hass, this.deviceId!).then((aldbInfo) => {
        this._records = this._filterRecords(aldbInfo.records, this._showUnused);
        this._schema = aldbInfo.schema;
      });
    }
  }

  protected _dirty() {
    return this._records?.reduce((dirty, rec) => {
      return dirty || rec.dirty;
    }, false);
  }

  private _filterRecords(
    records: ALDBRecord[],
    showUnused: boolean
  ): ALDBRecord[] {
    return records.filter((record) => {
      return record.in_use || showUnused;
    });
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
              <mwc-button @click=${this._onShowHideUnusedClicked}>
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.aldb.actions." +
                    this._showHideUnused
                )}
              </mwc-button>
              <mwc-button @click=${this._onLoadALDBClick}>
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.aldb.actions.load"
                )}
              </mwc-button>
              <mwc-button @click=${this._onAddDefaultLinksClicked}>
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.aldb.actions.add_default_links"
                )}
              </mwc-button>
              <mwc-button
                .disabled=${!this._dirty()}
                @click=${this._onWriteALDBClick}
              >
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.aldb.actions.write"
                )}
              </mwc-button>
              <mwc-button
                .disabled=${!this._dirty()}
                @click=${this._onResetALDBClick}
              >
                ${this.hass!.localize(
                  "ui.panel.config.insteon.device.aldb.actions.reset"
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
        <mwc-fab
          slot="fab"
          title="${this.hass.localize(
            "ui.panel.config.insteon.device.aldb.create"
          )}"
          @click=${this._createRecord}
        >
          <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
        </mwc-fab>
      </hass-tabs-subpage>
    `;
  }

  private _createRecord(): void {
    const record: ALDBRecord = {
      mem_addr: 0,
      in_use: true,
      mode: "C",
      highwater: false,
      group: 0,
      target: "",
      target_name: "",
      data1: 0,
      data2: 0,
      data3: 0,
      dirty: true,
    };
    showInsteonALDBRecordDialog(this, {
      schema: this._schema!,
      record: record,
      callback: async (rec) => await this._handleRecordCreate(rec),
    });
  }

  private _onImageLoad(ev) {
    ev.target.style.display = "inline-block";
  }

  private _onImageError(ev) {
    ev.target.style.display = "none";
  }

  private async _onLoadALDBClick() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.insteon.device.aldb.actions.warn_load"
      ),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: () => this._load(),
    });
  }

  private _load() {
    loadALDB(this.hass, this.deviceId!);
    this._device!.aldb_status = "loading";
    this._records = [];
  }

  private async _onShowHideUnusedClicked() {
    this._showUnused = !this._showUnused;
    if (this._showUnused) {
      this._showHideUnused = "hide_unused";
    } else {
      this._showHideUnused = "show_unused";
    }
    this._records = [];
    fetchInsteonALDB(this.hass, this.deviceId!).then((aldbInfo) => {
      this._records = this._filterRecords(aldbInfo.records, this._showUnused);
    });
  }

  private async _onWriteALDBClick() {
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
    writeALDB(this.hass, this.deviceId!);
    this._device!.aldb_status = "loading";
    this._records = [];
  }

  private async _onResetALDBClick() {
    resetALDB(this.hass, this.deviceId!);
    fetchInsteonALDB(this.hass, this.deviceId!).then((aldbInfo) => {
      this._records = this._filterRecords(aldbInfo.records, this._showUnused);
    });
  }

  private async _onAddDefaultLinksClicked() {
    showConfirmationDialog(this, {
      text: "Changes will be made to this device and your modem.",
      confirm: () => this._addDefaultLinks(),
    });
  }

  private async _addDefaultLinks() {
    addDefaultLinks(this.hass, this.deviceId!);
    // this._records = [];
  }

  private async _handleRecordChange(record: ALDBRecord) {
    changeALDBRecord(this.hass, this.deviceId!, record);
    if (!record.in_use) {
      this._showUnused = true;
    }
    fetchInsteonALDB(this.hass, this.deviceId!).then((aldbInfo) => {
      this._records = this._filterRecords(aldbInfo.records, this._showUnused);
    });
  }

  private async _handleRecordCreate(record: ALDBRecord) {
    createALDBRecord(this.hass, this.deviceId!, record);
    fetchInsteonALDB(this.hass, this.deviceId!).then((aldbInfo) => {
      this._records = this._filterRecords(aldbInfo.records, this._showUnused);
    });
  }

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
      callback: async (rec) => await this._handleRecordChange(rec),
    });
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
    resetALDB(this.hass, this.deviceId!);
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
    "insteon-config-device-aldb-page": InsteonConfigDeviceALDBPage;
  }
}
