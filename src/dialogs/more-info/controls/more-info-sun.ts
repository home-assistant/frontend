import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { formatTime } from "../../../common/datetime/format_time";
import "../../../components/ha-relative-time";
import { HomeAssistant } from "../../../types";

@customElement("more-info-sun")
class MoreInfoSun extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const risingDate = new Date(this.stateObj.attributes.next_rising);
    const settingDate = new Date(this.stateObj.attributes.next_setting);
    const order = risingDate > settingDate ? ["set", "ris"] : ["ris", "set"];

    return html`
      ${order.map((item) => {
        return html`
          <div class="row">
            <div class="key">
              <span
                >${item === "ris"
                  ? this.hass.localize(
                      "ui.dialogs.more_info_control.sun.rising"
                    )
                  : this.hass.localize(
                      "ui.dialogs.more_info_control.sun.setting"
                    )}</span
              >
              <ha-relative-time
                .hass=${this.hass}
                .datetimeObj=${item === "ris" ? risingDate : settingDate}
              ></ha-relative-time>
            </div>
            <div class="value">
              ${formatTime(
                item === "ris" ? risingDate : settingDate,
                this.hass.language
              )}
            </div>
          </div>
        `;
      })}
      <div class="row">
        <div class="key">
          ${this.hass.localize("ui.dialogs.more_info_control.sun.elevation")}
        </div>
        <div class="value">${this.stateObj.attributes.elevation}</div>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .row {
        margin: 0 8px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-sun": MoreInfoSun;
  }
}
