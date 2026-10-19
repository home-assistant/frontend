import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  addWebRtcCandidate,
  type WebRTCClientConfiguration,
  webRtcOffer,
  type WebRtcOfferEvent,
} from "../data/camera";
import type { HomeAssistantApi, HomeAssistantConnection } from "../types";

const CONNECT_TIMEOUT = 20000;

/**
 * A second WebRTC connection to a camera that only sends the microphone, so
 * the connection that plays the video and audio keeps running untouched.
 */
export class WebRtcMicrophoneSession {
  private _peerConnection: RTCPeerConnection;

  private _unsub?: Promise<UnsubscribeFunc>;

  private _sessionId?: string;

  private _candidatesList: RTCIceCandidate[] = [];

  private _closed = false;

  private _connected: Promise<void>;

  private _resolveConnected!: () => void;

  private _rejectConnected!: (err: Error) => void;

  private _connectTimeout?: number;

  constructor(
    private _api: HomeAssistantApi,
    private _connection: HomeAssistantConnection,
    private _entityId: string,
    clientConfig: WebRTCClientConfiguration,
    track: MediaStreamTrack,
    private _onClosed: (err?: Error) => void
  ) {
    this._connected = new Promise<void>((resolve, reject) => {
      this._resolveConnected = resolve;
      this._rejectConnected = reject;
    });
    // Handled by the caller of connect(), avoid unhandled rejections
    this._connected.catch(() => undefined);

    this._peerConnection = new RTCPeerConnection(clientConfig.configuration);
    if (clientConfig.dataChannel) {
      this._peerConnection.createDataChannel(clientConfig.dataChannel);
    }
    this._peerConnection.onicecandidate = this._handleIceCandidate;
    this._peerConnection.onconnectionstatechange = this._connectionStateChanged;
    this._peerConnection.addTransceiver(track, { direction: "sendonly" });
  }

  /** Resolves once the microphone is sent to the camera. */
  public async connect(): Promise<void> {
    this._connectTimeout = window.setTimeout(
      () => this._fail(new Error("Timeout connecting microphone")),
      CONNECT_TIMEOUT
    );
    try {
      const offer = await this._peerConnection.createOffer();
      await this._peerConnection.setLocalDescription(offer);
    } catch (err: unknown) {
      this._fail(err instanceof Error ? err : new Error(String(err)));
      return this._connected;
    }
    if (this._closed) {
      return this._connected;
    }
    this._unsub = webRtcOffer(
      this._connection,
      this._entityId,
      this._peerConnection.localDescription!.sdp,
      this._handleOfferEvent
    );
    this._unsub.catch((err) => {
      this._unsub = undefined;
      this._fail(err instanceof Error ? err : new Error(err?.message));
    });
    return this._connected;
  }

  public close() {
    if (this._closed) {
      return;
    }
    this._closed = true;
    clearTimeout(this._connectTimeout);
    this._peerConnection.onicecandidate = null;
    this._peerConnection.onconnectionstatechange = null;
    this._peerConnection.close();
    this._unsub?.then(
      (unsub) => unsub(),
      () => undefined
    );
    this._unsub = undefined;
    this._rejectConnected(new Error("Closed"));
  }

  private _fail(err: Error) {
    if (this._closed) {
      return;
    }
    this._rejectConnected(err);
    this.close();
    this._onClosed(err);
  }

  private _connectionStateChanged = () => {
    switch (this._peerConnection.connectionState) {
      case "connected":
        clearTimeout(this._connectTimeout);
        this._resolveConnected();
        break;
      case "failed":
        this._fail(new Error("Microphone connection failed"));
        break;
      default:
        break;
    }
  };

  private _handleOfferEvent = async (event: WebRtcOfferEvent) => {
    if (this._closed) {
      return;
    }
    if (event.type === "session") {
      this._sessionId = event.session_id;
      this._candidatesList.forEach((candidate) =>
        addWebRtcCandidate(
          this._api,
          this._entityId,
          event.session_id,
          candidate.toJSON()
        )
      );
      this._candidatesList = [];
    }
    if (event.type === "answer") {
      try {
        await this._peerConnection.setRemoteDescription({
          type: "answer",
          sdp: event.answer,
        });
      } catch (err: unknown) {
        this._fail(err instanceof Error ? err : new Error(String(err)));
      }
    }
    if (event.type === "candidate") {
      try {
        await this._peerConnection.addIceCandidate(
          event.candidate.sdpMid || event.candidate.sdpMLineIndex != null
            ? event.candidate
            : { candidate: event.candidate.candidate, sdpMid: "0" }
        );
      } catch (_err: unknown) {
        // A single failing candidate does not break the connection
      }
    }
    if (event.type === "error") {
      this._fail(new Error(event.message));
    }
  };

  private _handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    if (!event.candidate?.candidate) {
      return;
    }
    if (this._sessionId) {
      addWebRtcCandidate(
        this._api,
        this._entityId,
        this._sessionId,
        event.candidate.toJSON()
      );
    } else {
      this._candidatesList.push(event.candidate);
    }
  };
}
