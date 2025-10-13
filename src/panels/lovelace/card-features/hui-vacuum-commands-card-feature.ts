import {
  mdiHomeImportOutline,
  mdiMapMarker,
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiStop,
  mdiTargetVariant,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../data/entity";
import type { VacuumEntity } from "../../../data/vacuum";
import {
  VacuumEntityFeature,
  canReturnHome,
  canStart,
  canStop,
  isCleaning,
} from "../../../data/vacuum";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  VacuumCommand,
  VacuumCommandsCardFeatureConfig,
} from "./types";
import { VACUUM_COMMANDS } from "./types";

interface VacuumButton {
  translationKey: string;
  icon: string;
  serviceName: string;
  disabled?: boolean;
}

export const VACUUM_COMMANDS_FEATURES: Record<
  VacuumCommand,
  VacuumEntityFeature[]
> = {
  start_pause: [VacuumEntityFeature.PAUSE, VacuumEntityFeature.START],
  stop: [VacuumEntityFeature.STOP],
  clean_spot: [VacuumEntityFeature.CLEAN_SPOT],
  locate: [VacuumEntityFeature.LOCATE],
  return_home: [VacuumEntityFeature.RETURN_HOME],
};

export const supportsVacuumCommand = (
  stateObj: HassEntity,
  command: VacuumCommand
): boolean =>
  VACUUM_COMMANDS_FEATURES[command].some((feature) =>
    supportsFeature(stateObj, feature)
  );

export const VACUUM_COMMANDS_BUTTONS: Record<
  VacuumCommand,
  (stateObj: VacuumEntity) => VacuumButton
> = {
  start_pause: (stateObj) => {
    const startPauseOnly =
      // This service is only available for old vacuum entities, new entities have the `STATE` feature
      !supportsFeature(stateObj, VacuumEntityFeature.STATE) &&
      !supportsFeature(stateObj, VacuumEntityFeature.START) &&
      supportsFeature(stateObj, VacuumEntityFeature.PAUSE);

    if (startPauseOnly) {
      return {
        translationKey: "start_pause",
        icon: mdiPlayPause,
        serviceName: "start_pause",
      };
    }
    const canPause =
      isCleaning(stateObj) &&
      supportsFeature(stateObj, VacuumEntityFeature.PAUSE);

    return canPause
      ? {
          translationKey: "pause",
          icon: mdiPause,
          serviceName: "pause",
        }
      : {
          translationKey: "start",
          icon: mdiPlay,
          serviceName: "start",
          disabled: !canStart(stateObj),
        };
  },
  stop: (stateObj) => ({
    translationKey: "stop",
    icon: mdiStop,
    serviceName: "stop",
    disabled: !canStop(stateObj),
  }),
  clean_spot: () => ({
    translationKey: "clean_spot",
    icon: mdiTargetVariant,
    serviceName: "clean_spot",
  }),
  locate: () => ({
    translationKey: "locate",
    icon: mdiMapMarker,
    serviceName: "locate",
  }),
  return_home: (stateObj) => ({
    translationKey: "return_home",
    icon: mdiHomeImportOutline,
    serviceName: "return_to_base",
    disabled: !canReturnHome(stateObj),
  }),
};

export const supportsVacuumCommandsCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "vacuum" &&
    VACUUM_COMMANDS.some((c) => supportsVacuumCommand(stateObj, c))
  );
};

@customElement("hui-vacuum-commands-card-feature")
class HuiVacuumCommandCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: VacuumCommandsCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | VacuumEntity
      | undefined;
  }

  static getStubConfig(
    hass: HomeAssistant,
    context: LovelaceCardFeatureContext
  ): VacuumCommandsCardFeatureConfig {
    const stateObj = context.entity_id
      ? hass.states[context.entity_id]
      : undefined;
    return {
      type: "vacuum-commands",
      commands: stateObj
        ? VACUUM_COMMANDS.filter((c) =>
            supportsVacuumCommand(stateObj, c)
          ).slice(0, 3)
        : [],
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-vacuum-commands-card-feature-editor"
    );
    return document.createElement("hui-vacuum-commands-card-feature-editor");
  }

  public setConfig(config: VacuumCommandsCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onCommandTap(ev): void {
    ev.stopPropagation();
    const entry = (ev.target! as any).entry as VacuumButton;
    this.hass!.callService("vacuum", entry.serviceName, {
      entity_id: this._stateObj!.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsVacuumCommandsCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const stateObj = this._stateObj as VacuumEntity;

    return html`
      <ha-control-button-group>
        ${VACUUM_COMMANDS.filter(
          (command) =>
            supportsVacuumCommand(stateObj, command) &&
            this._config?.commands?.includes(command)
        ).map((command) => {
          const button = VACUUM_COMMANDS_BUTTONS[command](stateObj);
          return html`
            <ha-control-button
              .entry=${button}
              .label=${this.hass!.localize(
                // @ts-ignore
                `ui.dialogs.more_info_control.vacuum.${button.translationKey}`
              )}
              @click=${this._onCommandTap}
              .disabled=${button.disabled || stateObj.state === UNAVAILABLE}
            >
              <ha-svg-icon .path=${button.icon}></ha-svg-icon>
            </ha-control-button>
          `;
        })}
      </ha-control-button-group>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-vacuum-commands-card-feature": HuiVacuumCommandCardFeature;
  }
}
