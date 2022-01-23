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

export type EMExternalMessageCommands =
  | EMExternalMessageRestart
  | EMExternMessageShowNotifications;

type ExternalMessage =
  | EMMessageResultSuccess
  | EMMessageResultError
  | EMExternalMessageCommands;

type ExternalMessageHandler = (msg: EMExternalMessageCommands) => boolean;

export interface ExternalConfig {
  hasSettingsScreen: boolean;
  hasSidebar: boolean;
  canWriteTag: boolean;
  hasExoPlayer: boolean;
}

export class ExternalMessaging {
  public config!: ExternalConfig;

  public commands: { [msgId: number]: CommandInFlight } = {};

  public msgId = 0;

  private _commandHandler?: ExternalMessageHandler;

  public async attach() {
    window[CALLBACK_EXTERNAL_BUS] = (msg) => this.receiveMessage(msg);
    window.addEventListener("connection-status", (ev) =>
      this.fireMessage({
        type: "connection-status",
        payload: { event: ev.detail },
      })
    );
    this.config = await this.sendMessage<ExternalConfig>({
      type: "config/get",
    });
  }

  public addCommandHandler(handler: ExternalMessageHandler) {
    this._commandHandler = handler;
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
      if (!this._commandHandler || !this._commandHandler(msg)) {
        let code: string;
        let message: string;
        if (this._commandHandler) {
          code = "not_ready";
          message = "Command handler not ready";
        } else {
          code = "unknown_command";
          message = `Unknown command ${msg.command}`;
        }
        // eslint-disable-next-line no-console
        console.warn(message, msg);
        this.fireMessage({
          id: msg.id,
          type: "result",
          success: false,
          error: {
            code,
            message,
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
