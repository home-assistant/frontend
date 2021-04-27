import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  html,
  property,
  customElement,
  LitElement,
  CSSResultArray,
  internalProperty,
} from "lit-element";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import {
  fetchLogConfig,
  setLogLevel,
  subscribeZWaveJSLogs,
  ZWaveJSLogConfig,
} from "../../../../../data/zwave_js";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { HomeAssistant, Route } from "../../../../../types";
import { configTabs } from "./zwave_js-config-router";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";

@customElement("zwave_js-logs")
class ZWaveJSLogs extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property() public configEntryId!: string;

  @internalProperty() private _logConfig?: ZWaveJSLogConfig;

  private _textarea?: HTMLTextAreaElement;

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
    return [
      subscribeZWaveJSLogs(this.hass, this.configEntryId, (log) => {
        if (this._textarea) {
          if (Array.isArray(log.message)) {
            log.message.map((line) => {
              this._textarea!.value += `${line}\n`;
              return null;
            });
          } else {
            this._textarea!.value += `${log.message}\n`;
          }
        }
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
        </ha-card>
        <textarea></textarea>
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._textarea = this.shadowRoot!.querySelector("textarea")!;
    this._fetchData();
  }

  private async _fetchData() {
    if (!this.configEntryId) {
      return;
    }
    this._logConfig = await fetchLogConfig(this.hass!, this.configEntryId);
  }

  private _dropdownSelected(ev) {
    if (ev.target === undefined || this._logConfig === undefined) {
      return;
    }
    if (this._logConfig.level === ev.target.selected) {
      return;
    }
    setLogLevel(this.hass!, this.configEntryId, ev.target.selected);
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        textarea {
          width: 90%;
          height: 90%;
          margin: 16px auto;
          display: block;
        }
        ha-card {
          width: 90%;
          margin: 16px auto;
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
