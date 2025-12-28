import {
  mdiArrowOscillating,
  mdiArrowOscillatingOff,
  mdiFan,
  mdiFanOff,
  mdiPower,
  mdiTuneVariant,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import "../../../components/ha-outlined-icon-button";
import { UNAVAILABLE } from "../../../data/entity";
import type { FanEntity } from "../../../data/fan";
import {
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
  FanEntityFeature,
  computeFanSpeedCount,
  computeFanSpeedStateDisplay,
} from "../../../data/fan";
import { forwardHaptic } from "../../../data/haptics";
import "../../../state-control/fan/ha-state-control-fan-speed";
import "../../../state-control/ha-state-control-toggle";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-control-select-container";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

@customElement("more-info-fan")
class MoreInfoFan extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: FanEntity;

  @state() public _presetMode?: string;

  private _toggle = () => {
    const service = this.stateObj?.state === "on" ? "turn_off" : "turn_on";
    forwardHaptic(this, "light");
    this.hass.callService("fan", service, {
      entity_id: this.stateObj!.entity_id,
    });
  };

  private _handleDirection(ev) {
    const newVal = ev.target.value;
    const oldVal = this.stateObj?.attributes.direction;

    if (!newVal || oldVal === newVal) return;

    this.hass.callService("fan", "set_direction", {
      entity_id: this.stateObj!.entity_id,
      direction: newVal,
    });
  }

  private _handlePresetMode(ev) {
    const newVal = ev.target.value;
    const oldVal = this._presetMode;

    if (!newVal || oldVal === newVal) return;

    this._presetMode = newVal;
    this.hass.callService("fan", "set_preset_mode", {
      entity_id: this.stateObj!.entity_id,
      preset_mode: newVal,
    });
  }

  private _handleOscillating(ev) {
    const newVal = ev.target.value === "true";
    const oldVal = this.stateObj?.attributes.oscillating;

    if (oldVal === newVal) return;

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
    const stateDisplay = this.hass.formatEntityState(this.stateObj!);

    const positionStateDisplay = computeFanSpeedStateDisplay(
      this.stateObj!,
      this.hass
    );

    if (positionStateDisplay && stateActive(this.stateObj!)) {
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
              <ha-state-control-fan-speed
                .stateObj=${this.stateObj}
                .hass=${this.hass}
              >
              </ha-state-control-fan-speed>
            `
          : html`
              <ha-state-control-toggle
                .stateObj=${this.stateObj}
                .hass=${this.hass}
                .iconPathOn=${mdiFan}
                .iconPathOff=${mdiFanOff}
              ></ha-state-control-toggle>
            `}
        ${supportSpeedPercentage
          ? html`
              <div class="buttons">
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
              </div>
            `
          : nothing}
      </div>
      <ha-more-info-control-select-container>
        ${supportsPresetMode && this.stateObj.attributes.preset_modes
          ? html`
              <ha-control-select-menu
                .label=${this.hass.formatEntityAttributeName(
                  this.stateObj,
                  "preset_mode"
                )}
                .value=${this.stateObj.attributes.preset_mode}
                .disabled=${this.stateObj.state === UNAVAILABLE}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handlePresetMode}
                @closed=${stopPropagation}
              >
                ${this.stateObj.attributes.preset_mode
                  ? html`<ha-attribute-icon
                      slot="icon"
                      .hass=${this.hass}
                      .stateObj=${this.stateObj}
                      attribute="preset_mode"
                      .attributeValue=${this.stateObj.attributes.preset_mode}
                    ></ha-attribute-icon>`
                  : html`
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiTuneVariant}
                      ></ha-svg-icon>
                    `}
                ${this.stateObj.attributes.preset_modes?.map(
                  (mode) => html`
                    <ha-list-item .value=${mode} graphic="icon">
                      <ha-attribute-icon
                        slot="graphic"
                        .hass=${this.hass}
                        .stateObj=${this.stateObj}
                        attribute="preset_mode"
                        .attributeValue=${mode}
                      ></ha-attribute-icon>
                      ${this.hass.formatEntityAttributeValue(
                        this.stateObj!,
                        "preset_mode",
                        mode
                      )}
                    </ha-list-item>
                  `
                )}
              </ha-control-select-menu>
            `
          : nothing}
        ${supportsDirection
          ? html`
              <ha-control-select-menu
                .label=${this.hass.formatEntityAttributeName(
                  this.stateObj,
                  "direction"
                )}
                .value=${this.stateObj.attributes.direction}
                .disabled=${this.stateObj.state === UNAVAILABLE}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleDirection}
                @closed=${stopPropagation}
              >
                <ha-attribute-icon
                  slot="icon"
                  .hass=${this.hass}
                  .stateObj=${this.stateObj}
                  attribute="direction"
                  .attributeValue=${this.stateObj.attributes.direction}
                ></ha-attribute-icon>
                <ha-list-item value="forward" graphic="icon">
                  <ha-attribute-icon
                    slot="graphic"
                    .hass=${this.hass}
                    .stateObj=${this.stateObj}
                    attribute="direction"
                    attributeValue="forward"
                  ></ha-attribute-icon>
                  ${this.hass.formatEntityAttributeValue(
                    this.stateObj,
                    "direction",
                    "forward"
                  )}
                </ha-list-item>
                <ha-list-item value="reverse" graphic="icon">
                  <ha-attribute-icon
                    slot="graphic"
                    .hass=${this.hass}
                    .stateObj=${this.stateObj}
                    attribute="direction"
                    attributeValue="reverse"
                  ></ha-attribute-icon>
                  ${this.hass.formatEntityAttributeValue(
                    this.stateObj,
                    "direction",
                    "reverse"
                  )}
                </ha-list-item>
              </ha-control-select-menu>
            `
          : nothing}
        ${supportsOscillate
          ? html`
              <ha-control-select-menu
                .label=${this.hass.formatEntityAttributeName(
                  this.stateObj,
                  "oscillating"
                )}
                .value=${this.stateObj.attributes.oscillating
                  ? "true"
                  : "false"}
                .disabled=${this.stateObj.state === UNAVAILABLE}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleOscillating}
                @closed=${stopPropagation}
              >
                <ha-svg-icon
                  slot="icon"
                  .path=${mdiArrowOscillatingOff}
                ></ha-svg-icon>
                <ha-list-item value="true" graphic="icon">
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiArrowOscillating}
                  ></ha-svg-icon>
                  ${this.hass.formatEntityAttributeValue(
                    this.stateObj,
                    "oscillating",
                    true
                  )}
                </ha-list-item>
                <ha-list-item value="false" graphic="icon">
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiArrowOscillatingOff}
                  ></ha-svg-icon>
                  ${this.hass.formatEntityAttributeValue(
                    this.stateObj,
                    "oscillating",
                    false
                  )}
                </ha-list-item>
              </ha-control-select-menu>
            `
          : nothing}
      </ha-more-info-control-select-container>
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
