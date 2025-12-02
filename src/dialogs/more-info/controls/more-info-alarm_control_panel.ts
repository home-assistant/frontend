import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-button";
import "../../../components/ha-state-icon";
import type { AlarmControlPanelEntity } from "../../../data/alarm_control_panel";
import { setProtectedAlarmControlPanelMode } from "../../../data/alarm_control_panel";
import "../../../state-control/alarm_control_panel/ha-state-control-alarm_control_panel-modes";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

@customElement("more-info-alarm_control_panel")
class MoreInfoAlarmControlPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: AlarmControlPanelEntity;

  private async _disarm() {
    setProtectedAlarmControlPanelMode(
      this,
      this.hass,
      this.stateObj!,
      "disarmed"
    );
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const color = stateColorCss(this.stateObj);
    const style = {
      "--icon-color": color,
    };
    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls" style=${styleMap(style)}>
        ${["triggered", "arming", "pending"].includes(this.stateObj.state)
          ? html`
              <div class="status">
                <div class="icon">
                  <ha-state-icon .hass=${this.hass} .stateObj=${this.stateObj}>
                  </ha-state-icon>
                </div>
              </div>
            `
          : html`
              <ha-state-control-alarm_control_panel-modes
                .stateObj=${this.stateObj}
                .hass=${this.hass}
              >
              </ha-state-control-alarm_control_panel-modes>
            `}
      </div>
      <div>
        ${["triggered", "arming", "pending"].includes(this.stateObj.state)
          ? html`
              <ha-control-button @click=${this._disarm} class="disarm">
                ${this.hass.localize("ui.card.alarm_control_panel.disarm")}
              </ha-control-button>
            `
          : nothing}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        :host {
          --icon-color: var(--primary-color);
        }
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        .status {
          display: flex;
          align-items: center;
          flex-direction: column;
        }
        .status .icon {
          position: relative;
          --mdc-icon-size: 80px;
          animation: pulse 1s infinite;
          color: var(--icon-color);
          border-radius: var(--ha-border-radius-circle);
          width: 144px;
          height: 144px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .status .icon::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          border-radius: var(--ha-border-radius-circle);
          background-color: var(--icon-color);
          transition: background-color 180ms ease-in-out;
          opacity: 0.2;
        }
        ha-control-button.disarm {
          height: 60px;
          min-width: 130px;
          max-width: 200px;
          margin: 0 auto;
          --control-button-border-radius: var(--ha-border-radius-3xl);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-alarm_control_panel": MoreInfoAlarmControlPanel;
  }
}
