import "@material/mwc-list/mwc-list-item";
import {
  mdiBrightness6,
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
import "../components/lights/light-color-rgb-picker";
import "../components/lights/light-color-temp-picker";

declare global {
  interface HASSDomEvents {
    "live-value-changed": { value: string | undefined };
  }
}

type ControlView = "brightness" | "color_temp" | "color";

@customElement("more-info-light")
class MoreInfoLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _effect?: string;

  @state() private _selectedBrightness?: number;

  @state() private _liveValue?: string;

  @state() private _controlView: ControlView = "brightness";

  private _brightnessChanged(ev) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._selectedBrightness = value;
  }

  private _liveValueChanged(ev) {
    this._liveValue = ev.detail.value as string | undefined;
  }

  protected updated(changedProps: PropertyValues<typeof this>): void {
    if (changedProps.has("stateObj")) {
      this._selectedBrightness = this.stateObj?.attributes.brightness
        ? Math.round((this.stateObj.attributes.brightness * 100) / 255)
        : undefined;
      this._effect = this.stateObj?.attributes.effect;
    }
  }

  private setControlView(ev: any) {
    ev.stopPropagation();
    this._controlView = ev.currentTarget.view;
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

    const stateOverride =
      this._liveValue ??
      (this._selectedBrightness
        ? `${Math.round(this._selectedBrightness)}${blankBeforePercent(
            this.hass!.locale
          )}%`
        : undefined);

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .stateOverride=${stateOverride}
      ></ha-more-info-state-header>
      <div class="controls">
        ${!supportsBrightness
          ? html`
              <ha-more-info-toggle
                .stateObj=${this.stateObj}
                .hass=${this.hass}
                .iconPathOn=${mdiLightbulb}
                .iconPathOff=${mdiLightbulbOff}
              ></ha-more-info-toggle>
            `
          : nothing}
        ${supportsColorTemp || supportsColor || supportsBrightness
          ? html`
              ${supportsBrightness && this._controlView === "brightness"
                ? html`
                    <ha-more-info-light-brightness
                      .stateObj=${this.stateObj}
                      .hass=${this.hass}
                      @slider-moved=${this._brightnessChanged}
                    >
                    </ha-more-info-light-brightness>
                  `
                : nothing}
              ${supportsColor && this._controlView === "color"
                ? html`
                    <light-color-rgb-picker
                      .hass=${this.hass}
                      .stateObj=${this.stateObj}
                    >
                    </light-color-rgb-picker>
                  `
                : nothing}
              ${supportsColorTemp && this._controlView === "color_temp"
                ? html`
                    <light-color-temp-picker
                      .hass=${this.hass}
                      .stateObj=${this.stateObj}
                      @live-value-changed=${this._liveValueChanged}
                    >
                    </light-color-temp-picker>
                  `
                : nothing}
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
                      <div class="separator"></div>
                      <ha-icon-button
                        class=${classMap({
                          selected: this._controlView === "brightness",
                        })}
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.brightness"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.brightness"
                        )}
                        .view=${"brightness"}
                        @click=${this.setControlView}
                      >
                        <ha-svg-icon .path=${mdiBrightness6}></ha-svg-icon>
                      </ha-icon-button>
                    `
                  : nothing}
                ${supportsColor
                  ? html`
                      <ha-icon-button
                        class=${classMap({
                          selected: this._controlView === "color",
                        })}
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color"
                        )}
                        .view=${"color"}
                        @click=${this.setControlView}
                      >
                        <span class="wheel color"></span>
                      </ha-icon-button>
                    `
                  : nothing}
                ${supportsColorTemp
                  ? html`
                      <ha-icon-button
                        class=${classMap({
                          selected: this._controlView === "color_temp",
                        })}
                        .disabled=${this.stateObj!.state === UNAVAILABLE}
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color_temp"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color_temp"
                        )}
                        .view=${"color_temp"}
                        @click=${this.setControlView}
                      >
                        <span class="wheel color-temp"></span>
                      </ha-icon-button>
                    `
                  : nothing}
                <div class="separator"></div>
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
                        this.hass.config,
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
                        this.hass.config,
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
        ha-icon-button {
          position: relative;
          transition: color 180ms ease-in-out;
        }
        ha-icon-button.selected {
          color: var(--primary-background-color);
        }
        ha-icon-button *::before {
          opacity: 0;
          transition: opacity 180ms ease-in-out;
          background-color: var(--primary-text-color);
          border-radius: 20px;
          height: 40px;
          width: 40px;
          content: "";
          position: absolute;
          top: -10px;
          left: -10px;
          bottom: -10px;
          right: -10px;
          margin: auto;
          z-index: -1;
          box-sizing: border-box;
        }
        ha-icon-button .wheel::before {
          background-color: transparent;
          border: 2px solid var(--primary-text-color);
        }
        .wheel {
          width: 30px;
          height: 30px;
          flex: none;
          border-radius: 15px;
        }
        ha-icon-button.selected *::before {
          opacity: 1;
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
        .separator {
          background-color: rgba(var(--rgb-primary-text-color), 0.15);
          width: 1px;
          height: 30px;
          margin: 4px;
        }
        .separator:last-child,
        .separator:first-child,
        .separator + .separator {
          display: none;
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
