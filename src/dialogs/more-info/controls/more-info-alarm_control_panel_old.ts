import "@material/mwc-button";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import {
  AlarmControlPanelEntityFeature,
  callAlarmAction,
  FORMAT_NUMBER,
} from "../../../data/alarm_control_panel";
import type { HomeAssistant } from "../../../types";

const BUTTONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "clear"];
const DISARM_ACTIONS = ["disarm"];

@customElement("more-info-alarm_control_panel_old")
export class MoreInfoAlarmControlPanelOld extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _armActions: string[] = [];

  @query("#alarmCode") private _input?: HaTextField;

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);

    if (!this.stateObj || !changedProps.has("stateObj")) {
      return;
    }

    this._armActions = [];
    if (
      supportsFeature(this.stateObj, AlarmControlPanelEntityFeature.ARM_HOME)
    ) {
      this._armActions.push("arm_home");
    }
    if (
      supportsFeature(this.stateObj, AlarmControlPanelEntityFeature.ARM_AWAY)
    ) {
      this._armActions.push("arm_away");
    }
    if (
      supportsFeature(this.stateObj, AlarmControlPanelEntityFeature.ARM_NIGHT)
    ) {
      this._armActions.push("arm_night");
    }
    if (
      supportsFeature(
        this.stateObj,
        AlarmControlPanelEntityFeature.ARM_CUSTOM_BYPASS
      )
    ) {
      this._armActions.push("arm_custom_bypass");
    }
    if (
      supportsFeature(
        this.stateObj,
        AlarmControlPanelEntityFeature.ARM_VACATION
      )
    ) {
      this._armActions.push("arm_vacation");
    }
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    return html`
      ${!this.stateObj.attributes.code_format
        ? ""
        : html`
            <div class="center">
              <ha-textfield
                id="alarmCode"
                .label=${this.hass.localize("ui.card.alarm_control_panel.code")}
                type="password"
                .inputMode=${this.stateObj.attributes.code_format ===
                FORMAT_NUMBER
                  ? "numeric"
                  : "text"}
              ></ha-textfield>
            </div>
          `}
      ${this.stateObj.attributes.code_format !== FORMAT_NUMBER
        ? ""
        : html`
            <div id="keypad">
              ${BUTTONS.map((value) =>
                value === ""
                  ? html`<mwc-button disabled></mwc-button>`
                  : html`
                      <mwc-button
                        .value=${value}
                        @click=${this._handlePadClick}
                        outlined
                        class=${classMap({
                          numberkey: value !== "clear",
                        })}
                      >
                        ${value === "clear"
                          ? this.hass!.localize(
                              `ui.card.alarm_control_panel.clear_code`
                            )
                          : value}
                      </mwc-button>
                    `
              )}
            </div>
          `}
      <div class="actions">
        ${(this.stateObj.state === "disarmed"
          ? this._armActions
          : DISARM_ACTIONS
        ).map(
          (stateAction) => html`
            <mwc-button
              .action=${stateAction}
              @click=${this._handleActionClick}
              outlined
            >
              ${this.hass!.localize(
                `ui.card.alarm_control_panel.${stateAction}`
              )}
            </mwc-button>
          `
        )}
      </div>
    `;
  }

  private _handlePadClick(e: MouseEvent): void {
    const val = (e.currentTarget! as any).value;
    this._input!.value = val === "clear" ? "" : this._input!.value + val;
  }

  private _handleActionClick(e: MouseEvent): void {
    const input = this._input;
    callAlarmAction(
      this.hass!,
      this.stateObj!.entity_id,
      (e.currentTarget! as any).action,
      input?.value || undefined
    );
    if (input) {
      input.value = "";
    }
  }

  static styles = css`
    ha-textfield {
      display: block;
      margin: 8px;
      max-width: 150px;
      text-align: center;
    }

    #keypad {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      margin: auto;
      width: 100%;
      max-width: 300px;
    }

    #keypad mwc-button {
      padding: 8px;
      width: 30%;
      box-sizing: border-box;
    }

    .actions {
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
    }

    .actions mwc-button {
      margin: 0 4px 4px;
    }

    mwc-button#disarm {
      color: var(--error-color);
    }

    mwc-button.numberkey {
      --mdc-typography-button-font-size: var(--keypad-font-size, 0.875rem);
    }

    .center {
      display: flex;
      justify-content: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-alarm_control_panel_old": MoreInfoAlarmControlPanelOld;
  }
}
