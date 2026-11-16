import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../common/translations/localize";
import type {
  CameraStreamStatus,
  CameraStreamType,
} from "../../data/camera-streams";
import "../ha-spinner";

/** Names of the protocols, the same in every language. */
export const CAMERA_STREAM_TYPE_NAMES: Record<CameraStreamType, string> = {
  web_rtc: "WebRTC",
  hls: "HLS",
  mjpeg: "MJPEG",
};

/**
 * Shows over a camera stream how it is connected. A faster stream that still
 * connects in the background is shown next to the current one.
 */
@customElement("ha-camera-stream-badge")
export class HaCameraStreamBadge extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public status?: CameraStreamStatus;

  protected render() {
    const status = this.status;
    if (!status) {
      return nothing;
    }
    const connecting = status.connecting || !status.type;
    const label = connecting
      ? this._localize("ui.components.camera-player.connecting")
      : CAMERA_STREAM_TYPE_NAMES[status.type!];

    return html`
      <button
        type="button"
        aria-label=${this._ariaLabel(status)}
        class=${connecting ? "connecting" : "live"}
      >
        <span class="dot"></span>
        <span class="label">${label}</span>
        ${
          status.upgrading
            ? html`<span class="upgrading" aria-hidden="true">
                <ha-spinner></ha-spinner>
                ${CAMERA_STREAM_TYPE_NAMES[status.upgrading]}
              </span>`
            : nothing
        }
      </button>
    `;
  }

  private _ariaLabel(status: CameraStreamStatus): string {
    if (status.connecting || !status.type) {
      return this._localize(
        "ui.components.camera-player.stream_info_connecting"
      );
    }
    if (status.upgrading) {
      return this._localize(
        "ui.components.camera-player.stream_info_upgrading",
        {
          type: CAMERA_STREAM_TYPE_NAMES[status.type],
          upgrading: CAMERA_STREAM_TYPE_NAMES[status.upgrading],
        }
      );
    }
    return this._localize("ui.components.camera-player.stream_info", {
      type: CAMERA_STREAM_TYPE_NAMES[status.type],
    });
  }

  static styles = css`
    :host {
      display: inline-flex;
    }

    /* Readable on a dark and on a bright picture */
    button {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-1);
      height: 28px;
      padding-inline: var(--ha-space-2);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--ha-border-radius-pill);
      background-color: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: white;
      font-family: inherit;
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      line-height: 1;
      cursor: pointer;
    }

    button:focus-visible {
      outline: 2px solid white;
      outline-offset: 2px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--ha-color-green-60, #3fb950);
    }

    .connecting .dot {
      background-color: rgba(255, 255, 255, 0.8);
      animation: pulse 1.2s ease-in-out infinite;
    }

    .upgrading {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-1);
      padding-inline-start: var(--ha-space-1);
      border-inline-start: 1px solid rgba(255, 255, 255, 0.3);
      opacity: 0.7;
      --ha-spinner-indicator-color: white;
      --ha-spinner-size: 10px;
      --ha-spinner-divider-color: rgba(255, 255, 255, 0.3);
    }

    @keyframes pulse {
      50% {
        opacity: 0.3;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .connecting .dot {
        animation: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-camera-stream-badge": HaCameraStreamBadge;
  }
}
