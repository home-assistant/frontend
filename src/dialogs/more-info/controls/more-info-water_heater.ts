import { mdiAccount, mdiAccountArrowRight, mdiWaterBoiler } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import { UNAVAILABLE } from "../../../data/entity";
import {
  WaterHeaterEntity,
  WaterHeaterEntityFeature,
  compareWaterHeaterOperationMode,
  computeOperationModeIcon,
} from "../../../data/water_heater";
import { HomeAssistant } from "../../../types";
import "../components/ha-more-info-control-select-container";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/water_heater/ha-more-info-water_heater-temperature";

@customElement("more-info-water_heater")
class MoreInfoWaterHeater extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: WaterHeaterEntity;

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
        <ha-more-info-water_heater-temperature
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-more-info-water_heater-temperature>
      </div>
      <ha-more-info-control-select-container>
        ${supportOperationMode && stateObj.attributes.operation_list
          ? html`
              <ha-control-select-menu
                .label=${this.hass.localize("ui.card.water_heater.mode")}
                .value=${stateObj.state}
                .disabled=${stateObj.state === UNAVAILABLE}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleOperationModeChanged}
                @closed=${stopPropagation}
              >
                <ha-svg-icon slot="icon" .path=${mdiWaterBoiler}></ha-svg-icon>
                ${stateObj.attributes.operation_list
                  .concat()
                  .sort(compareWaterHeaterOperationMode)
                  .map(
                    (mode) => html`
                      <ha-list-item .value=${mode} graphic="icon">
                        <ha-svg-icon
                          slot="graphic"
                          .path=${computeOperationModeIcon(mode)}
                        ></ha-svg-icon>
                        ${this.hass.formatEntityState(stateObj, mode)}
                      </ha-list-item>
                    `
                  )}
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
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleAwayModeChanged}
                @closed=${stopPropagation}
              >
                <ha-svg-icon slot="icon" .path=${mdiAccount}></ha-svg-icon>
                <ha-list-item value="on" graphic="icon">
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiAccountArrowRight}
                  ></ha-svg-icon>
                  ${this.hass.formatEntityAttributeValue(
                    stateObj,
                    "away_mode",
                    "on"
                  )}
                </ha-list-item>
                <ha-list-item value="off" graphic="icon">
                  <ha-svg-icon slot="graphic" .path=${mdiAccount}></ha-svg-icon>
                  ${this.hass.formatEntityAttributeValue(
                    stateObj,
                    "away_mode",
                    "off"
                  )}
                </ha-list-item>
              </ha-control-select-menu>
            `
          : nothing}
      </ha-more-info-control-select-container>
    `;
  }

  private _handleOperationModeChanged(ev) {
    const newVal = ev.target.value;
    this._callServiceHelper(
      this.stateObj!.state,
      newVal,
      "set_operation_mode",
      {
        operation_mode: newVal,
      }
    );
  }

  private _handleAwayModeChanged(ev) {
    const newVal = ev.target.value === "on";
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
          margin-bottom: 40px;
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
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.4px;
          margin-bottom: 4px;
        }

        .current .value {
          font-size: 22px;
          font-weight: 500;
          line-height: 28px;
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
