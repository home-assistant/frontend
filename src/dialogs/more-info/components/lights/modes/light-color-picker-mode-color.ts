import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-hs-color-picker";
import "../../../../../components/ha-icon-button";
import { LightEntity } from "../../../../../data/light";
import { HomeAssistant } from "../../../../../types";
import "../../ha-more-info-bar-slider";

@customElement("light-color-picker-mode-color")
export class LightColorPickerModeColor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() value?: { h: number; s: number };

  protected updated(changedProp: PropertyValues): void {
    if (changedProp.has("stateObj")) {
      this.value = {
        h: this.stateObj!.attributes.hs_color![0],
        s: this.stateObj!.attributes.hs_color![1],
      };
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const value = ev.detail.value;
    this.value = value;
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      hs_color: [value.h, value.s],
    });
  }

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <ha-hs-color-picker
          .throttle=${500}
          .value=${this.value}
          @value-changed=${this._valueChanged}
        ></ha-hs-color-picker>
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

      ha-hs-color-picker {
        padding-top: 52px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "light-color-picker-mode-color": LightColorPickerModeColor;
  }
}
