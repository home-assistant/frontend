import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiChevronRight, mdiDevices } from "@mdi/js";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-select";
import type { HassDialog } from "../../../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../../../types";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices } from "../../../../../data/zha";
import { haStyleDialog } from "../../../../../resources/styles";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";

@customElement("dialog-zha-offline-devices")
class DialogZHAOfflineDevices extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _offlineDevices: ZHADevice[] = [];

  @state() private _isLoading = false;

  @state() private _error: any;

  public showDialog(): void {
    this._opened = true;
    this._loadDevices();
  }

  private async _loadDevices() {
    this._isLoading = true;
    try {
      const devices = await fetchDevices(this.hass);
      this._offlineDevices = devices.filter((d) => !d.available);
    } catch (err: any) {
      this._error = err.message || err;
    }
    this._isLoading = false;
  }

  public closeDialog() {
    this._opened = false;
    this._offlineDevices = [];
    this._isLoading = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  private _renderItem(device: ZHADevice) {
    return html`<ha-md-list-item
      type="link"
      href="/config/devices/device/${device.device_reg_id}"
    >
      <ha-svg-icon .path=${mdiDevices} slot="start"></ha-svg-icon>
      <span slot="headline">${device.user_given_name} (${device.ieee})</span>
      <span slot="supporting-text">
        ${this.hass.localize(
          "ui.panel.config.zha.offline_devices_dialog.last_seen",
          {
            date: new Date(device.last_seen).toLocaleString(this.hass.language),
          }
        )}
      </span>
      <ha-svg-icon slot="end" .path=${mdiChevronRight}></ha-svg-icon>
    </ha-md-list-item>`;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._opened) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zha.offline_devices_dialog.title")
        )}
      >
        ${this._error
          ? html`<ha-alert alert-type="error"
              >${this.hass.localize(
                "ui.panel.config.zha.offline_devices_dialog.error_loading",
                { error: this._error }
              )}
            </ha-alert>`
          : nothing}
        ${this._isLoading
          ? html`<ha-spinner></ha-spinner>`
          : this._offlineDevices.length !== 0
            ? html`<ha-md-list>
                ${this._offlineDevices.map((device) =>
                  this._renderItem(device)
                )}
              </ha-md-list>`
            : html`<ha-alert>
                ${this.hass.localize(
                  "ui.panel.config.zha.offline_devices_dialog.no_offline_devices"
                )}
              </ha-alert>`}

        <ha-button
          slot="primaryAction"
          appearance="plain"
          @click=${this.closeDialog}
          >${this.hass.localize("ui.common.close")}
        </ha-button>
      </ha-dialog>
    `;
  }

  static styles = [
    haStyleDialog,
    css`
      ha-spinner {
        display: block;
        margin: 16px auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-offline-devices": DialogZHAOfflineDevices;
  }
}
