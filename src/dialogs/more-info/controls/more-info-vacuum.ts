import "@material/mwc-list/mwc-list-item";
import {
  mdiFan,
  mdiHomeImportOutline,
  mdiMapMarker,
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiStop,
  mdiTargetVariant,
} from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-attributes";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-select";
import { UNAVAILABLE } from "../../../data/entity";
import {
  EntityRegistryDisplayEntry,
  findBatteryChargingEntity,
  findBatteryEntity,
} from "../../../data/entity_registry";
import { VacuumEntity, VacuumEntityFeature } from "../../../data/vacuum";
import { HomeAssistant } from "../../../types";

interface VacuumCommand {
  translationKey: string;
  icon: string;
  serviceName: string;
  isVisible: (stateObj: VacuumEntity) => boolean;
}

const VACUUM_COMMANDS: VacuumCommand[] = [
  {
    translationKey: "start",
    icon: mdiPlay,
    serviceName: "start",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, VacuumEntityFeature.START),
  },
  {
    translationKey: "pause",
    icon: mdiPause,
    serviceName: "pause",
    isVisible: (stateObj) =>
      // We need also to check if Start is supported because if not we show start-pause
      // Start-pause service is only available for old vacuum entities, new entities have the `STATE` feature
      supportsFeature(stateObj, VacuumEntityFeature.PAUSE) &&
      (supportsFeature(stateObj, VacuumEntityFeature.STATE) ||
        supportsFeature(stateObj, VacuumEntityFeature.START)),
  },
  {
    translationKey: "start_pause",
    icon: mdiPlayPause,
    serviceName: "start_pause",
    isVisible: (stateObj) =>
      // If start is supported, we don't show this button
      // This service is only available for old vacuum entities, new entities have the `STATE` feature
      !supportsFeature(stateObj, VacuumEntityFeature.STATE) &&
      !supportsFeature(stateObj, VacuumEntityFeature.START) &&
      supportsFeature(stateObj, VacuumEntityFeature.PAUSE),
  },
  {
    translationKey: "stop",
    icon: mdiStop,
    serviceName: "stop",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, VacuumEntityFeature.STOP),
  },
  {
    translationKey: "clean_spot",
    icon: mdiTargetVariant,
    serviceName: "clean_spot",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, VacuumEntityFeature.CLEAN_SPOT),
  },
  {
    translationKey: "locate",
    icon: mdiMapMarker,
    serviceName: "locate",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, VacuumEntityFeature.LOCATE),
  },
  {
    translationKey: "return_home",
    icon: mdiHomeImportOutline,
    serviceName: "return_to_base",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, VacuumEntityFeature.RETURN_HOME),
  },
];

@customElement("more-info-vacuum")
class MoreInfoVacuum extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: VacuumEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;

    const filterExtraAttributes =
      "fan_speed,fan_speed_list,status,battery_level,battery_icon";

    return html`
      ${stateObj.state !== UNAVAILABLE
        ? html` <div class="flex-horizontal">
            <div>
              <span class="status-subtitle"
                >${this.hass!.localize(
                  "ui.dialogs.more_info_control.vacuum.status"
                )}:
              </span>
              <span>
                <strong>
                  ${supportsFeature(stateObj, VacuumEntityFeature.STATUS) &&
                  stateObj.attributes.status
                    ? this.hass.formatEntityAttributeValue(stateObj, "status")
                    : this.hass.formatEntityState(stateObj)}
                </strong>
              </span>
            </div>
            ${this._renderBattery()}
          </div>`
        : ""}
      ${VACUUM_COMMANDS.some((item) => item.isVisible(stateObj))
        ? html`
            <div>
              <p></p>
              <div class="status-subtitle">
                ${this.hass!.localize(
                  "ui.dialogs.more_info_control.vacuum.commands"
                )}
              </div>
              <div class="flex-horizontal">
                ${VACUUM_COMMANDS.filter((item) =>
                  item.isVisible(stateObj)
                ).map(
                  (item) => html`
                    <div>
                      <ha-icon-button
                        .path=${item.icon}
                        .entry=${item}
                        @click=${this.callService}
                        .label=${this.hass!.localize(
                          `ui.dialogs.more_info_control.vacuum.${item.translationKey}`
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
      ${supportsFeature(stateObj, VacuumEntityFeature.FAN_SPEED)
        ? html`
            <div>
              <div class="flex-horizontal">
                <ha-select
                  .label=${this.hass!.localize(
                    "ui.dialogs.more_info_control.vacuum.fan_speed"
                  )}
                  .disabled=${stateObj.state === UNAVAILABLE}
                  .value=${stateObj.attributes.fan_speed}
                  @selected=${this.handleFanSpeedChanged}
                  fixedMenuPosition
                  naturalMenuWidth
                  @closed=${stopPropagation}
                >
                  ${stateObj.attributes.fan_speed_list!.map(
                    (mode) => html`
                      <mwc-list-item .value=${mode}>
                        ${this.hass.formatEntityAttributeValue(
                          stateObj,
                          "fan_speed",
                          mode
                        )}
                      </mwc-list-item>
                    `
                  )}
                </ha-select>
                <div
                  style="justify-content: center; align-self: center; padding-top: 1.3em"
                >
                  <span>
                    <ha-svg-icon .path=${mdiFan}></ha-svg-icon>
                    ${this.hass.formatEntityAttributeValue(
                      stateObj,
                      "fan_speed"
                    )}
                  </span>
                </div>
              </div>
              <p></p>
            </div>
          `
        : ""}

      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .extraFilters=${filterExtraAttributes}
      ></ha-attributes>
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
    const batteryDomain = battery ? computeStateDomain(battery) : undefined;

    // Use device battery entity
    if (
      battery &&
      (batteryDomain === "binary_sensor" || !isNaN(battery.state as any))
    ) {
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
            ${batteryDomain === "sensor"
              ? this.hass.formatEntityState(battery)
              : nothing}
            <ha-battery-icon
              .hass=${this.hass}
              .batteryStateObj=${battery}
              .batteryChargingStateObj=${batteryCharging}
            ></ha-battery-icon>
          </span>
        </div>
      `;
    }

    // Use battery_level and battery_icon deprecated attributes
    if (
      supportsFeature(stateObj, VacuumEntityFeature.BATTERY) &&
      stateObj.attributes.battery_level
    ) {
      return html`
        <div>
          <span>
            ${this.hass.formatEntityAttributeValue(
              stateObj,
              "battery_level",
              Math.round(stateObj.attributes.battery_level)
            )}

            <ha-icon .icon=${stateObj.attributes.battery_icon}></ha-icon>
          </span>
        </div>
      `;
    }

    return nothing;
  }

  private callService(ev: CustomEvent) {
    const entry = (ev.target! as any).entry as VacuumCommand;
    this.hass.callService("vacuum", entry.serviceName, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private handleFanSpeedChanged(ev) {
    const oldVal = this.stateObj!.attributes.fan_speed;
    const newVal = ev.target.value;

    if (!newVal || oldVal === newVal) {
      return;
    }

    this.hass.callService("vacuum", "set_fan_speed", {
      entity_id: this.stateObj!.entity_id,
      fan_speed: newVal,
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
        justify-content: space-between;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-vacuum": MoreInfoVacuum;
  }
}
