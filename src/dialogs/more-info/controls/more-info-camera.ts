import type { ContextType } from "@lit/context";
import { mdiMicrophone, mdiMicrophoneOff } from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { watchAudioLevel } from "../../../common/audio/watch-audio-level";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-button";
import "../../../components/ha-camera-stream";
import type {
  CameraStreamType,
  HaCameraStream,
} from "../../../components/ha-camera-stream";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { WebRtcMicrophoneState } from "../../../components/ha-web-rtc-player";
import { STREAM_TYPE_WEB_RTC, type CameraEntity } from "../../../data/camera";
import { configContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  canAppStreamMicrophone,
  isWebRtcStreamErrorCode,
  startAppMicrophoneStream,
  stopAppMicrophoneStream,
  subscribeAppStreamStopped,
} from "../../../external_app/camera_microphone_stream";
import type {
  EMError,
  WebRtcStreamStopped,
} from "../../../external_app/external_messaging";
import { showToast } from "../../../util/toast";

@customElement("more-info-camera")
class MoreInfoCamera extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @state() private _attached = false;

  @state() private _microphoneState: WebRtcMicrophoneState = "off";

  @state() private _streamType?: CameraStreamType;

  @state() private _supportsTwoWayAudio = false;

  @query("ha-camera-stream") private _cameraStream?: HaCameraStream;

  @query(".microphone-meter") private _microphoneMeter?: HTMLElement;

  private _stopAudioLevel?: () => void;

  private _appMicrophoneSession?: string;

  // Increased on every start and stop, so replies to older starts are ignored
  private _appMicrophoneRequest = 0;

  private _unsubAppStreamStopped?: () => void;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
    this._stopMicrophoneMeter();
    this._resetMicrophone();
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    const oldStateObj = changedProps.get("stateObj");
    if (oldStateObj && oldStateObj.entity_id !== this.stateObj?.entity_id) {
      this._resetMicrophone();
    }
  }

  // A removed player can't fire microphone-changed anymore, so reset it here
  private _resetMicrophone() {
    this._stopAppMicrophone();
    this._microphoneState = "off";
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
        @camera-capabilities-changed=${this._capabilitiesChanged}
      ></ha-camera-stream>
      ${this._supportsTwoWayAudio ? this._renderMicrophoneButton() : nothing}
    `;
  }

  /**
   * Browsers only allow microphone access in a secure context (HTTPS). Without
   * it, an app can send the microphone itself in a separate stream, while the
   * video stream keeps running in the frontend.
   */
  private get _useAppMicrophone(): boolean {
    return (
      !window.isSecureContext &&
      canAppStreamMicrophone(this._config?.auth.external)
    );
  }

  private _microphoneDisabledReason(): string | undefined {
    if (!window.isSecureContext && !this._useAppMicrophone) {
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

    // Stopping is always possible, so the microphone is never stuck on
    const disabled =
      !microphoneOn &&
      (disabledReason !== undefined || this.stateObj!.state === UNAVAILABLE);

    const button = html`
      <ha-button
        .appearance=${microphoneOn ? "accent" : "filled"}
        .disabled=${disabled}
        @click=${this._toggleMicrophone}
      >
        ${
          this._microphoneState === "connecting"
            ? html`<ha-spinner slot="start" size="tiny"></ha-spinner>`
            : html`<ha-svg-icon
                slot="start"
                .path=${microphoneOn ? mdiMicrophone : mdiMicrophoneOff}
              ></ha-svg-icon>`
        }
        ${this._localize(`ui.dialogs.more_info_control.camera.${microphoneOn ? "stop_talking" : "start_talking"}`)}
      </ha-button>
    `;

    return html`
      <div class="buttons">
        <div
          id="microphone-button"
          class="microphone-meter"
          tabindex=${ifDefined(disabled && disabledReason ? "0" : undefined)}
        >
          ${
            this._microphoneState === "on"
              ? html`<span class="microphone-waves"></span>`
              : nothing
          }
          ${button}
        </div>
        ${
          disabled && disabledReason
            ? html`<ha-tooltip for="microphone-button"
                >${disabledReason}</ha-tooltip
              >`
            : nothing
        }
      </div>
    `;
  }

  private _toggleMicrophone() {
    if (this._useAppMicrophone) {
      this._toggleAppMicrophone();
      return;
    }
    this._cameraStream?.toggleMicrophone();
  }

  private async _toggleAppMicrophone() {
    // Stops a connected session, or cancels one the app is connecting
    if (this._appMicrophoneSession || this._microphoneState === "connecting") {
      this._stopAppMicrophone();
      return;
    }
    const request = ++this._appMicrophoneRequest;
    this._microphoneState = "connecting";
    try {
      const sessionId = await startAppMicrophoneStream(
        this._config.auth.external!,
        this.stateObj!.entity_id
      );
      // Cancelled, closed or replaced while the app was connecting
      if (request !== this._appMicrophoneRequest) {
        stopAppMicrophoneStream(this._config.auth.external!, sessionId);
        return;
      }
      this._appMicrophoneSession = sessionId;
      // Only connected sessions can be stopped by the app
      this._unsubAppStreamStopped = subscribeAppStreamStopped(
        this._appStreamStopped
      );
      this._microphoneState = "on";
    } catch (err: unknown) {
      if (request !== this._appMicrophoneRequest) {
        return;
      }
      this._microphoneState = "off";
      showToast(this, { message: this._appErrorMessage(err as EMError) });
    }
  }

  private _appErrorMessage({ code, message }: EMError): string {
    if (code === "unknown" || !isWebRtcStreamErrorCode(code)) {
      return this._localize(
        "ui.dialogs.more_info_control.camera.app_microphone_error.unknown",
        { message }
      );
    }
    return this._localize(
      `ui.dialogs.more_info_control.camera.app_microphone_error.${code}`
    );
  }

  private _stopAppMicrophone() {
    this._appMicrophoneRequest++;
    if (this._appMicrophoneSession) {
      stopAppMicrophoneStream(
        this._config.auth.external!,
        this._appMicrophoneSession
      );
      this._clearAppMicrophoneSession();
    }
    if (this._useAppMicrophone) {
      this._microphoneState = "off";
    }
  }

  private _clearAppMicrophoneSession() {
    this._appMicrophoneSession = undefined;
    this._unsubAppStreamStopped?.();
    this._unsubAppStreamStopped = undefined;
  }

  private _appStreamStopped = (stopped: WebRtcStreamStopped) => {
    if (stopped.session_id !== this._appMicrophoneSession) {
      return;
    }
    this._clearAppMicrophoneSession();
    this._microphoneState = "off";
    if (stopped.code === "interrupted") {
      return;
    }
    showToast(this, { message: this._appErrorMessage(stopped) });
  };

  private _streamTypeChanged(
    ev: HASSDomEvent<HASSDomEvents["stream-type-changed"]>
  ) {
    this._streamType = ev.detail.type;
  }

  private _capabilitiesChanged(
    ev: HASSDomEvent<HASSDomEvents["camera-capabilities-changed"]>
  ) {
    this._supportsTwoWayAudio = ev.detail.capabilities?.two_way_audio ?? false;
  }

  private _microphoneChanged(
    ev: HASSDomEvent<HASSDomEvents["microphone-changed"]>
  ) {
    if (this._useAppMicrophone) {
      return;
    }
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

    ha-spinner {
      --ha-spinner-indicator-color: currentColor;
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
        transform: scale(1.08, 1.3);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-camera": MoreInfoCamera;
  }
}
