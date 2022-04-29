import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/buttons/ha-progress-button";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-settings-row";
import { BOARD_NAMES } from "../../../data/hardware";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../data/hassio/common";
import {
  fetchHassioHassOsInfo,
  fetchHassioHostInfo,
  HassioHassOSInfo,
  HassioHostInfo,
  rebootHost,
  shutdownHost,
} from "../../../data/hassio/host";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showhardwareAvailableDialog } from "./show-dialog-hardware-available";

@customElement("ha-config-hardware")
class HaConfigHardware extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _error?: { code: string; message: string };

  @state() private _OSData?: HassioHassOSInfo;

  @state() private _hostData?: HassioHostInfo;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass, "hassio")) {
      this._load();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.hardware.caption")}
      >
        <ha-button-menu corner="BOTTOM_START" slot="toolbar-icon">
          <ha-icon-button
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
            slot="trigger"
          ></ha-icon-button>
          <mwc-list-item @click=${this._openHardware}
            >${this.hass.localize(
              "ui.panel.config.hardware.available_hardware.title"
            )}</mwc-list-item
          >
        </ha-button-menu>
        ${this._error
          ? html`
              <ha-alert alert-type="error"
                >${this._error.message || this._error.code}</ha-alert
              >
            `
          : ""}
        ${this._OSData || this._hostData
          ? html`
              <div class="content">
                <ha-card outlined>
                  ${this._OSData?.board
                    ? html`
                        <div class="card-content">
                          <ha-settings-row>
                            <span slot="heading"
                              >${BOARD_NAMES[this._OSData.board] ||
                              this.hass.localize(
                                "ui.panel.config.hardware.board"
                              )}</span
                            >
                            <div slot="description">
                              <span class="value">${this._OSData.board}</span>
                            </div>
                          </ha-settings-row>
                        </div>
                      `
                    : ""}
                  ${this._hostData
                    ? html`
                        <div class="card-actions">
                          ${this._hostData.features.includes("reboot")
                            ? html`
                                <ha-progress-button
                                  class="warning"
                                  @click=${this._hostReboot}
                                >
                                  ${this.hass.localize(
                                    "ui.panel.config.hardware.reboot_host"
                                  )}
                                </ha-progress-button>
                              `
                            : ""}
                          ${this._hostData.features.includes("shutdown")
                            ? html`
                                <ha-progress-button
                                  class="warning"
                                  @click=${this._hostShutdown}
                                >
                                  ${this.hass.localize(
                                    "ui.panel.config.hardware.shutdown_host"
                                  )}
                                </ha-progress-button>
                              `
                            : ""}
                        </div>
                      `
                    : ""}
                </ha-card>
              </div>
            `
          : ""}
      </hass-subpage>
    `;
  }

  private async _load() {
    try {
      this._OSData = await fetchHassioHassOsInfo(this.hass);
      this._hostData = await fetchHassioHostInfo(this.hass);
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private async _openHardware() {
    showhardwareAvailableDialog(this);
  }

  private async _hostReboot(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.hardware.reboot_host"),
      text: this.hass.localize("ui.panel.config.hardware.reboot_host_confirm"),
      confirmText: this.hass.localize("ui.panel.config.hardware.reboot_host"),
      dismissText: this.hass.localize("common.cancel"),
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await rebootHost(this.hass);
    } catch (err: any) {
      // Ignore connection errors, these are all expected
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.hardware.failed_to_reboot_host"
          ),
          text: extractApiErrorMessage(err),
        });
      }
    }
    button.progress = false;
  }

  private async _hostShutdown(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.hardware.shutdown_host"),
      text: this.hass.localize(
        "ui.panel.config.hardware.shutdown_host_confirm"
      ),
      confirmText: this.hass.localize("ui.panel.config.hardware.shutdown_host"),
      dismissText: this.hass.localize("common.cancel"),
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await shutdownHost(this.hass);
    } catch (err: any) {
      // Ignore connection errors, these are all expected
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.hardware.failed_to_shutdown_host"
          ),
          text: extractApiErrorMessage(err),
        });
      }
    }
    button.progress = false;
  }

  static styles = [
    haStyle,
    css`
      .content {
        padding: 28px 20px 0;
        max-width: 1040px;
        margin: 0 auto;
      }
      ha-card {
        max-width: 600px;
        margin: 0 auto;
        height: 100%;
        justify-content: space-between;
        flex-direction: column;
        display: flex;
      }
      .card-content {
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        padding: 16px 16px 0 16px;
      }
      ha-button-menu {
        color: var(--secondary-text-color);
        --mdc-menu-min-width: 200px;
      }
      .card-actions {
        height: 48px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-hardware": HaConfigHardware;
  }
}
