import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import type { ChartOptions } from "chart.js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { numberFormatToLocale } from "../../../common/number/format_number";
import { round } from "../../../common/number/round";
import "../../../components/buttons/ha-progress-button";
import "../../../components/chart/ha-chart-base";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-clickable-list-item";
import "../../../components/ha-icon-next";
import "../../../components/ha-settings-row";
import {
  BOARD_NAMES,
  HardwareInfo,
  SystemStatusStreamMessage,
} from "../../../data/hardware";
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
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { DEFAULT_PRIMARY_COLOR } from "../../../resources/ha-style";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { hardwareBrandsUrl } from "../../../util/brands-url";
import { showToast } from "../../../util/toast";
import { showhardwareAvailableDialog } from "./show-dialog-hardware-available";

const DATASAMPLES = 60;

const DATA_SET_CONFIG = {
  fill: "origin",
  borderColor: DEFAULT_PRIMARY_COLOR,
  backgroundColor: DEFAULT_PRIMARY_COLOR + "2B",
  pointRadius: 0,
  lineTension: 0.2,
  borderWidth: 1,
};

@customElement("ha-config-hardware")
class HaConfigHardware extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _error?: { code: string; message: string };

  @state() private _OSData?: HassioHassOSInfo;

  @state() private _hostData?: HassioHostInfo;

  @state() private _hardwareInfo?: HardwareInfo;

  @state() private _chartOptions?: ChartOptions;

  @state() private _systemStatusData?: SystemStatusStreamMessage;

  private _memoryEntries: { x: number; y: number | null }[] = [];

  private _cpuEntries: { x: number; y: number | null }[] = [];

  public hassSubscribe() {
    return isComponentLoaded(this.hass, "hardware")
      ? [
          this.hass.connection.subscribeMessage<SystemStatusStreamMessage>(
            (message) => {
              // Only store the last 60 entries
              this._memoryEntries.shift();
              this._cpuEntries.shift();

              this._memoryEntries.push({
                x: new Date(message.timestamp).getTime(),
                y: message.memory_used_percent,
              });
              this._cpuEntries.push({
                x: new Date(message.timestamp).getTime(),
                y: message.cpu_percent,
              });

              this._systemStatusData = message;
            },
            {
              type: "hardware/subscribe_system_status",
            }
          ),
        ]
      : [];
  }

  protected willUpdate(): void {
    if (!this.hasUpdated) {
      this._chartOptions = {
        animation: false,
        responsive: true,
        scales: {
          y: {
            gridLines: {
              drawTicks: false,
            },
            ticks: {
              maxTicksLimit: 7,
              fontSize: 10,
              max: 100,
              min: 0,
              stepSize: 1,
              callback: (value) => value + "%",
            },
          },
          x: {
            type: "time",
            adapters: {
              date: {
                locale: this.hass.locale,
              },
            },
            gridLines: {
              display: true,
              drawTicks: false,
            },
            ticks: {
              maxRotation: 0,
              sampleSize: 5,
              autoSkipPadding: 20,
              major: {
                enabled: true,
              },
              fontSize: 10,
              autoSkip: true,
              maxTicksLimit: 5,
            },
          },
        },
        // @ts-expect-error
        locale: numberFormatToLocale(this.hass.locale),
      };
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._load();

    const date = new Date();
    // Force graph to start drawing from the right
    for (let i = 0; i < DATASAMPLES; i++) {
      const t = new Date(date);
      t.setSeconds(t.getSeconds() - 5 * (DATASAMPLES - i));
      this._memoryEntries.push({ x: t.getTime(), y: null });
      this._cpuEntries.push({ x: t.getTime(), y: null });
    }
  }

  protected render(): TemplateResult {
    let boardId: string | undefined;
    let boardName: string | undefined;
    let imageURL: string | undefined;
    let documentationURL: string | undefined;

    if (this._hardwareInfo?.hardware.length) {
      const boardData = this._hardwareInfo.hardware[0];

      boardId = boardData.board.hassio_board_id;
      boardName = boardData.name;
      documentationURL = boardData.url;
      imageURL = hardwareBrandsUrl({
        category: "boards",
        manufacturer: boardData.board.manufacturer,
        model: boardData.board.model,
        darkOptimized: this.hass.themes?.darkMode,
      });
    } else if (this._OSData?.board) {
      boardId = this._OSData.board;
      boardName = BOARD_NAMES[this._OSData.board];
    }

    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.hardware.caption")}
      >
        ${isComponentLoaded(this.hass, "hassio")
          ? html`<ha-button-menu corner="BOTTOM_START" slot="toolbar-icon">
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
            </ha-button-menu>`
          : ""}
        ${this._error
          ? html`
              <ha-alert alert-type="error"
                >${this._error.message || this._error.code}</ha-alert
              >
            `
          : ""}
        <div class="content">
          ${boardName
            ? html`
                <ha-card outlined>
                  <div class="card-content">
                    <mwc-list>
                      <mwc-list-item
                        noninteractive
                        graphic=${ifDefined(imageURL ? "medium" : undefined)}
                        .twoline=${Boolean(boardId)}
                      >
                        ${imageURL
                          ? html`<img slot="graphic" src=${imageURL} />`
                          : ""}
                        <span class="primary-text">
                          ${boardName ||
                          this.hass.localize("ui.panel.config.hardware.board")}
                        </span>
                        ${boardId
                          ? html`
                              <span class="secondary-text" slot="secondary"
                                >${boardId}</span
                              >
                            `
                          : ""}
                      </mwc-list-item>
                      ${documentationURL
                        ? html`
                            <ha-clickable-list-item
                              .href=${documentationURL}
                              openNewTab
                              twoline
                              hasMeta
                            >
                              <span
                                >${this.hass.localize(
                                  "ui.panel.config.hardware.documentation"
                                )}</span
                              >
                              <span slot="secondary"
                                >${this.hass.localize(
                                  "ui.panel.config.hardware.documentation_description"
                                )}</span
                              >
                              <ha-icon-next slot="meta"></ha-icon-next>
                            </ha-clickable-list-item>
                          `
                        : ""}
                    </mwc-list>
                  </div>
                </ha-card>
              `
            : ""}
          ${this._systemStatusData
            ? html`<ha-card outlined>
                  <div class="header">
                    <div class="title">
                      ${this.hass.localize(
                        "ui.panel.config.hardware.processor"
                      )}
                    </div>
                    <div class="value">
                      ${this._systemStatusData.cpu_percent || "-"}%
                    </div>
                  </div>
                  <div class="card-content">
                    <ha-chart-base
                      .data=${{
                        datasets: [
                          {
                            ...DATA_SET_CONFIG,
                            data: this._cpuEntries,
                          },
                        ],
                      }}
                      .options=${this._chartOptions}
                    ></ha-chart-base>
                  </div>
                </ha-card>
                <ha-card outlined>
                  <div class="header">
                    <div class="title">
                      ${this.hass.localize("ui.panel.config.hardware.memory")}
                    </div>
                    <div class="value">
                      ${round(this._systemStatusData.memory_used_mb / 1024, 1)}
                      GB /
                      ${round(
                        (this._systemStatusData.memory_used_mb! +
                          this._systemStatusData.memory_free_mb!) /
                          1024,
                        0
                      )}
                      GB
                    </div>
                  </div>
                  <div class="card-content">
                    <ha-chart-base
                      .data=${{
                        datasets: [
                          {
                            ...DATA_SET_CONFIG,
                            data: this._memoryEntries,
                          },
                        ],
                      }}
                      .options=${this._chartOptions}
                    ></ha-chart-base>
                  </div>
                </ha-card>`
            : ""}
        </div>
      </hass-subpage>
    `;
  }

  private async _load() {
    const isHassioLoaded = isComponentLoaded(this.hass, "hassio");
    try {
      if (isComponentLoaded(this.hass, "hardware")) {
        this._hardwareInfo = await this.hass.callWS({ type: "hardware/info" });
      }

      if (isHassioLoaded && !this._hardwareInfo?.hardware.length) {
        this._OSData = await fetchHassioHassOsInfo(this.hass);
      }

      if (isHassioLoaded) {
        this._hostData = await fetchHassioHostInfo(this.hass);
      }
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private async _openHardware() {
    showhardwareAvailableDialog(this);
  }

  private async _hostReboot(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.hardware.reboot_host"),
      text: this.hass.localize("ui.panel.config.hardware.reboot_host_confirm"),
      confirmText: this.hass.localize("ui.panel.config.hardware.reboot_host"),
      dismissText: this.hass.localize("ui.common.cancel"),
    });

    if (!confirmed) {
      return;
    }

    showToast(this, {
      message: this.hass.localize("ui.panel.config.hardware.rebooting_host"),
      duration: 0,
    });

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
  }

  private async _hostShutdown(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.hardware.shutdown_host"),
      text: this.hass.localize(
        "ui.panel.config.hardware.shutdown_host_confirm"
      ),
      confirmText: this.hass.localize("ui.panel.config.hardware.shutdown_host"),
      dismissText: this.hass.localize("ui.common.cancel"),
    });

    if (!confirmed) {
      return;
    }

    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.hardware.host_shutting_down"
      ),
      duration: 0,
    });

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
        margin-bottom: 16px;
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

      .header {
        padding: 16px;
        display: flex;
        justify-content: space-between;
      }

      .header .title {
        color: var(--secondary-text-color);
        font-size: 18px;
      }

      .header .value {
        font-size: 16px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-hardware": HaConfigHardware;
  }
}
