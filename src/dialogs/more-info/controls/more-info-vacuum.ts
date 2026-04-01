import {
  mdiFan,
  mdiHomeImportOutline,
  mdiMapMarker,
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiStop,
  mdiTargetVariant,
  mdiViewDashboardVariant,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-outlined-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/entity/ha-battery-icon";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { EntityRegistryDisplayEntry } from "../../../data/entity/entity_registry";
import { findBatteryEntity } from "../../../data/entity/entity_registry";
import type { VacuumEntity } from "../../../data/vacuum";
import {
  VacuumEntityFeature,
  canReturnHome,
  canStart,
  canStop,
  isCleaning,
} from "../../../data/vacuum";
import { forwardHaptic } from "../../../data/haptics";
import "../../../state-control/vacuum/ha-state-control-vacuum-status";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-control-select-container";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";
import { showVacuumCleanRoomsView } from "../components/vacuum/show-view-vacuum-clean-rooms";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

@customElement("more-info-vacuum")
class MoreInfoVacuum extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: VacuumEntity;

  private _deviceEntities = memoizeOne(
    (
      deviceId: string,
      entities: HomeAssistant["entities"]
    ): EntityRegistryDisplayEntry[] => {
      const entries = Object.values(entities);
      return entries.filter((entity) => entity.device_id === deviceId);
    }
  );

  private get _stateOverride(): string | undefined {
    if (!this.stateObj || !this.hass) {
      return undefined;
    }

    const stateDisplay = supportsFeature(
      this.stateObj,
      VacuumEntityFeature.STATUS
    )
      ? this.hass.formatEntityAttributeValue(this.stateObj, "status") ||
        this.hass.formatEntityState(this.stateObj)
      : this.hass.formatEntityState(this.stateObj);

    const batteryText = this._getBatteryText();
    if (batteryText) {
      return `${stateDisplay} · ${batteryText}`;
    }
    return stateDisplay;
  }

  private _getBatteryText(): string | undefined {
    if (!this.stateObj || !this.hass) {
      return undefined;
    }

    const deviceId = this.hass.entities[this.stateObj.entity_id]?.device_id;
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
      if (batteryDomain === "sensor") {
        return this.hass.formatEntityState(battery);
      }
      return undefined;
    }

    // Use deprecated battery_level attribute
    if (
      supportsFeature(this.stateObj, VacuumEntityFeature.BATTERY) &&
      this.stateObj.attributes.battery_level
    ) {
      return this.hass.formatEntityAttributeValue(
        this.stateObj,
        "battery_level",
        Math.round(this.stateObj.attributes.battery_level)
      );
    }

    return undefined;
  }

  private _callVacuumService(service: string) {
    forwardHaptic(this, "light");
    this.hass.callService("vacuum", service, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _handleStartPause() {
    const stateObj = this.stateObj!;

    // Legacy start_pause for old vacuum entities without STATE feature
    if (
      !supportsFeature(stateObj, VacuumEntityFeature.STATE) &&
      !supportsFeature(stateObj, VacuumEntityFeature.START) &&
      supportsFeature(stateObj, VacuumEntityFeature.PAUSE)
    ) {
      this._callVacuumService("start_pause");
      return;
    }

    if (isCleaning(stateObj)) {
      this._callVacuumService("pause");
    } else {
      this._callVacuumService("start");
    }
  }

  private _handleStop() {
    this._callVacuumService("stop");
  }

  private _handleReturnHome() {
    this._callVacuumService("return_to_base");
  }

  private _handleLocate() {
    this._callVacuumService("locate");
  }

  private _handleCleanSpot() {
    this._callVacuumService("clean_spot");
  }

  private _handleCleanRooms() {
    showVacuumCleanRoomsView(
      this,
      this.hass.localize,
      this.stateObj!.entity_id
    );
  }

  private _handleFanSpeedChanged(ev: HaDropdownSelectEvent) {
    const newVal = ev.detail.item.value;
    const oldVal = this.stateObj!.attributes.fan_speed;

    if (!newVal || oldVal === newVal) return;

    this.hass.callService("vacuum", "set_fan_speed", {
      entity_id: this.stateObj!.entity_id,
      fan_speed: newVal,
    });
  }

  private get _supportsStartPause(): boolean {
    if (!this.stateObj) return false;
    return (
      supportsFeature(this.stateObj, VacuumEntityFeature.START) ||
      supportsFeature(this.stateObj, VacuumEntityFeature.PAUSE)
    );
  }

  private get _startPauseIcon(): string {
    if (!this.stateObj) return mdiPlay;

    // Legacy mode
    if (
      !supportsFeature(this.stateObj, VacuumEntityFeature.STATE) &&
      !supportsFeature(this.stateObj, VacuumEntityFeature.START)
    ) {
      return mdiPlayPause;
    }

    return isCleaning(this.stateObj) &&
      supportsFeature(this.stateObj, VacuumEntityFeature.PAUSE)
      ? mdiPause
      : mdiPlay;
  }

  private get _startPauseLabel(): string {
    if (!this.stateObj || !this.hass) return "";

    // Legacy mode
    if (
      !supportsFeature(this.stateObj, VacuumEntityFeature.STATE) &&
      !supportsFeature(this.stateObj, VacuumEntityFeature.START)
    ) {
      return this.hass.localize(
        "ui.dialogs.more_info_control.vacuum.start_pause"
      );
    }

    return isCleaning(this.stateObj) &&
      supportsFeature(this.stateObj, VacuumEntityFeature.PAUSE)
      ? this.hass.localize("ui.dialogs.more_info_control.vacuum.pause")
      : this.hass.localize("ui.dialogs.more_info_control.vacuum.start");
  }

  private get _startPauseDisabled(): boolean {
    if (!this.stateObj) return true;
    if (this.stateObj.state === UNAVAILABLE) return true;

    // Legacy mode - never disabled
    if (
      !supportsFeature(this.stateObj, VacuumEntityFeature.STATE) &&
      !supportsFeature(this.stateObj, VacuumEntityFeature.START)
    ) {
      return false;
    }

    // If cleaning, pause is always available
    if (isCleaning(this.stateObj)) return false;

    return !canStart(this.stateObj);
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;
    const isUnavailable = stateObj.state === UNAVAILABLE;

    const supportsStop = supportsFeature(stateObj, VacuumEntityFeature.STOP);
    const supportsReturnHome = supportsFeature(
      stateObj,
      VacuumEntityFeature.RETURN_HOME
    );
    const supportsLocate = supportsFeature(
      stateObj,
      VacuumEntityFeature.LOCATE
    );
    const supportsCleanSpot = supportsFeature(
      stateObj,
      VacuumEntityFeature.CLEAN_SPOT
    );
    const supportsCleanArea = supportsFeature(
      stateObj,
      VacuumEntityFeature.CLEAN_AREA
    );
    const supportsFanSpeed = supportsFeature(
      stateObj,
      VacuumEntityFeature.FAN_SPEED
    );

    const hasSecondaryControls =
      supportsLocate || supportsCleanSpot || supportsCleanArea;

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .stateOverride=${this._stateOverride}
      ></ha-more-info-state-header>

      <div class="controls">
        <ha-state-control-vacuum-status
          .stateObj=${this.stateObj}
          .hass=${this.hass}
        ></ha-state-control-vacuum-status>

        ${this._supportsStartPause || supportsStop || supportsReturnHome
          ? html`
              <div class="buttons">
                <ha-control-button-group>
                  ${this._supportsStartPause
                    ? html`
                        <ha-control-button
                          .label=${this._startPauseLabel}
                          @click=${this._handleStartPause}
                          .disabled=${this._startPauseDisabled}
                        >
                          <ha-svg-icon
                            .path=${this._startPauseIcon}
                          ></ha-svg-icon>
                        </ha-control-button>
                      `
                    : nothing}
                  ${supportsStop
                    ? html`
                        <ha-control-button
                          .label=${this.hass.localize(
                            "ui.dialogs.more_info_control.vacuum.stop"
                          )}
                          @click=${this._handleStop}
                          .disabled=${isUnavailable || !canStop(stateObj)}
                        >
                          <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
                        </ha-control-button>
                      `
                    : nothing}
                  ${supportsReturnHome
                    ? html`
                        <ha-control-button
                          .label=${this.hass.localize(
                            "ui.dialogs.more_info_control.vacuum.return_home"
                          )}
                          @click=${this._handleReturnHome}
                          .disabled=${isUnavailable || !canReturnHome(stateObj)}
                        >
                          <ha-svg-icon
                            .path=${mdiHomeImportOutline}
                          ></ha-svg-icon>
                        </ha-control-button>
                      `
                    : nothing}
                </ha-control-button-group>
              </div>
            `
          : nothing}
        ${hasSecondaryControls
          ? html`
              <div class="secondary-buttons">
                ${supportsLocate
                  ? html`
                      <ha-outlined-icon-button
                        .label=${this.hass.localize(
                          "ui.dialogs.more_info_control.vacuum.locate"
                        )}
                        @click=${this._handleLocate}
                        .disabled=${isUnavailable}
                      >
                        <ha-svg-icon .path=${mdiMapMarker}></ha-svg-icon>
                      </ha-outlined-icon-button>
                    `
                  : nothing}
                ${supportsCleanSpot
                  ? html`
                      <ha-outlined-icon-button
                        .label=${this.hass.localize(
                          "ui.dialogs.more_info_control.vacuum.clean_spot"
                        )}
                        @click=${this._handleCleanSpot}
                        .disabled=${isUnavailable}
                      >
                        <ha-svg-icon .path=${mdiTargetVariant}></ha-svg-icon>
                      </ha-outlined-icon-button>
                    `
                  : nothing}
                ${supportsCleanArea
                  ? html`
                      <ha-outlined-icon-button
                        .label=${this.hass.localize(
                          "ui.dialogs.more_info_control.vacuum.clean_rooms"
                        )}
                        @click=${this._handleCleanRooms}
                        .disabled=${isUnavailable}
                      >
                        <ha-svg-icon
                          .path=${mdiViewDashboardVariant}
                        ></ha-svg-icon>
                      </ha-outlined-icon-button>
                    `
                  : nothing}
              </div>
            `
          : nothing}
      </div>

      ${supportsFanSpeed && stateObj.attributes.fan_speed_list
        ? html`
            <ha-more-info-control-select-container>
              <ha-control-select-menu
                .hass=${this.hass}
                .label=${this.hass.formatEntityAttributeName(
                  stateObj,
                  "fan_speed"
                )}
                .value=${stateObj.attributes.fan_speed}
                .disabled=${isUnavailable}
                @wa-select=${this._handleFanSpeedChanged}
                .options=${stateObj.attributes.fan_speed_list.map((mode) => ({
                  value: mode,
                  label: this.hass.formatEntityAttributeValue(
                    stateObj,
                    "fan_speed",
                    mode
                  ),
                }))}
              >
                <ha-svg-icon slot="icon" .path=${mdiFan}></ha-svg-icon>
              </ha-control-select-menu>
            </ha-more-info-control-select-container>
          `
        : nothing}
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        ha-state-control-vacuum-status {
          margin-bottom: var(--ha-space-4);
        }

        ha-control-button-group {
          --control-button-group-thickness: 60px;
          width: 100%;
          max-width: 400px;
        }

        .secondary-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--ha-space-3);
          margin-top: var(--ha-space-3);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-vacuum": MoreInfoVacuum;
  }
}
