import { mdiHomeImportOutline, mdiPause, mdiPlay } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { EntityRegistryDisplayEntry } from "../../../data/entity/entity_registry";
import {
  findBatteryChargingEntity,
  findBatteryEntity,
} from "../../../data/entity/entity_registry";
import { forwardHaptic } from "../../../data/haptics";
import type { LawnMowerEntity } from "../../../data/lawn_mower";
import {
  LawnMowerEntityFeature,
  canDock,
  canStartMowing,
  isMowing,
} from "../../../data/lawn_mower";
import "../../../state-control/lawn_mower/ha-state-control-lawn_mower-status";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

@customElement("more-info-lawn_mower")
class MoreInfoLawnMower extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LawnMowerEntity;

  private _deviceEntities = memoizeOne(
    (
      deviceId: string,
      entities: HomeAssistant["entities"]
    ): EntityRegistryDisplayEntry[] => {
      const entries = Object.values(entities);
      return entries.filter((entity) => entity.device_id === deviceId);
    }
  );

  private get _supportsStartPause(): boolean {
    if (!this.stateObj) return false;
    return (
      supportsFeature(this.stateObj, LawnMowerEntityFeature.START_MOWING) ||
      supportsFeature(this.stateObj, LawnMowerEntityFeature.PAUSE)
    );
  }

  private get _startPauseIcon(): string {
    if (!this.stateObj) return mdiPlay;
    return isMowing(this.stateObj) &&
      supportsFeature(this.stateObj, LawnMowerEntityFeature.PAUSE)
      ? mdiPause
      : mdiPlay;
  }

  private get _startPauseLabel(): string {
    if (!this.stateObj || !this.hass) return "";
    return isMowing(this.stateObj) &&
      supportsFeature(this.stateObj, LawnMowerEntityFeature.PAUSE)
      ? this.hass.localize("ui.dialogs.more_info_control.lawn_mower.pause")
      : this.hass.localize(
          "ui.dialogs.more_info_control.lawn_mower.start_mowing"
        );
  }

  private get _startPauseDisabled(): boolean {
    if (!this.stateObj) return true;
    if (this.stateObj.state === UNAVAILABLE) return true;
    if (isMowing(this.stateObj)) return false;
    return !canStartMowing(this.stateObj);
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
            ? nothing
            : html`<span
                >${Number(battery.state).toFixed()}${blankBeforePercent(
                  this.hass.locale
                )}%</span
              >`}
          <ha-battery-icon
            .hass=${this.hass}
            .batteryStateObj=${battery}
            .batteryChargingStateObj=${batteryCharging}
          ></ha-battery-icon>
        </span>
      `;
    }

    return nothing;
  }

  private _handleStartPause() {
    if (!this.stateObj) return;
    forwardHaptic(this, "light");
    if (isMowing(this.stateObj)) {
      this.hass.callService("lawn_mower", "pause", {
        entity_id: this.stateObj.entity_id,
      });
    } else {
      this.hass.callService("lawn_mower", "start_mowing", {
        entity_id: this.stateObj.entity_id,
      });
    }
  }

  private _handleDock() {
    if (!this.stateObj) return;
    forwardHaptic(this, "light");
    this.hass.callService("lawn_mower", "dock", {
      entity_id: this.stateObj.entity_id,
    });
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;
    const isUnavailable = stateObj.state === UNAVAILABLE;
    const supportsDock = supportsFeature(stateObj, LawnMowerEntityFeature.DOCK);

    const hasAnyCommand = this._supportsStartPause || supportsDock;

    return html`
      <ha-more-info-state-header .hass=${this.hass} .stateObj=${this.stateObj}>
        ${this._renderBattery()}
      </ha-more-info-state-header>

      <div class="controls">
        <ha-state-control-lawn_mower-status
          .stateObj=${this.stateObj}
          .hass=${this.hass}
        ></ha-state-control-lawn_mower-status>

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
                  ${supportsDock
                    ? html`
                        <ha-control-button
                          .label=${this.hass.localize(
                            "ui.dialogs.more_info_control.lawn_mower.dock"
                          )}
                          @click=${this._handleDock}
                          .disabled=${isUnavailable || !canDock(stateObj)}
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
      </div>
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
          font-size: var(--ha-font-size-m);
          color: var(--secondary-text-color);
          --mdc-icon-size: 18px;
        }

        .battery span {
          height: var(--mdc-icon-size);
          line-height: var(--mdc-icon-size);
        }

        ha-state-control-lawn_mower-status {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-lawn_mower": MoreInfoLawnMower;
  }
}
