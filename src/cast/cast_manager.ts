import { castApiAvailable } from "./cast_framework";
import { CAST_APP_ID, CAST_NS, CAST_DEV_HASS_URL } from "./const";
import {
  castSendAuth,
  HassMessage as ReceiverMessage,
} from "./receiver_messages";
// tslint:disable-next-line: no-implicit-dependencies
import { SessionStateEventData } from "chromecast-caf-receiver/cast.framework";
import { SenderMessage, ReceiverStatusMessage } from "./sender_messages";
import { Auth } from "home-assistant-js-websocket";

let managerProm: Promise<CastManager> | undefined;

type CastEventListener = () => void;

/*
General flow of Chromecast:

Chromecast sessions are started via the Chromecast button. When clicked, session
state changes to started. We then send authentication and change our internal
state to be ready to send commands.

If a session is already active, we query the status to see what it is up to. If
a user presses the cast button we should send auth if not connected yet, then
send command as usual.
*/

/* tslint:disable:no-console */

type CastEvent = "connection-changed" | "something-else";

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
      // @ts-ignore
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });
    context.addEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      (ev) => this._sessionStateChanged(ev)
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
        (__DEV__ && this.status.hassUrl === CAST_DEV_HASS_URL))
    );
  }

  public sendMessage(msg: ReceiverMessage) {
    if (__DEV__) {
      console.log("Sending cast message", msg);
    }
    this.castSession.sendMessage(CAST_NS, msg);
  }

  public get castContext(): cast.framework.CastContext {
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

  private _sessionStateChanged(ev: SessionStateEventData) {
    if (__DEV__) {
      console.log("Cast session state changed", ev.sessionState);
    }
    if (ev.sessionState === "SESSION_RESUMED") {
      this.sendMessage({ type: "get_status" });
      this._attachMessageListener();
    } else if (ev.sessionState === "SESSION_STARTED") {
      if (this.auth) {
        castSendAuth(this, this.auth);
      }
      this._attachMessageListener();
    } else if (ev.sessionState === "SESSION_ENDED") {
      this.status = undefined;
      this._fireEvent("connection-changed");
    }
  }

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
