import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import { LightEntity } from "../../../data/light";
import { HomeAssistant } from "../../../types";
import "./ha-more-info-bar-slider";

@customElement("ha-more-info-light-brightness")
export class HaMoreInfoLightBrightness extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value =
        this.stateObj.attributes.brightness != null
          ? Math.max(
              Math.round((this.stateObj.attributes.brightness * 100) / 255),
              1
            )
          : undefined;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      brightness_pct: value,
    });
  }

  private _sliderMoved(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.value = value;
  }

  private _valueFormatter = (value?: number) => {
    if (value == null)
      return computeStateDisplay(
        this.hass.localize,
        this.stateObj,
        this.hass.locale,
        this.hass.entities
      );
    return `${Math.round(value)}${blankBeforePercent(this.hass!.locale)}%`;
  };

  protected render(): TemplateResult {
    let color = stateColorCss(this.stateObj);

    if (this.stateObj.attributes.rgb_color) {
      const hsvColor = rgb2hsv(this.stateObj.attributes.rgb_color);

      // Modify the real rgb color for better contrast
      if (hsvColor[1] < 0.4) {
        // Special case for very light color (e.g: white)
        if (hsvColor[1] < 0.1) {
          hsvColor[2] = 225;
        } else {
          hsvColor[1] = 0.4;
        }
      }
      color = rgb2hex(hsv2rgb(hsvColor));
    }

    return html`
      <ha-more-info-bar-slider
        show-value
        label=${this.hass.localize("ui.card.light.brightness")}
        min="1"
        max="100"
        .showHandle=${stateActive(this.stateObj)}
        .value=${this.value}
        @value-changed=${this._valueChanged}
        @slider-moved=${this._sliderMoved}
        .valueFormatter=${this._valueFormatter}
        style=${styleMap({
          "--more-info-slider-bar-color": color,
        })}
      >
      </ha-more-info-bar-slider>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-more-info-bar-slider {
        --more-info-slider-bar-height: 250px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-brightness": HaMoreInfoLightBrightness;
  }
}
