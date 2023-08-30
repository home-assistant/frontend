import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { HassEntity } from "home-assistant-js-websocket";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { alarmPanelIcon } from "../../../common/entity/alarm_panel_icon";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-card";
import "../../../components/ha-chip";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import {
  callAlarmAction,
  FORMAT_NUMBER,
  ALARM_MODES,
  AlarmMode,
} from "../../../data/alarm_control_panel";
import { UNAVAILABLE } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard } from "../types";
import { AlarmPanelCardConfig, AlarmPanelCardConfigState } from "./types";
import { supportsFeature } from "../../../common/entity/supports-feature";

const BUTTONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "clear"];

export const DEFAULT_STATES = [
  "arm_home",
  "arm_away",
] as AlarmPanelCardConfigState[];

export const ALARM_MODE_STATE_MAP: Record<
  AlarmPanelCardConfigState,
  AlarmMode
> = {
  arm_home: "armed_home",
  arm_away: "armed_away",
  arm_night: "armed_night",
  arm_vacation: "armed_vacation",
  arm_custom_bypass: "armed_custom_bypass",
};

export const filterSupportedAlarmStates = (
  stateObj: HassEntity | undefined,
  states: AlarmPanelCardConfigState[]
): AlarmPanelCardConfigState[] =>
  states.filter(
    (s) =>
      stateObj &&
      supportsFeature(
        stateObj,
        ALARM_MODES[ALARM_MODE_STATE_MAP[s]].feature || 0
      )
  );

@customElement("hui-alarm-panel-card")
class HuiAlarmPanelCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../editor/config-elements/hui-alarm-panel-card-editor");
    return document.createElement("hui-alarm-panel-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): AlarmPanelCardConfig {
    const includeDomains = ["alarm_control_panel"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    const entity = foundEntities[0] || "";
    const stateObj = hass.states[entity];

    return {
      type: "alarm-panel",
      states: filterSupportedAlarmStates(stateObj, DEFAULT_STATES),
      entity,
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AlarmPanelCardConfig;

  @query("#alarmCode") private _input?: HaTextField;

  public async getCardSize(): Promise<number> {
    if (!this._config || !this.hass) {
      return 9;
    }

    const stateObj = this.hass.states[this._config.entity];

    return !stateObj || stateObj.attributes.code_format !== FORMAT_NUMBER
      ? 4
      : 9;
  }

  public setConfig(config: AlarmPanelCardConfig): void {
    if (
      !config ||
      !config.entity ||
      config.entity.split(".")[0] !== "alarm_control_panel"
    ) {
      throw new Error("Invalid configuration");
    }

    this._config = { ...config };
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | AlarmPanelCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !oldHass ||
      oldHass.themes !== this.hass!.themes ||
      oldHass.locale !== this.hass!.locale
    ) {
      return true;
    }
    return (
      oldHass.states[this._config!.entity] !==
      this.hass!.states[this._config!.entity]
    );
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const stateObj = this.hass.states[this._config.entity];
    const states =
      this._config.states ||
      filterSupportedAlarmStates(stateObj, DEFAULT_STATES);

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const stateLabel = this._stateDisplay(stateObj.state);

    return html`
      <ha-card>
        <h1 class="card-header">
          ${this._config.name ||
          stateObj.attributes.friendly_name ||
          stateLabel}
          <ha-chip
            hasIcon
            style=${styleMap({
              "--alarm-state-color": stateColorCss(stateObj),
            })}
            class=${classMap({ [stateObj.state]: true })}
            @click=${this._handleMoreInfo}
          >
            <ha-svg-icon slot="icon" .path=${alarmPanelIcon(stateObj.state)}>
            </ha-svg-icon>
            ${stateLabel}
          </ha-chip>
        </h1>
        <div id="armActions" class="actions">
          ${(stateObj.state === "disarmed"
            ? states
            : (["disarm"] as const)
          ).map(
            (stateAction) => html`
              <mwc-button
                .action=${stateAction}
                @click=${this._handleActionClick}
                outlined
              >
                ${this._actionDisplay(stateAction)}
              </mwc-button>
            `
          )}
        </div>
        ${!stateObj.attributes.code_format
          ? nothing
          : html`
              <ha-textfield
                id="alarmCode"
                .label=${this.hass.localize("ui.card.alarm_control_panel.code")}
                type="password"
                .inputMode=${stateObj.attributes.code_format === FORMAT_NUMBER
                  ? "numeric"
                  : "text"}
              ></ha-textfield>
            `}
        ${stateObj.attributes.code_format !== FORMAT_NUMBER
          ? nothing
          : html`
              <div id="keypad">
                ${BUTTONS.map((value) =>
                  value === ""
                    ? html` <mwc-button disabled></mwc-button> `
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
      </ha-card>
    `;
  }

  private _actionDisplay(
    entityState: NonNullable<AlarmPanelCardConfig["states"]>[number]
  ): string {
    return this.hass!.localize(`ui.card.alarm_control_panel.${entityState}`);
  }

  private _stateDisplay(entityState: string): string {
    return entityState === UNAVAILABLE
      ? this.hass!.localize("state.default.unavailable")
      : this.hass!.localize(
          `component.alarm_control_panel.entity_component._.state.${entityState}`
        ) || entityState;
  }

  private _handlePadClick(e: MouseEvent): void {
    const val = (e.currentTarget! as any).value;
    this._input!.value = val === "clear" ? "" : this._input!.value + val;
  }

  private _handleActionClick(e: MouseEvent): void {
    const input = this._input;
    callAlarmAction(
      this.hass!,
      this._config!.entity,
      (e.currentTarget! as any).action,
      input?.value || undefined
    );
    if (input) {
      input.value = "";
    }
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        padding-bottom: 16px;
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-sizing: border-box;
        --alarm-state-color: var(--state-inactive-color);
      }

      ha-chip {
        --ha-chip-background-color: var(--alarm-state-color);
        --primary-text-color: var(--text-primary-color);
        line-height: initial;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
      }

      .triggered,
      .arming,
      .pending {
        animation: pulse 1s infinite;
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

      ha-textfield {
        display: block;
        margin: 8px;
        max-width: 150px;
        text-align: center;
      }

      .state {
        margin-left: 16px;
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
        width: 100%;
        max-width: 300px;
        direction: ltr;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-panel-card": HuiAlarmPanelCard;
  }
}
