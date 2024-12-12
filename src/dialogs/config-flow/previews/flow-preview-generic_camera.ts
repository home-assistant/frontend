import { html, nothing } from "lit";
import { customElement } from "lit/decorators";
import { FlowPreviewGeneric } from "./flow-preview-generic";
import "../../../components/ha-hls-player";
import "../../../components/ha-circular-progress";

@customElement("flow-preview-generic_camera")
class FlowPreviewGenericCamera extends FlowPreviewGeneric {
  protected override render() {
    if (!this._preview) {
      return nothing;
    }
    if (this._error) {
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
          <ha-circular-progress
            class="render-spinner"
            id="hls-load-spinner"
            indeterminate
            size="large"
          ></ha-circular-progress>
          <ha-hls-player
            autoplay
            playsinline
            .hass=${this.hass}
            .url=${streamUrl}
          ></ha-hls-player>`
      : ""}`;
  }

  protected firstUpdated() {
    this.addEventListener("load", () => {
      this.shadowRoot!.getElementById("hls-load-spinner")?.remove();
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "flow-preview-generic_camera": FlowPreviewGenericCamera;
  }
}
