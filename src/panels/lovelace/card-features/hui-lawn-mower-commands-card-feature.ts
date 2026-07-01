import { mdiHomeImportOutline, mdiPause, mdiPlay } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { LawnMowerEntity } from "../../../data/lawn_mower";
import { LawnMowerEntityFeature, canDock } from "../../../data/lawn_mower";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LawnMowerCommand,
  LawnMowerCommandsCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";
import { LAWN_MOWER_COMMANDS } from "./types";

interface LawnMowerButton {
  translationKey: string;
  icon: string;
  serviceName: string;
  disabled?: boolean;
}

export const LAWN_MOWER_COMMANDS_FEATURES: Record<
  LawnMowerCommand,
  LawnMowerEntityFeature[]
> = {
  start_pause: [
    LawnMowerEntityFeature.PAUSE,
    LawnMowerEntityFeature.START_MOWING,
  ],
  dock: [LawnMowerEntityFeature.DOCK],
};

export const supportsLawnMowerCommand = (
  stateObj: HassEntity,
  command: LawnMowerCommand
): boolean =>
  LAWN_MOWER_COMMANDS_FEATURES[command].some((feature) =>
    supportsFeature(stateObj, feature)
  );

export const LAWN_MOWER_COMMANDS_BUTTONS: Record<
  LawnMowerCommand,
  (stateObj: LawnMowerEntity) => LawnMowerButton
> = {
  start_pause: (stateObj) => {
    const canPause =
      stateObj.state === "mowing" &&
      supportsFeature(stateObj, LawnMowerEntityFeature.PAUSE);

    return canPause
      ? {
          translationKey: "pause",
          icon: mdiPause,
          serviceName: "pause",
        }
      : {
          translationKey: "start",
          icon: mdiPlay,
          serviceName: "start_mowing",
        };
  },
  dock: (stateObj) => ({
    translationKey: "dock",
    icon: mdiHomeImportOutline,
    serviceName: "dock",
    disabled: !canDock(stateObj),
  }),
};

export const supportsLawnMowerCommandCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "lawn_mower" &&
    LAWN_MOWER_COMMANDS.some((c) => supportsLawnMowerCommand(stateObj, c))
  );
};

@customElement("hui-lawn-mower-commands-card-feature")
class HuiLawnMowerCommandCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: LawnMowerCommandsCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      LawnMowerEntity | undefined;
  }

  static getStubConfig(): LawnMowerCommandsCardFeatureConfig {
    return {
      type: "lawn-mower-commands",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-lawn-mower-commands-card-feature-editor");
    return document.createElement(
      "hui-lawn-mower-commands-card-feature-editor"
    );
  }

  public setConfig(config: LawnMowerCommandsCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onCommandTap(ev): void {
    ev.stopPropagation();
    const entry = (ev.target! as any).entry as LawnMowerButton;
    this.hass!.callService("lawn_mower", entry.serviceName, {
      entity_id: this._stateObj!.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsLawnMowerCommandCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const stateObj = this._stateObj as LawnMowerEntity;

    const commands = this._config.commands ?? LAWN_MOWER_COMMANDS;

    return html`
      <ha-control-button-group>
        ${commands
          .filter((command) => supportsLawnMowerCommand(stateObj, command))
          .map((command) => {
            const button = LAWN_MOWER_COMMANDS_BUTTONS[command](stateObj);
            return html`
              <ha-control-button
                .entry=${button}
                .label=${this.hass!.localize(
                  // @ts-ignore
                  `ui.dialogs.more_info_control.lawn_mower.${button.translationKey}`
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
    "hui-lawn-mower-commands-card-feature": HuiLawnMowerCommandCardFeature;
  }
}
