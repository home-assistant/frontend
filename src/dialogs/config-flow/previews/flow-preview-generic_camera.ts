import { html } from "lit";
import { customElement } from "lit/decorators";
import { FlowPreviewGeneric } from "./flow-preview-generic";

@customElement("flow-preview-generic_camera")
class FlowPreviewGenericCamera extends FlowPreviewGeneric {
  protected override render() {
    if (!this._preview) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }

    const stillUrl = this._preview.attributes.stillUrl;
    const streamUrl = this._preview.attributes.streamUrl;

    return html` ${stillUrl
      ? html`<p>Still image:</p>
          <p>
            <img src=${stillUrl} alt="Still preview" />
          </p>`
      : ""}
    ${streamUrl
      ? html`<p>Stream:</p>
          <ha-hls-player
            autoplay
            playsinline
            .hass=${this.hass}
            .controls=${false}
            .url=${streamUrl}
            posterUrl="/static/icons/spinner-48x48.svg"
          ></ha-hls-player>`
      : ""}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "flow-preview-generic_camera": FlowPreviewGenericCamera;
  }
}
