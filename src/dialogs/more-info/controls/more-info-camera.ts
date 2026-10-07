import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-camera-stream";
import type { CameraEntity } from "../../../data/camera";

@customElement("more-info-camera")
class MoreInfoCamera extends LitElement {
  @property({ attribute: false }) public stateObj?: CameraEntity;

  @state() private _attached = false;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
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
      ></ha-camera-stream>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-camera": MoreInfoCamera;
  }
}
