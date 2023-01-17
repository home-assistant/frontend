import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-icon-button";
import { LightEntity } from "../../../data/light";
import { HomeAssistant } from "../../../types";
import "./ha-more-info-bar-slider";

@customElement("ha-more-info-light-hs")
export class HaMoreInfoLightHS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() value?: { h: number; s: number };

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value = {
        h: this.stateObj!.attributes.hs_color![0],
        s: this.stateObj!.attributes.hs_color![1] / 100,
      };
    }
  }

  private _colorPicked(
    ev: CustomEvent<{
      hs: { h: number; s: number };
      rgb: [number, number, number];
    }>
  ) {
    const value = [ev.detail.hs.h, ev.detail.hs.s * 100];

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      hs_color: value,
    });
  }

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <ha-color-picker
          class="color"
          @colorselected=${this._colorPicked}
          .desiredHsColor=${this.value}
          .throttle=${500}
        >
        </ha-color-picker>
        <p>Color</p>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        position: relative;
        max-height: 500px;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }

      ha-color-picker {
        --ha-color-picker-wheel-borderwidth: 5;
        --ha-color-picker-wheel-bordercolor: white;
        --ha-color-picker-wheel-shadow: none;
        --ha-color-picker-marker-borderwidth: 2;
        --ha-color-picker-marker-bordercolor: white;
        height: 320px;
        padding-top: 52px;
      }

      p {
        font-weight: 500;
        font-size: 14px;
        line-height: 20px;
        text-align: center;
        margin: 16px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-hs": HaMoreInfoLightHS;
  }
}
