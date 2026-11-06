import { mdiDownload } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultArray, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { capitalizeFirstLetter } from "../../../../../common/string/capitalize-first-letter";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-log-viewer";
import type { HaLogViewer } from "../../../../../components/ha-log-viewer";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import type { ZWaveJSLogConfig } from "../../../../../data/zwave_js";
import {
  fetchZWaveJSLogConfig,
  setZWaveJSLogLevel,
  subscribeZWaveJSLogs,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { fileDownload } from "../../../../../util/file_download";

@customElement("zwave_js-logs")
class ZWaveJSLogs extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public configEntryId!: string;

  @state() private _logConfig?: ZWaveJSLogConfig;

  @query("ha-log-viewer") private _logViewer?: HaLogViewer;

  public hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeZWaveJSLogs(this.hass, this.configEntryId, (update) => {
        if (update.type === "log_message") {
          this._logViewer?.addLines(
            Array.isArray(update.log_message.message)
              ? update.log_message.message
              : [update.log_message.message]
          );
        } else {
          this._logConfig = update.log_config;
        }
      }).then((unsub) => {
        this._logViewer?.addLines([
          this.hass.localize(
            "ui.panel.config.zwave_js.logs.subscribed_to_logs"
          ),
        ]);
        return unsub;
      }),
    ];
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.zwave_js.logs.caption")}
        back-path="/config/zwave_js/dashboard?config_entry=${
          this.configEntryId
        }"
      >
        <div class="container">
          <ha-card>
            <div class="card-header">
              <h1>
                ${this.hass.localize("ui.panel.config.zwave_js.logs.title")}
              </h1>
            </div>
            <div class="card-content">
              ${
                this._logConfig
                  ? html`
                      <ha-select
                        .label=${this.hass.localize(
                          "ui.panel.config.zwave_js.logs.log_level"
                        )}
                        .value=${this._logConfig.level}
                        @selected=${this._dropdownSelected}
                        .options=${[
                          "error",
                          "warn",
                          "info",
                          "verbose",
                          "debug",
                          "silly",
                        ].map((level) => ({
                          value: level,
                          label: capitalizeFirstLetter(level),
                        }))}
                      >
                      </ha-select>
                    `
                  : ""
              }
            </div>
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.zwave_js.logs.download_logs"
              )}
              @click=${this._downloadLogs}
              .path=${mdiDownload}
            ></ha-icon-button>
          </ha-card>
          <ha-log-viewer></ha-log-viewer>
        </div>
      </hass-subpage>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._fetchData();
  }

  private async _fetchData() {
    if (!this.configEntryId) {
      return;
    }
    this._logConfig = await fetchZWaveJSLogConfig(
      this.hass!,
      this.configEntryId
    );
  }

  private _downloadLogs() {
    fileDownload(
      `data:text/plain;charset=utf-8,${encodeURIComponent(
        this._logViewer!.lines.join("\n")
      )}`,
      `zwave_js.log`
    );
  }

  private _dropdownSelected(ev: HaSelectSelectEvent) {
    if (ev.target === undefined || this._logConfig === undefined) {
      return;
    }
    const selected = ev.detail.value;
    if (this._logConfig.level === selected) {
      return;
    }
    setZWaveJSLogLevel(this.hass!, this.configEntryId, selected);
    this._logViewer?.addLines([
      this.hass.localize("ui.panel.config.zwave_js.logs.log_level_changed", {
        level: capitalizeFirstLetter(selected),
      }),
    ]);
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .container {
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
          padding: 16px;
        }
        ha-card {
          margin: 16px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-logs": ZWaveJSLogs;
  }
}
