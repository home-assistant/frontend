import "@material/mwc-list/mwc-list-item";
import "@material/web/iconbutton/outlined-icon-button";
import { mdiPalette, mdiShimmer } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-button-menu";
import "../../../components/ha-select";
import {
  LightColorMode,
  LightEntity,
  LightEntityFeature,
  lightSupportsBrightness,
  lightSupportsColor,
  lightSupportsColorMode,
} from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-light-brightness";
import { showLightColorPickerDialog } from "../components/lights/show-dialog-light-color-picker";

@customElement("more-info-light")
class MoreInfoLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const supportsColorTemp = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.COLOR_TEMP
    );

    const supportsColor = lightSupportsColor(this.stateObj);

    const supportsBrightness = lightSupportsBrightness(this.stateObj);

    const supportsEffects = supportsFeature(
      this.stateObj,
      LightEntityFeature.EFFECT
    );

    return html`
      <div class="content">
        ${supportsBrightness
          ? html`
              <ha-more-info-light-brightness
                .stateObj=${this.stateObj}
                .hass=${this.hass}
              >
              </ha-more-info-light-brightness>
            `
          : ""}
        ${supportsColorTemp || supportsColor || supportsEffects
          ? html`
              <div class="buttons">
                ${supportsColorTemp || supportsColor
                  ? html`
                      <md-outlined-icon-button
                        .title=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color"
                        )}
                        .ariaLabel=${this.hass.localize(
                          "ui.dialogs.more_info_control.light.change_color"
                        )}
                        @click=${this._showLightColorPickerDialog}
                      >
                        <ha-svg-icon .path=${mdiPalette}></ha-svg-icon>
                      </md-outlined-icon-button>
                    `
                  : null}
                ${supportsEffects
                  ? html`
                      <ha-button-menu
                        corner="BOTTOM_START"
                        @action=${this._handleEffectButton}
                        @closed=${stopPropagation}
                        fixed
                      >
                        <md-outlined-icon-button
                          slot="trigger"
                          .title=${this.hass.localize(
                            "ui.dialogs.more_info_control.light.select_effect"
                          )}
                          .ariaLabel=${this.hass.localize(
                            "ui.dialogs.more_info_control.light.select_effect"
                          )}
                        >
                          <ha-svg-icon .path=${mdiShimmer}></ha-svg-icon>
                        </md-outlined-icon-button>
                        ${this.stateObj.attributes.effect_list!.map(
                          (effect: string) => html`
                            <mwc-list-item
                              .value=${effect}
                              .activated=${this.stateObj!.attributes.effect ===
                              effect}
                            >
                              ${effect}
                            </mwc-list-item>
                          `
                        )}
                      </ha-button-menu>
                    `
                  : null}
              </div>
            `
          : null}
        <ha-attributes
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          extra-filters="brightness,color_temp,color_temp_kelvin,white_value,effect_list,effect,hs_color,rgb_color,rgbw_color,rgbww_color,xy_color,min_mireds,max_mireds,min_color_temp_kelvin,max_color_temp_kelvin,entity_id,supported_color_modes,color_mode"
        ></ha-attributes>
      </div>
    `;
  }

  private _showLightColorPickerDialog = () => {
    showLightColorPickerDialog(this, { entityId: this.stateObj!.entity_id });
  };

  private _handleEffectButton(ev) {
    ev.stopPropagation();
    ev.preventDefault();

    const index = ev.detail.index;
    const effect = this.stateObj!.attributes.effect_list![index];

    if (!effect || this.stateObj!.attributes.effect === effect) {
      return;
    }

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      effect,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      .content {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .content > * {
        width: 100%;
      }

      .buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
      }
      .buttons > * {
        margin: 4px;
      }

      ha-more-info-light-brightness {
        margin-bottom: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-light": MoreInfoLight;
  }
}
