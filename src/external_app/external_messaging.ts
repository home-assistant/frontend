const CALLBACK_RECEIVE_MESSAGE = "externalReceiveMessage";

interface CommandInFlight {
  resolve: (data: any) => void;
  reject: (err: ExternalError) => void;
}

export interface InternalMessage {
  msgId?: number;
  type: string;
}

interface ExternalError {
  code: string;
  message: string;
}

interface ExternalMessageResult {
  msgId: number;
  type: "result";
  success: true;
  result: unknown;
}

interface ExternalMessageResultError {
  msgId: number;
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
    window[CALLBACK_RECEIVE_MESSAGE] = (msg) => this.receiveMessage(msg);
  }

  /**
   * Send message to external app that expects a response.
   * @param msg message to send
   */
  public sendMessage<T>(msg: InternalMessage): Promise<T> {
    const msgId = ++this.msgId;
    msg.msgId = msgId;

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
    if (!msg.msgId) {
      msg.msgId = ++this.msgId;
    }
    this._sendExternal(msg);
  }

  public receiveMessage(msg: ExternalMessage) {
    const pendingCmd = this.commands[msg.msgId];

    if (!pendingCmd) {
      // tslint:disable-next-line: no-console
      console.warn(`Received unknown msg ID`, msg.msgId);
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
    if (window.externalApp) {
      window.externalApp.sendMessageToExternal(JSON.stringify(msg));
    } else {
      window.webkit!.messageHandlers.sendMessageToExternal.postMessage(msg);
    }
  }
}
