import type { ContextType } from "@lit/context";
import {
  mdiArrowAll,
  mdiMicrophone,
  mdiMicrophoneOff,
  mdiPhone,
} from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { watchAudioLevel } from "../../../common/audio/watch-audio-level";
import { consume } from "../../../common/decorators/consume";
import {
  consumeEntityRegistryEntry,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/camera/ha-camera-player";
import type { HaCameraPlayer } from "../../../components/camera/ha-camera-player";
import type {
  CameraStreamStatus,
  CameraStreamType,
} from "../../../components/ha-camera-stream";
import "../../../components/ha-control-button";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import type { WebRtcMicrophoneState } from "../../../components/ha-web-rtc-player";
import { STREAM_TYPE_WEB_RTC, type CameraEntity } from "../../../data/camera";
import { findCameraPtzEntities } from "../../../data/camera-controls";
import { configContext, fullEntitiesContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../../../data/entity/entity_registry";
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
import { cameraControlHintStyle } from "../components/camera/camera-control-styles";
import "../components/camera/ha-more-info-camera-ptz";
import "../components/camera/ha-more-info-camera-sensors";

type CameraControlTab = "call" | "ptz";

@customElement("more-info-camera")
class MoreInfoCamera extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _fullEntities?: EntityRegistryEntry[];

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @state()
  @consumeEntityRegistryEntry({ entityIdPath: ["stateObj", "entity_id"] })
  private _entry?: EntityRegistryDisplayEntry;

  @state() private _attached = false;

  @state() private _microphoneState: WebRtcMicrophoneState = "off";

  @state() private _streamType?: CameraStreamType;

  @state() private _supportsTwoWayAudio = false;

  @state() private _streamStatus?: CameraStreamStatus;

  @state() private _tab?: CameraControlTab;

  // Why the app could not start or keep the microphone
  @state() private _microphoneError?: string;

  @query("ha-camera-player") private _cameraStream?: HaCameraPlayer;

  @query(".microphone") private _microphoneMeter?: HTMLElement;

  private _ptzEntities = memoizeOne(
    (entityId: string, entities?: EntityRegistryEntry[]) =>
      entities ? findCameraPtzEntities(entityId, entities) : undefined
  );

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
      this._tab = undefined;
    }
  }

  // A removed player can't fire microphone-changed anymore, so reset it here
  private _resetMicrophone() {
    this._stopAppMicrophone();
    this._microphoneState = "off";
    this._microphoneError = undefined;
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

  private _tabs(): CameraControlTab[] {
    const tabs: CameraControlTab[] = [];
    if (this._supportsTwoWayAudio) {
      tabs.push("call");
    }
    if (this._ptzEntities(this.stateObj!.entity_id, this._fullEntities)) {
      tabs.push("ptz");
    }
    return tabs;
  }

  protected render() {
    if (!this._attached || !this.stateObj) {
      return nothing;
    }

    const tabs = this._tabs();
    const tab = this._tab && tabs.includes(this._tab) ? this._tab : tabs[0];

    return html`
      <ha-camera-player
        .stateObj=${this.stateObj}
        allow-exoplayer
        @microphone-changed=${this._microphoneChanged}
        @stream-type-changed=${this._streamTypeChanged}
        @camera-stream-status-changed=${this._streamStatusChanged}
        @camera-capabilities-changed=${this._capabilitiesChanged}
      ></ha-camera-player>
      ${
        tabs.length || this._entry?.device_id
          ? this._renderControls(tabs, tab)
          : nothing
      }
    `;
  }

  private _renderControls(tabs: CameraControlTab[], tab?: CameraControlTab) {
    return html`
      <div class="controls">
        <ha-more-info-camera-sensors
          .deviceId=${this._entry?.device_id}
        ></ha-more-info-camera-sensors>
        ${
          tabs.length > 1
            ? html`
                <ha-icon-button-group class="tabs">
                  ${tabs.map(
                    (item) => html`
                      <ha-icon-button-toggle
                        .label=${this._localize(
                          `ui.dialogs.more_info_control.camera.tabs.${item}`
                        )}
                        .selected=${tab === item}
                        .path=${item === "call" ? mdiPhone : mdiArrowAll}
                        data-tab=${item}
                        @click=${this._selectTab}
                      ></ha-icon-button-toggle>
                    `
                  )}
                </ha-icon-button-group>
              `
            : nothing
        }
        ${
          tab === "call"
            ? this._renderCall()
            : tab === "ptz"
              ? html`<ha-more-info-camera-ptz
                  .ptz=${this._ptzEntities(
                    this.stateObj!.entity_id,
                    this._fullEntities
                  )}
                  .deviceId=${this._entry?.device_id}
                ></ha-more-info-camera-ptz>`
              : nothing
        }
      </div>
    `;
  }

  private _selectTab(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    this._tab = ev.currentTarget.dataset.tab as CameraControlTab;
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
    if (this.stateObj!.state === UNAVAILABLE) {
      return this._localize(
        "ui.dialogs.more_info_control.camera.microphone_unavailable"
      );
    }
    if (!window.isSecureContext && !this._useAppMicrophone) {
      return this._localize(
        "ui.dialogs.more_info_control.camera.microphone_not_secure"
      );
    }
    if (this._streamType !== STREAM_TYPE_WEB_RTC) {
      return this._localize(
        this._streamStatus?.upgrading === STREAM_TYPE_WEB_RTC
          ? "ui.dialogs.more_info_control.camera.microphone_webrtc_connecting"
          : "ui.dialogs.more_info_control.camera.microphone_webrtc_only"
      );
    }
    if (this._microphoneState === "denied") {
      return this._localize(
        "ui.dialogs.more_info_control.camera.microphone_denied"
      );
    }
    return undefined;
  }

  private _renderCall() {
    const disabledReason = this._microphoneDisabledReason();

    const microphoneOn =
      this._microphoneState === "on" || this._microphoneState === "connecting";

    // Stopping is always possible, so the microphone is never stuck on
    const disabled = !microphoneOn && disabledReason !== undefined;

    const hint = disabled ? disabledReason : this._microphoneError;

    const label = this._localize(
      `ui.dialogs.more_info_control.camera.${
        this._microphoneState === "connecting"
          ? "connecting_microphone"
          : microphoneOn
            ? "stop_talking"
            : "start_talking"
      }`
    );

    return html`
      <div class="call">
        <div
          class=${classMap({
            microphone: true,
            on: this._microphoneState === "on",
          })}
        >
          <span class="waves"></span>
          <span class="level"></span>
          <ha-control-button
            .label=${label}
            .disabled=${disabled}
            class=${classMap({ active: microphoneOn })}
            @click=${this._toggleMicrophone}
          >
            ${
              this._microphoneState === "connecting"
                ? html`<ha-spinner size="small"></ha-spinner>`
                : html`<ha-svg-icon
                    .path=${microphoneOn ? mdiMicrophone : mdiMicrophoneOff}
                  ></ha-svg-icon>`
            }
          </ha-control-button>
        </div>
        <span class="call-label" aria-hidden="true">${label}</span>
        ${hint ? html`<div class="hint" role="status">${hint}</div>` : nothing}
      </div>
    `;
  }

  private _toggleMicrophone() {
    this._microphoneError = undefined;
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
      this._microphoneError = this._appErrorMessage(err as EMError);
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
    this._microphoneError = this._appErrorMessage(stopped);
  };

  private _streamTypeChanged(
    ev: HASSDomEvent<HASSDomEvents["stream-type-changed"]>
  ) {
    this._streamType = ev.detail.type;
  }

  private _streamStatusChanged(
    ev: HASSDomEvent<HASSDomEvents["camera-stream-status-changed"]>
  ) {
    this._streamStatus = ev.detail;
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

  static styles = [
    cameraControlHintStyle,
    css`
      :host {
        display: block;
      }

      .controls {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--ha-space-4) 0 var(--ha-space-6);
      }

      /* Spaces itself, as it is empty without sensors */
      ha-more-info-camera-sensors {
        align-self: stretch;
      }

      .tabs {
        margin-bottom: var(--ha-space-6);
      }

      ha-more-info-camera-ptz,
      .call {
        padding: 0 var(--ha-space-4);
      }

      .call {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ha-space-3);
        align-self: stretch;
      }

      .call-label {
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
        color: var(--primary-text-color);
      }

      .microphone {
        --microphone-size: 88px;
        position: relative;
        width: var(--microphone-size);
        height: var(--microphone-size);
        margin: var(--ha-space-4);
        isolation: isolate;
      }

      ha-control-button {
        width: 100%;
        height: 100%;
        --control-button-border-radius: var(--ha-border-radius-circle);
        --mdc-icon-size: 36px;
        transition: transform var(--ha-animation-duration-fast, 150ms) ease-out;
      }

      ha-control-button.active {
        --control-button-background-color: var(--primary-color);
        --control-button-background-opacity: 1;
        --control-button-icon-color: var(--text-primary-color, white);
      }

      ha-control-button:active:not([disabled]) {
        transform: scale(0.95);
      }

      ha-spinner {
        --ha-spinner-indicator-color: currentColor;
      }

      /* Rings that keep moving out while the microphone is on */
      .waves,
      .level {
        position: absolute;
        inset: 0;
        z-index: -1;
        border-radius: var(--ha-border-radius-circle);
        pointer-events: none;
      }

      .waves::before,
      .waves::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        border: 2px solid var(--primary-color);
        opacity: 0;
      }

      .microphone.on .waves::before,
      .microphone.on .waves::after {
        animation: microphone-wave 2s ease-out infinite;
      }

      .microphone.on .waves::after {
        animation-delay: 1s;
      }

      /* Grows with the voice going into the microphone */
      .level {
        background-color: var(--primary-color);
        opacity: calc(var(--microphone-level, 0) * 0.35);
        transform: scale(calc(1 + var(--microphone-level, 0) * 0.45));
        transition:
          transform 100ms linear,
          opacity 100ms linear;
      }

      @keyframes microphone-wave {
        from {
          transform: scale(1);
          opacity: 0.6;
        }
        to {
          transform: scale(1.7);
          opacity: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .microphone.on .waves::before,
        .microphone.on .waves::after {
          animation: none;
        }
        .level,
        ha-control-button {
          transition: none;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-camera": MoreInfoCamera;
  }
}
