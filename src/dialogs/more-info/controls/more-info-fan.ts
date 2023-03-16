import "@material/web/iconbutton/outlined-icon-button";
import {
  mdiClose,
  mdiFan,
  mdiFanOff,
  mdiPower,
  mdiRotate360,
  mdiRotateLeft,
  mdiRotateRight,
} from "@mdi/js";
import { CSSResultGroup, html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import { UNAVAILABLE } from "../../../data/entity";
import { FanEntity, FanEntityFeature } from "../../../data/fan";
import { forwardHaptic } from "../../../data/haptics";
import type { HomeAssistant } from "../../../types";
import "../components/fan/ha-more-info-fan-percentage";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";
import "../components/ha-more-info-toggle";
import "./more-info-fan-old";

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

  _toggleDirection() {
    const current_direction = this.stateObj!.attributes.direction;
    this.hass.callService("fan", "set_direction", {
      entity_id: this.stateObj!.entity_id,
      direction: current_direction === "forward" ? "reverse" : "forward",
    });
  }

  _toggleOscillate() {
    const oscillating = this.stateObj!.attributes.oscillating;
    this.hass.callService("fan", "oscillate", {
      entity_id: this.stateObj!.entity_id,
      oscillating: !oscillating,
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

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls">
        ${supportsSpeed
          ? html`
              <ha-more-info-fan-percentage
                .stateObj=${this.stateObj}
                .hass=${this.hass}
              >
              </ha-more-info-fan-percentage>
            `
          : html`
              <ha-more-info-toggle
                .stateObj=${this.stateObj}
                .hass=${this.hass}
                .iconPathOn=${mdiFan}
                .iconPathOff=${mdiFanOff}
              ></ha-more-info-toggle>
            `}

        <div class="buttons">
          <md-outlined-icon-button
            .disabled=${this.stateObj.state === UNAVAILABLE}
            @click=${this._toggle}
          >
            <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
          </md-outlined-icon-button>
          ${supportsDirection
            ? html`
                <md-outlined-icon-button
                  .disabled=${this.stateObj.state === UNAVAILABLE}
                  .title=${this.hass.localize(
                    `ui.dialogs.more_info_control.fan.${
                      this.stateObj.attributes.direction === "forward"
                        ? "set_reverse_direction"
                        : "set_forward_direction"
                    }`
                  )}
                  .ariaLabel=${this.hass.localize(
                    `ui.dialogs.more_info_control.fan.${
                      this.stateObj.attributes.direction === "forward"
                        ? "set_reverse_direction"
                        : "set_forward_direction"
                    }`
                  )}
                  @click=${this._toggleDirection}
                >
                  <ha-svg-icon
                    .path=${this.stateObj.attributes.direction === "forward"
                      ? mdiRotateRight
                      : mdiRotateLeft}
                  ></ha-svg-icon>
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
                      ? mdiRotate360
                      : mdiClose}
                  ></ha-svg-icon>
                </md-outlined-icon-button>
              `
            : nothing}
        </div>
      </div>
      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        extra-filters="percentage_step,speed,preset_mode,preset_modes,speed_list,percentage,oscillating,direction"
      ></ha-attributes>
      <more-info-fan-old
        .hass=${this.hass}
        .stateObj=${this.stateObj}
      ></more-info-fan-old>
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
