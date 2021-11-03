import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-camera-stream";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-checkbox";
import {
  CameraEntity,
  CameraPreferences,
  CAMERA_SUPPORT_STREAM,
  fetchCameraPrefs,
  STREAM_TYPE_HLS,
  updateCameraPrefs,
} from "../../../data/camera";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-formfield";

class MoreInfoCamera extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @state() private _cameraPrefs?: CameraPreferences;

  @state() private _attached = false;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
  }

  protected render(): TemplateResult {
    if (!this._attached || !this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <ha-camera-stream
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        allow-exoplayer
        controls
      ></ha-camera-stream>
      ${this._cameraPrefs
        ? html`
            <ha-formfield label="Preload stream">
              <ha-checkbox
                .checked=${this._cameraPrefs.preload_stream}
                @change=${this._handleCheckboxChanged}
              >
              </ha-checkbox>
            </ha-formfield>
          `
        : undefined}
    `;
  }

  protected updated(changedProps: PropertyValues) {
    if (!changedProps.has("stateObj")) {
      return;
    }

    const oldState = changedProps.get("stateObj") as this["stateObj"];
    const oldEntityId = oldState ? oldState.entity_id : undefined;
    const curEntityId = this.stateObj ? this.stateObj.entity_id : undefined;

    // Same entity, ignore.
    if (curEntityId === oldEntityId) {
      return;
    }

    if (
      curEntityId &&
      isComponentLoaded(this.hass!, "stream") &&
      supportsFeature(this.stateObj!, CAMERA_SUPPORT_STREAM) &&
      // The stream component for HLS streams supports a server-side pre-load
      // option that client initiated WebRTC streams do not
      this.stateObj!.attributes.frontend_stream_type === STREAM_TYPE_HLS
    ) {
      // Fetch in background while we set up the video.
      this._fetchCameraPrefs();
    }
  }

  private async _fetchCameraPrefs() {
    this._cameraPrefs = await fetchCameraPrefs(
      this.hass!,
      this.stateObj!.entity_id
    );
  }

  private async _handleCheckboxChanged(ev) {
    const checkbox = ev.currentTarget as HaCheckbox;
    try {
      this._cameraPrefs = await updateCameraPrefs(
        this.hass!,
        this.stateObj!.entity_id,
        {
          preload_stream: checkbox.checked!,
        }
      );
    } catch (err: any) {
      alert(err.message);
      checkbox.checked = !checkbox.checked;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        position: relative;
      }
      ha-formfield {
        position: absolute;
        top: 0;
        right: 0;
        background-color: var(--secondary-background-color);
        padding-right: 16px;
        border-bottom-left-radius: 4px;
      }
    `;
  }
}

customElements.define("more-info-camera", MoreInfoCamera);

declare global {
  interface HTMLElementTagNameMap {
    "more-info-camera": MoreInfoCamera;
  }
}
