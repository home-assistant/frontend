import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/buttons/ha-progress-button";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-clickable-list-item";
import "../../../components/ha-icon-next";
import "../../../components/ha-settings-row";
import { BOARD_NAMES, HardwareInfo } from "../../../data/hardware";
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

  @state() private _hardwareInfo?: HardwareInfo;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass, "hassio")) {
      this._load();
    }
  }

  protected render(): TemplateResult {
    let board: string | undefined;
    let hostName: string | undefined;
    let imageURL: string | undefined;
    let documentationURL: string | undefined;

    if (
      isComponentLoaded(this.hass, "hardware") &&
      this._hardwareInfo?.hardware.length
    ) {
      const boardData = this._hardwareInfo!.hardware[0];

      board = boardData.board.model;
      hostName = boardData.name;
      documentationURL = boardData.url;
      imageURL =
        "https://raw.githubusercontent.com/home-assistant/brands/2d3cd2eb7dbd1b8daa756a885755a88a1b6bd160/core_integrations/_homeassistant/icon.png";
    } else if (this._OSData?.board) {
      board = this._OSData.board;
      hostName = BOARD_NAMES[this._OSData.board];
    }

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
          ${this._hostData
            ? html`
                <mwc-list-item class="warning" @click=${this._hostReboot}
                  >${this.hass.localize(
                    "ui.panel.config.hardware.reboot_host"
                  )}</mwc-list-item
                >
                <mwc-list-item class="warning" @click=${this._hostShutdown}
                  >${this.hass.localize(
                    "ui.panel.config.hardware.shutdown_host"
                  )}</mwc-list-item
                >
              `
            : ""}
        </ha-button-menu>
        ${this._error
          ? html`
              <ha-alert alert-type="error"
                >${this._error.message || this._error.code}</ha-alert
              >
            `
          : ""}
        ${board
          ? html`
              <div class="content">
                <ha-card outlined>
                  ${board
                    ? html`
                        <div class="card-content">
                          <mwc-list>
                            <mwc-list-item
                              graphic=${ifDefined(
                                imageURL ? "medium" : undefined
                              )}
                              twoline
                            >
                              ${imageURL
                                ? html`<img slot="graphic" src=${imageURL} />`
                                : ""}
                              <span class="primary-text">
                                ${hostName ||
                                this.hass.localize(
                                  "ui.panel.config.hardware.board"
                                )}
                              </span>
                              <span class="secondary-text" slot="secondary"
                                >${board}</span
                              >
                            </mwc-list-item>
                            <ha-clickable-list-item
                              .href=${documentationURL}
                              openNewTab
                              twoline
                              hasMeta
                            >
                              <span>Documentation</span>
                              <span slot="secondary"
                                >Find extra information on your device</span
                              >
                              <ha-icon-next slot="meta"></ha-icon-next>
                            </ha-clickable-list-item>
                          </mwc-list>
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
      if (isComponentLoaded(this.hass, "hardware")) {
        this._hardwareInfo = await this.hass.callWS({ type: "hardware/info" });
      } else {
        this._OSData = await fetchHassioHassOsInfo(this.hass);
      }
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
        padding: 16px;
      }
      ha-button-menu {
        color: var(--secondary-text-color);
        --mdc-menu-min-width: 200px;
      }

      .primary-text {
        font-size: 16px;
      }
      .secondary-text {
        font-size: 14px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-hardware": HaConfigHardware;
  }
}
