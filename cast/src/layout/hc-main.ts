import { HassElement } from "../../../src/state/hass-element";
import {
  getAuth,
  createConnection,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import { customElement, TemplateResult, html, property } from "lit-element";
import {
  HassMessage,
  ConnectMessage,
  ShowLovelaceViewMessage,
  GetStatusMessage,
} from "../../../src/cast/receiver_messages";
import {
  LovelaceConfig,
  getLovelaceCollection,
} from "../../../src/data/lovelace";
import "./hc-launch-screen";
import { castContext } from "../cast_context";
import { CAST_NS } from "../../../src/cast/const";
import { ReceiverStatusMessage } from "../../../src/cast/sender_messages";

@customElement("hc-main")
export class HcMain extends HassElement {
  @property() private _lovelaceConfig?: LovelaceConfig;
  @property() private _lovelacePath?: string;
  @property() private _error?: string;
  private _unsubLovelace?: UnsubscribeFunc;

  public processIncomingMessage(msg: HassMessage) {
    if (msg.type === "connect") {
      this._handleConnectMessage(msg);
    } else if (msg.type === "show_lovelace_view") {
      this._handleShowLovelaceMessage(msg);
    } else if (msg.type === "get_status") {
      this._handleGetStatusMessage(msg);
    } else {
      // tslint:disable-next-line: no-console
      console.warn("unknown msg type", msg);
    }
  }

  protected render(): TemplateResult | void {
    if (!this._lovelaceConfig) {
      return html`
        <hc-launch-screen
          .hass=${this.hass}
          .error=${this._error}
        ></hc-launch-screen>
      `;
    }
    return html`
      <hc-lovelace
        .hass=${this.hass}
        .lovelaceConfig=${this._lovelaceConfig}
        .viewPath=${this._lovelacePath}
      ></hc-lovelace>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    import("../second-load");
  }

  private _sendStatus(senderId?: string) {
    const status: ReceiverStatusMessage = {
      type: "receiver_status",
      connected: !!this.hass,
    };

    if (this.hass) {
      status.hassUrl = this.hass.auth.data.hassUrl;
      status.lovelacePath = this._lovelacePath;
    }

    if (senderId) {
      this.sendMessage(senderId, status);
    } else {
      for (const sender of castContext.getSenders()) {
        this.sendMessage(sender.id, status);
      }
    }
  }

  private async _handleGetStatusMessage(msg: GetStatusMessage) {
    this._sendStatus(msg.senderId!);
  }

  private async _handleConnectMessage(msg: ConnectMessage) {
    let auth;
    try {
      auth = await getAuth({
        loadTokens: async () => ({
          hassUrl: msg.hassUrl,
          clientId: msg.clientId,
          refresh_token: msg.refreshToken,
          access_token: "",
          expires: 0,
          expires_in: 0,
        }),
      });
    } catch (err) {
      this._error = err;
      return;
    }
    const connection = await createConnection({ auth });
    if (this.hass) {
      this.hass.connection.close();
    }
    this.initializeHass(auth, connection);
    this._error = undefined;
    this._sendStatus();
  }

  private _handleShowLovelaceMessage(msg: ShowLovelaceViewMessage) {
    // We should not get this command before we are connected.
    // Means a client got out of sync. Let's send status to them.
    if (!this.hass) {
      this._sendStatus(msg.senderId!);
      this._error = "Cannot show Lovelace because we're not connected.";
      return;
    }
    if (!this._unsubLovelace) {
      this._unsubLovelace = getLovelaceCollection(
        this.hass!.connection
      ).subscribe((lovelaceConfig) => {
        castContext.setApplicationState(lovelaceConfig.title!);
        this._lovelaceConfig = lovelaceConfig;
      });
    }
    this._lovelacePath = msg.viewPath;
    if (castContext.getDeviceCapabilities().touch_input_supported) {
      this._breakFree();
    }
    this._sendStatus();
  }

  private _breakFree() {
    const controls = document.body.querySelector("touch-controls");
    if (controls) {
      controls.remove();
    }
  }

  private sendMessage(senderId: string, response: any) {
    castContext.sendCustomMessage(CAST_NS, senderId, response);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-main": HcMain;
  }
}
