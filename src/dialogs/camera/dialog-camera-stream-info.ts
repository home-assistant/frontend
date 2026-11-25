import {
  mdiFilmstrip,
  mdiImageMultipleOutline,
  mdiLightningBolt,
} from "@mdi/js";
import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { consume } from "../../common/decorators/consume";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../common/translations/localize";
import { CAMERA_STREAM_TYPE_NAMES } from "../../components/camera/ha-camera-stream-badge";
import "../../components/ha-adaptive-dialog";
import "../../components/ha-alert";
import "../../components/ha-expansion-panel";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-base";
import "../../components/list/ha-list-base";
import {
  MJPEG_STREAM,
  STREAM_TYPE_HLS,
  STREAM_TYPE_WEB_RTC,
  type CameraStreamType,
  type StreamType,
} from "../../data/camera-streams";
import { fetchCloudStatus } from "../../data/cloud";
import { apiContext, configContext } from "../../data/context";
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

  @consume({ context: apiContext })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: configContext })
  private _hassConfig!: ContextType<typeof configContext>;

  @state() private _cloudIceServers = false;

  protected firstUpdated() {
    this._fetchCloudIceServers();
  }

  // The same check that core uses to add the cloud TURN servers
  private async _fetchCloudIceServers() {
    if (!isComponentLoaded(this._hassConfig.config, "cloud")) {
      return;
    }
    try {
      const status = await fetchCloudStatus(this._api.callWS);
      this._cloudIceServers =
        status.logged_in &&
        status.active_subscription &&
        status.prefs.cloud_ice_servers_enabled;
    } catch (_err) {
      // Without the cloud status the label stays hidden
    }
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const { status, supportedTypes } = this.params;
    // Without a video stream, still images are all the camera has
    const stillImagesOnly = supportedTypes?.length === 0;
    // MJPEG is only the fallback, only worth explaining while it shows
    const mjpegInUse = status.type === MJPEG_STREAM;
    const videoTypes = STREAM_TYPES.filter(({ type }) => type !== MJPEG_STREAM);
    const isSupported = (type: CameraStreamType) =>
      !supportedTypes || supportedTypes.includes(type as StreamType);
    const supported = stillImagesOnly
      ? []
      : videoTypes.filter(({ type }) => isSupported(type));
    const unsupported = stillImagesOnly
      ? []
      : videoTypes.filter(({ type }) => !isSupported(type));
    const mjpeg = STREAM_TYPES.find(({ type }) => type === MJPEG_STREAM)!;

    return html`
      <ha-adaptive-dialog
        open
        width="medium"
        .headerTitle=${this._localize("ui.dialogs.camera_stream_info.title")}
      >
        <p>
          ${this._localize(
            stillImagesOnly
              ? "ui.dialogs.camera_stream_info.still_images_only"
              : "ui.dialogs.camera_stream_info.intro"
          )}
        </p>
        ${
          mjpegInUse && !stillImagesOnly
            ? html`<ha-alert alert-type="info">
                ${this._localize("ui.dialogs.camera_stream_info.fallback_in_use")}
              </ha-alert>`
            : nothing
        }
        <ha-list-base>
          ${mjpegInUse ? this._renderType(mjpeg) : nothing}
          ${supported.map((item) => this._renderType(item))}
        </ha-list-base>
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
                  <ha-list-base>
                    ${unsupported.map((item) => this._renderType(item))}
                  </ha-list-base>
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
      <ha-list-item-base
        .headline=${CAMERA_STREAM_TYPE_NAMES[type]}
        .supportingText=${this._localize(
          `ui.dialogs.camera_stream_info.description.${type}`
        )}
        wrap-supporting-text
      >
        <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
        ${
          type === STREAM_TYPE_WEB_RTC && this._cloudIceServers
            ? html`<span slot="headline" class="headline">
                ${CAMERA_STREAM_TYPE_NAMES[type]}
                <span class="tag cloud"
                  >${this._localize(
                    "ui.dialogs.camera_stream_info.enhanced_by_cloud"
                  )}</span
                >
              </span>`
            : nothing
        }
        ${
          current
            ? html`<span slot="end" class="tag current"
                >${this._localize("ui.dialogs.camera_stream_info.in_use")}</span
              >`
            : upgrading
              ? html`<span slot="end" class="tag"
                  >${this._localize(
                    "ui.dialogs.camera_stream_info.connecting"
                  )}</span
                >`
              : nothing
        }
      </ha-list-item-base>
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

      ha-alert {
        display: block;
        margin-top: var(--ha-space-4);
      }

      ha-list-base {
        margin-top: var(--ha-space-2);
      }

      ha-list-item-base {
        --ha-row-item-padding-inline: 0;
      }

      ha-expansion-panel {
        display: block;
        margin-top: var(--ha-space-6);
        --expansion-panel-summary-padding: 0 var(--ha-space-4);
        --expansion-panel-content-padding: 0 var(--ha-space-4);
      }

      ha-list-item-base ha-svg-icon {
        flex: none;
        padding: var(--ha-space-2);
        border-radius: var(--ha-border-radius-circle);
        background-color: var(--ha-color-fill-neutral-quiet-resting);
        color: var(--primary-text-color);
      }

      .tag {
        font-size: var(--ha-font-size-xs);
        font-weight: var(--ha-font-weight-medium);
        padding: 2px var(--ha-space-2);
        border-radius: var(--ha-border-radius-pill);
        background-color: var(--ha-color-fill-neutral-quiet-resting);
        color: var(--secondary-text-color);
      }

      .headline {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ha-space-2);
      }

      .tag.cloud {
        background-color: var(--ha-color-fill-primary-quiet-resting);
        color: var(--ha-color-on-primary-quiet);
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
