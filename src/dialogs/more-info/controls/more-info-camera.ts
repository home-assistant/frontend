import { mdiMicrophone, mdiMicrophoneOff } from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { watchAudioLevel } from "../../../common/audio/watch-audio-level";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-button";
import "../../../components/ha-camera-stream";
import type {
  CameraStreamType,
  HaCameraStream,
} from "../../../components/ha-camera-stream";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { WebRtcMicrophoneState } from "../../../components/ha-web-rtc-player";
import {
  CameraEntityFeature,
  STREAM_TYPE_WEB_RTC,
  type CameraEntity,
} from "../../../data/camera";
import { UNAVAILABLE } from "../../../data/entity/entity";

@customElement("more-info-camera")
class MoreInfoCamera extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @state() private _attached = false;

  @state() private _microphoneState: WebRtcMicrophoneState = "off";

  @state() private _streamType?: CameraStreamType;

  @query("ha-camera-stream") private _cameraStream?: HaCameraStream;

  @query(".microphone-meter") private _microphoneMeter?: HTMLElement;

  private _stopAudioLevel?: () => void;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
    this._stopMicrophoneMeter();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_microphoneState")) {
      this._stopMicrophoneMeter();
      const track = this._cameraStream?.microphoneTrack;
      if (this._microphoneState === "on" && track) {
        // Set as CSS variable instead of state, to not re-render every frame
        this._stopAudioLevel = watchAudioLevel(track, (level) => {
          this._microphoneMeter?.style.setProperty(
            "--microphone-level",
            String(level)
          );
        });
      }
    }
  }

  private _stopMicrophoneMeter() {
    this._stopAudioLevel?.();
    this._stopAudioLevel = undefined;
    this._microphoneMeter?.style.removeProperty("--microphone-level");
  }

  protected render() {
    if (!this._attached || !this.stateObj) {
      return nothing;
    }

    return html`
      <ha-camera-stream
        .stateObj=${this.stateObj}
        allow-exoplayer
        controls
        @microphone-changed=${this._microphoneChanged}
        @stream-type-changed=${this._streamTypeChanged}
      ></ha-camera-stream>
      ${
        supportsFeature(this.stateObj, CameraEntityFeature.TWO_WAY_AUDIO)
          ? this._renderMicrophoneButton()
          : nothing
      }
    `;
  }

  private _microphoneDisabledReason(): string | undefined {
    // Browsers only allow microphone access in a secure context (HTTPS)
    if (!window.isSecureContext) {
      return this._localize(
        "ui.dialogs.more_info_control.camera.microphone_not_secure"
      );
    }
    if (this._streamType !== STREAM_TYPE_WEB_RTC) {
      return this._localize(
        "ui.dialogs.more_info_control.camera.microphone_webrtc_only"
      );
    }
    if (this._microphoneState === "denied") {
      return this._localize(
        "ui.dialogs.more_info_control.camera.microphone_denied"
      );
    }
    return undefined;
  }

  private _renderMicrophoneButton() {
    const disabledReason = this._microphoneDisabledReason();

    const microphoneOn =
      this._microphoneState === "on" || this._microphoneState === "connecting";

    const button = html`
      <ha-button
        .appearance=${microphoneOn ? "accent" : "filled"}
        .loading=${this._microphoneState === "connecting"}
        .disabled=${
          disabledReason !== undefined || this.stateObj!.state === UNAVAILABLE
        }
        @click=${this._toggleMicrophone}
      >
        <ha-svg-icon
          slot="start"
          .path=${microphoneOn ? mdiMicrophone : mdiMicrophoneOff}
        ></ha-svg-icon>
        ${this._localize(`ui.dialogs.more_info_control.camera.${microphoneOn ? "stop_talking" : "start_talking"}`)}
      </ha-button>
    `;

    return html`
      <div class="buttons">
        <div id="microphone-button" class="microphone-meter">
          ${
            this._microphoneState === "on"
              ? html`<span class="microphone-waves"></span>`
              : nothing
          }
          ${button}
        </div>
        ${
          disabledReason
            ? html`<ha-tooltip for="microphone-button"
                >${disabledReason}</ha-tooltip
              >`
            : nothing
        }
      </div>
    `;
  }

  private _toggleMicrophone() {
    this._cameraStream?.toggleMicrophone();
  }

  private _streamTypeChanged(
    ev: HASSDomEvent<HASSDomEvents["stream-type-changed"]>
  ) {
    this._streamType = ev.detail.type;
  }

  private _microphoneChanged(
    ev: HASSDomEvent<HASSDomEvents["microphone-changed"]>
  ) {
    this._microphoneState = ev.detail.state;
  }

  static styles = css`
    :host {
      display: block;
    }

    .buttons {
      display: flex;
      justify-content: flex-end;
      padding: var(--ha-space-4);
    }

    .microphone-meter {
      position: relative;
      isolation: isolate;
    }

    .microphone-waves {
      position: absolute;
      inset: 0;
      z-index: -1;
      opacity: var(--microphone-level, 0);
      transition: opacity 150ms linear;
    }

    .microphone-waves::before,
    .microphone-waves::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: var(--ha-border-radius-pill);
      background-color: var(--ha-color-fill-primary-loud-resting);
      animation: microphone-wave 1.4s ease-out infinite;
    }

    .microphone-waves::after {
      animation-delay: 0.7s;
    }

    @keyframes microphone-wave {
      from {
        transform: scale(1);
        opacity: 0.4;
      }
      to {
        transform: scale(1.15, 1.6);
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .microphone-waves::before,
      .microphone-waves::after {
        animation: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-camera": MoreInfoCamera;
  }
}
