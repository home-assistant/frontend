import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { formatTime } from "../../../common/datetime/format_time";
import "../../../components/ha-relative-time";
import { HomeAssistant } from "../../../types";

@customElement("more-info-sun")
class MoreInfoSun extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
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
                .datetime=${item === "ris" ? risingDate : settingDate}
              ></ha-relative-time>
            </div>
            <div class="value">
              ${formatTime(
                item === "ris" ? risingDate : settingDate,
                this.hass.locale,
                this.hass.config
              )}
            </div>
          </div>
        `
      )}
      <div class="row">
        <div class="key">
          ${this.hass.localize("ui.dialogs.more_info_control.sun.elevation")}
        </div>
        <div class="value">
          ${this.hass.formatEntityAttributeValue(this.stateObj, "elevation")}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
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
        margin: 16px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-sun": MoreInfoSun;
  }
}
