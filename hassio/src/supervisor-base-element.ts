import { Collection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators";
import { atLeastVersion } from "../../src/common/config/version";
import { computeLocalize } from "../../src/common/translations/localize";
import { fetchHassioAddonsInfo } from "../../src/data/hassio/addon";
import { HassioResponse } from "../../src/data/hassio/common";
import {
  fetchHassioHassOsInfo,
  fetchHassioHostInfo,
} from "../../src/data/hassio/host";
import { fetchNetworkInfo } from "../../src/data/hassio/network";
import { fetchHassioResolution } from "../../src/data/hassio/resolution";
import {
  fetchHassioHomeAssistantInfo,
  fetchHassioInfo,
  fetchHassioSupervisorInfo,
} from "../../src/data/hassio/supervisor";
import { fetchSupervisorStore } from "../../src/data/supervisor/store";
import {
  getSupervisorEventCollection,
  Supervisor,
  SupervisorObject,
  supervisorCollection,
  SupervisorKeys,
  cleanupSupervisorCollection,
} from "../../src/data/supervisor/supervisor";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
import { urlSyncMixin } from "../../src/state/url-sync-mixin";
import { HomeAssistant, Route } from "../../src/types";
import { getTranslation } from "../../src/util/common-translation";

declare global {
  interface HASSDomEvents {
    "supervisor-update": Partial<Supervisor>;
    "supervisor-collection-refresh": { collection: SupervisorObject };
  }
}

export class SupervisorBaseElement extends urlSyncMixin(
  ProvideHassLitMixin(LitElement)
) {
  @property({ attribute: false }) public route?: Route;

  @property({ attribute: false }) public supervisor: Partial<Supervisor> = {
    localize: () => "",
  };

  @state() private _unsubs: Record<string, UnsubscribeFunc> = {};

  @state() private _collections: Record<string, Collection<unknown>> = {};

  @state() private _language = "en";

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasUpdated) {
      return;
    }
    if (this.route?.prefix === "/hassio") {
      this._initSupervisor();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    Object.keys(this._unsubs).forEach((unsub) => {
      this._unsubs[unsub]();
      delete this._unsubs[unsub];
    });
    Object.keys(this._collections).forEach((collection) => {
      cleanupSupervisorCollection(this.hass.connection, collection);
    });
    this._collections = {};
    this.removeEventListener(
      "supervisor-collection-refresh",
      this._handleSupervisorStoreRefreshEvent
    );
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (!this.hasUpdated) {
      if (this.route?.prefix === "/hassio") {
        this._initSupervisor();
      }
    }
    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass") as
        | HomeAssistant
        | undefined;
      if (oldHass?.language !== this.hass.language) {
        this._language = this.hass.language;
      }
    }

    if (changedProperties.has("_language") || !this.hasUpdated) {
      this._initializeLocalize();
    }
  }

  protected _updateSupervisor(update: Partial<Supervisor>): void {
    this.supervisor = { ...this.supervisor, ...update };
  }

  private async _initializeLocalize() {
    const { language, data } = await getTranslation(null, this._language);

    this._updateSupervisor({
      localize: await computeLocalize<SupervisorKeys>(
        this.constructor.prototype,
        language,
        {
          [language]: data,
        }
      ),
    });
  }

  private async _handleSupervisorStoreRefreshEvent(ev) {
    const collection = ev.detail.collection;
    if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
      if (collection in this._collections) {
        this._collections[collection].refresh();
      }
      return;
    }

    const response = await this.hass.callApi<HassioResponse<any>>(
      "GET",
      `hassio${supervisorCollection[collection]}`
    );
    this._updateSupervisor({ [collection]: response.data });
  }

  private _subscribeCollection(collection: string) {
    if (this._unsubs[collection]) {
      this._unsubs[collection]();
    }
    try {
      this._unsubs[collection] = this._collections[collection].subscribe(
        (data) =>
          this._updateSupervisor({
            [collection]: data,
          })
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  private async _initSupervisor(): Promise<void> {
    this.addEventListener(
      "supervisor-collection-refresh",
      this._handleSupervisorStoreRefreshEvent
    );

    if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
      Object.keys(supervisorCollection).forEach((collection) => {
        if (collection in this._collections) {
          this._subscribeCollection(collection);
          this._collections[collection].refresh();
        } else {
          this._collections[collection] = getSupervisorEventCollection(
            this.hass.connection,
            collection,
            supervisorCollection[collection]
          );
          if (this._collections[collection].state) {
            // happens when the grace period of the collection unsubscribe has not passed yet
            this._updateSupervisor({
              [collection]: this._collections[collection].state,
            });
          }
          this._subscribeCollection(collection);
        }
      });
    } else {
      const [
        addon,
        supervisor,
        host,
        core,
        info,
        os,
        network,
        resolution,
        store,
      ] = await Promise.all([
        fetchHassioAddonsInfo(this.hass),
        fetchHassioSupervisorInfo(this.hass),
        fetchHassioHostInfo(this.hass),
        fetchHassioHomeAssistantInfo(this.hass),
        fetchHassioInfo(this.hass),
        fetchHassioHassOsInfo(this.hass),
        fetchNetworkInfo(this.hass),
        fetchHassioResolution(this.hass),
        fetchSupervisorStore(this.hass),
      ]);

      this._updateSupervisor({
        addon,
        supervisor,
        host,
        core,
        info,
        os,
        network,
        resolution,
        store,
      });

      this.addEventListener("supervisor-update", (ev) =>
        this._updateSupervisor(ev.detail)
      );
    }
  }
}
