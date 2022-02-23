import "@material/mwc-list/mwc-list-item";
import { mdiDownload } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultArray, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { capitalizeFirstLetter } from "../../../../../common/string/capitalize-first-letter";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-select";
import {
  fetchZWaveJSLogConfig,
  setZWaveJSLogLevel,
  subscribeZWaveJSLogs,
  ZWaveJSLogConfig,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../../types";
import { fileDownload } from "../../../../../util/file_download";
import { configTabs } from "./zwave_js-config-router";

@customElement("zwave_js-logs")
class ZWaveJSLogs extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property() public configEntryId!: string;

  @state() private _logConfig?: ZWaveJSLogConfig;

  @query("textarea", true) private _textarea?: HTMLTextAreaElement;

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
    return [
      subscribeZWaveJSLogs(this.hass, this.configEntryId, (update) => {
        if (!this.hasUpdated) {
          return;
        }
        if (update.type === "log_message") {
          if (Array.isArray(update.log_message.message)) {
            for (const line of update.log_message.message) {
              this._textarea!.value += `${line}\n`;
            }
          } else {
            this._textarea!.value += `${update.log_message.message}\n`;
          }
        } else {
          this._logConfig = update.log_config;
        }
      }).then((unsub) => {
        this._textarea!.value += `${this.hass.localize(
          "ui.panel.config.zwave_js.logs.subscribed_to_logs"
        )}\n`;
        return unsub;
      }),
    ];
  }

  protected render() {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
      >
        <div class="container">
          <ha-card>
            <div class="card-header">
              <h1>
                ${this.hass.localize("ui.panel.config.zwave_js.logs.title")}
              </h1>
            </div>
            <div class="card-content">
              ${this._logConfig
                ? html`
                    <ha-select
                      .label=${this.hass.localize(
                        "ui.panel.config.zwave_js.logs.log_level"
                      )}
                      .value=${this._logConfig.level}
                      @selected=${this._dropdownSelected}
                    >
                      <mwc-list-item value="error">Error</mwc-list-item>
                      <mwc-list-item value="warn">Warn</mwc-list-item>
                      <mwc-list-item value="info">Info</mwc-list-item>
                      <mwc-list-item value="verbose">Verbose</mwc-list-item>
                      <mwc-list-item value="debug">Debug</mwc-list-item>
                      <mwc-list-item value="silly">Silly</mwc-list-item>
                    </ha-select>
                  `
                : ""}
            </div>
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.zwave_js.logs.download_logs"
              )}
              @click=${this._downloadLogs}
              .path=${mdiDownload}
            ></ha-icon-button>
          </ha-card>
          <textarea readonly></textarea>
        </div>
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps) {
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
        this._textarea!.value
      )}`,
      `zwave_js.log`
    );
  }

  private _dropdownSelected(ev) {
    if (ev.target === undefined || this._logConfig === undefined) {
      return;
    }
    const selected = ev.target.value;
    if (this._logConfig.level === selected) {
      return;
    }
    setZWaveJSLogLevel(this.hass!, this.configEntryId, selected);
    this._textarea!.value += `${this.hass.localize(
      "ui.panel.config.zwave_js.logs.log_level_changed",
      { level: capitalizeFirstLetter(selected) }
    )}\n`;
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
        textarea {
          flex-grow: 1;
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
