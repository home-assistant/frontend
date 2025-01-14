import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import "../../../components/ha-camera-stream";
import type { CameraEntity } from "../../../data/camera";
import type { HomeAssistant } from "../../../types";
import "../../../components/buttons/ha-progress-button";
import { UNAVAILABLE } from "../../../data/entity";
import { fileDownload } from "../../../util/file_download";
import { showToast } from "../../../util/toast";
import { slugify } from "../../../common/string/slugify";

class MoreInfoCamera extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @state() private _attached = false;

  @state() private _waiting = false;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
  }

  protected render() {
    if (!this._attached || !this.stateObj) {
      return nothing;
    }

    return html`
      <ha-camera-stream
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        allow-exoplayer
        controls
      ></ha-camera-stream>

      <div class="actions">
        <ha-progress-button
          @click=${this._downloadSnapshot}
          .progress=${this._waiting}
          .disabled=${this.stateObj.state === UNAVAILABLE}
        >
          ${this.hass.localize(
            "ui.dialogs.more_info_control.camera.download_snapshot"
          )}
        </ha-progress-button>
      </div>
    `;
  }

  private async _downloadSnapshot(ev: CustomEvent) {
    const button = ev.currentTarget as any;
    this._waiting = true;

    try {
      const result: Response | undefined = await this.hass.callApiRaw(
        "GET",
        `camera_proxy/${this.stateObj!.entity_id}`
      );

      if (!result) {
        throw new Error("No response from API");
      }

      const contentType = result.headers.get("content-type");
      const ext = contentType === "image/png" ? "png" : "jpg";
      const date = new Date().toLocaleString();
      const filename = `snapshot_${slugify(this.stateObj!.entity_id)}_${date}.${ext}`;

      const blob = await result.blob();
      const url = window.URL.createObjectURL(blob);
      fileDownload(url, filename);
    } catch (_err) {
      this._waiting = false;
      button.actionError();
      showToast(this, {
        message: this.hass.localize(
          "ui.dialogs.more_info_control.camera.failed_to_download"
        ),
      });
      return;
    }

    this._waiting = false;
    button.actionSuccess();
  }

  static styles = css`
    :host {
      display: block;
    }

    .actions {
      width: 100%;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: flex-end;
      box-sizing: border-box;
      padding: 12px;
      z-index: 1;
      gap: 8px;
    }
  `;
}

customElements.define("more-info-camera", MoreInfoCamera);

declare global {
  interface HTMLElementTagNameMap {
    "more-info-camera": MoreInfoCamera;
  }
}
