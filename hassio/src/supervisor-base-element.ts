import { Collection, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import { atLeastVersion } from "../../src/common/config/version";
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
import {
  getSupervisorEventCollection,
  subscribeSupervisorEvents,
  Supervisor,
  SupervisorObject,
  supervisorStore,
} from "../../src/data/supervisor/supervisor";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
import { urlSyncMixin } from "../../src/state/url-sync-mixin";

declare global {
  interface HASSDomEvents {
    "supervisor-update": Partial<Supervisor>;
    "supervisor-store-refresh": { store: SupervisorObject };
  }
}

export class SupervisorBaseElement extends urlSyncMixin(
  ProvideHassLitMixin(LitElement)
) {
  @property({ attribute: false }) public supervisor?: Supervisor;

  @internalProperty() private _unsubs: Record<string, UnsubscribeFunc> = {};

  @internalProperty() private _collections: Record<
    string,
    Collection<unknown>
  > = {};

  public disconnectedCallback() {
    super.disconnectedCallback();
    Object.keys(this._unsubs).forEach((unsub) => {
      this._unsubs[unsub]();
    });
  }

  protected _updateSupervisor(obj: Partial<Supervisor>): void {
    this.supervisor = { ...this.supervisor!, ...obj };
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._initSupervisor();
  }

  private async _handleSupervisorStoreRefreshEvent(ev) {
    const store = ev.detail.store;
    if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
      this._collections[store].refresh();
      return;
    }

    const response = await this.hass.callApi<HassioResponse<any>>(
      "GET",
      `hassio${supervisorStore[store]}`
    );
    this._updateSupervisor({ [store]: response.data });
  }

  private async _initSupervisor(): Promise<void> {
    this.addEventListener(
      "supervisor-store-refresh",
      this._handleSupervisorStoreRefreshEvent
    );

    if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
      Object.keys(supervisorStore).forEach((store) => {
        this._unsubs[store] = subscribeSupervisorEvents(
          this.hass,
          (data) => this._updateSupervisor({ [store]: data }),
          store,
          supervisorStore[store]
        );
        if (this._collections[store]) {
          this._collections[store].refresh();
        } else {
          this._collections[store] = getSupervisorEventCollection(
            this.hass.connection,
            store,
            supervisorStore[store]
          );
        }
      });

      if (this.supervisor === undefined) {
        Object.keys(this._collections).forEach((collection) =>
          this._updateSupervisor({
            [collection]: this._collections[collection].state,
          })
        );
      }
      return;
    }

    const [
      addon,
      supervisor,
      host,
      core,
      info,
      os,
      network,
      resolution,
    ] = await Promise.all([
      fetchHassioAddonsInfo(this.hass),
      fetchHassioSupervisorInfo(this.hass),
      fetchHassioHostInfo(this.hass),
      fetchHassioHomeAssistantInfo(this.hass),
      fetchHassioInfo(this.hass),
      fetchHassioHassOsInfo(this.hass),
      fetchNetworkInfo(this.hass),
      fetchHassioResolution(this.hass),
    ]);

    this.supervisor = {
      addon,
      supervisor,
      host,
      core,
      info,
      os,
      network,
      resolution,
    };

    this.addEventListener("supervisor-update", (ev) =>
      this._updateSupervisor(ev.detail)
    );
  }
}
