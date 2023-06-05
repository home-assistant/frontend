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
import { stopPropagation } from "../../../common/dom/stop_propagation";
import {
  computeAttributeNameDisplay,
  computeAttributeValueDisplay,
} from "../../../common/entity/compute_attribute_display";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/ha-attributes";
import "../../../components/ha-button-menu";
import "../../../components/ha-outlined-button";
import "../../../components/ha-outlined-icon-button";
import "../../../components/ha-select";
import { UNAVAILABLE } from "../../../data/entity";
import { ExtEntityRegistryEntry } from "../../../data/entity_registry";
import { forwardHaptic } from "../../../data/haptics";
import {
  LightColorMode,
  LightEntity,
  LightEntityFeature,
  lightSupportsBrightness,
  lightSupportsColor,
  lightSupportsColorMode,
  lightSupportsFavoriteColors,
} from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";
import "../components/ha-more-info-toggle";
import "../components/lights/ha-favorite-color-button";
import "../components/lights/ha-more-info-light-brightness";
import "../components/lights/ha-more-info-light-favorite-colors";
import { showLightColorPickerView } from "../components/lights/show-view-light-color-picker";

@customElement("more-info-light")
class MoreInfoLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _effect?: string;

  @state() private _selectedBrightness?: number;

  private _brightnessChanged(ev) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._selectedBrightness = value;
  }

  protected updated(changedProps: PropertyValues<typeof this>): void {
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

    const supportsBrightness = lightSupportsBrightness(this.stateObj);

    const supportsWhite = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.WHITE
    );

    const supportsEffects = supportsFeature(
      this.stateObj,
      LightEntityFeature.EFFECT
    );

    const hasFavoriteColors =
      this.entry &&
      (this.entry.options?.light?.favorite_colors == null ||
        this.entry.options.light.favorite_colors.length > 0);

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
        ${supportsColorTemp || supportsColor || supportsBrightness
          ? html`
              <div class="button-bar">
                ${supportsBrightness
                  ? html`
                      <ha-icon-button
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.toggle"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.toggle"
                        )}
                        @click=${this._toggle}
                      >
                        <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
                      </ha-icon-button>
                    `
                  : nothing}
                ${supportsColor
                  ? html`
                      <ha-icon-button
                        class="color-mode"
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color"
                        )}
                        .mode=${"color"}
                        @click=${this._showLightColorPickerView}
                      >
                        <span class="wheel color"></span>
                      </ha-icon-button>
                    `
                  : nothing}
                ${supportsColorTemp
                  ? html`
                      <ha-icon-button
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color_temp"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color_temp"
                        )}
                        .mode=${"color_temp"}
                        @click=${this._showLightColorPickerView}
                      >
                        <span class="wheel color-temp"></span>
                      </ha-icon-button>
                    `
                  : nothing}
                ${supportsWhite
                  ? html`
                      <ha-icon-button
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.set_white"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.set_white"
                        )}
                        @click=${this._setWhite}
                      >
                        <ha-svg-icon .path=${mdiFileWordBox}></ha-svg-icon>
                      </ha-icon-button>
                    `
                  : nothing}
              </div>
              ${this.entry &&
              lightSupportsFavoriteColors(this.stateObj) &&
              (this.editMode || hasFavoriteColors)
                ? html`
                    <ha-more-info-light-favorite-colors
                      .hass=${this.hass}
                      .stateObj=${this.stateObj}
                      .entry=${this.entry}
                      .editMode=${this.editMode}
                    >
                    </ha-more-info-light-favorite-colors>
                  `
                : nothing}
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
                  ${this._effect
                    ? computeAttributeValueDisplay(
                        this.hass.localize,
                        this.stateObj!,
                        this.hass.locale,
                        this.hass.entities,
                        "effect",
                        this._effect
                      )
                    : computeAttributeNameDisplay(
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
                      ${computeAttributeValueDisplay(
                        this.hass.localize,
                        this.stateObj!,
                        this.hass.locale,
                        this.hass.entities,
                        "effect",
                        effect
                      )}
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

  private _showLightColorPickerView = (ev) => {
    showLightColorPickerView(
      this,
      this.hass.localize(
        "ui.dialogs.more_info_control.light.color_picker.title"
      ),
      {
        entityId: this.stateObj!.entity_id,
        defaultMode: ev.currentTarget.mode,
      }
    );
  };

  private _setWhite = () => {
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
        .button-bar {
          display: flex;
          flex-direction: row;
          align-items: center;
          height: 48px;
          border-radius: 24px;
          background-color: rgba(139, 145, 151, 0.1);
          box-sizing: border-box;
          width: auto;
        }
        .wheel {
          width: 30px;
          height: 30px;
          flex: none;
          border-radius: 15px;
        }
        ha-icon-button[disabled] .wheel {
          filter: grayscale(1) opacity(0.5);
        }
        .wheel.color {
          background-image: url("/static/images/color_wheel.png");
          background-size: cover;
        }
        .wheel.color-temp {
          background: linear-gradient(
            0,
            rgb(166, 209, 255) 0%,
            white 50%,
            rgb(255, 160, 0) 100%
          );
        }
        .buttons {
          flex-wrap: wrap;
          max-width: 250px;
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
