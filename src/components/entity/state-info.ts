import "@polymer/paper-tooltip/paper-tooltip";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { computeStateName } from "../../common/entity/compute_state_name";
import { computeRTL } from "../../common/util/compute_rtl";
import type { HomeAssistant } from "../../types";
import "../ha-relative-time";
import "./state-badge";

@customElement("state-info")
class StateInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  // property used only in CSS
  @property({ type: Boolean, reflect: true }) public rtl = false;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const name = computeStateName(this.stateObj);

    return html`<state-badge
        .stateObj=${this.stateObj}
        .stateColor=${true}
      ></state-badge>
      <div class="info">
        <div class="name" .title=${name} .inDialog=${this.inDialog}>
          ${name}
        </div>
        ${this.inDialog
          ? html`<div class="time-ago">
              <ha-relative-time
                id="last_changed"
                .hass=${this.hass}
                .datetime=${this.stateObj.last_changed}
                capitalize
              ></ha-relative-time>
              <paper-tooltip animation-delay="0" for="last_changed">
                <div>
                  <div class="row">
                    <span class="column-name">
                      ${this.hass.localize(
                        "ui.dialogs.more_info_control.last_changed"
                      )}:
                    </span>
                    <ha-relative-time
                      .hass=${this.hass}
                      .datetime=${this.stateObj.last_changed}
                      capitalize
                    ></ha-relative-time>
                  </div>
                  <div class="row">
                    <span>
                      ${this.hass.localize(
                        "ui.dialogs.more_info_control.last_updated"
                      )}:
                    </span>
                    <ha-relative-time
                      .hass=${this.hass}
                      .datetime=${this.stateObj.last_updated}
                      capitalize
                    ></ha-relative-time>
                  </div>
                </div>
              </paper-tooltip>
            </div>`
          : html`<div class="extra-info"><slot></slot></div>`}
      </div>`;
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.locale !== this.hass.locale) {
      this.rtl = computeRTL(this.hass);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        min-width: 120px;
        white-space: nowrap;
      }

      state-badge {
        float: left;
      }
      :host([rtl]) state-badge {
        float: right;
      }

      .info {
        margin-left: 56px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
      }

      :host([rtl]) .info {
        margin-right: 56px;
        margin-left: 0;
        text-align: right;
      }

      .name {
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .name[in-dialog],
      :host([secondary-line]) .name {
        line-height: 20px;
      }

      .time-ago,
      .extra-info,
      .extra-info > * {
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .row {
        display: flex;
        flex-direction: row;
        flex-wrap: no-wrap;
        width: 100%;
        justify-content: space-between;
        margin: 0 2px 4px 0;
      }

      .row:last-child {
        margin-bottom: 0px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-info": StateInfo;
  }
}
