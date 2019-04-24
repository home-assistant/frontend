import {
  externalForwardConnectionEvents,
  externalForwardHaptics,
} from "./external_events_forwarder";

const CALLBACK_EXTERNAL_BUS = "externalBus";

interface CommandInFlight {
  resolve: (data: any) => void;
  reject: (err: ExternalError) => void;
}

export interface InternalMessage {
  id?: number;
  type: string;
  payload?: unknown;
}

interface ExternalError {
  code: string;
  message: string;
}

interface ExternalMessageResult {
  id: number;
  type: "result";
  success: true;
  result: unknown;
}

interface ExternalMessageResultError {
  id: number;
  type: "result";
  success: false;
  error: ExternalError;
}

type ExternalMessage = ExternalMessageResult | ExternalMessageResultError;

export class ExternalMessaging {
  public commands: { [msgId: number]: CommandInFlight } = {};
  public cache: { [key: string]: any } = {};
  public msgId = 0;

  public attach() {
    externalForwardConnectionEvents(this);
    externalForwardHaptics(this);
    window[CALLBACK_EXTERNAL_BUS] = (msg) => this.receiveMessage(msg);
  }

  /**
   * Send message to external app that expects a response.
   * @param msg message to send
   */
  public sendMessage<T>(msg: InternalMessage): Promise<T> {
    const msgId = ++this.msgId;
    msg.id = msgId;

    this.fireMessage(msg);

    return new Promise<T>((resolve, reject) => {
      this.commands[msgId] = { resolve, reject };
    });
  }

  /**
   * Send message to external app without expecting a response.
   * @param msg message to send
   */
  public fireMessage(msg: InternalMessage) {
    if (!msg.id) {
      msg.id = ++this.msgId;
    }
    this._sendExternal(msg);
  }

  public receiveMessage(msg: ExternalMessage) {
    if (__DEV__) {
      // tslint:disable-next-line: no-console
      console.log("Receiving message from external app", msg);
    }

    const pendingCmd = this.commands[msg.id];

    if (!pendingCmd) {
      // tslint:disable-next-line: no-console
      console.warn(`Received unknown msg ID`, msg.id);
      return;
    }

    if (msg.type === "result") {
      if (msg.success) {
        pendingCmd.resolve(msg.result);
      } else {
        pendingCmd.reject(msg.error);
      }
    }
  }

  protected _sendExternal(msg: InternalMessage) {
    if (__DEV__) {
      // tslint:disable-next-line: no-console
      console.log("Sending message to external app", msg);
    }
    if (window.externalApp) {
      window.externalApp.externalBus(JSON.stringify(msg));
    } else {
      window.webkit!.messageHandlers.externalBus.postMessage(msg);
    }
  }
}
