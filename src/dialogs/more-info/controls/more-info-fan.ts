import {
  mdiCreation,
  mdiFan,
  mdiFanOff,
  mdiPower,
  mdiRotateLeft,
  mdiRotateRight,
} from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import {
  computeAttributeNameDisplay,
  computeAttributeValueDisplay,
} from "../../../common/entity/compute_attribute_display";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import "../../../components/ha-outlined-icon-button";
import { UNAVAILABLE } from "../../../data/entity";
import {
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
  FanEntity,
  FanEntityFeature,
  computeFanSpeedCount,
  computeFanSpeedStateDisplay,
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

  _handlePresetMode(ev) {
    const newVal = ev.target.value;
    const oldVal = this._presetMode;

    if (!newVal || oldVal === newVal) return;

    this._presetMode = newVal;
    this.hass.callService("fan", "set_preset_mode", {
      entity_id: this.stateObj!.entity_id,
      preset_mode: newVal,
    });
  }

  _handleOscillating(ev) {
    const newVal = ev.target.value === "yes";

    this.hass.callService("fan", "oscillate", {
      entity_id: this.stateObj!.entity_id,
      oscillating: newVal,
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
        ${supportsSpeed
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
            `}
        ${supportSpeedPercentage || supportsDirection
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
            </div> `
          : nothing}
      </div>
      <div class="secondary-controls">
        <div class="secondary-controls-scroll">
          ${supportsPresetMode && this.stateObj.attributes.preset_modes
            ? html`
                <ha-control-select-menu
                  .label=${computeAttributeNameDisplay(
                    this.hass.localize,
                    this.stateObj,
                    this.hass.entities,
                    "preset_mode"
                  )}
                  .value=${this.stateObj.attributes.preset_mode}
                  fixedMenuPosition
                  naturalMenuWidth
                  @selected=${this._handlePresetMode}
                  @closed=${stopPropagation}
                >
                  <ha-svg-icon slot="icon" .path=${mdiCreation}></ha-svg-icon>
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
                </ha-control-select-menu>
              `
            : nothing}
          ${supportsOscillate
            ? html`
                <ha-control-select-menu
                  .label=${computeAttributeNameDisplay(
                    this.hass.localize,
                    this.stateObj,
                    this.hass.entities,
                    "oscillating"
                  )}
                  .value=${this.stateObj.attributes.oscillating ? "yes" : "no"}
                  fixedMenuPosition
                  naturalMenuWidth
                  @selected=${this._handleOscillating}
                  @closed=${stopPropagation}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${this.stateObj.attributes.oscillating
                      ? haOscillating
                      : haOscillatingOff}
                  ></ha-svg-icon>
                  <ha-list-item .value=${"yes"} graphic="icon">
                    <ha-svg-icon
                      slot="graphic"
                      .path=${haOscillating}
                    ></ha-svg-icon>
                    ${this.hass.localize("ui.common.yes")}
                  </ha-list-item>
                  <ha-list-item .value=${"no"} graphic="icon">
                    <ha-svg-icon
                      slot="graphic"
                      .path=${haOscillatingOff}
                    ></ha-svg-icon>
                    ${this.hass.localize("ui.common.no")}
                  </ha-list-item>
                </ha-control-select-menu>
              `
            : nothing}
        </div>
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
