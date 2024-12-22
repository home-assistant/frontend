import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-camera-stream";
import { computeImageUrl, ImageEntity } from "../../../data/image";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-image")
class MoreInfoImage extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ImageEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }
    return html`<img
      alt=${this.stateObj.attributes.friendly_name || this.stateObj.entity_id}
      src=${this.hass.hassUrl(computeImageUrl(this.stateObj))}
    /> `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        text-align: center;
      }
      img {
        max-width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-image": MoreInfoImage;
  }
}
