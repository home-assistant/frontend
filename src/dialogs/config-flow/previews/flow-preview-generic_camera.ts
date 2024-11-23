import { html } from "lit";
import { customElement } from "lit/decorators";
import { FlowPreviewGeneric } from "./flow-preview-generic";
import "../../../components/ha-hls-player";

@customElement("flow-preview-generic_camera")
class FlowPreviewGenericCamera extends FlowPreviewGeneric {
  protected override render() {
    if (!this._preview) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }

    const stillUrl = this._preview.attributes.still_url;
    const streamUrl = this._preview.attributes.stream_url;

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
