import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { createConnection, getAuth } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html } from "lit";
import { customElement, state } from "lit/decorators";
import { CAST_NS } from "../../../../src/cast/const";
import type {
  ConnectMessage,
  GetStatusMessage,
  HassMessage,
  ShowDemoMessage,
  ShowLovelaceViewMessage,
} from "../../../../src/cast/receiver_messages";
import type {
  ReceiverErrorMessage,
  ReceiverStatusMessage,
} from "../../../../src/cast/sender_messages";
import { ReceiverErrorCode } from "../../../../src/cast/sender_messages";
import { atLeastVersion } from "../../../../src/common/config/version";
import { isNavigationClick } from "../../../../src/common/dom/is-navigation-click";
import {
  getLegacyLovelaceCollection,
  getLovelaceCollection,
} from "../../../../src/data/lovelace";
import type {
  LegacyLovelaceConfig,
  LovelaceConfig,
  LovelaceDashboardStrategyConfig,
} from "../../../../src/data/lovelace/config/types";
import { isStrategyDashboard } from "../../../../src/data/lovelace/config/types";
import { fetchResources } from "../../../../src/data/lovelace/resource";
import { loadLovelaceResources } from "../../../../src/panels/lovelace/common/load-resources";
import { HassElement } from "../../../../src/state/hass-element";
import { castContext } from "../cast_context";
import "./hc-launch-screen";
import { getPanelTitleFromUrlPath } from "../../../../src/data/panel";
import { checkLovelaceConfig } from "../../../../src/panels/lovelace/common/check-lovelace-config";

const DEFAULT_CONFIG: LovelaceDashboardStrategyConfig = {
  strategy: {
    type: "original-states",
  },
};

let resourcesLoaded = false;
@customElement("hc-main")
export class HcMain extends HassElement {
  @state() private _showDemo = false;

  @state() private _lovelaceConfig?: LovelaceConfig;

  @state() private _lovelacePath: string | number | null = null;

  @state() private _urlPath?: string | null;

  @state() private _error?: string;

