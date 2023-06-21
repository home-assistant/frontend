import { mdiShieldOff } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { domainIcon } from "../../../common/entity/domain_icon";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-outlined-button";
import { AlarmControlPanelEntity } from "../../../data/alarm_control_panel";
import type { HomeAssistant } from "../../../types";
import { showEnterCodeDialogDialog } from "../../enter-code/show-enter-code-dialog";
import "../components/alarm_control_panel/ha-more-info-alarm_control_panel-modes";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";

@customElement("more-info-alarm_control_panel")
class MoreInfoAlarmControlPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: AlarmControlPanelEntity;

  private async _disarm() {
    let code: string | undefined;

    if (this.stateObj!.attributes.code_format) {
      const response = await showEnterCodeDialogDialog(this, {
        codeFormat: this.stateObj!.attributes.code_format,
        title: this.hass.localize(
          "ui.dialogs.more_info_control.alarm_control_panel.disarm_title"
        ),
        submitText: this.hass.localize(
          "ui.dialogs.more_info_control.alarm_control_panel.disarm_action"
        ),
      });
      if (response == null) {
        return;
      }
      code = response;
    }

    this.hass.callService("alarm_control_panel", "alarm_disarm", {
      entity_id: this.stateObj!.entity_id,
      code,
    });
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
                <span></span>
                <div class="icon">
                  <ha-svg-icon
                    .path=${domainIcon("alarm_control_panel", this.stateObj)}
                  ></ha-svg-icon>
                </div>
                <ha-outlined-button @click=${this._disarm}>
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.alarm_control_panel.disarm_action"
                  )}
                  <ha-svg-icon slot="icon" .path=${mdiShieldOff}></ha-svg-icon>
                </ha-outlined-button>
              </div>
            `
          : html`
              <ha-more-info-alarm_control_panel-modes
                .stateObj=${this.stateObj}
                .hass=${this.hass}
              >
              </ha-more-info-alarm_control_panel-modes>
            `}
      </div>
      <span></span>
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
          border-radius: 50%;
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
          border-radius: 50%;
          background-color: var(--icon-color);
          transition: background-color 180ms ease-in-out;
          opacity: 0.2;
        }
        .status ha-outlined-button {
          margin-top: 32px;
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
