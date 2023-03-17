import "@material/web/iconbutton/outlined-icon-button";
import {
  mdiAutorenew,
  mdiAutorenewOff,
  mdiFan,
  mdiFanOff,
  mdiPower,
  mdiRotateLeft,
  mdiRotateRight,
} from "@mdi/js";
import { CSSResultGroup, html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import {
  computeAttributeNameDisplay,
  computeAttributeValueDisplay,
} from "../../../common/entity/compute_attribute_display";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import { UNAVAILABLE } from "../../../data/entity";
import { FanEntity, FanEntityFeature } from "../../../data/fan";
import { forwardHaptic } from "../../../data/haptics";
import type { HomeAssistant } from "../../../types";
import {
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
  getFanSpeedCount,
} from "../components/fan/ha-more-info-fan-speed";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";
import "../components/ha-more-info-toggle";

@customElement("more-info-fan")
class MoreInfoFan extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: FanEntity;

  private _toggle = () => {
    const service = this.stateObj?.state === "on" ? "turn_off" : "turn_on";
    forwardHaptic("light");
    this.hass.callService("fan", service, {
      entity_id: this.stateObj!.entity_id,
    });
  };

  _setReverseDirection() {
    this.hass.callService("fan", "set_direction", {
      entity_id: this.stateObj!.entity_id,
      direction: "reverse",
    });
  }

  _setForwardDirection() {
    this.hass.callService("fan", "set_direction", {
      entity_id: this.stateObj!.entity_id,
      direction: "forward",
    });
  }

  _toggleOscillate() {
    const oscillating = this.stateObj!.attributes.oscillating;
    this.hass.callService("fan", "oscillate", {
      entity_id: this.stateObj!.entity_id,
      oscillating: !oscillating,
    });
  }

  _handlePresetMode(ev) {
    const oldVal = this.stateObj!.attributes.preset_mode;
    const newVal = ev.target.value;

    if (!newVal || oldVal === newVal) return;

    this.hass.callService("fan", "set_preset_mode", {
      entity_id: this.stateObj!.entity_id,
      preset_mode: newVal,
    });
  }

  protected render(): TemplateResult | null {
    if (!this.hass || !this.stateObj) {
      return null;
    }

    const supportsSpeed = supportsFeature(
      this.stateObj,
      FanEntityFeature.SET_SPEED
    );

    const supportsDirection = supportsFeature(
      this.stateObj,
      FanEntityFeature.DIRECTION
    );
    const supportsOscillate = supportsFeature(
      this.stateObj,
      FanEntityFeature.OSCILLATE
    );
    const supportsPresetMode = supportsFeature(
      this.stateObj,
      FanEntityFeature.PRESET_MODE
    );

    const supportSpeedPercentage =
      supportsSpeed &&
      getFanSpeedCount(this.stateObj) > FAN_SPEED_COUNT_MAX_FOR_BUTTONS;

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls">
        ${
          supportsSpeed
            ? html`
                <ha-more-info-fan-speed
                  .stateObj=${this.stateObj}
                  .hass=${this.hass}
                >
                </ha-more-info-fan-speed>
              `
            : html`
                <ha-more-info-toggle
                  .stateObj=${this.stateObj}
                  .hass=${this.hass}
                  .iconPathOn=${mdiFan}
                  .iconPathOff=${mdiFanOff}
                ></ha-more-info-toggle>
              `
        }
        ${
          supportSpeedPercentage || supportsDirection || supportsOscillate
            ? html`<div class="buttons">
                ${supportSpeedPercentage
                  ? html`
                      <md-outlined-icon-button
                        .disabled=${this.stateObj.state === UNAVAILABLE}
                        @click=${this._toggle}
                      >
                        <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
                      </md-outlined-icon-button>
                    `
                  : null}
                ${supportsDirection
                  ? html`
                      <md-outlined-icon-button
                        .disabled=${this.stateObj.state === UNAVAILABLE ||
                        this.stateObj.attributes.direction === "reverse"}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.fan.set_reverse_direction"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.fan.set_reverse_direction"
                        )}
                        @click=${this._setReverseDirection}
                      >
                        <ha-svg-icon .path=${mdiRotateLeft}></ha-svg-icon>
                      </md-outlined-icon-button>
                      <md-outlined-icon-button
                        .disabled=${this.stateObj.state === UNAVAILABLE ||
                        this.stateObj.attributes.direction === "forward"}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.fan.set_forward_direction"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.fan.set_forward_direction"
                        )}
                        @click=${this._setForwardDirection}
                      >
                        <ha-svg-icon .path=${mdiRotateRight}></ha-svg-icon>
                      </md-outlined-icon-button>
                    `
                  : nothing}
                ${supportsOscillate
                  ? html`
                      <md-outlined-icon-button
                        .disabled=${this.stateObj.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          `ui.dialogs.more_info_control.fan.${
                            this.stateObj.attributes.oscillating
                              ? "turn_off_oscillating"
                              : "turn_on_oscillating"
                          }`
                        )}
                        .ariaLabel=${this.hass.localize(
                          `ui.dialogs.more_info_control.fan.${
                            this.stateObj.attributes.oscillating
                              ? "turn_off_oscillating"
                              : "turn_on_oscillating"
                          }`
                        )}
                        @click=${this._toggleOscillate}
                      >
                        <ha-svg-icon
                          .path=${this.stateObj.attributes.oscillating
                            ? mdiAutorenew
                            : mdiAutorenewOff}
                        ></ha-svg-icon>
                      </md-outlined-icon-button>
                    `
                  : nothing}
              </div> `
            : nothing
        }
          ${
            supportsPresetMode && this.stateObj.attributes.preset_modes
              ? html`
                  <ha-select
                    outlined
                    .label=${computeAttributeNameDisplay(
                      this.hass.localize,
                      this.stateObj,
                      this.hass.entities,
                      "preset_mode"
                    )}
                    .value=${this.stateObj.attributes.preset_mode ?? ""}
                    @selected=${this._handlePresetMode}
                    fixedMenuPosition
                    naturalMenuWidth
                    @closed=${stopPropagation}
                    .disabled=${this.stateObj.state === UNAVAILABLE}
                  >
                    ${this.stateObj.attributes.preset_modes?.map(
                      (mode) =>
                        html`
                          <ha-list-item value=${mode}>
                            ${computeAttributeValueDisplay(
                              this.hass.localize,
                              this.stateObj!,
                              this.hass.locale,
                              this.hass.entities,
                              "preset_mode",
                              mode
                            )}
                          </ha-list-item>
                        `
                    )}
                  </ha-select>
                `
              : nothing
          }
        </div>
        <ha-attributes
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          extra-filters="percentage_step,speed,preset_mode,preset_modes,speed_list,percentage,oscillating,direction"
        ></ha-attributes>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return moreInfoControlStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-fan": MoreInfoFan;
  }
}
