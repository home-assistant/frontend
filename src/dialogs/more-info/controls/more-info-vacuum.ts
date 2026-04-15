import {
  mdiChevronRight,
  mdiFan,
  mdiHomeImportOutline,
  mdiMapMarker,
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiStop,
  mdiTargetVariant,
  mdiTextureBox,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-svg-icon";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-icon";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { EntityRegistryDisplayEntry } from "../../../data/entity/entity_registry";
import {
  findBatteryChargingEntity,
  findBatteryEntity,
} from "../../../data/entity/entity_registry";
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
import { showVacuumCleanAreasView } from "../components/vacuum/show-view-vacuum-clean-areas";
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

    if (
      supportsFeature(this.stateObj, VacuumEntityFeature.STATUS) &&
      this.stateObj.attributes.status
    ) {
      return this.hass.formatEntityAttributeValue(this.stateObj, "status");
    }

    return undefined;
  }

  private _renderBattery() {
    if (!this.stateObj || !this.hass) {
      return nothing;
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
      const batteryChargingEntity = findBatteryChargingEntity(
        this.hass,
        entities
      );
      const batteryCharging = batteryChargingEntity
        ? this.hass.states[batteryChargingEntity?.entity_id]
        : undefined;

      return html`
        <span class="battery" slot="after-time">
          ${batteryDomain === "binary_sensor"
            ? ""
            : `${Number(battery.state).toFixed()}${blankBeforePercent(this.hass.locale)}%`}
          <ha-battery-icon
            .hass=${this.hass}
            .batteryStateObj=${battery}
            .batteryChargingStateObj=${batteryCharging}
          ></ha-battery-icon>
        </span>
      `;
    }

    // Use deprecated battery_level and battery_icon attributes
    if (
      supportsFeature(this.stateObj, VacuumEntityFeature.BATTERY) &&
      this.stateObj.attributes.battery_level
    ) {
      return html`
        <span class="battery" slot="after-time">
          ${Math.round(
            this.stateObj.attributes.battery_level
          )}${blankBeforePercent(this.hass.locale)}%
          <ha-icon .icon=${this.stateObj.attributes.battery_icon}></ha-icon>
        </span>
      `;
    }

    return nothing;
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

  private _handleCleanAreas() {
    showVacuumCleanAreasView(
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

    const hasAnyCommand =
      this._supportsStartPause ||
      supportsStop ||
      supportsReturnHome ||
      supportsLocate ||
      supportsCleanSpot ||
      supportsCleanArea;

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .stateOverride=${this._stateOverride}
      >
        ${this._renderBattery()}
      </ha-more-info-state-header>

      <div class="controls">
        <ha-state-control-vacuum-status
          .stateObj=${this.stateObj}
          .hass=${this.hass}
        ></ha-state-control-vacuum-status>

        ${hasAnyCommand
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
                  ${supportsLocate
                    ? html`
                        <ha-control-button
                          .label=${this.hass.localize(
                            "ui.dialogs.more_info_control.vacuum.locate"
                          )}
                          @click=${this._handleLocate}
                          .disabled=${isUnavailable}
                        >
                          <ha-svg-icon .path=${mdiMapMarker}></ha-svg-icon>
                        </ha-control-button>
                      `
                    : nothing}
                  ${supportsCleanSpot
                    ? html`
                        <ha-control-button
                          .label=${this.hass.localize(
                            "ui.dialogs.more_info_control.vacuum.clean_spot"
                          )}
                          @click=${this._handleCleanSpot}
                          .disabled=${isUnavailable}
                        >
                          <ha-svg-icon .path=${mdiTargetVariant}></ha-svg-icon>
                        </ha-control-button>
                      `
                    : nothing}
                </ha-control-button-group>
              </div>
            `
          : nothing}
      </div>

      ${(supportsFanSpeed && stateObj.attributes.fan_speed_list) ||
      supportsCleanArea
        ? html`
            <ha-more-info-control-select-container>
              ${supportsFanSpeed && stateObj.attributes.fan_speed_list
                ? html`
                    <ha-control-select-menu
                      .hass=${this.hass}
                      .label=${this.hass.formatEntityAttributeName(
                        stateObj,
                        "fan_speed"
                      )}
                      .value=${stateObj.attributes.fan_speed}
                      .disabled=${isUnavailable}
                      @wa-select=${this._handleFanSpeedChanged}
                      .options=${stateObj.attributes.fan_speed_list.map(
                        (mode) => ({
                          value: mode,
                          label: this.hass.formatEntityAttributeValue(
                            stateObj,
                            "fan_speed",
                            mode
                          ),
                        })
                      )}
                    >
                      <ha-svg-icon slot="icon" .path=${mdiFan}></ha-svg-icon>
                    </ha-control-select-menu>
                  `
                : nothing}
              ${supportsCleanArea
                ? html`
                    <button
                      class="clean-areas-button"
                      ?disabled=${isUnavailable}
                      @click=${this._handleCleanAreas}
                    >
                      <div class="icon">
                        <ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>
                      </div>
                      <div class="content">
                        <p class="label">
                          ${this.hass.localize(
                            "ui.dialogs.more_info_control.vacuum.cleaning"
                          )}
                        </p>
                        <p class="value">
                          ${this.hass.localize(
                            "ui.dialogs.more_info_control.vacuum.by_area"
                          )}
                        </p>
                      </div>
                      <div class="icon">
                        <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
                      </div>
                    </button>
                  `
                : nothing}
            </ha-more-info-control-select-container>
          `
        : nothing}
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        .battery {
          display: inline-flex;
          align-items: center;
          gap: var(--ha-space-1);
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }

        .battery ha-battery-icon,
        .battery ha-icon {
          --mdc-icon-size: 18px;
        }

        ha-state-control-vacuum-status {
          margin-bottom: var(--ha-space-4);
        }

        ha-control-button-group {
          --control-button-group-thickness: 48px;
          justify-content: center;
        }

        ha-control-button-group ha-control-button {
          flex: 0 0 auto;
          width: var(--control-button-group-thickness);
          --control-button-border-radius: var(--ha-border-radius-lg);
        }

        .clean-areas-button {
          --mdc-icon-size: 20px;
          position: relative;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
          width: auto;
          max-width: 100%;
          height: 48px;
          padding: 6px 10px;
          border: none;
          border-radius: var(--ha-border-radius-lg);
          background: none;
          color: var(--primary-text-color);
          font-family: inherit;
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: 1.4;
          letter-spacing: 0.25px;
          text-align: left;
          cursor: pointer;
          overflow: hidden;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
          z-index: 0;
          transition: box-shadow 180ms ease-in-out;
        }
        .clean-areas-button::before {
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--disabled-color);
          opacity: 0.2;
          transition:
            background-color 180ms ease-in-out,
            opacity 180ms ease-in-out;
        }
        .clean-areas-button:hover::before {
          background-color: var(--ha-color-on-neutral-quiet);
        }
        .clean-areas-button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--secondary-text-color);
        }
        .clean-areas-button[disabled] {
          cursor: not-allowed;
          color: var(--disabled-color);
        }
        .clean-areas-button .icon {
          display: flex;
          --mdc-icon-size: 20px;
        }
        .clean-areas-button .content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .clean-areas-button .content p {
          margin: 0;
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .clean-areas-button .label {
          font-size: var(--ha-font-size-s);
          letter-spacing: 0.4px;
        }
        .clean-areas-button .value {
          font-size: var(--ha-font-size-m);
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
