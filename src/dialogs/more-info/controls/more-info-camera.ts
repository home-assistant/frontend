import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { slugify } from "../../../common/string/slugify";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/buttons/ha-progress-button";
import "../../../components/ha-camera-stream";
import type { CameraEntity } from "../../../data/camera";
import { apiContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistantApi } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import { showToast } from "../../../util/toast";

@customElement("more-info-camera")
class MoreInfoCamera extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

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
    if (!this._attached || !this.stateObj || !this._localize) {
      return nothing;
    }

    return html`
      <ha-camera-stream
        .stateObj=${this.stateObj}
        allow-exoplayer
        controls
      ></ha-camera-stream>

      <div class="actions">
        <ha-progress-button
          @click=${this._downloadSnapshot}
          .progress=${this._waiting}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          appearance="filled"
        >
          ${this._localize(
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
      const result: Response | undefined = await this._api.callApiRaw(
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
        message: this._localize(
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
      padding: var(--ha-space-4);
      z-index: 1;
      gap: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-camera": MoreInfoCamera;
  }
}
