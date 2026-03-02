import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-alert";
import "../../../components/ha-checkbox";
import "../../../components/ha-control-button";
import "../../../components/ha-formfield";
import "../../../components/ha-state-icon";
import type { AlarmControlPanelEntity } from "../../../data/alarm_control_panel";
import { setProtectedAlarmControlPanelMode } from "../../../data/alarm_control_panel";
import { getExtendedEntityRegistryEntry } from "../../../data/entity/entity_registry";
import "../../../state-control/alarm_control_panel/ha-state-control-alarm_control_panel-modes";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

@customElement("more-info-alarm_control_panel")
class MoreInfoAlarmControlPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: AlarmControlPanelEntity;

  @state() private _forceArm = false;

  @state() private _codeRequired?: boolean;

  private async _updateCodeRequired() {
    if (!this.stateObj || !this.hass) {
      this._codeRequired = undefined;
      return;
    }
    if (
      !this.stateObj.attributes.code_arm_required ||
      !this.stateObj.attributes.code_format
    ) {
      this._codeRequired = false;
      return;
    }
    const entry = await getExtendedEntityRegistryEntry(
      this.hass,
      this.stateObj.entity_id
    ).catch(() => undefined);
    const defaultCode = entry?.options?.alarm_control_panel?.default_code;
    this._codeRequired = !defaultCode;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has("stateObj")) {
      this._forceArm = false;
      this._updateCodeRequired();
    }
  }

  private _forceArmChanged(ev: Event): void {
    this._forceArm = (ev.target as any).checked;
  }

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
      ${this.stateObj.attributes.status_message
        ? html`
            <ha-alert alert-type="warning">
              ${this.stateObj.attributes.status_message}
            </ha-alert>
          `
        : nothing}
      ${this.stateObj.attributes.force_arm_available &&
      this._codeRequired === false
        ? html`
            <ha-formfield
              .label=${this.hass.localize(
                "ui.card.alarm_control_panel.force_arm"
              )}
            >
              <ha-checkbox
                .checked=${this._forceArm}
                @change=${this._forceArmChanged}
              ></ha-checkbox>
            </ha-formfield>
          `
        : nothing}
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
                .forceArm=${this._forceArm}
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
        ha-alert {
          display: block;
          margin: 0 16px;
        }
        ha-formfield {
          display: block;
          text-align: center;
          margin: 8px 0;
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
