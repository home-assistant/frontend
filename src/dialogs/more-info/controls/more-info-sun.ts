import { consume } from "@lit/context";
import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatTime } from "../../../common/datetime/format_time";
import { transform } from "../../../common/decorators/transform";
import "../../../components/ha-relative-time";
import {
  configContext,
  formattersContext,
  internationalizationContext,
} from "../../../data/context";
import type {
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../../../types";

@customElement("more-info-sun")
class MoreInfoSun extends LitElement {
  @property({ attribute: false }) public stateObj?: HassEntity;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _config!: HassConfig;

  protected render() {
    if (!this._i18n || !this.stateObj) {
      return nothing;
    }

    const risingDate = new Date(this.stateObj.attributes.next_rising);
    const settingDate = new Date(this.stateObj.attributes.next_setting);
    const order = risingDate > settingDate ? ["set", "ris"] : ["ris", "set"];

    return html`
      <hr />
      ${order.map(
        (item) => html`
          <div class="row">
            <div class="key">
              <span
                >${
                  item === "ris"
                    ? this._i18n.localize(
                        "ui.dialogs.more_info_control.sun.rising"
                      )
                    : this._i18n.localize(
                        "ui.dialogs.more_info_control.sun.setting"
                      )
                }</span
              >
              <ha-relative-time
                .datetime=${item === "ris" ? risingDate : settingDate}
              ></ha-relative-time>
            </div>
            <div class="value">
              ${formatTime(
                item === "ris" ? risingDate : settingDate,
                this._i18n.locale,
                this._config
              )}
            </div>
          </div>
        `
      )}
      <div class="row">
        <div class="key">
          ${this._i18n.localize("ui.dialogs.more_info_control.sun.elevation")}
        </div>
        <div class="value">
          ${this._formatters.formatEntityAttributeValue(
            this.stateObj,
            "elevation"
          )}
        </div>
      </div>
      <div class="row">
        <div class="key">
          ${this._i18n.localize("ui.dialogs.more_info_control.sun.azimuth")}
        </div>
        <div class="value">
          ${this._formatters.formatEntityAttributeValue(
            this.stateObj,
            "azimuth"
          )}
        </div>
      </div>
    `;
  }

  static styles = css`
    .row {
      margin: 0;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }
    ha-relative-time {
      display: inline-block;
      white-space: nowrap;
    }
    hr {
      border-color: var(--divider-color);
      border-bottom: none;
      margin: var(--ha-space-4) 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-sun": MoreInfoSun;
  }
}
