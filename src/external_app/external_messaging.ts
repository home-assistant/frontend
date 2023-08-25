const CALLBACK_EXTERNAL_BUS = "externalBus";

interface CommandInFlight {
  resolve: (data: any) => void;
  reject: (err: EMError) => void;
}

export interface EMMessage {
  id?: number;
  type: string;
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

interface EMOutgoingMessageConfigGet extends EMMessage {
  type: "config/get";
}

interface EMOutgoingMessageMatterCommission extends EMMessage {
  type: "matter/commission";
}

type EMOutgoingMessageWithAnswer = {
  "config/get": {
    request: EMOutgoingMessageConfigGet;
    response: ExternalConfig;
  };
};

interface EMOutgoingMessageExoplayerPlayHLS extends EMMessage {
  type: "exoplayer/play_hls";
  payload: {
    url: string;
    muted: boolean;
  };
}
interface EMOutgoingMessageExoplayerResize extends EMMessage {
  type: "exoplayer/resize";
  payload: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

interface EMOutgoingMessageExoplayerStop extends EMMessage {
  type: "exoplayer/stop";
}

interface EMOutgoingMessageThemeUpdate extends EMMessage {
  type: "theme-update";
}

interface EMOutgoingMessageHaptic extends EMMessage {
  type: "haptic";
  payload: { hapticType: string };
}

interface EMOutgoingMessageConnectionStatus extends EMMessage {
  type: "connection-status";
  payload: { event: string };
}

interface EMOutgoingMessageAppConfiguration extends EMMessage {
  type: "config_screen/show";
}

interface EMOutgoingMessageTagWrite extends EMMessage {
  type: "tag/write";
  payload: {
    name: string | null;
    tag: string;
  };
}

interface EMOutgoingMessageSidebarShow extends EMMessage {
  type: "sidebar/show";
}

interface EMOutgoingMessageAssistShow extends EMMessage {
  type: "assist/show";
  payload?: {
    pipeline_id: "preferred" | "last_used" | string;
    start_listening: boolean;
  };
}

type EMOutgoingMessageWithoutAnswer =
  | EMOutgoingMessageHaptic
  | EMOutgoingMessageConnectionStatus
  | EMOutgoingMessageAppConfiguration
  | EMOutgoingMessageTagWrite
  | EMOutgoingMessageSidebarShow
  | EMOutgoingMessageAssistShow
  | EMOutgoingMessageExoplayerPlayHLS
  | EMOutgoingMessageExoplayerResize
  | EMOutgoingMessageExoplayerStop
  | EMOutgoingMessageThemeUpdate
  | EMMessageResultSuccess
  | EMMessageResultError
  | EMOutgoingMessageMatterCommission;

interface EMIncomingMessageRestart {
  id: number;
  type: "command";
  command: "restart";
}

interface EMIncomingMessageShowNotifications {
  id: number;
  type: "command";
  command: "notifications/show";
}

interface EMIncomingMessageToggleSidebar {
  id: number;
  type: "command";
  command: "sidebar/toggle";
}

interface EMIncomingMessageShowSidebar {
  id: number;
  type: "command";
  command: "sidebar/show";
}

export type EMIncomingMessageCommands =
  | EMIncomingMessageRestart
  | EMIncomingMessageShowNotifications
  | EMIncomingMessageToggleSidebar
  | EMIncomingMessageShowSidebar;

type EMIncomingMessage =
  | EMMessageResultSuccess
  | EMMessageResultError
  | EMIncomingMessageCommands;

type EMIncomingMessageHandler = (msg: EMIncomingMessageCommands) => boolean;

export interface ExternalConfig {
  hasSettingsScreen: boolean;
  hasSidebar: boolean;
  canWriteTag: boolean;
  hasExoPlayer: boolean;
  canCommissionMatter: boolean;
  hasAssist: boolean;
}

export class ExternalMessaging {
  public config!: ExternalConfig;

  public commands: { [msgId: number]: CommandInFlight } = {};

  public msgId = 0;

  private _commandHandler?: EMIncomingMessageHandler;

  public async attach() {
    window[CALLBACK_EXTERNAL_BUS] = (msg) => this.receiveMessage(msg);
    window.addEventListener("connection-status", (ev) =>
      this.fireMessage({
        type: "connection-status",
        payload: { event: ev.detail },
      })
    );
    this.config = await this.sendMessage<"config/get">({
      type: "config/get",
    });
  }

  public addCommandHandler(handler: EMIncomingMessageHandler) {
    this._commandHandler = handler;
  }

  /**
   * Send message to external app that expects a response.
   * @param msg message to send
   */
  public sendMessage<T extends keyof EMOutgoingMessageWithAnswer>(
    msg: EMOutgoingMessageWithAnswer[T]["request"]
  ): Promise<EMOutgoingMessageWithAnswer[T]["response"]> {
    const msgId = ++this.msgId;
    msg.id = msgId;

    this._sendExternal(msg);

    return new Promise<EMOutgoingMessageWithAnswer[T]["response"]>(
      (resolve, reject) => {
        this.commands[msgId] = { resolve, reject };
      }
    );
  }

  /**
   * Send message to external app without expecting a response.
   * @param msg message to send
   */
  public fireMessage(msg: EMOutgoingMessageWithoutAnswer) {
    if (!msg.id) {
      msg.id = ++this.msgId;
    }
    this._sendExternal(msg);
  }

  public receiveMessage(msg: EMIncomingMessage) {
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
