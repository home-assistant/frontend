import {
  mdiBrightness6,
  mdiCreation,
  mdiFileWordBox,
  mdiLightbulbOff,
  mdiLightbulbOn,
  mdiPower,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-attributes";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import "../../../components/ha-list-item";
import { UNAVAILABLE } from "../../../data/entity";
import type { ExtEntityRegistryEntry } from "../../../data/entity_registry";
import { forwardHaptic } from "../../../data/haptics";
import type { LightEntity } from "../../../data/light";
import {
  LightColorMode,
  LightEntityFeature,
  lightSupportsBrightness,
  lightSupportsColor,
  lightSupportsColorMode,
  lightSupportsFavoriteColors,
} from "../../../data/light";
import "../../../state-control/ha-state-control-toggle";
import "../../../state-control/light/ha-state-control-light-brightness";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-control-select-container";
import "../components/ha-more-info-state-header";
import "../components/lights/ha-favorite-color-button";
import "../components/lights/ha-more-info-light-favorite-colors";
import "../components/lights/light-color-rgb-picker";
import "../components/lights/light-color-temp-picker";
import { moreInfoControlStyle } from "../components/more-info-control-style";

type MainControl = "brightness" | "color_temp" | "color";

@customElement("more-info-light")
class MoreInfoLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _effect?: string;

  @state() private _mainControl: MainControl = "brightness";

  protected updated(changedProps: PropertyValues<typeof this>): void {
    if (changedProps.has("stateObj")) {
      this._effect = this.stateObj?.attributes.effect;
    }
  }

  private _setMainControl(ev: any) {
    ev.stopPropagation();
    this._mainControl = ev.currentTarget.control;
  }

  private _resetMainControl(ev: any) {
    ev.stopPropagation();
    this._mainControl = "brightness";
  }

  private get _stateOverride() {
    if (this.stateObj?.attributes.brightness) {
      return this.hass.formatEntityAttributeValue(this.stateObj!, "brightness");
    }
    return undefined;
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

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .stateOverride=${this._stateOverride}
      ></ha-more-info-state-header>
      <div class="controls">
        ${!supportsBrightness
          ? html`
              <ha-state-control-toggle
                .stateObj=${this.stateObj}
                .hass=${this.hass}
                .iconPathOn=${mdiLightbulbOn}
                .iconPathOff=${mdiLightbulbOff}
              ></ha-state-control-toggle>
            `
          : nothing}
        ${supportsColorTemp || supportsColor || supportsBrightness
          ? html`
              ${supportsBrightness && this._mainControl === "brightness"
                ? html`
                    <ha-state-control-light-brightness
                      .stateObj=${this.stateObj}
                      .hass=${this.hass}
                    >
                    </ha-state-control-light-brightness>
                  `
                : nothing}
              ${supportsColor && this._mainControl === "color"
                ? html`
                    <light-color-rgb-picker
                      .hass=${this.hass}
                      .stateObj=${this.stateObj}
                    >
                    </light-color-rgb-picker>
                  `
                : nothing}
              ${supportsColorTemp && this._mainControl === "color_temp"
                ? html`
                    <light-color-temp-picker
                      .hass=${this.hass}
                      .stateObj=${this.stateObj}
                    >
                    </light-color-temp-picker>
                  `
                : nothing}
              <ha-icon-button-group>
                ${supportsBrightness
                  ? html`
                      <ha-icon-button
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .label=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.toggle"
                        )}
                        @click=${this._toggle}
                      >
                        <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
                      </ha-icon-button>
                    `
                  : nothing}
                ${supportsColor || supportsColorTemp
                  ? html`
                      <div class="separator"></div>
                      <ha-icon-button-toggle
                        .selected=${this._mainControl === "brightness"}
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .label=${this.hass.formatEntityAttributeName(
                          this.stateObj,
                          "brightness"
                        )}
                        .control=${"brightness"}
                        @click=${this._setMainControl}
                      >
                        <ha-svg-icon .path=${mdiBrightness6}></ha-svg-icon>
                      </ha-icon-button-toggle>
                    `
                  : nothing}
                ${supportsColor
                  ? html`
                      <ha-icon-button-toggle
                        border-only
                        .selected=${this._mainControl === "color"}
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .label=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.color"
                        )}
                        .control=${"color"}
                        @click=${this._setMainControl}
                      >
                        <span class="wheel color"></span>
                      </ha-icon-button-toggle>
                    `
                  : nothing}
                ${supportsColorTemp
                  ? html`
                      <ha-icon-button-toggle
                        border-only
                        .selected=${this._mainControl === "color_temp"}
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .label=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.color_temp"
                        )}
                        .control=${"color_temp"}
                        @click=${this._setMainControl}
                      >
                        <span class="wheel color-temp"></span>
                      </ha-icon-button-toggle>
                    `
                  : nothing}
                ${supportsWhite
                  ? html`
                      <div class="separator"></div>
                      <ha-icon-button
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .label=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.set_white"
                        )}
                        @click=${this._setWhite}
                      >
                        <ha-svg-icon .path=${mdiFileWordBox}></ha-svg-icon>
                      </ha-icon-button>
                    `
                  : nothing}
              </ha-icon-button-group>
              ${this.entry &&
              lightSupportsFavoriteColors(this.stateObj) &&
              (this.editMode || hasFavoriteColors)
                ? html`
                    <ha-more-info-light-favorite-colors
                      .hass=${this.hass}
                      .stateObj=${this.stateObj}
                      .entry=${this.entry}
                      .editMode=${this.editMode}
                      @favorite-color-edit-started=${this._resetMainControl}
                    >
                    </ha-more-info-light-favorite-colors>
                  `
                : nothing}
            `
          : nothing}
      </div>
      <div>
        <ha-more-info-control-select-container>
          ${supportsEffects && this.stateObj.attributes.effect_list
            ? html`
                <ha-control-select-menu
                  .label=${this.hass.formatEntityAttributeName(
                    this.stateObj,
                    "effect"
                  )}
                  .value=${this.stateObj.attributes.effect}
                  .disabled=${this.stateObj.state === UNAVAILABLE}
                  fixedMenuPosition
                  naturalMenuWidth
                  @selected=${this._handleEffect}
                  @closed=${stopPropagation}
                >
                  ${this.stateObj.attributes.effect
                    ? html`<ha-attribute-icon
                        slot="icon"
                        .hass=${this.hass}
                        .stateObj=${this.stateObj}
                        attribute="effect"
                        .attributeValue=${this.stateObj.attributes.effect}
                      ></ha-attribute-icon>`
                    : html`<ha-svg-icon
                        slot="icon"
                        .path=${mdiCreation}
                      ></ha-svg-icon>`}
                  ${this.stateObj.attributes.effect_list?.map(
                    (effect) => html`
                      <ha-list-item .value=${effect} graphic="icon">
                        <ha-attribute-icon
                          slot="graphic"
                          .hass=${this.hass}
                          .stateObj=${this.stateObj}
                          attribute="effect"
                          .attributeValue=${effect}
                        ></ha-attribute-icon>
                        ${this.hass.formatEntityAttributeValue(
                          this.stateObj!,
                          "effect",
                          effect
                        )}
                      </ha-list-item>
                    `
                  )}
                </ha-control-select-menu>
              `
            : nothing}
        </ha-more-info-control-select-container>
        <ha-attributes
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          extra-filters="brightness,color_temp,color_temp_kelvin,white_value,effect_list,effect,hs_color,rgb_color,rgbw_color,rgbww_color,xy_color,min_mireds,max_mireds,min_color_temp_kelvin,max_color_temp_kelvin,entity_id,supported_color_modes,color_mode"
        ></ha-attributes>
      </div>
    `;
  }

  private _toggle = () => {
    const service = this.stateObj?.state === "on" ? "turn_off" : "turn_on";
    forwardHaptic(this, "light");
    this.hass.callService("light", service, {
      entity_id: this.stateObj!.entity_id,
    });
  };

  private _setWhite = () => {
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      white: true,
    });
  };

  private _handleEffect(ev) {
    const newVal = ev.target.value;
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
        *[disabled] .wheel {
          filter: grayscale(1) opacity(0.5);
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
