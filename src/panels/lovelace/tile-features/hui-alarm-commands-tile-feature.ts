import {
  mdiShieldAirplaneOutline,
  mdiShieldHalfFull,
  mdiShieldHomeOutline,
  mdiShieldLockOutline,
  mdiShieldMoonOutline,
  mdiShieldOffOutline,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/tile/ha-tile-button";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
import { AlarmCommand, AlarmCommandsTileFeatureConfig } from "./types";

interface AlarmButton {
  translationKey: string;
  icon: string;
  serviceName: AlarmCommand;
}

export const armAlarmCommand = (
  stateObj: HassEntity,
  button: AlarmButton
): boolean => {
  if (stateObj.state !== "disarmed" && button.serviceName !== "alarm_disarm") {
    return false;
  }
  return true;
};

export const ALARM_COMMANDS_BUTTONS: AlarmButton[] = [
  {
    translationKey: "disarm",
    icon: mdiShieldOffOutline,
    serviceName: "alarm_disarm",
  },
  {
    translationKey: "arm_away",
    icon: mdiShieldLockOutline,
    serviceName: "alarm_arm_away",
  },
  {
    translationKey: "arm_home",
    icon: mdiShieldHomeOutline,
    serviceName: "alarm_arm_home",
  },
  {
    translationKey: "arm_night",
    icon: mdiShieldMoonOutline,
    serviceName: "alarm_arm_night",
  },
  {
    translationKey: "arm_vacation",
    icon: mdiShieldAirplaneOutline,
    serviceName: "alarm_arm_vacation",
  },
  {
    translationKey: "arm_custom_bypass",
    icon: mdiShieldHalfFull,
    serviceName: "alarm_arm_custom_bypass",
  },
];

@customElement("hui-alarm-commands-tile-feature")
class HuiVacuumCommandTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: AlarmCommandsTileFeatureConfig;

  static getStubConfig(): AlarmCommandsTileFeatureConfig {
    return {
      type: "alarm-commands",
      commands: [
        "alarm_arm_away",
        "alarm_arm_home",
        "alarm_arm_night",
        "alarm_arm_vacation",
        "alarm_arm_custom_bypass",
        "alarm_disarm",
      ],
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import(
      "../editor/config-elements/hui-alarm-commands-tile-feature-editor"
    );
    return document.createElement("hui-alarm-commands-tile-feature-editor");
  }

  public setConfig(config: AlarmCommandsTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onCommandTap(ev): void {
    ev.stopPropagation();
    const entry = (ev.target! as any).entry as AlarmButton;
    this.hass!.callService("alarm_control_panel", entry.serviceName, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this.stateObj) {
      return html``;
    }

    const stateObj = this.stateObj;

    return html`
      <div class="container">
        ${ALARM_COMMANDS_BUTTONS.filter(
          (button) =>
            armAlarmCommand(stateObj, button) &&
            this._config?.commands?.includes(button.serviceName)
        ).map(
          (button) => html`
            <ha-tile-button
              .entry=${button}
              .label=${this.hass!.localize(
                // @ts-ignore
                `ui.dialogs.more_info_control.alarm.${button.translationKey}`
              )}
              @click=${this._onCommandTap}
              .disabled=${this.stateObj?.state === UNAVAILABLE}
            >
              <ha-svg-icon .path=${button.icon}></ha-svg-icon>
            </ha-tile-button>
          `
        )}
      </div>
    `;
  }

  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: row;
        padding: 0 12px 12px 12px;
        width: auto;
      }
      ha-tile-button {
        flex: 1;
      }
      ha-tile-button:not(:last-child) {
        margin-right: 12px;
        margin-inline-end: 12px;
        margin-inline-start: initial;
        direction: var(--direction);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-commands-tile-feature": HuiVacuumCommandTileFeature;
  }
}