  private _hassUUID?: string;

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
      // eslint-disable-next-line no-console
      console.warn("unknown msg type", msg);
    }
  }

  protected render(): TemplateResult {
    if (this._showDemo) {
      return html` <hc-demo .lovelacePath=${this._lovelacePath}></hc-demo> `;
    }

    if (
      !this._lovelaceConfig ||
      this._urlPath === undefined ||
      // Guard against part of HA not being loaded yet.
      !this.hass ||
      !this.hass.states ||
      !this.hass.config ||
      !this.hass.services
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
        .urlPath=${this._urlPath}
        .viewPath=${this._lovelacePath}
        @config-refresh=${this._generateDefaultLovelaceConfig}
      ></hc-lovelace>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    import("./hc-lovelace");
    import("../../../../src/resources/append-ha-style");

    window.addEventListener("location-changed", () => {
      const panelPath = `/${this._urlPath || "lovelace"}/`;
      if (location.pathname.startsWith(panelPath)) {
        this._lovelacePath = location.pathname.substr(panelPath.length);
        this._sendStatus();
      }
    });
    document.body.addEventListener("click", (ev) => {
      const panelPath = `/${this._urlPath || "lovelace"}/`;
      const href = isNavigationClick(ev);
      if (href && href.startsWith(panelPath)) {
        this._lovelacePath = href.substr(panelPath.length);
        this._sendStatus();
      }
    });
    this.addEventListener("dialog-closed", this._dialogClosed);
  }

  private _sendStatus(senderId?: string) {
    const status: ReceiverStatusMessage = {
      type: "receiver_status",
      connected: !!this.hass,
      showDemo: this._showDemo,
    };

    if (this.hass) {
      status.hassUrl = this.hass.auth.data.hassUrl;
      status.hassUUID = this._hassUUID;
      status.lovelacePath = this._lovelacePath;
      status.urlPath = this._urlPath;
    }

    if (senderId) {
      this._sendMessage(senderId, status);
    } else {
      for (const sender of castContext.getSenders()) {
        this._sendMessage(sender.id, status);
      }
    }
  }

  private _sendError(
    error_code: number,
    error_message: string,
    senderId?: string
  ) {
    const error: ReceiverErrorMessage = {
      type: "receiver_error",
      error_code,
      error_message,
    };

    if (senderId) {
      this._sendMessage(senderId, error);
    } else {
      for (const sender of castContext.getSenders()) {
        this._sendMessage(sender.id, error);
      }
    }
  }

  private _dialogClosed = () => {
    document.body.setAttribute("style", "overflow-y: auto !important");
  };

  private async _handleGetStatusMessage(msg: GetStatusMessage) {
    if (
      (this.hass && msg.hassUUID && msg.hassUUID !== this._hassUUID) ||
      (this.hass && msg.hassUrl && msg.hassUrl !== this.hass.auth.data.hassUrl)
    ) {
      this._error = "Not connected to the same Home Assistant instance.";
      this._sendError(
        ReceiverErrorCode.WRONG_INSTANCE,
        this._error,
        msg.senderId!
      );
    }

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
    } catch (err: any) {
      const errorMessage = this._getErrorMessage(err);
      this._error = errorMessage;
      this._sendError(err, errorMessage);
      return;
    }
    let connection;
    try {
      connection = await createConnection({ auth });
    } catch (err: any) {
      const errorMessage = this._getErrorMessage(err);
      this._error = errorMessage;
      this._sendError(err, errorMessage);
      return;
    }
    if (this.hass) {
      this.hass.connection.close();
    }
    this.initializeHass(auth, connection);
    if (this._hassUUID !== msg.hassUUID) {
      this._hassUUID = msg.hassUUID;
      this._lovelaceConfig = undefined;
      this._urlPath = undefined;
      this._lovelacePath = null;
      if (this._unsubLovelace) {
        this._unsubLovelace();
        this._unsubLovelace = undefined;
      }
      resourcesLoaded = false;
    }
    this._error = undefined;
    this._sendStatus();
  }

  private async _handleShowLovelaceMessage(msg: ShowLovelaceViewMessage) {
    this._showDemo = false;
    // We should not get this command before we are connected.
    // Means a client got out of sync. Let's send status to them.
    if (!this.hass?.connected) {
      this._sendStatus(msg.senderId!);
      this._error = "Cannot show Lovelace because we're not connected.";
      this._sendError(
        ReceiverErrorCode.NOT_CONNECTED,
        this._error,
        msg.senderId!
      );
      return;
    }

    if (
      (msg.hassUUID && msg.hassUUID !== this._hassUUID) ||
      (msg.hassUrl && msg.hassUrl !== this.hass.auth.data.hassUrl)
    ) {
      this._sendStatus(msg.senderId!);
      this._error =
        "Cannot show Lovelace because we're not connected to the same Home Assistant instance.";
      this._sendError(
        ReceiverErrorCode.WRONG_INSTANCE,
        this._error,
        msg.senderId!
      );
      return;
    }

    this._error = undefined;
    if (msg.urlPath === "lovelace" || msg.urlPath === undefined) {
      msg.urlPath = null;
    }
    this._lovelacePath = msg.viewPath;
    if (msg.urlPath === "energy") {
      this._lovelaceConfig = {
        views: [
          {
            strategy: {
              type: "energy",
            },
          },
        ],
      };
      this._urlPath = "energy";
      this._lovelacePath = null;
      this._sendStatus();
      return;
    }
    if (!this._unsubLovelace || this._urlPath !== msg.urlPath) {
      this._urlPath = msg.urlPath;
      this._lovelaceConfig = undefined;
      if (this._unsubLovelace) {
        this._unsubLovelace();
        this._unsubLovelace = undefined;
      }
      const llColl = atLeastVersion(this.hass.connection.haVersion, 0, 107)
        ? getLovelaceCollection(this.hass.connection, msg.urlPath)
        : getLegacyLovelaceCollection(this.hass.connection);
      // We first do a single refresh because we need to check if there is LL
      // configuration.
      try {
        await llColl.refresh();
        this._unsubLovelace = llColl.subscribe(async (rawConfig) => {
          if (isStrategyDashboard(rawConfig)) {
            const { generateLovelaceDashboardStrategy } = await import(
              "../../../../src/panels/lovelace/strategies/get-strategy"
            );
            const config = await generateLovelaceDashboardStrategy(
              rawConfig,
              this.hass!
            );
            this._handleNewLovelaceConfig(config);
          } else {
            this._handleNewLovelaceConfig(rawConfig);
          }
        });
      } catch (err: any) {
        if (
          atLeastVersion(this.hass.connection.haVersion, 0, 107) &&
          err.code !== "config_not_found"
        ) {
          // eslint-disable-next-line
          console.log("Error fetching Lovelace configuration", err, msg);
          this._error = `Error fetching Lovelace configuration: ${err.message}`;
          this._sendError(ReceiverErrorCode.FETCH_CONFIG_FAILED, this._error);
          return;
        }
        // Generate a Lovelace config.
        this._unsubLovelace = () => undefined;
        await this._generateDefaultLovelaceConfig();
      }
    }
    if (!resourcesLoaded) {
      resourcesLoaded = true;
      const resources = atLeastVersion(this.hass.connection.haVersion, 0, 107)
        ? await fetchResources(this.hass!.connection)
        : (this._lovelaceConfig as LegacyLovelaceConfig).resources;
      if (resources) {
        loadLovelaceResources(resources, this.hass!);
      }
    }

    this._sendStatus();
  }

  private async _generateDefaultLovelaceConfig() {
    const { generateLovelaceDashboardStrategy } = await import(
      "../../../../src/panels/lovelace/strategies/get-strategy"
    );
    this._handleNewLovelaceConfig(
      await generateLovelaceDashboardStrategy(DEFAULT_CONFIG, this.hass!)
    );
  }

  private _handleNewLovelaceConfig(lovelaceConfig: LovelaceConfig) {
    const title = getPanelTitleFromUrlPath(
      this.hass!,
      this._urlPath || "lovelace"
    );
    castContext.setApplicationState(title || "");
    this._lovelaceConfig = checkLovelaceConfig(
      lovelaceConfig
    ) as LovelaceConfig;
  }

  private _handleShowDemo(_msg: ShowDemoMessage) {
    import("./hc-demo").then(() => {
      this._showDemo = true;
      this._lovelacePath = "overview";
      this._sendStatus();
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

  private _sendMessage(senderId: string, response: any) {
    castContext.sendCustomMessage(CAST_NS, senderId, response);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-main": HcMain;
  }
}
