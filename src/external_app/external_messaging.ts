import { Connection } from "home-assistant-js-websocket";
import { showNotificationDrawer } from "../dialogs/notifications/show-notification-drawer";
import { ExternalConfig, getExternalConfig } from "./external_config";
import {
  externalForwardConnectionEvents,
  externalForwardHaptics,
} from "./external_events_forwarder";

const CALLBACK_EXTERNAL_BUS = "externalBus";

interface CommandInFlight {
  resolve: (data: any) => void;
  reject: (err: EMError) => void;
}

export interface EMMessage {
  id?: number;
  type: string;
  payload?: unknown;
}

interface EMError {
  code: string;
  message: string;
}

interface EMMessageResultSuccess {
  id: number;
  type: "result";
  success: true;
  result: unknown;
}

interface EMMessageResultError {
  id: number;
  type: "result";
  success: false;
  error: EMError;
}

interface EMExternalMessageRestart {
  id: number;
  type: "command";
  command: "restart";
}

interface EMExternMessageShowNotifications {
  id: number;
  type: "command";
  command: "notifications/show";
}

type ExternalMessage =
  | EMMessageResultSuccess
  | EMMessageResultError
  | EMExternalMessageRestart
  | EMExternMessageShowNotifications;

export class ExternalMessaging {
  public config!: ExternalConfig;

  public commands: { [msgId: number]: CommandInFlight } = {};

  public connection?: Connection;

  public cache: Record<string, any> = {};

  public msgId = 0;

  public async attach() {
    externalForwardConnectionEvents(this);
    externalForwardHaptics(this);
    window[CALLBACK_EXTERNAL_BUS] = (msg) => this.receiveMessage(msg);
    this.config = await getExternalConfig(this);
  }

  /**
   * Send message to external app that expects a response.
   * @param msg message to send
   */
  public sendMessage<T>(msg: EMMessage): Promise<T> {
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
  public fireMessage(
    msg: EMMessage | EMMessageResultSuccess | EMMessageResultError
  ) {
    if (!msg.id) {
      msg.id = ++this.msgId;
    }
    this._sendExternal(msg);
  }

  public receiveMessage(msg: ExternalMessage) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("Receiving message from external app", msg);
    }

    if (msg.type === "command") {
      if (!this.connection) {
        // eslint-disable-next-line no-console
        console.warn("Received command without having connection set", msg);
        this.fireMessage({
          id: msg.id,
          type: "result",
          success: false,
          error: {
            code: "commands_not_init",
            message: `Commands connection not set`,
          },
        });
      } else if (msg.command === "restart") {
        this.connection.reconnect(true);
        this.fireMessage({
          id: msg.id,
          type: "result",
          success: true,
          result: null,
        });
      } else if (msg.command === "notifications/show") {
        const hassEl = this.hassEl;
        if (hassEl) {
          showNotificationDrawer(hassEl, {
            narrow: document.body.clientWidth < 870,
          });
        }
        this.fireMessage({
          id: msg.id,
          type: "result",
          success: true,
          result: null,
        });
      } else {
        // @ts-ignore
        // eslint-disable-next-line no-console
        console.warn("Received unknown command", msg.command, msg);
        this.fireMessage({
          // @ts-ignore
          id: msg.id,
          type: "result",
          success: false,
          error: {
            code: "unknown_command",
            // @ts-ignore
            message: `Unknown command ${msg.command}`,
          },
        });
      }
      return;
    }

    const pendingCmd = this.commands[msg.id];

    if (!pendingCmd) {
      // eslint-disable-next-line no-console
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

  private get hassEl() {
    return document.body.querySelector("home-assistant");
  }

  protected _sendExternal(msg: EMMessage) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("Sending message to external app", msg);
    }
    if (window.externalApp) {
      window.externalApp.externalBus(JSON.stringify(msg));
    } else {
      window.webkit!.messageHandlers.externalBus.postMessage(msg);
    }
  }
}
