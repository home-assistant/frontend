import {
  getAuth,
  createConnection,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import { customElement, TemplateResult, html, property } from "lit-element";
import { HassElement } from "../../../../src/state/hass-element";
import {
  HassMessage,
  ConnectMessage,
  ShowLovelaceViewMessage,
  GetStatusMessage,
  ShowDemoMessage,
} from "../../../../src/cast/receiver_messages";
import {
  LovelaceConfig,
  getLovelaceCollection,
} from "../../../../src/data/lovelace";
import "./hc-launch-screen";
import { castContext } from "../cast_context";
import { CAST_NS } from "../../../../src/cast/const";
import { ReceiverStatusMessage } from "../../../../src/cast/sender_messages";
import { loadLovelaceResources } from "../../../../src/panels/lovelace/common/load-resources";
import { isNavigationClick } from "../../../../src/common/dom/is-navigation-click";

@customElement("hc-main")
export class HcMain extends HassElement {
  @property() private _showDemo = false;

  @property() private _lovelaceConfig?: LovelaceConfig;

  @property() private _lovelacePath: string | number | null = null;

  @property() private _error?: string;

  private _unsubLovelace?: UnsubscribeFunc;

  public processIncomingMessage(msg: HassMessage) {
    if (msg.type === "connect") {
      this._handleConnectMessage(msg);
    } else if (msg.type === "show_lovelace_view") {
      this._handleShowLovelaceMessage(msg);
    } else if (msg.type === "get_status") {
      this._handleGetStatusMessage(msg);
    } else if (msg.type === "show_demo") {
      this._handleShowDemo(msg);
    } else {
      // tslint:disable-next-line: no-console
      console.warn("unknown msg type", msg);
    }
  }

  protected render(): TemplateResult {
    if (this._showDemo) {
      return html`
        <hc-demo .lovelacePath=${this._lovelacePath}></hc-demo>
      `;
    }

    if (
      !this._lovelaceConfig ||
      this._lovelacePath === null ||
      // Guard against part of HA not being loaded yet.
      (this.hass &&
        (!this.hass.states || !this.hass.config || !this.hass.services))
    ) {
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
    window.addEventListener("location-changed", () => {
      if (location.pathname.startsWith("/lovelace/")) {
        this._lovelacePath = location.pathname.substr(10);
        this._sendStatus();
      }
    });
    document.body.addEventListener("click", (ev) => {
      const href = isNavigationClick(ev);
      if (href && href.startsWith("/lovelace/")) {
        this._lovelacePath = href.substr(10);
        this._sendStatus();
      }
    });
  }

  private _sendStatus(senderId?: string) {
    const status: ReceiverStatusMessage = {
      type: "receiver_status",
      connected: !!this.hass,
      showDemo: this._showDemo,
    };

    if (this.hass) {
      status.hassUrl = this.hass.auth.data.hassUrl;
      status.lovelacePath = this._lovelacePath!;
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
      this._error = this._getErrorMessage(err);
      return;
    }
    let connection;
    try {
      connection = await createConnection({ auth });
    } catch (err) {
      this._error = this._getErrorMessage(err);
      return;
    }
    if (this.hass) {
      this.hass.connection.close();
    }
    this.initializeHass(auth, connection);
    this._error = undefined;
    this._sendStatus();
  }

  private async _handleShowLovelaceMessage(msg: ShowLovelaceViewMessage) {
    // We should not get this command before we are connected.
    // Means a client got out of sync. Let's send status to them.
    if (!this.hass) {
      this._sendStatus(msg.senderId!);
      this._error = "Cannot show Lovelace because we're not connected.";
      return;
    }
    if (!this._unsubLovelace) {
      const llColl = getLovelaceCollection(this.hass!.connection);
      // We first do a single refresh because we need to check if there is LL
      // configuration.
      try {
        await llColl.refresh();
        this._unsubLovelace = llColl.subscribe((lovelaceConfig) =>
          this._handleNewLovelaceConfig(lovelaceConfig)
        );
      } catch (err) {
        // Generate a Lovelace config.
        this._unsubLovelace = () => undefined;
        const { generateLovelaceConfigFromHass } = await import(
          "../../../../src/panels/lovelace/common/generate-lovelace-config"
        );
        this._handleNewLovelaceConfig(
          await generateLovelaceConfigFromHass(this.hass!)
        );
      }
    }
    this._showDemo = false;
    this._lovelacePath = msg.viewPath;
    if (castContext.getDeviceCapabilities().touch_input_supported) {
      this._breakFree();
    }
    this._sendStatus();
  }

  private _handleNewLovelaceConfig(lovelaceConfig: LovelaceConfig) {
    castContext.setApplicationState(lovelaceConfig.title!);
    this._lovelaceConfig = lovelaceConfig;
    if (lovelaceConfig.resources) {
      loadLovelaceResources(
        lovelaceConfig.resources,
        this.hass!.auth.data.hassUrl
      );
    }
  }

  private _handleShowDemo(_msg: ShowDemoMessage) {
    import("./hc-demo").then(() => {
      this._showDemo = true;
      this._lovelacePath = "overview";
      this._sendStatus();
      if (castContext.getDeviceCapabilities().touch_input_supported) {
        this._breakFree();
      }
    });
  }

  private _getErrorMessage(error: number): string {
    switch (error) {
      case 1:
        return "Unable to connect to the Home Assistant websocket API.";
      case 2:
        return "The supplied authentication is invalid.";
      case 3:
        return "The connection to Home Assistant was lost.";
      case 4:
        return "Missing hassUrl. This is required.";
      case 5:
        return "Home Assistant needs to be served over https:// to use with Home Assistant Cast.";
      default:
        return "Unknown Error";
    }
  }

  private _breakFree() {
    const controls = document.body.querySelector("touch-controls");
    if (controls) {
      controls.remove();
    }
    document.body.setAttribute("style", "overflow-y: auto !important");
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
