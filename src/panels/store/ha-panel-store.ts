import type { PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import "../../layouts/hass-loading-screen";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import { HacsDispatchEvent } from "./data/common";
import type { Hacs, HacsInfo } from "./data/hacs";
import type { RepositoryBase } from "./data/repository";
import {
  fetchHacsInfo,
  getRepositories,
  websocketSubscription,
} from "./data/websocket";
import "./hacs-router";
import { HacsStyles } from "./styles/hacs-common-style";
import { hacsStyleVariables } from "./styles/variables";

@customElement("ha-panel-store")
class HaPanelStore extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public panel?: PanelInfo;

  @state() private _repositories?: RepositoryBase[];

  @state() private _info?: HacsInfo;

  private _hacs = memoizeOne(
    (repositories: RepositoryBase[], info: HacsInfo): Hacs => ({
      repositories,
      info,
    })
  );

  public connectedCallback(): void {
    super.connectedCallback();
    // Dialogs are appended outside of this panel, so their refresh requests
    // never bubble through here.
    window.addEventListener("store-refresh", this._handleRefresh);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("store-refresh", this._handleRefresh);
  }

  public hassSubscribe() {
    return [
      websocketSubscription(
        this.hass,
        this._refreshInfo,
        HacsDispatchEvent.CONFIG
      ),
      websocketSubscription(
        this.hass,
        this._refreshInfo,
        HacsDispatchEvent.STATUS
      ),
      websocketSubscription(
        this.hass,
        this._refreshInfo,
        HacsDispatchEvent.STAGE
      ),
      websocketSubscription(
        this.hass,
        this._refreshRepositories,
        HacsDispatchEvent.REPOSITORY
      ),
      this.hass.connection.subscribeEvents(
        this._refreshInfo,
        "lovelace_updated"
      ),
    ];
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (!this.hasUpdated) {
      this._refreshInfo();
      this._refreshRepositories();
    }
  }

  protected render() {
    if (!this._repositories || !this._info) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></hass-loading-screen>
      `;
    }

    return html`
      <hacs-router
        .hass=${this.hass}
        .hacs=${this._hacs(this._repositories, this._info)}
        .route=${this.route}
        .narrow=${this.narrow}
      ></hacs-router>
    `;
  }

  private _handleRefresh = (
    ev: HASSDomEvent<HASSDomEvents["store-refresh"]>
  ): void => {
    if (ev.detail.target === "info") {
      this._refreshInfo();
      return;
    }

    this._refreshRepositories();
  };

  private _refreshInfo = async (): Promise<void> => {
    this._info = await fetchHacsInfo(this.hass);
  };

  private _refreshRepositories = async (): Promise<void> => {
    this._repositories = await getRepositories(this.hass);
  };

  static get styles() {
    return [
      HacsStyles,
      hacsStyleVariables,
      css`
        hass-loading-screen {
          height: 100vh;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-store": HaPanelStore;
  }
}
