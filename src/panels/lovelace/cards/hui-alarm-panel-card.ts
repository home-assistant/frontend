import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/ha-state-icon";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import type { AlarmMode } from "../../../data/alarm_control_panel";
import {
  ALARM_MODES,
  FORMAT_NUMBER,
  callAlarmAction,
} from "../../../data/alarm_control_panel";
import { UNAVAILABLE } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard } from "../types";
import type { ExtEntityRegistryEntry } from "../../../data/entity_registry";
import {
  getExtendedEntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import type { AlarmPanelCardConfig, AlarmPanelCardConfigState } from "./types";

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

  @state() private _entry?: ExtEntityRegistryEntry | null;

  @query("#alarmCode") private _input?: HaTextField;

  private _unsubEntityRegistry?: UnsubscribeFunc;

  public connectedCallback() {
    super.connectedCallback();
    this._subscribeEntityEntry();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeEntityRegistry();
  }

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
    this._subscribeEntityEntry();
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

  private async _unsubscribeEntityRegistry() {
    if (this._unsubEntityRegistry) {
      this._unsubEntityRegistry();
      this._unsubEntityRegistry = undefined;
    }
  }

  private async _subscribeEntityEntry() {
    if (!this._config?.entity) {
      return;
    }
    try {
      this._unsubEntityRegistry = subscribeEntityRegistry(
        this.hass!.connection,
        async (entries) => {
          if (
            entries.some((entry) => entry.entity_id === this._config!.entity)
          ) {
            this._entry = await getExtendedEntityRegistryEntry(
              this.hass!,
              this._config!.entity
            );
          }
        }
      );
    } catch (_e) {
      this._entry = null;
    }
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
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const stateLabel = this._stateDisplay(stateObj.state);

    const defaultCode = this._entry?.options?.alarm_control_panel?.default_code;

    return html`
      <ha-card>
        <h1 class="card-header">
          ${this._config.name ||
          stateObj.attributes.friendly_name ||
          stateLabel}
          <ha-assist-chip
            filled
            style=${styleMap({
              "--alarm-state-color": stateColorCss(stateObj),
            })}
            class=${classMap({ [stateObj.state]: true })}
            @click=${this._handleMoreInfo}
            .label=${stateLabel}
          >
            <ha-state-icon
              slot="icon"
              .hass=${this.hass}
              .stateObj=${stateObj}
            ></ha-state-icon>
          </ha-assist-chip>
        </h1>
        <div id="armActions" class="actions">
          ${(stateObj.state === "disarmed"
            ? states
            : (["disarm"] as const)
          ).map(
            (stateAction) => html`
              <ha-button
                .action=${stateAction}
                @click=${this._handleActionClick}
                appearance="filled"
                size="small"
                variant=${stateAction === "disarm" ? "danger" : "primary"}
              >
                ${this._actionDisplay(stateAction)}
              </ha-button>
            `
          )}
        </div>
        ${!stateObj.attributes.code_format || defaultCode
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
        ${stateObj.attributes.code_format !== FORMAT_NUMBER || defaultCode
          ? nothing
          : html`
              <div id="keypad">
                ${BUTTONS.map((value) =>
                  value === ""
                    ? html`<ha-button disabled></ha-button> `
                    : html`
                        <ha-button
                          .value=${value}
                          @click=${this._handlePadClick}
                          appearance="filled"
                          class=${classMap({
                            numberkey: value !== "clear",
                          })}
                        >
                          ${value === "clear"
                            ? this.hass!.localize(
                                `ui.card.alarm_control_panel.clear_code`
                              )
                            : value}
                        </ha-button>
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

  static styles = css`
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

    ha-assist-chip {
      --ha-assist-chip-filled-container-color: var(--alarm-state-color);
      --primary-text-color: var(--text-primary-color);
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
      margin-inline-start: 16px;
      margin-inline-end: initial;
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

    #keypad ha-button {
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

    .actions ha-button {
      margin: 0 4px 4px;
    }

    ha-button.numberkey {
      --ha-button-font-size: var(--keypad-font-size, var(--ha-font-size-s));
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-panel-card": HuiAlarmPanelCard;
  }
}
