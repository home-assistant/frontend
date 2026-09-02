import type { PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import "../../layouts/hass-loading-screen";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import { StoreDispatchEvent } from "./data/common";
import type { StoreData, StoreInfo } from "./data/store";
import type { RepositoryBase } from "./data/repository";
import {
  fetchStoreInfo,
  getRepositories,
  websocketSubscription,
} from "./data/websocket";
import "./ha-store-router";
import { storeStyles } from "./styles/store-common-style";
import { storeStyleVariables } from "./styles/variables";

@customElement("ha-panel-store")
class HaPanelStore extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public panel?: PanelInfo;

  @state() private _repositories?: RepositoryBase[];

  @state() private _info?: StoreInfo;

  private _store = memoizeOne(
    (repositories: RepositoryBase[], info: StoreInfo): StoreData => ({
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
        StoreDispatchEvent.CONFIG
      ),
      websocketSubscription(
        this.hass,
        this._refreshInfo,
        StoreDispatchEvent.STATUS
      ),
      websocketSubscription(
        this.hass,
        this._refreshInfo,
        StoreDispatchEvent.STAGE
      ),
      websocketSubscription(
        this.hass,
        this._refreshRepositories,
        StoreDispatchEvent.REPOSITORY
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
      <ha-store-router
        .hass=${this.hass}
        .store=${this._store(this._repositories, this._info)}
        .route=${this.route}
        .narrow=${this.narrow}
      ></ha-store-router>
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
    this._info = await fetchStoreInfo(this.hass);
  };

  private _refreshRepositories = async (): Promise<void> => {
    this._repositories = await getRepositories(this.hass);
  };

  static get styles() {
    return [
      storeStyles,
      storeStyleVariables,
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
