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
  aldbChangeRecordSchema,
  aldbNewRecordSchema,
} from "../../../../../data/insteon";
import "../../../../../layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../../../../types";
import { insteonDeviceTabs } from "./insteon-config-device-router";
import "./insteon-aldb-data-table";
import { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { RowClickedEvent } from "../../../../../components/data-table/ha-data-table";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { showInsteonALDBRecordDialog } from "./show-dialog-insteon-aldb-record";

@customElement("insteon-config-device-aldb-page")
class InsteonConfigDeviceALDBPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow?: boolean;

  @property() public isWide?: boolean;

  @property() public route?: Route;

  @property() private deviceId?: string;

  @internalProperty() private _device?: InsteonDevice;

  @internalProperty() private _records?: ALDBRecord[];

  @internalProperty() private _allRecords?: ALDBRecord[];

  @internalProperty() private _showHideUnused = "show";

  @internalProperty() private _showUnused = false;

  @internalProperty() private _isLoading = false;

  private _subscribed?: Promise<() => Promise<void>>;

  private _refreshDevicesTimeoutHandle?: number;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.deviceId) {
      fetchInsteonDevice(this.hass, this.deviceId!).then(
        (device) => {
          this._device = device;
          this._getRecords();
        },
        () => {
          this._noDeviceError();
        }
      );
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
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
                "ui.panel.config.insteon.aldb.status." +
                  this._device?.aldb_status
              )}
            </div>
            <div class="header-right">
              <mwc-button @click=${this._onShowHideUnusedClicked}>
                ${this.hass!.localize(
                  "ui.panel.config.insteon.aldb.actions." + this._showHideUnused
                )}
              </mwc-button>
              <mwc-button @click=${this._onLoadALDBClick}>
                ${this.hass!.localize(
                  "ui.panel.config.insteon.common.actions.load"
                )}
              </mwc-button>
              <mwc-button @click=${this._onAddDefaultLinksClicked}>
                ${this.hass!.localize(
                  "ui.panel.config.insteon.aldb.actions.add_default_links"
                )}
              </mwc-button>
              <mwc-button
                .disabled=${!this._dirty()}
                @click=${this._onWriteALDBClick}
              >
                ${this.hass!.localize(
                  "ui.panel.config.insteon.common.actions.write"
                )}
              </mwc-button>
              <mwc-button
                .disabled=${!this._dirty()}
                @click=${this._onResetALDBClick}
              >
                ${this.hass!.localize(
                  "ui.panel.config.insteon.common.actions.reset"
                )}
              </mwc-button>
            </div>
          </div>
          <insteon-aldb-data-table
            .hass=${this.hass}
            .narrow=${this.narrow}
            .records=${this._records}
            @row-click=${this._handleRowClicked}
            .isLoading=${this._isLoading}
          ></insteon-aldb-data-table>
        </div>
        <mwc-fab
          slot="fab"
          title="${this.hass.localize("ui.panel.config.insteon.aldb.create")}"
          @click=${this._createRecord}
        >
          <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
        </mwc-fab>
      </hass-tabs-subpage>
    `;
  }

  private _getRecords(): void {
    if (!this._device) {
      this._records = [];
      return;
    }
    fetchInsteonALDB(this.hass, this._device?.address).then((records) => {
      this._allRecords = records;
      this._records = this._filterRecords(this._allRecords, this._showUnused);
    });
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
      schema: aldbNewRecordSchema(this.hass),
      record: record,
      title: this.hass.localize("ui.panel.config.insteon.aldb.actions.new"),
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
    await showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.insteon.common.warn.load"),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: () => this._load(),
    });
  }

  private _load() {
    this._subscribe();
    loadALDB(this.hass, this._device!.address);
    this._isLoading = true;
    this._records = [];
  }

  private async _onShowHideUnusedClicked() {
    this._showUnused = !this._showUnused;
    if (this._showUnused) {
      this._showHideUnused = "hide";
    } else {
      this._showHideUnused = "show";
    }
    this._records = this._filterRecords(this._allRecords!, this._showUnused);
  }

  private async _onWriteALDBClick() {
    await showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.insteon.common.warn.write"),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: () => this._write(),
    });
  }

  private _write() {
    this._subscribe();
    writeALDB(this.hass, this._device!.address);
    this._isLoading = true;
    this._records = [];
  }

  private async _onResetALDBClick() {
    resetALDB(this.hass, this._device!.address);
    this._getRecords();
  }

  private async _onAddDefaultLinksClicked() {
    await showConfirmationDialog(this, {
      text: this.hass!.localize(
        "ui.panel.config.insteon.common.warn.add_default_links"
      ),
      confirm: () => this._addDefaultLinks(),
    });
  }

  private async _addDefaultLinks() {
    this._subscribe();
    addDefaultLinks(this.hass, this._device!.address);
    this._records = [];
  }

  private async _handleRecordChange(record: ALDBRecord) {
    changeALDBRecord(this.hass, this._device!.address, record);
    if (!record.in_use) {
      this._showUnused = true;
    }
    this._getRecords();
  }

  private async _handleRecordCreate(record: ALDBRecord) {
    createALDBRecord(this.hass, this._device!.address, record);
    this._getRecords();
  }

  private async _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const id = ev.detail.id;
    const record = this._records!.find((rec) => rec.mem_addr === id);
    showInsteonALDBRecordDialog(this, {
      schema: aldbChangeRecordSchema(this.hass),
      record: record!,
      title: this.hass.localize("ui.panel.config.insteon.aldb.actions.change"),
      callback: async (rec) => await this._handleRecordChange(rec),
    });
    history.back();
  }

  private async _handleBackTapped(): Promise<void> {
    if (this._dirty()) {
      await showConfirmationDialog(this, {
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
    resetALDB(this.hass, this._device!.address);
    history.back();
  }

  private _handleMessage(message: any): void {
    if (message.type === "record_loaded") {
      this._getRecords();
    }
    if (message.type === "status_changed") {
      fetchInsteonDevice(this.hass, this.deviceId!).then((device) => {
        this._device = device;
      });
      this._isLoading = message.is_loading;
      if (!message.is_loading) {
        this._unsubscribe();
      }
    }
  }

  private _unsubscribe(): void {
    if (this._refreshDevicesTimeoutHandle) {
      clearTimeout(this._refreshDevicesTimeoutHandle);
    }
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  private _subscribe(): void {
    if (!this.hass) {
      return;
    }
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      {
        type: "insteon/aldb/notify",
        device_address: this._device?.address,
      }
    );
    this._refreshDevicesTimeoutHandle = window.setTimeout(
      () => this._unsubscribe(),
      1200000
    );
  }

  private _noDeviceError(): void {
    showAlertDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.insteon.common.error.device_not_found"
      ),
    });
    this._goBack();
    this._goBack();
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
