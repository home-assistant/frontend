import type { PropertyValues } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import "../../layouts/hass-error-screen";
import "../../layouts/hass-loading-screen";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant, Route } from "../../types";
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

  @state() private _repositories?: RepositoryBase[];

  @state() private _info?: StoreInfo;

  // The panel is registered on every install, the integration is not. Gate
  // the subscriptions on this so SubscribeMixin retries once it shows up.
  @state() private _integrationLoaded?: true;

  protected hassSubscribeRequiredHostProps = ["_integrationLoaded"];

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

    if (this._integrationLoaded || !this.hass) {
      return;
    }

    const previousHass = changedProperties.get("hass");
    const componentsChanged =
      previousHass?.config.components !== this.hass.config.components;

    if ((this.hasUpdated && !componentsChanged) || !this._isLoaded) {
      return;
    }

    this._integrationLoaded = true;
    this._refreshInfo();
    this._refreshRepositories();
  }

  protected render() {
    if (!this._isLoaded) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
          .error=${this.hass.localize("ui.panel.store.not_loaded")}
        ></hass-error-screen>
      `;
    }

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

  private get _isLoaded(): boolean {
    return isComponentLoaded(this.hass.config, "store");
  }

  private _handleRefresh = (): void => {
    this._refreshRepositories();
  };

  private _refreshInfo = async (): Promise<void> => {
    try {
      this._info = await fetchStoreInfo(this.hass);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch Community store information", err);
    }
  };

  private _refreshRepositories = async (): Promise<void> => {
    try {
      this._repositories = await getRepositories(this.hass);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch Community store repositories", err);
    }
  };

  static get styles() {
    return [storeStyles, storeStyleVariables];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-store": HaPanelStore;
  }
}
