import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
  property,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { LovelaceCard } from "../types";
import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import {
  callAlarmAction,
  FORMAT_NUMBER,
} from "../../../data/alarm_control_panel";

import "../../../components/ha-card";
import "../../../components/ha-label-badge";
import "../components/hui-warning";

const ICONS = {
  armed_away: "hass:shield-lock",
  armed_custom_bypass: "hass:security",
  armed_home: "hass:shield-home",
  armed_night: "hass:shield-home",
  disarmed: "hass:shield-check",
  pending: "hass:shield-outline",
  triggered: "hass:bell-ring",
};

const BUTTONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "clear"];

export interface Config extends LovelaceCardConfig {
  entity: string;
  name?: string;
  states?: string[];
}

class HuiAlarmPanelCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import(/* webpackChunkName: "hui-alarm-panel-card-editor" */ "../editor/config-elements/hui-alarm-panel-card-editor");
    return document.createElement("hui-alarm-panel-card-editor");
  }

  public static getStubConfig() {
    return { states: ["arm_home", "arm_away"] };
  }

  @property() public hass?: HomeAssistant;
  @property() private _config?: Config;
  @property() private _code?: string;

  public getCardSize(): number {
    if (!this._config || !this.hass) {
      return 0;
    }

    const stateObj = this.hass.states[this._config.entity];

    return !stateObj || stateObj.attributes.code_format !== FORMAT_NUMBER
      ? 3
      : 8;
  }

  public setConfig(config: Config): void {
    if (
      !config ||
      !config.entity ||
      config.entity.split(".")[0] !== "alarm_control_panel"
    ) {
      throw new Error("Invalid card configuration");
    }

    const defaults = {
      states: ["arm_away", "arm_home"],
    };

    this._config = { ...defaults, ...config };
    this._code = "";
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config") || changedProps.has("_code")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass) {
      return (
        oldHass.states[this._config!.entity] !==
        this.hass!.states[this._config!.entity]
      );
    }
    return true;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }
    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    return html`
      <ha-card .header="${this._config.name || this._label(stateObj.state)}">
        <ha-label-badge
          class="${classMap({ [stateObj.state]: true })}"
          .icon="${ICONS[stateObj.state] || "hass:shield-outline"}"
          .label="${this._stateIconLabel(stateObj.state)}"
        ></ha-label-badge>
        <div id="armActions" class="actions">
          ${(stateObj.state === "disarmed"
            ? this._config.states!
            : ["disarm"]
          ).map((state) => {
            return html`
              <mwc-button
                .action="${state}"
                @click="${this._handleActionClick}"
                outlined
              >
                ${this._label(state)}
              </mwc-button>
            `;
          })}
        </div>
        ${!stateObj.attributes.code_format
          ? html``
          : html`
              <paper-input
                label="Alarm Code"
                type="password"
                .value="${this._code}"
              ></paper-input>
            `}
        ${stateObj.attributes.code_format !== FORMAT_NUMBER
          ? html``
          : html`
              <div id="keypad">
                ${BUTTONS.map((value) => {
                  return value === ""
                    ? html`
                        <mwc-button disabled></mwc-button>
                      `
                    : html`
                        <mwc-button
                          .value="${value}"
                          @click="${this._handlePadClick}"
                          dense
                        >
                          ${value === "clear"
                            ? this._label("clear_code")
                            : value}
                        </mwc-button>
                      `;
                })}
              </div>
            `}
      </ha-card>
    `;
  }

  private _stateIconLabel(state: string): string {
    const stateLabel = state.split("_").pop();
    return stateLabel === "disarmed" ||
      stateLabel === "triggered" ||
      !stateLabel
      ? ""
      : stateLabel;
  }

  private _label(state: string): string {
    return (
      this.hass!.localize(`state.alarm_control_panel.${state}`) ||
      this.hass!.localize(`ui.card.alarm_control_panel.${state}`)
    );
  }

  private _handlePadClick(e: MouseEvent): void {
    const val = (e.currentTarget! as any).value;
    this._code = val === "clear" ? "" : this._code + val;
  }

  private _handleActionClick(e: MouseEvent): void {
    callAlarmAction(
      this.hass!,
      this._config!.entity,
      (e.currentTarget! as any).action,
      this._code!
    );
    this._code = "";
  }

  static get styles(): CSSResult[] {
    return [
      css`
        ha-card {
          padding-bottom: 16px;
          position: relative;
          --alarm-color-disarmed: var(--label-badge-green);
          --alarm-color-pending: var(--label-badge-yellow);
          --alarm-color-triggered: var(--label-badge-red);
          --alarm-color-armed: var(--label-badge-red);
          --alarm-color-autoarm: rgba(0, 153, 255, 0.1);
          --alarm-state-color: var(--alarm-color-armed);
          --base-unit: 15px;
          font-size: calc(var(--base-unit));
        }
        ha-label-badge {
          --ha-label-badge-color: var(--alarm-state-color);
          --label-badge-text-color: var(--alarm-state-color);
          --label-badge-background-color: var(--paper-card-background-color);
          color: var(--alarm-state-color);
          position: absolute;
          right: 12px;
          top: 12px;
        }
        .disarmed {
          --alarm-state-color: var(--alarm-color-disarmed);
        }
        .triggered {
          --alarm-state-color: var(--alarm-color-triggered);
          animation: pulse 1s infinite;
        }
        .arming {
          --alarm-state-color: var(--alarm-color-pending);
          animation: pulse 1s infinite;
        }
        .pending {
          --alarm-state-color: var(--alarm-color-pending);
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0% {
            --ha-label-badge-color: var(--alarm-state-color);
          }
          100% {
            --ha-label-badge-color: rgba(255, 153, 0, 0.3);
          }
        }
        paper-input {
          margin: 0 auto 8px;
          max-width: 150px;
          font-size: calc(var(--base-unit));
          text-align: center;
        }
        .state {
          margin-left: 16px;
          font-size: calc(var(--base-unit) * 0.9);
          position: relative;
          bottom: 16px;
          color: var(--alarm-state-color);
          animation: none;
        }
        #keypad {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          margin: auto;
          width: 300px;
        }
        #keypad mwc-button {
          margin-bottom: 5%;
          width: 30%;
          padding: calc(var(--base-unit));
          font-size: calc(var(--base-unit) * 1.1);
          box-sizing: border-box;
        }
        .actions {
          margin: 0 8px;
          padding-top: 20px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          font-size: calc(var(--base-unit) * 1);
        }
        .actions mwc-button {
          min-width: calc(var(--base-unit) * 9);
          color: var(--primary-color);
          margin: 0 4px;
        }
        mwc-button#disarm {
          color: var(--google-red-500);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-panel-card": HuiAlarmPanelCard;
  }
}

customElements.define("hui-alarm-panel-card", HuiAlarmPanelCard);
