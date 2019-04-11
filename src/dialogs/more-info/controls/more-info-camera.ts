import {
  property,
  PropertyValues,
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
} from "lit-element";

import computeStateName from "../../../common/entity/compute_state_name";
import { HomeAssistant, CameraEntity } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  computeMJPEGStreamUrl,
  CAMERA_SUPPORT_STREAM,
  CameraPreferences,
  fetchCameraPrefs,
  updateCameraPrefs,
} from "../../../data/camera";
import "../../../components/ha-camera-stream";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "@polymer/paper-checkbox/paper-checkbox";
// Not duplicate import, it's for typing
// tslint:disable-next-line
import { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";

class MoreInfoCamera extends LitElement {
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
      img {
        width: 100%;
      }
    `;
  }
  @property() public hass?: HomeAssistant;
  @property() public stateObj?: CameraEntity;
  @property() private _cameraPrefs?: CameraPreferences;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._teardownPlayback();
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      ${!this.hass!.config.components.includes("stream") ||
      !supportsFeature(this.stateObj, CAMERA_SUPPORT_STREAM)
        ? html`
            <img
              src="${computeMJPEGStreamUrl(this.stateObj!)}"
              alt="${computeStateName(this.stateObj!)}"
            />
          `
        : html`
            <ha-camera-stream
              .hass="${this.hass}"
              .stateObj="${this.stateObj}"
            />
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
          `}
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

    // Tear down if we have something and we need to build it up
    if (oldEntityId) {
      this._teardownPlayback();
    }

    if (curEntityId) {
      // Fetch in background while we set up the video.
      this._fetchCameraPrefs();
    }

    const imgEl = this._imgEl;
    if (imgEl) {
      imgEl.addEventListener("load", () => fireEvent(this, "iron-resize"));
    }
  }

  private get _imgEl(): HTMLImageElement {
    return this.shadowRoot!.querySelector("img")! as HTMLImageElement;
  }

  private _teardownPlayback(): any {
    this.stateObj = undefined;
    this._cameraPrefs = undefined;
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
}

customElements.define("more-info-camera", MoreInfoCamera);
