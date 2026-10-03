import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/item/ha-list-item-base";
import "../../../../../components/list/ha-list-base";
import type { ZWaveJSControllerStatisticsUpdatedMessage } from "../../../../../data/zwave_js";
import { subscribeZwaveControllerStatistics } from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

@customElement("zwave_js-controller-statistics")
class ZWaveJSControllerStatistics extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public configEntryId!: string;

  @state()
  private _statistics?: ZWaveJSControllerStatisticsUpdatedMessage;

  public hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeZwaveControllerStatistics(
        this.hass,
        this.configEntryId,
        (message) => {
          if (!this.hasUpdated) {
            return;
          }
          this._statistics = message;
        }
      ),
    ];
  }

  protected render() {
    if (!this._statistics) {
      return nothing;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.zwave_js.navigation.statistics"
        )}
        back-path="/config/zwave_js/dashboard?config_entry=${
          this.configEntryId
        }"
      >
        <div class="container">
          <ha-card>
            <ha-list-base>
              ${this._renderStat("messages_tx")}
              ${this._renderStat("messages_rx")}
              ${this._renderStat("messages_dropped_tx")}
              ${this._renderStat("messages_dropped_rx")}
              ${this._renderStat("nak")} ${this._renderStat("can")}
              ${this._renderStat("timeout_ack")}
              ${this._renderStat("timeout_response")}
              ${this._renderStat("timeout_callback")}
            </ha-list-base>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _renderStat(key: string) {
    return html`
      <ha-list-item-base>
        <span slot="headline">
          ${this.hass.localize(
            `ui.panel.config.zwave_js.dashboard.statistics.${key}.label`
          )}
        </span>
        <span slot="supporting-text">
          ${this.hass.localize(
            `ui.panel.config.zwave_js.dashboard.statistics.${key}.tooltip`
          )}
        </span>
        <span slot="end">${this._statistics?.[key] ?? 0}</span>
      </ha-list-item-base>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin: auto;
          margin-top: var(--ha-space-4);
          max-width: 600px;
        }

        span[slot="end"] {
          font-size: 0.95em;
          color: var(--primary-text-color);
        }

        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-controller-statistics": ZWaveJSControllerStatistics;
  }
}
