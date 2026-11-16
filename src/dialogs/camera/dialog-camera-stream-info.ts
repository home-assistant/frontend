import {
  mdiFilmstrip,
  mdiImageMultipleOutline,
  mdiLightningBolt,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../common/translations/localize";
import { CAMERA_STREAM_TYPE_NAMES } from "../../components/camera/ha-camera-stream-badge";
import "../../components/ha-adaptive-dialog";
import "../../components/ha-expansion-panel";
import "../../components/ha-svg-icon";
import {
  MJPEG_STREAM,
  STREAM_TYPE_HLS,
  STREAM_TYPE_WEB_RTC,
  type CameraStreamType,
} from "../../data/camera-streams";
import { haStyleDialog, haStyleDialogFixedTop } from "../../resources/styles";
import { DialogMixin } from "../dialog-mixin";
import type { CameraStreamInfoDialogParams } from "./show-dialog-camera-stream-info";

// Ordered from the fastest to the most compatible
const STREAM_TYPES: { type: CameraStreamType; icon: string }[] = [
  { type: STREAM_TYPE_WEB_RTC, icon: mdiLightningBolt },
  { type: STREAM_TYPE_HLS, icon: mdiFilmstrip },
  { type: MJPEG_STREAM, icon: mdiImageMultipleOutline },
];

@customElement("dialog-camera-stream-info")
class DialogCameraStreamInfo extends DialogMixin<CameraStreamInfoDialogParams>(
  LitElement
) {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const { supportedTypes } = this.params;
    // MJPEG is the fallback of every camera
    const isSupported = (type: CameraStreamType) =>
      type === MJPEG_STREAM || !supportedTypes || supportedTypes.includes(type);
    const supported = STREAM_TYPES.filter(({ type }) => isSupported(type));
    const unsupported = STREAM_TYPES.filter(({ type }) => !isSupported(type));

    return html`
      <ha-adaptive-dialog
        open
        width="medium"
        .headerTitle=${this._localize("ui.dialogs.camera_stream_info.title")}
      >
        <p>${this._localize("ui.dialogs.camera_stream_info.intro")}</p>
        <ul>
          ${supported.map((item) => this._renderType(item))}
        </ul>
        ${
          unsupported.length
            ? html`
                <ha-expansion-panel
                  outlined
                  .header=${this._localize(
                    "ui.dialogs.camera_stream_info.not_supported_count",
                    { count: unsupported.length }
                  )}
                >
                  <ul class="unsupported">
                    ${unsupported.map((item) => this._renderType(item))}
                  </ul>
                </ha-expansion-panel>
              `
            : nothing
        }
      </ha-adaptive-dialog>
    `;
  }

  private _renderType({
    type,
    icon,
  }: {
    type: CameraStreamType;
    icon: string;
  }) {
    const { status } = this.params!;
    const current = !status.connecting && status.type === type;
    const upgrading = status.upgrading === type;
    return html`
      <li>
        <ha-svg-icon .path=${icon}></ha-svg-icon>
        <div>
          <div class="name">
            ${CAMERA_STREAM_TYPE_NAMES[type]}
            ${
              current
                ? html`<span class="tag current"
                    >${this._localize("ui.dialogs.camera_stream_info.in_use")}</span
                  >`
                : upgrading
                  ? html`<span class="tag"
                      >${this._localize(
                        "ui.dialogs.camera_stream_info.connecting"
                      )}</span
                    >`
                  : nothing
            }
          </div>
          <p>
            ${this._localize(`ui.dialogs.camera_stream_info.description.${type}`)}
          </p>
        </div>
      </li>
    `;
  }

  static styles = [
    haStyleDialog,
    // At the top like the more info dialog it opens from
    haStyleDialogFixedTop,
    css`
      p {
        margin: 0;
        color: var(--secondary-text-color);
      }

      ul {
        list-style: none;
        margin: var(--ha-space-4) 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-4);
      }

      li {
        display: flex;
        align-items: flex-start;
        gap: var(--ha-space-4);
      }

      ha-expansion-panel {
        display: block;
        margin-top: var(--ha-space-6);
        --expansion-panel-summary-padding: 0 var(--ha-space-4);
        --expansion-panel-content-padding: 0 var(--ha-space-4);
      }

      ul.unsupported {
        margin: var(--ha-space-2) 0 var(--ha-space-4);
      }

      li ha-svg-icon {
        flex: none;
        padding: var(--ha-space-2);
        border-radius: var(--ha-border-radius-circle);
        background-color: var(--ha-color-fill-neutral-quiet-resting);
        color: var(--primary-text-color);
      }

      .name {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--ha-space-2);
        font-weight: var(--ha-font-weight-medium);
        margin-bottom: var(--ha-space-1);
      }

      .tag {
        font-size: var(--ha-font-size-xs);
        font-weight: var(--ha-font-weight-medium);
        padding: 2px var(--ha-space-2);
        border-radius: var(--ha-border-radius-pill);
        background-color: var(--ha-color-fill-neutral-quiet-resting);
        color: var(--secondary-text-color);
      }

      .tag.current {
        background-color: var(--ha-color-fill-success-quiet-resting);
        color: var(--ha-color-on-success-quiet);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-camera-stream-info": DialogCameraStreamInfo;
  }
}
