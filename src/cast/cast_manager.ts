/* eslint-disable no-console */

import { Auth } from "home-assistant-js-websocket";
import { castApiAvailable } from "./cast_framework";
import { CAST_APP_ID, CAST_DEV, CAST_NS } from "./const";
import { CAST_DEV_HASS_URL } from "./dev_const";
import {
  castSendAuth,
  HassMessage as ReceiverMessage,
} from "./receiver_messages";
import { ReceiverStatusMessage, SenderMessage } from "./sender_messages";

let managerProm: Promise<CastManager> | undefined;

type CastEventListener = () => void;

/*
General flow of Chromecast:

Chromecast sessions are started via the Chromecast button. When clicked, session
state changes to started. We then send authentication, which will cause the
receiver app to send a status update.

If a session is already active, we query the status to see what it is up to. If
a user presses the cast button we send auth if not connected yet, then send
command as usual.
*/

type CastEvent = "connection-changed" | "state-changed";

export class CastManager {
  public auth?: Auth;

  // If the cast connection is connected to our Hass.
  public status?: ReceiverStatusMessage;

  private _eventListeners: { [event: string]: CastEventListener[] } = {};

  constructor(auth?: Auth) {
    this.auth = auth;
    const context = this.castContext;
    context.setOptions({
      receiverApplicationId: CAST_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });
    context.addEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      this._sessionStateChanged
    );
    context.addEventListener(
      cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      this._castStateChanged
    );
  }

  public addEventListener(event: CastEvent, listener: CastEventListener) {
    if (!(event in this._eventListeners)) {
      this._eventListeners[event] = [];
    }
    this._eventListeners[event].push(listener);

    return () => {
      this._eventListeners[event].splice(
        this._eventListeners[event].indexOf(listener)
      );
    };
  }

  public get castConnectedToOurHass(): boolean {
    return (
      this.status !== undefined &&
      this.auth !== undefined &&
      this.status.connected &&
      (this.status.hassUrl === this.auth.data.hassUrl ||
        (CAST_DEV && this.status.hassUrl === CAST_DEV_HASS_URL))
    );
  }

  public sendMessage(msg: ReceiverMessage) {
    if (__DEV__) {
      console.log("Sending cast message", msg);
    }
    this.castSession.sendMessage(CAST_NS, msg);
  }

  public get castState() {
    return this.castContext.getCastState();
  }

  public get castContext() {
    // @ts-ignore
    return cast.framework.CastContext.getInstance();
  }

  public get castSession() {
    return this.castContext.getCurrentSession()!;
  }

  public requestSession() {
    return this.castContext.requestSession();
  }

  private _fireEvent(event: CastEvent) {
    for (const listener of this._eventListeners[event] || []) {
      listener();
    }
  }

  private _receiveMessage(msg: SenderMessage) {
    if (__DEV__) {
      console.log("Received cast message", msg);
    }
    if (msg.type === "receiver_status") {
      this.status = msg;
      this._fireEvent("connection-changed");
    }
  }

  private _sessionStateChanged = (ev: cast.framework.SessionStateEventData) => {
    if (__DEV__) {
      console.log("Cast session state changed", ev.sessionState);
    }
    // On Android, opening a new session always results in SESSION_RESUMED.
    // So treat both as the same.
    if (
      ev.sessionState === "SESSION_STARTED" ||
      ev.sessionState === "SESSION_RESUMED"
    ) {
      if (this.auth) {
        castSendAuth(this, this.auth);
      } else {
        // Only do if no auth, as this is done as part of sendAuth.
        this.sendMessage({ type: "get_status" });
      }
      this._attachMessageListener();
    } else if (ev.sessionState === "SESSION_ENDED") {
      this.status = undefined;
      this._fireEvent("connection-changed");
    }
  };

  private _castStateChanged = (ev: cast.framework.CastStateEventData) => {
    if (__DEV__) {
      console.log("Cast state changed", ev.castState);
    }
    this._fireEvent("state-changed");
  };

  private _attachMessageListener() {
    const session = this.castSession;
    session.addMessageListener(CAST_NS, (_ns, msg) =>
      this._receiveMessage(JSON.parse(msg))
    );
  }
}

export const getCastManager = (auth?: Auth) => {
  if (!managerProm) {
    managerProm = castApiAvailable().then((isAvailable) => {
      if (!isAvailable) {
        throw new Error("No Cast API available");
      }
      return new CastManager(auth);
    });
  }
  return managerProm;
};
