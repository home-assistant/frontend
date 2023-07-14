import {
  mdiCreation,
  mdiFan,
  mdiFanOff,
  mdiPower,
  mdiRotateLeft,
  mdiRotateRight,
} from "@mdi/js";
import { CSSResultGroup, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import {
  computeAttributeNameDisplay,
  computeAttributeValueDisplay,
} from "../../../common/entity/compute_attribute_display";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-outlined-button";
import "../../../components/ha-outlined-icon-button";
import { UNAVAILABLE } from "../../../data/entity";
import {
  computeFanSpeedCount,
  computeFanSpeedStateDisplay,
  FanEntity,
  FanEntityFeature,
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
} from "../../../data/fan";
import { forwardHaptic } from "../../../data/haptics";
import { haOscillating } from "../../../data/icons/haOscillating";
import { haOscillatingOff } from "../../../data/icons/haOscillatingOff";
import type { HomeAssistant } from "../../../types";
import "../components/fan/ha-more-info-fan-speed";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";
import "../components/ha-more-info-toggle";

@customElement("more-info-fan")
class MoreInfoFan extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: FanEntity;

  @state() public _presetMode?: string;

  @state() private _liveSpeed?: number;

  private _speedSliderMoved(ev) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._liveSpeed = value;
  }

  private _speedValueChanged() {
    this._liveSpeed = undefined;
  }

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
    ev.stopPropagation();
    ev.preventDefault();

    const index = ev.detail.index;
    const newVal = this.stateObj!.attributes.preset_modes![index];
    const oldVal = this._presetMode;

    if (!newVal || oldVal === newVal) return;

    this._presetMode = newVal;
    this.hass.callService("fan", "set_preset_mode", {
      entity_id: this.stateObj!.entity_id,
      preset_mode: newVal,
    });
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("stateObj")) {
      this._presetMode = this.stateObj?.attributes.preset_mode;
    }
  }

  private get _stateOverride() {
    const liveValue = this._liveSpeed;

    const forcedState =
      liveValue != null ? (liveValue ? "on" : "off") : undefined;

    const stateDisplay = computeStateDisplay(
      this.hass.localize,
      this.stateObj!,
      this.hass.locale,
      this.hass.config,
      this.hass.entities,
      forcedState
    );

    const positionStateDisplay = computeFanSpeedStateDisplay(
      this.stateObj!,
      this.hass.locale,
      liveValue
    );

    if (positionStateDisplay && (stateActive(this.stateObj!) || liveValue)) {
      return positionStateDisplay;
    }
    return stateDisplay;
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
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
      computeFanSpeedCount(this.stateObj) > FAN_SPEED_COUNT_MAX_FOR_BUTTONS;

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .stateOverride=${this._stateOverride}
      ></ha-more-info-state-header>
      <div class="controls">
        ${
          supportsSpeed
            ? html`
                <ha-more-info-fan-speed
                  .stateObj=${this.stateObj}
                  .hass=${this.hass}
                  @slider-moved=${this._speedSliderMoved}
                  @value-changed=${this._speedValueChanged}
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
                      <ha-outlined-icon-button
                        .disabled=${this.stateObj.state === UNAVAILABLE}
                        @click=${this._toggle}
                      >
                        <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
                      </ha-outlined-icon-button>
                    `
                  : nothing}
                ${supportsDirection
                  ? html`
                      <ha-outlined-icon-button
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
                      </ha-outlined-icon-button>
                      <ha-outlined-icon-button
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
                      </ha-outlined-icon-button>
                    `
                  : nothing}
                ${supportsOscillate
                  ? html`
                      <ha-outlined-icon-button
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
                            ? haOscillating
                            : haOscillatingOff}
                        ></ha-svg-icon>
                      </ha-outlined-icon-button>
                    `
                  : nothing}
              </div> `
            : nothing
        }
          ${
            supportsPresetMode && this.stateObj.attributes.preset_modes
              ? html`
                  <ha-button-menu
                    @action=${this._handlePresetMode}
                    @closed=${stopPropagation}
                    fixed
                    .disabled=${this.stateObj.state === UNAVAILABLE}
                  >
                    <ha-outlined-button
                      slot="trigger"
                      .disabled=${this.stateObj.state === UNAVAILABLE}
                    >
                      ${this._presetMode
                        ? computeAttributeValueDisplay(
                            this.hass.localize,
                            this.stateObj!,
                            this.hass.locale,
                            this.hass.config,
                            this.hass.entities,
                            "preset_mode",
                            this._presetMode
                          )
                        : computeAttributeNameDisplay(
                            this.hass.localize,
                            this.stateObj,
                            this.hass.entities,
                            "preset_mode"
                          )}
                      <ha-svg-icon
                        slot="icon"
                        path=${mdiCreation}
                      ></ha-svg-icon>
                    </ha-outlined-button>
                    ${this.stateObj.attributes.preset_modes?.map(
                      (mode) => html`
                        <ha-list-item
                          .value=${mode}
                          .activated=${this._presetMode === mode}
                        >
                          ${computeAttributeValueDisplay(
                            this.hass.localize,
                            this.stateObj!,
                            this.hass.locale,
                            this.hass.config,
                            this.hass.entities,
                            "preset_mode",
                            mode
                          )}
                        </ha-list-item>
                      `
                    )}
                  </ha-button-menu>
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
