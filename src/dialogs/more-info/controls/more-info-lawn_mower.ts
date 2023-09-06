import { mdiHomeImportOutline, mdiPause, mdiPlay } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-icon-button";
import { UNAVAILABLE } from "../../../data/entity";
import {
  EntityRegistryDisplayEntry,
  findBatteryChargingEntity,
  findBatteryEntity,
} from "../../../data/entity_registry";
import {
  LawnMowerEntity,
  LawnMowerEntityFeature,
} from "../../../data/lawn_mower";
import { HomeAssistant } from "../../../types";

interface LawnMowerCommand {
  translationKey: string;
  icon: string;
  serviceName: string;
  isVisible: (stateObj: LawnMowerEntity) => boolean;
}

const LAWN_MOWER_COMMANDS: LawnMowerCommand[] = [
  {
    translationKey: "start_mowing",
    icon: mdiPlay,
    serviceName: "start_mowing",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, LawnMowerEntityFeature.START_MOWING),
  },
  {
    translationKey: "pause",
    icon: mdiPause,
    serviceName: "pause",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, LawnMowerEntityFeature.PAUSE),
  },
  {
    translationKey: "dock",
    icon: mdiHomeImportOutline,
    serviceName: "dock",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, LawnMowerEntityFeature.DOCK),
  },
];

@customElement("more-info-lawn_mower")
class MoreInfoLawnMower extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: LawnMowerEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;

    return html`
      ${stateObj.state !== UNAVAILABLE
        ? html` <div class="flex-horizontal">
            <div>
              <span class="status-subtitle"
                >${this.hass!.localize(
                  "ui.dialogs.more_info_control.lawn_mower.activity"
                )}:
              </span>
              <span>
                <strong>${this.hass.formatEntityState(stateObj)}</strong>
              </span>
            </div>
            ${this._renderBattery()}
          </div>`
        : nothing}
      ${LAWN_MOWER_COMMANDS.some((item) => item.isVisible(stateObj))
        ? html`
            <div>
              <p></p>
              <div class="status-subtitle">
                ${this.hass!.localize(
                  "ui.dialogs.more_info_control.lawn_mower.commands"
                )}
              </div>
              <div class="flex-horizontal space-around">
                ${LAWN_MOWER_COMMANDS.filter((item) =>
                  item.isVisible(stateObj)
                ).map(
                  (item) => html`
                    <div>
                      <ha-icon-button
                        .path=${item.icon}
                        .entry=${item}
                        @click=${this.callService}
                        .label=${this.hass!.localize(
                          `ui.dialogs.more_info_control.lawn_mower.${item.translationKey}`
                        )}
                        .disabled=${stateObj.state === UNAVAILABLE}
                      ></ha-icon-button>
                    </div>
                  `
                )}
              </div>
            </div>
          `
        : ""}
    `;
  }

  private _deviceEntities = memoizeOne(
    (
      deviceId: string,
      entities: HomeAssistant["entities"]
    ): EntityRegistryDisplayEntry[] => {
      const entries = Object.values(entities);
      return entries.filter((entity) => entity.device_id === deviceId);
    }
  );

  private _renderBattery() {
    const stateObj = this.stateObj!;

    const deviceId = this.hass.entities[stateObj.entity_id]?.device_id;

    const entities = deviceId
      ? this._deviceEntities(deviceId, this.hass.entities)
      : [];

    const batteryEntity = findBatteryEntity(this.hass, entities);
    const battery = batteryEntity
      ? this.hass.states[batteryEntity.entity_id]
      : undefined;

    const batteryIsBinary =
      battery && computeStateDomain(battery) === "binary_sensor";

    // Use device battery entity
    if (battery && (batteryIsBinary || !isNaN(battery.state as any))) {
      const batteryChargingEntity = findBatteryChargingEntity(
        this.hass,
        entities
      );
      const batteryCharging = batteryChargingEntity
        ? this.hass.states[batteryChargingEntity?.entity_id]
        : undefined;

      return html`
        <div>
          <span>
            ${batteryIsBinary
              ? ""
              : `${Number(battery.state).toFixed()}${blankBeforePercent(
                  this.hass.locale
                )}%`}
            <ha-battery-icon
              .hass=${this.hass}
              .batteryStateObj=${battery}
              .batteryChargingStateObj=${batteryCharging}
            ></ha-battery-icon>
          </span>
        </div>
      `;
    }

    return nothing;
  }

  private callService(ev: CustomEvent) {
    const entry = (ev.target! as any).entry as LawnMowerCommand;
    this.hass.callService("lawn_mower", entry.serviceName, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        line-height: 1.5;
      }
      .status-subtitle {
        color: var(--secondary-text-color);
      }
      .flex-horizontal {
        display: flex;
        flex-direction: row;
      }
      .space-around {
        justify-content: space-around;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-lawn_mower": MoreInfoLawnMower;
  }
}
