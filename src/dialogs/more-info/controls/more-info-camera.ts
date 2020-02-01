import {
  property,
  PropertyValues,
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
} from "lit-element";

import { HomeAssistant, CameraEntity } from "../../../types";
import {
  CAMERA_SUPPORT_STREAM,
  CameraPreferences,
  fetchCameraPrefs,
  updateCameraPrefs,
} from "../../../data/camera";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-camera-stream";
import "@polymer/paper-checkbox/paper-checkbox";
// Not duplicate import, it's for typing
// tslint:disable-next-line
import { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";

class MoreInfoCamera extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public stateObj?: CameraEntity;
  @property() private _cameraPrefs?: CameraPreferences;
  @property() private _attached = false;

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
        .hass="${this.hass}"
        .stateObj="${this.stateObj}"
        showcontrols
      ></ha-camera-stream>
      ${this._cameraPrefs
        ? html`
            <paper-checkbox
              .checked=${this._cameraPrefs.preload_stream}
              @change=${this._handleCheckboxChanged}
            >
              Preload stream
            </paper-checkbox>
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
      this.hass!.config.components.includes("stream") &&
      supportsFeature(this.stateObj!, CAMERA_SUPPORT_STREAM)
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
    const checkbox = ev.currentTarget as PaperCheckboxElement;
    try {
      this._cameraPrefs = await updateCameraPrefs(
        this.hass!,
        this.stateObj!.entity_id,
        {
          preload_stream: checkbox.checked!,
        }
      );
    } catch (err) {
      alert(err.message);
      checkbox.checked = !checkbox.checked;
    }
  }

  static get styles(): CSSResult {
    return css`
      paper-checkbox {
        position: absolute;
        top: 0;
        right: 0;
        background-color: var(--secondary-background-color);
        padding: 5px;
        border-bottom-left-radius: 6px;
      }
    `;
  }
}

customElements.define("more-info-camera", MoreInfoCamera);
