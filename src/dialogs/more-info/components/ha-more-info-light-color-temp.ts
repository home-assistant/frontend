import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { LightEntity } from "../../../data/light";
import { HomeAssistant } from "../../../types";
import "./ha-more-info-bar-slider";

@customElement("ha-more-info-light-color-temp")
export class HaMoreInfoLightColorTemp extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value = this.stateObj?.attributes?.color_temp_kelvin;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      color_temp_kelvin: value,
    });
  }

  private _sliderMoved(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.value = value;
  }

  private _valueFormatter(value?: number) {
    if (value == null) return "-";
    return `${Math.round(value)}K`;
  }

  protected render(): TemplateResult {
    return html`
      <ha-more-info-bar-slider
        label=${this.hass.localize("ui.card.light.color_temperature")}
        min="1"
        max="100"
        mode="indicator"
        .value=${this.value}
        .valueFormatter=${this._valueFormatter}
        @value-changed=${this._valueChanged}
        @slider-moved=${this._sliderMoved}
        .min=${this.stateObj.attributes.min_color_temp_kelvin!}
        .max=${this.stateObj.attributes.max_color_temp_kelvin!}
      >
      </ha-more-info-bar-slider>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-more-info-bar-slider {
        --more-info-slider-bar-background: -webkit-linear-gradient(
          top,
          rgb(166, 209, 255) 0%,
          white 50%,
          rgb(255, 160, 0) 100%
        );
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-color-temp": HaMoreInfoLightColorTemp;
  }
}
