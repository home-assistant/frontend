import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import "../../components/ha-button";
import type { ConfigEntry, ConfigEntryUpdate } from "../../data/config_entries";
import { subscribeConfigEntries } from "../../data/config_entries";
import "../../layouts/hass-error-screen";
import "../../layouts/hass-loading-screen";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant, Route } from "../../types";
import { MarketplaceDispatchEvent } from "../../data/marketplace/common";
import type {
  MarketplaceData,
  MarketplaceInfo,
} from "../../data/marketplace/marketplace";
import type { RepositoryBase } from "../../data/marketplace/repository";
import {
  ERROR_NOT_LOADED,
  fetchMarketplaceInfo,
  isWebSocketError,
  marketplaceErrorMessage,
  subscribeMarketplaceChanges,
} from "../../data/marketplace/websocket";
import { fetchMarketplaceRepositories } from "../../data/marketplace/repository";
import "./components/ha-marketplace-warning";
import "./ha-marketplace-router";
import { haStyle } from "../../resources/styles";

// The entry is not going to load without the user stepping in.
const ENTRY_FAILED_STATES: ConfigEntry["state"][] = [
  "setup_error",
  "migration_error",
  "failed_unload",
];

@customElement("ha-panel-marketplace")
class HaPanelMarketplace extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _repositories?: RepositoryBase[];

  @state() private _info?: MarketplaceInfo;

  // Only shown while the first fetch has nothing to show yet.
  @state() private _loadError?: string;

  // The panel is registered on every install, the integration is not. Gate
  // the subscriptions on this so SubscribeMixin retries once it shows up.
  @state() private _integrationLoaded?: true;

  // The Marketplace commands answer with `not_loaded` until its config entry
  // is loaded, which happens a moment after Home Assistant started and again
  // on every reload of the entry.
  private _entryLoaded = false;

  @state() private _entry?: ConfigEntry;

  @state() private _entryRemoved = false;

  private _marketplaceUnsubs: Promise<UnsubscribeFunc>[] = [];

  private _repositoriesRequest?: Promise<void>;

  private _repositoriesOutdated = false;

  protected hassSubscribeRequiredHostProps = ["_integrationLoaded"];

  private _marketplace = memoizeOne(
    (
      repositories: RepositoryBase[],
      info: MarketplaceInfo
    ): MarketplaceData => ({
      repositories,
      info,
    })
  );

  public connectedCallback(): void {
    super.connectedCallback();
    // Changes arrive as signals from the backend, pages that need more ask here
    this.addEventListener("marketplace-refresh", this._handleRefresh);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("marketplace-refresh", this._handleRefresh);
    this._unsubscribeMarketplace();
    this._entryLoaded = false;
    this._entry = undefined;
  }

  public hassSubscribe() {
    return [
      subscribeConfigEntries(this.hass, this._handleConfigEntryUpdates),
      this.hass.connection.subscribeEvents(
        this._refreshInfo,
        "lovelace_updated"
      ),
      this._subscribeReconnect(),
    ];
  }

  // What the signals said while the connection was down is lost, the
  // entry is still loaded, so nothing else asks again
  private _subscribeReconnect(): UnsubscribeFunc {
    const connection = this.hass.connection;
    const handleReady = () => {
      if (this._entryLoaded) {
        this._handleRefresh();
      }
    };

    connection.addEventListener("ready", handleReady);
    return () => connection.removeEventListener("ready", handleReady);
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
  }

  // Only the user can fix the entry, the integration page is where they do it
  private _renderEntryProblem(error: string) {
    return html`
      <hass-error-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
        .error=${error}
      >
        <ha-button
          appearance="filled"
          size="s"
          href="/config/integrations/integration/marketplace"
        >
          ${this.hass.localize("ui.panel.marketplace.entry.open_integration")}
        </ha-button>
      </hass-error-screen>
    `;
  }

  protected render() {
    if (!this._isLoaded || this._entryRemoved) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
          .error=${this.hass.localize("ui.panel.marketplace.not_loaded")}
        ></hass-error-screen>
      `;
    }

    if (this._entry?.disabled_by) {
      return this._renderEntryProblem(
        this.hass.localize("ui.panel.marketplace.entry.disabled")
      );
    }

    if (this._entry && ENTRY_FAILED_STATES.includes(this._entry.state)) {
      return this._renderEntryProblem(
        this._entry.reason
          ? this.hass.localize("ui.panel.marketplace.entry.failed_reason", {
              reason: this._entry.reason,
            })
          : this.hass.localize("ui.panel.marketplace.entry.failed")
      );
    }

    if ((!this._repositories || !this._info) && this._loadError) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
          .error=${this.hass.localize("ui.panel.marketplace.load_failed", {
            error: this._loadError,
          })}
        >
          <ha-button appearance="filled" size="s" @click=${this._handleRetry}>
            ${this.hass.localize("ui.panel.marketplace.common.retry")}
          </ha-button>
        </hass-error-screen>
      `;
    }

    if (!this._repositories || !this._info) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
          .message=${
            this._entry?.state === "setup_retry"
              ? this.hass.localize("ui.panel.marketplace.entry.retrying")
              : undefined
          }
        ></hass-loading-screen>
      `;
    }

    if (!this._info.warning_accepted) {
      return html`
        <ha-marketplace-warning .narrow=${this.narrow}></ha-marketplace-warning>
      `;
    }

    return html`
      <ha-marketplace-router
        .hass=${this.hass}
        .marketplace=${this._marketplace(this._repositories, this._info)}
        .route=${this.route}
        .narrow=${this.narrow}
      ></ha-marketplace-router>
    `;
  }

  private get _isLoaded(): boolean {
    return isComponentLoaded(this.hass.config, "marketplace");
  }

  private _handleConfigEntryUpdates = (updates: ConfigEntryUpdate[]): void => {
    const update = updates.find(({ entry }) => entry.domain === "marketplace");
    if (!update) {
      return;
    }

    this._entryRemoved = update.type === "removed";
    this._entry = this._entryRemoved ? undefined : update.entry;

    // What the removed entry knew is gone with it
    if (this._entryRemoved) {
      this._info = undefined;
      this._repositories = undefined;
    }

    const entryLoaded = this._entry?.state === "loaded";
    if (entryLoaded === this._entryLoaded) {
      return;
    }

    this._entryLoaded = entryLoaded;

    // Resubscribe on every load, the signals are not guaranteed to survive
    // an unload of the entry.
    this._unsubscribeMarketplace();
    if (!entryLoaded) {
      return;
    }

    this._loadError = undefined;
    // The panel translates the errors of the backend itself
    this.hass.loadBackendTranslation("exceptions", "marketplace");
    this._subscribeMarketplace();
    this._refreshInfo();
    this._refreshRepositories();
  };

  private _subscribeMarketplace(): void {
    const signals: [MarketplaceDispatchEvent, () => void][] = [
      [MarketplaceDispatchEvent.CONFIG, this._refreshInfo],
      [MarketplaceDispatchEvent.STATUS, this._refreshInfo],
      [MarketplaceDispatchEvent.STAGE, this._refreshInfo],
      [MarketplaceDispatchEvent.REPOSITORY, this._refreshRepositories],
    ];

    this._marketplaceUnsubs = signals.map(([signal, callback]) => {
      const unsub = subscribeMarketplaceChanges(this.hass, signal, callback);
      // Not loaded yet, the entry loading again subscribes again
      unsub.catch(() => undefined);
      return unsub;
    });
  }

  private _unsubscribeMarketplace(): void {
    this._marketplaceUnsubs.forEach((unsub) =>
      unsub.then((unsubscribe) => unsubscribe()).catch(() => undefined)
    );
    this._marketplaceUnsubs = [];
  }

  private _handleRefresh = (): void => {
    this._refreshInfo();
    this._refreshRepositories();
  };

  private _handleRetry(): void {
    this._loadError = undefined;
    this._handleRefresh();
  }

  private _refreshInfo = async (): Promise<void> => {
    try {
      this._info = await fetchMarketplaceInfo(this.hass);
    } catch (err) {
      this._handleFetchError(err, this._info);
      return;
    }

    this._clearLoadError();
  };

  // A catalog refresh sends a signal per category, one list request at a
  // time with one more after it when anything changed meanwhile.
  private _refreshRepositories = (): Promise<void> => {
    if (this._repositoriesRequest) {
      this._repositoriesOutdated = true;
      return this._repositoriesRequest;
    }

    this._repositoriesRequest = this._fetchRepositories().finally(() => {
      this._repositoriesRequest = undefined;
      if (this._repositoriesOutdated) {
        this._repositoriesOutdated = false;
        this._refreshRepositories();
      }
    });
    return this._repositoriesRequest;
  };

  private async _fetchRepositories(): Promise<void> {
    try {
      this._repositories = await fetchMarketplaceRepositories(this.hass);
    } catch (err) {
      this._handleFetchError(err, this._repositories);
      return;
    }

    this._clearLoadError();
  }

  private _handleFetchError(err: unknown, currentData: unknown): void {
    // Not loaded refetches once it is, and earlier data beats an error screen.
    if (isWebSocketError(err, ERROR_NOT_LOADED) || currentData) {
      return;
    }

    this._loadError = marketplaceErrorMessage(err, this.hass.localize);
  }

  // Either fetch failing keeps the error up until both have data.
  private _clearLoadError(): void {
    if (this._info && this._repositories) {
      this._loadError = undefined;
    }
  }

  static get styles() {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-marketplace": HaPanelMarketplace;
  }
}
