import "@material/mwc-list/mwc-list-item";
import {
  mdiCreation,
  mdiFileWordBox,
  mdiLightbulb,
  mdiLightbulbOff,
  mdiPower,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeAttributeNameDisplay } from "../../../common/entity/compute_attribute_display";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/ha-attributes";
import "../../../components/ha-button-menu";
import "../../../components/ha-outlined-button";
import "../../../components/ha-outlined-icon-button";
import "../../../components/ha-select";
import { UNAVAILABLE } from "../../../data/entity";
import { forwardHaptic } from "../../../data/haptics";
import {
  LightColorMode,
  LightEntity,
  LightEntityFeature,
  lightSupportsBrightness,
  lightSupportsColor,
  lightSupportsColorMode,
} from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";
import "../components/ha-more-info-toggle";
import "../components/lights/ha-more-info-light-brightness";
import { showLightColorPickerView } from "../components/lights/show-view-light-color-picker";

@customElement("more-info-light")
class MoreInfoLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  @state() private _effect?: string;

  @state() private _selectedBrightness?: number;

  private _brightnessChanged(ev) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._selectedBrightness = value;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("stateObj")) {
      this._selectedBrightness = this.stateObj?.attributes.brightness
        ? Math.round((this.stateObj.attributes.brightness * 100) / 255)
        : undefined;
      this._effect = this.stateObj?.attributes.effect;
    }
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const supportsColorTemp = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.COLOR_TEMP
    );

    const supportsColor = lightSupportsColor(this.stateObj);

    const supportsWhite = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.WHITE
    );

    const supportsBrightness = lightSupportsBrightness(this.stateObj);

    const supportsEffects = supportsFeature(
      this.stateObj,
      LightEntityFeature.EFFECT
    );

    const stateOverride = this._selectedBrightness
      ? `${Math.round(this._selectedBrightness)}${blankBeforePercent(
          this.hass!.locale
        )}%`
      : undefined;

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .stateOverride=${stateOverride}
      ></ha-more-info-state-header>
      <div class="controls">
        ${supportsBrightness
          ? html`
              <ha-more-info-light-brightness
                .stateObj=${this.stateObj}
                .hass=${this.hass}
                @slider-moved=${this._brightnessChanged}
              >
              </ha-more-info-light-brightness>
            `
          : html`
              <ha-more-info-toggle
                .stateObj=${this.stateObj}
                .hass=${this.hass}
                .iconPathOn=${mdiLightbulb}
                .iconPathOff=${mdiLightbulbOff}
              ></ha-more-info-toggle>
            `}
        ${supportsColorTemp ||
        supportsColor ||
        supportsEffects ||
        supportsBrightness
          ? html`
              <div class="buttons">
                ${supportsBrightness
                  ? html`
                      <ha-outlined-icon-button
                        .disabled=${this.stateObj.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.toggle"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.toggle"
                        )}
                        @click=${this._toggle}
                      >
                        <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
                      </ha-outlined-icon-button>
                    `
                  : nothing}
                ${supportsColorTemp || supportsColor
                  ? html`
                      <ha-outlined-icon-button
                        class=${classMap({
                          "color-rgb-mode": supportsColor,
                          "color-temp-mode": !supportsColor,
                        })}
                        .disabled=${this.stateObj.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color"
                        )}
                        @click=${this._showLightColorPickerView}
                      >
                      </ha-outlined-icon-button>
                    `
                  : nothing}
                ${supportsWhite
                  ? html`
                      <ha-outlined-icon-button
                        .disabled=${this.stateObj.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.set_white"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.set_white"
                        )}
                        @click=${this._setWhiteColor}
                      >
                        <ha-svg-icon .path=${mdiFileWordBox}></ha-svg-icon>
                      </ha-outlined-icon-button>
                    `
                  : nothing}
              </div>
            `
          : nothing}
        ${supportsEffects && this.stateObj.attributes.effect_list
          ? html`
              <ha-button-menu
                @action=${this._handleEffectButton}
                @closed=${stopPropagation}
                fixed
                .disabled=${this.stateObj.state === UNAVAILABLE}
              >
                <ha-outlined-button
                  slot="trigger"
                  .disabled=${this.stateObj.state === UNAVAILABLE}
                >
                  <ha-svg-icon slot="icon" path=${mdiCreation}></ha-svg-icon>
                  ${this._effect ||
                  computeAttributeNameDisplay(
                    this.hass.localize,
                    this.stateObj,
                    this.hass.entities,
                    "effect"
                  )}
                </ha-outlined-button>
                ${this.stateObj.attributes.effect_list.map(
                  (effect: string) => html`
                    <ha-list-item
                      .value=${effect}
                      .activated=${this.stateObj!.attributes.effect === effect}
                    >
                      ${effect}
                    </ha-list-item>
                  `
                )}
              </ha-button-menu>
            `
          : nothing}
      </div>

      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        extra-filters="brightness,color_temp,color_temp_kelvin,white_value,effect_list,effect,hs_color,rgb_color,rgbw_color,rgbww_color,xy_color,min_mireds,max_mireds,min_color_temp_kelvin,max_color_temp_kelvin,entity_id,supported_color_modes,color_mode"
      ></ha-attributes>
    `;
  }

  private _toggle = () => {
    const service = this.stateObj?.state === "on" ? "turn_off" : "turn_on";
    forwardHaptic("light");
    this.hass.callService("light", service, {
      entity_id: this.stateObj!.entity_id,
    });
  };

  private _showLightColorPickerView = () => {
    showLightColorPickerView(
      this,
      this.hass.localize(
        "ui.dialogs.more_info_control.light.color_picker.title"
      ),
      {
        entityId: this.stateObj!.entity_id,
      }
    );
  };

  private _setWhiteColor = () => {
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      white: true,
    });
  };

  private _handleEffectButton(ev) {
    ev.stopPropagation();
    ev.preventDefault();

    const index = ev.detail.index;
    const newVal = this.stateObj!.attributes.effect_list![index];
    const oldVal = this._effect;

    if (!newVal || oldVal === newVal) return;

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      effect: newVal,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        .color-rgb-mode {
          background-image: url("/static/images/color_wheel.png");
          background-size: cover;
          border-radius: 20px;
          --md-sys-color-outline: var(--divider-color);
        }
        .color-temp-mode {
          background: linear-gradient(
            0,
            rgb(255, 160, 0) 0%,
            white 50%,
            rgb(166, 209, 255) 100%
          );
          border-radius: 20px;
          --md-sys-color-outline: var(--divider-color);
        }
        .color-rgb-mode[disabled],
        .color-temp-mode[disabled] {
          filter: grayscale(1) opacity(0.5);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-light": MoreInfoLight;
  }
}
