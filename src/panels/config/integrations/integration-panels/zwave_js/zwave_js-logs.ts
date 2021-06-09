import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-listbox/paper-listbox";
import { mdiDownload } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultArray, html, LitElement } from "lit";
import { customElement, property, state, query } from "lit/decorators";
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
      subscribeZWaveJSLogs(this.hass, this.configEntryId, (log) => {
        if (!this.hasUpdated) {
          return;
        }
        if (Array.isArray(log.message)) {
          for (const line of log.message) {
            this._textarea!.value += `${line}\n`;
          }
        } else {
          this._textarea!.value += `${log.message}\n`;
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
                    <paper-dropdown-menu
                      dynamic-align
                      .label=${this.hass.localize(
                        "ui.panel.config.zwave_js.logs.log_level"
                      )}
                    >
                      <paper-listbox
                        slot="dropdown-content"
                        .selected=${this._logConfig.level}
                        attr-for-selected="value"
                        @iron-select=${this._dropdownSelected}
                      >
                        <paper-item value="error">Error</paper-item>
                        <paper-item value="warn">Warn</paper-item>
                        <paper-item value="info">Info</paper-item>
                        <paper-item value="verbose">Verbose</paper-item>
                        <paper-item value="debug">Debug</paper-item>
                        <paper-item value="silly">Silly</paper-item>
                      </paper-listbox>
                    </paper-dropdown-menu>
                  `
                : ""}
            </div>
            <div>
              <mwc-icon-button
                label="Download Logs"
                @click=${this._downloadLogs}
              >
                <ha-svg-icon
                  .title="Download Logs"
                  .path=${mdiDownload}
                ></ha-svg-icon>
              </mwc-icon-button>
            </div>
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
    const aEl = document.createElement("a");
    aEl.download = `zwave_js.log`;
    aEl.href = `data:text/plain;charset=utf-8,${encodeURI(
      this._textarea!.value
    )}`;
    aEl.click();
  }

  private _dropdownSelected(ev) {
    if (ev.target === undefined || this._logConfig === undefined) {
      return;
    }
    const selected = ev.target.selected;
    if (this._logConfig.level === selected) {
      return;
    }
    setZWaveJSLogLevel(this.hass!, this.configEntryId, selected);
    this._logConfig.level = selected;
    this._textarea!.value += `${this.hass.localize(
      "ui.panel.config.zwave_js.logs.log_level_changed",
      { level: selected.charAt(0).toUpperCase() + selected.slice(1) }
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
