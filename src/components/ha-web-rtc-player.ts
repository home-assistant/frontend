import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { handleWebRtcOffer, WebRtcAnswer } from "../data/camera";
import type { HomeAssistant } from "../types";
import "./ha-alert";

/**
 * A WebRTC stream is established by first sending an offer through a signal
 * path via an integration. An answer is returned, then the rest of the stream
 * is handled entirely client side.
 */
@customElement("ha-web-rtc-player")
class HaWebRtcPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityid!: string;

  @property({ type: Boolean, attribute: "controls" })
  public controls = false;

  @property({ type: Boolean, attribute: "muted" })
  public muted = false;

  @property({ type: Boolean, attribute: "autoplay" })
  public autoPlay = false;

  @property({ type: Boolean, attribute: "playsinline" })
  public playsInline = false;

  @state() private _error?: string;

  // don't cache this, as we remove it on disconnects
  @query("#remote-stream") private _videoEl!: HTMLVideoElement;

  protected render(): TemplateResult {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    return html`
      <video
        id="remote-stream"
        ?autoplay=${this.autoPlay}
        .muted=${this.muted}
        ?playsinline=${this.playsInline}
        ?controls=${this.controls}
        @loadeddata=${this._elementResized}
      ></video>
    `;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanUp();
  }

  protected updated(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has("entityid")) {
      return;
    }
    if (!this._videoEl) {
      return;
    }
    this._startWebRtc();
  }

  private async _startWebRtc(): Promise<void> {
    const peerConnection = new RTCPeerConnection();
    // Some cameras (such as nest) require a data channel to establish a stream
    // however, not used by any integrations.
    peerConnection.createDataChannel("dataSendChannel");
    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    };
    const offer: RTCSessionDescriptionInit = await peerConnection.createOffer(
      offerOptions
    );
    await peerConnection.setLocalDescription(offer);

    let webRtcAnswer: WebRtcAnswer;
    try {
      webRtcAnswer = await handleWebRtcOffer(
        this.hass,
        this.entityid,
        offer.sdp!
      );
    } catch (err: any) {
      this._error = "Failed to start WebRTC stream: " + err.message;
      return;
    }

    // Setup callbacks to render remote stream once media tracks are discovered.
    const remoteStream = new MediaStream();
    peerConnection.addEventListener("track", (event) => {
      remoteStream.addTrack(event.track);
      this._videoEl.srcObject = remoteStream;
    });

    // Initiate the stream with the remote device
    const remoteDesc = new RTCSessionDescription({
      type: "answer",
      sdp: webRtcAnswer.answer,
    });
    await peerConnection.setRemoteDescription(remoteDesc);
  }

  private _elementResized() {
    fireEvent(this, "iron-resize");
  }

  private _cleanUp() {
    if (this._videoEl) {
      const videoEl = this._videoEl;
      videoEl.removeAttribute("src");
      videoEl.load();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      video {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-web-rtc-player": HaWebRtcPlayer;
  }
}
