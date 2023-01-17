import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
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
        ${supportsColorTemp || supportsColor
          ? html`<div class="color-container">
              <mwc-button @click=${this._showLightColorPickerDialog}
                >Choose color</mwc-button
              >
            </div>`
          : null}
        ${supportsFeature(this.stateObj, LightEntityFeature.EFFECT) &&
        this.stateObj!.attributes.effect_list?.length
          ? html`
              <hr />
              <ha-select
                .label=${this.hass.localize("ui.card.light.effect")}
                .value=${this.stateObj.attributes.effect || ""}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._effectChanged}
                @closed=${stopPropagation}
              >
                ${this.stateObj.attributes.effect_list.map(
                  (effect: string) => html`
                    <mwc-list-item .value=${effect}>${effect}</mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}
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

  private _effectChanged(ev) {
    const newVal = ev.target.value;

    if (!newVal || this.stateObj!.attributes.effect === newVal) {
      return;
    }

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      effect: newVal,
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

      .color-container {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      hr {
        border-color: var(--divider-color);
        border-bottom: none;
        margin: 16px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-light": MoreInfoLight;
  }
}
