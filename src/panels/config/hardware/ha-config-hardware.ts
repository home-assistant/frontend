import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiPower } from "@mdi/js";
import type { ChartOptions } from "chart.js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { numberFormatToLocale } from "../../../common/number/format_number";
import { round } from "../../../common/number/round";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/buttons/ha-progress-button";
import "../../../components/chart/ha-chart-base";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-clickable-list-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-settings-row";
import {
  ConfigEntry,
  subscribeConfigEntries,
} from "../../../data/config_entries";
import {
  BOARD_NAMES,
  HardwareInfo,
  SystemStatusStreamMessage,
} from "../../../data/hardware";
import {
  fetchHassioHassOsInfo,
  HassioHassOSInfo,
} from "../../../data/hassio/host";
import { scanUSBDevices } from "../../../data/usb";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import { showRestartDialog } from "../../../dialogs/restart/show-dialog-restart";
import "../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { DEFAULT_PRIMARY_COLOR } from "../../../resources/styles-data";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { hardwareBrandsUrl } from "../../../util/brands-url";
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

  @state() private _hardwareInfo?: HardwareInfo;

  @state() private _chartOptions?: ChartOptions;

  @state() private _systemStatusData?: SystemStatusStreamMessage;

  @state() private _configEntries?: { [id: string]: ConfigEntry };

  private _memoryEntries: { x: number; y: number | null }[] = [];

  private _cpuEntries: { x: number; y: number | null }[] = [];

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
    const subs = [
      subscribeConfigEntries(
        this.hass,
        (messages) => {
          let fullUpdate = false;
          const newEntries: ConfigEntry[] = [];
          messages.forEach((message) => {
            if (message.type === null || message.type === "added") {
              newEntries.push(message.entry);
              if (message.type === null) {
                fullUpdate = true;
              }
            } else if (message.type === "removed") {
              if (this._configEntries) {
                delete this._configEntries[message.entry.entry_id];
              }
            } else if (message.type === "updated") {
              if (this._configEntries) {
                const newEntry = message.entry;
                this._configEntries[message.entry.entry_id] = newEntry;
              }
            }
          });
          if (!newEntries.length && !fullUpdate) {
            return;
          }
          const entries = [
            ...(fullUpdate ? [] : Object.values(this._configEntries || {})),
            ...newEntries,
          ];
          const configEntries: { [id: string]: ConfigEntry } = {};
          for (const entry of entries) {
            configEntries[entry.entry_id] = entry;
          }
          this._configEntries = configEntries;
        },
        { type: ["hardware"] }
      ),
    ];

    if (isComponentLoaded(this.hass, "hardware")) {
      subs.push(
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
        )
      );
    }

    return subs;
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
              callback: (value) =>
                value + blankBeforePercent(this.hass.locale) + "%",
            },
          },
          x: {
            type: "time",
            adapters: {
              date: {
                locale: this.hass.locale,
                config: this.hass.config,
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

  protected render() {
    let boardId: string | undefined;
    let boardName: string | undefined;
    let imageURL: string | undefined;
    let documentationURL: string | undefined;
    let boardConfigEntries: ConfigEntry[] = [];

    const boardData = this._hardwareInfo?.hardware.find(
      (hw) => hw.board !== null
    );

    const dongles = this._hardwareInfo?.hardware.filter(
      (hw) =>
        hw.dongle !== null &&
        (!hw.config_entries.length ||
          hw.config_entries.some(
            (entryId) =>
              this._configEntries?.[entryId] &&
              !this._configEntries[entryId].disabled_by
          ))
    );

    if (boardData) {
      boardConfigEntries = boardData.config_entries
        .map((id) => this._configEntries?.[id])
        .filter(
          (entry) => entry?.supports_options && !entry.disabled_by
        ) as ConfigEntry[];
      boardId = boardData.board!.hassio_board_id;
      boardName = boardData.name;
      documentationURL = boardData.url;
      imageURL = hardwareBrandsUrl({
        category: "boards",
        manufacturer: boardData.board!.manufacturer,
        model: boardData.board!.model,
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
          ? html`
              <ha-icon-button
                slot="toolbar-icon"
                .path=${mdiPower}
                .label=${this.hass.localize(
                  "ui.panel.config.hardware.restart_homeassistant"
                )}
                @click=${this._showRestartDialog}
              ></ha-icon-button>
            `
          : ""}
        ${this._error
          ? html`
              <ha-alert alert-type="error"
                >${this._error.message || this._error.code}</ha-alert
              >
            `
          : ""}
        <div class="content">
          ${boardName || isComponentLoaded(this.hass, "hassio")
            ? html`
                <ha-card outlined>
                  <div class="card-content">
                    ${imageURL
                      ? html`<img
                          alt=""
                          src=${imageURL}
                          crossorigin="anonymous"
                          referrerpolicy="no-referrer"
                        />`
                      : ""}
                    <div class="board-info">
                      <p class="primary-text">
                        ${boardName ||
                        this.hass.localize(
                          "ui.panel.config.hardware.generic_hardware"
                        )}
                      </p>
                      ${boardId
                        ? html`<p class="secondary-text">${boardId}</p>`
                        : ""}
                    </div>
                  </div>
                  ${documentationURL
                    ? html`
                        <mwc-list>
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
                        </mwc-list>
                      `
                    : ""}
                  ${boardConfigEntries.length ||
                  isComponentLoaded(this.hass, "hassio")
                    ? html`<div class="card-actions">
                        ${boardConfigEntries.length
                          ? html`
                              <mwc-button
                                .entry=${boardConfigEntries[0]}
                                @click=${this._openOptionsFlow}
                              >
                                ${this.hass.localize(
                                  "ui.panel.config.hardware.configure"
                                )}
                              </mwc-button>
                            `
                          : nothing}
                        ${isComponentLoaded(this.hass, "hassio")
                          ? html`
                              <mwc-button @click=${this._openHardware}>
                                ${this.hass.localize(
                                  "ui.panel.config.hardware.available_hardware.title"
                                )}
                              </mwc-button>
                            `
                          : nothing}
                      </div>`
                    : ""}
                </ha-card>
              `
            : ""}
          ${dongles?.length
            ? html`<ha-card outlined>
                ${dongles.map((dongle) => {
                  const configEntry = dongle.config_entries
                    .map((id) => this._configEntries?.[id])
                    .filter(
                      (entry) => entry?.supports_options && !entry.disabled_by
                    )[0];
                  return html`<div class="row">
                    ${dongle.name}${configEntry
                      ? html`<mwc-button
                          .entry=${configEntry}
                          @click=${this._openOptionsFlow}
                        >
                          ${this.hass.localize(
                            "ui.panel.config.hardware.configure"
                          )}
                        </mwc-button>`
                      : ""}
                  </div>`;
                })}
              </ha-card>`
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
                      ${this._systemStatusData.cpu_percent ||
                      "-"}${blankBeforePercent(this.hass.locale)}%
                    </div>
                  </div>
                  <div class="card-content">
                    <ha-chart-base
                      .hass=${this.hass}
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
                      .hass=${this.hass}
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
            : isComponentLoaded(this.hass, "hardware")
            ? html`<ha-card outlined>
                <div class="card-content">
                  <div class="value">
                    ${this.hass.localize(
                      "ui.panel.config.hardware.loading_system_data"
                    )}
                  </div>
                </div>
              </ha-card>`
            : ""}
        </div>
      </hass-subpage>
    `;
  }

  private async _load() {
    if (isComponentLoaded(this.hass, "usb")) {
      await scanUSBDevices(this.hass);
    }

    const isHassioLoaded = isComponentLoaded(this.hass, "hassio");
    try {
      if (isComponentLoaded(this.hass, "hardware")) {
        this._hardwareInfo = await this.hass.callWS({ type: "hardware/info" });
      }

      if (isHassioLoaded && !this._hardwareInfo?.hardware.length) {
        this._OSData = await fetchHassioHassOsInfo(this.hass);
      }
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private async _openOptionsFlow(ev) {
    const entry = ev.currentTarget.entry;
    if (!entry) {
      return;
    }
    showOptionsFlowDialog(this, entry);
  }

  private async _openHardware() {
    showhardwareAvailableDialog(this);
  }

  private async _showRestartDialog() {
    showRestartDialog(this);
  }

  static styles = [
    haStyle,
    css`
      .content {
        padding: 28px 20px 0;
        max-width: 1040px;
        margin: 0 auto;
        --mdc-list-side-padding: 24px;
        --mdc-list-vertical-padding: 0;
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
      .card-content img {
        max-width: 300px;
        margin: auto;
      }
      .board-info {
        text-align: center;
      }
      .primary-text {
        font-size: 16px;
        margin: 0;
      }
      .secondary-text {
        font-size: 14px;
        margin-bottom: 0;
        color: var(--secondary-text-color);
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
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 48px;
        padding: 8px 16px;
      }
      .card-actions {
        display: flex;
        justify-content: space-between;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-hardware": HaConfigHardware;
  }
}
