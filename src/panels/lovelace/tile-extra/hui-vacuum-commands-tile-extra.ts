import {
  mdiHomeMapMarker,
  mdiMapMarker,
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiStop,
  mdiTargetVariant,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/tile/ha-tile-button";
import { UNAVAILABLE } from "../../../data/entity";
import {
  canReturnHome,
  canStop,
  isCleaning,
  VacuumEntity,
  VacuumEntityFeature,
} from "../../../data/vacuum";
import { HomeAssistant } from "../../../types";
import { LovelaceTileExtra, LovelaceTileExtraEditor } from "../types";
import { VacuumCommand, VacuumCommandsTileExtraConfig } from "./types";

interface VacuumButton {
  translationKey: string;
  icon: string;
  serviceName: string;
  isVisible: (entity: VacuumEntity, commands: VacuumCommand[]) => boolean;
  isDisabled?: (entity: VacuumEntity) => boolean;
}

export const VACUUM_BUTTONS: VacuumButton[] = [
  {
    translationKey: "start",
    icon: mdiPlay,
    serviceName: "start",
    isVisible: (entity, commands) =>
      supportsFeature(entity, VacuumEntityFeature.START) &&
      commands.includes("start_pause") &&
      !isCleaning(entity),
  },
  {
    translationKey: "pause",
    icon: mdiPause,
    serviceName: "pause",
    isVisible: (entity, commands) =>
      // We need also to check if Start is supported because if not we show play-pause
      supportsFeature(entity, VacuumEntityFeature.START) &&
      supportsFeature(entity, VacuumEntityFeature.PAUSE) &&
      commands.includes("start_pause") &&
      isCleaning(entity),
  },
  {
    translationKey: "start_pause",
    icon: mdiPlayPause,
    serviceName: "start_pause",
    isVisible: (entity, commands) =>
      // If start is supported, we don't show this button
      !supportsFeature(entity, VacuumEntityFeature.START) &&
      supportsFeature(entity, VacuumEntityFeature.PAUSE) &&
      commands.includes("start_pause"),
  },
  {
    translationKey: "stop",
    icon: mdiStop,
    serviceName: "stop",
    isVisible: (entity, commands) =>
      supportsFeature(entity, VacuumEntityFeature.STOP) &&
      commands.includes("stop"),
    isDisabled: (entity) => !canStop(entity),
  },
  {
    translationKey: "clean_spot",
    icon: mdiTargetVariant,
    serviceName: "clean_spot",
    isVisible: (entity, commands) =>
      supportsFeature(entity, VacuumEntityFeature.CLEAN_SPOT) &&
      commands.includes("clean_spot"),
  },
  {
    translationKey: "locate",
    icon: mdiMapMarker,
    serviceName: "locate",
    isVisible: (entity, commands) =>
      supportsFeature(entity, VacuumEntityFeature.LOCATE) &&
      commands.includes("locate"),
    isDisabled: (entity) => !canReturnHome(entity),
  },
  {
    translationKey: "return_home",
    icon: mdiHomeMapMarker,
    serviceName: "return_to_base",
    isVisible: (entity, commands) =>
      supportsFeature(entity, VacuumEntityFeature.RETURN_HOME) &&
      commands.includes("return_home"),
  },
];

@customElement("hui-vacuum-commands-tile-extra")
class HuiVacuumCommandTileExtra
  extends LitElement
  implements LovelaceTileExtra
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: VacuumCommandsTileExtraConfig;

  static getStubConfig(): VacuumCommandsTileExtraConfig {
    return {
      type: "vacuum-commands",
      commands: [],
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileExtraEditor> {
    await import(
      "../editor/config-elements/hui-vacuum-commands-tile-extra-editor"
    );
    return document.createElement("hui-vacuum-commands-tile-extra-editor");
  }

  public setConfig(config: VacuumCommandsTileExtraConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onCommandTap(ev): void {
    ev.stopPropagation();
    const entry = (ev.target! as any).entry as VacuumButton;
    this.hass!.callService("vacuum", entry.serviceName, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this.stateObj) {
      return html``;
    }

    const stateObj = this.stateObj as VacuumEntity;

    return html`
      <div class="container">
        ${VACUUM_BUTTONS.filter((button) =>
          button.isVisible(stateObj, this._config?.commands || [])
        ).map(
          (button) => html`
            <ha-tile-button
              .entry=${button}
              .label=${this.hass!.localize(
                // @ts-ignore
                `ui.dialogs.more_info_control.vacuum.${button.translationKey}`
              )}
              @click=${this._onCommandTap}
              .disabled=${button.isDisabled
                ? button.isDisabled(stateObj)
                : stateObj.state === UNAVAILABLE}
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
    "hui-vacuum-commands-tile-extra": HuiVacuumCommandTileExtra;
  }
}
