import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../../../types";
import "./light-color-picker";
import { LightColorPickerViewParams } from "./show-view-light-color-picker";

@customElement("ha-more-info-view-light-color-picker")
class MoreInfoViewLightColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public params?: LightColorPickerViewParams;

  protected render() {
    if (!this.params) {
      return nothing;
    }

    return html`
      <light-color-picker
        .hass=${this.hass}
        .entityId=${this.params.entityId}
        .defaultMode=${this.params.defaultMode}
      >
      </light-color-picker>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          position: relative;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        light-color-picker {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-view-light-color-picker": MoreInfoViewLightColorPicker;
  }
}
