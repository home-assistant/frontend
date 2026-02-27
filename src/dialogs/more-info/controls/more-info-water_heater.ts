import { mdiAccount, mdiAccountArrowRight, mdiWaterBoiler } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select-menu";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-list-item";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { WaterHeaterEntity } from "../../../data/water_heater";
import {
  WaterHeaterEntityFeature,
  compareWaterHeaterOperationMode,
} from "../../../data/water_heater";
import "../../../state-control/water_heater/ha-state-control-water_heater-temperature";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-control-select-container";
import { moreInfoControlStyle } from "../components/more-info-control-style";

@customElement("more-info-water_heater")
class MoreInfoWaterHeater extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: WaterHeaterEntity;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;

    const supportOperationMode = supportsFeature(
      stateObj,
      WaterHeaterEntityFeature.OPERATION_MODE
    );

    const supportAwayMode = supportsFeature(
      stateObj,
      WaterHeaterEntityFeature.AWAY_MODE
    );

    const currentTemperature = this.stateObj.attributes.current_temperature;

    return html`
      <div class="current">
        ${currentTemperature != null
          ? html`
              <div>
                <p class="label">
                  ${this.hass.formatEntityAttributeName(
                    this.stateObj,
                    "current_temperature"
                  )}
                </p>
                <p class="value">
                  ${this.hass.formatEntityAttributeValue(
                    this.stateObj,
                    "current_temperature"
                  )}
                </p>
              </div>
            `
          : nothing}
      </div>
      <div class="controls">
        <ha-state-control-water_heater-temperature
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-state-control-water_heater-temperature>
      </div>
      <ha-more-info-control-select-container>
        ${supportOperationMode && stateObj.attributes.operation_list
          ? html`
              <ha-control-select-menu
                .hass=${this.hass}
                .label=${this.hass.localize("ui.card.water_heater.mode")}
                .value=${stateObj.state}
                .disabled=${stateObj.state === UNAVAILABLE}
                @wa-select=${this._handleOperationModeChanged}
                .options=${stateObj.attributes.operation_list
                  .concat()
                  .sort(compareWaterHeaterOperationMode)
                  .map((mode) => ({
                    value: mode,
                    label: this.hass.formatEntityState(stateObj, mode),
                    attributeIcon: {
                      stateObj,
                      attribute: "operation_mode",
                      attributeValue: mode,
                    },
                  }))}
              >
                <ha-svg-icon slot="icon" .path=${mdiWaterBoiler}></ha-svg-icon>
              </ha-control-select-menu>
            `
          : nothing}
        ${supportAwayMode
          ? html`
              <ha-control-select-menu
                .label=${this.hass.formatEntityAttributeName(
                  stateObj,
                  "away_mode"
                )}
                .value=${stateObj.attributes.away_mode}
                .disabled=${stateObj.state === UNAVAILABLE}
                @wa-select=${this._handleAwayModeChanged}
                .options=${["on", "off"].map((mode) => ({
                  value: mode,
                  label: this.hass.formatEntityAttributeValue(
                    stateObj,
                    "away_mode",
                    mode
                  ),
                  iconPath: mode === "on" ? mdiAccountArrowRight : mdiAccount,
                }))}
              >
                <ha-svg-icon slot="icon" .path=${mdiAccount}></ha-svg-icon>
              </ha-control-select-menu>
            `
          : nothing}
      </ha-more-info-control-select-container>
    `;
  }

  private _handleOperationModeChanged(ev: HaDropdownSelectEvent) {
    const newVal = ev.detail.item.value;
    this._callServiceHelper(
      this.stateObj!.state,
      newVal,
      "set_operation_mode",
      {
        operation_mode: newVal,
      }
    );
  }

  private _handleAwayModeChanged(ev: HaDropdownSelectEvent) {
    const newVal = ev.detail.item.value === "on";
    const oldVal = this.stateObj!.attributes.away_mode === "on";

    this._callServiceHelper(oldVal, newVal, "set_away_mode", {
      away_mode: newVal,
    });
  }

  private async _callServiceHelper(
    oldVal: unknown,
    newVal: unknown,
    service: string,
    data: {
      entity_id?: string;
      [key: string]: unknown;
    }
  ) {
    if (oldVal === newVal) {
      return;
    }

    data.entity_id = this.stateObj!.entity_id;
    const curState = this.stateObj;

    await this.hass.callService("water_heater", service, data);

    // We reset stateObj to re-sync the inputs with the state. It will be out
    // of sync if our service call did not result in the entity to be turned
    // on. Since the state is not changing, the resync is not called automatic.
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    // No need to resync if we received a new state.
    if (this.stateObj !== curState) {
      return;
    }

    this.stateObj = undefined;
    await this.updateComplete;
    // Only restore if not set yet by a state change
    if (this.stateObj === undefined) {
      this.stateObj = curState;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        :host {
          color: var(--primary-text-color);
        }

        .current {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          text-align: center;
          margin-bottom: var(--ha-space-10);
        }

        .current div {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          flex: 1;
        }

        .current p {
          margin: 0;
          text-align: center;
          color: var(--primary-text-color);
        }

        .current .label {
          opacity: 0.8;
          font-size: var(--ha-font-size-m);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.4px;
          margin-bottom: var(--ha-space-1);
        }

        .current .value {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
          direction: ltr;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-water_heater": MoreInfoWaterHeater;
  }
}
