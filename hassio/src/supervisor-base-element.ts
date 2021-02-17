import { Collection, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import { atLeastVersion } from "../../src/common/config/version";
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
} from "../../src/data/supervisor/supervisor";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
import { urlSyncMixin } from "../../src/state/url-sync-mixin";

declare global {
  interface HASSDomEvents {
    "supervisor-update": Partial<Supervisor>;
    "supervisor-store-refresh": { store: SupervisorObject };
  }
}

const supervisorStores = [
  { key: "host", endpoint: "/host/info" },
  { key: "supervisor", endpoint: "/supervisor/info" },
  { key: "info", endpoint: "/info" },
  { key: "core", endpoint: "/core/info" },
  { key: "network", endpoint: "/network/info" },
  { key: "resolution", endpoint: "/resolution/info" },
  { key: "os", endpoint: "/os/info" },
];

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

  protected _updateSupervisorFromStore(obj: Partial<Supervisor>): void {
    if (!obj) {
      return;
    }
    this._updateSupervisor(obj);
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._initSupervisor();
  }

  private async _initSupervisor(): Promise<void> {
    if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
      this.addEventListener("supervisor-store-refresh", (ev) => {
        this._collections[ev.detail.store].refresh();
      });
      supervisorStores.forEach((store) => {
        this._unsubs[store.key] = subscribeSupervisorEvents(
          this.hass,
          (data) => this._updateSupervisorFromStore({ [store.key]: data }),
          store.key,
          store.endpoint
        );
        this._collections[store.key] = getSupervisorEventCollection(
          this.hass.connection,
          store.key,
          store.endpoint
        );
      });
      return;
    }

    const [
      supervisor,
      host,
      core,
      info,
      os,
      network,
      resolution,
    ] = await Promise.all([
      fetchHassioSupervisorInfo(this.hass),
      fetchHassioHostInfo(this.hass),
      fetchHassioHomeAssistantInfo(this.hass),
      fetchHassioInfo(this.hass),
      fetchHassioHassOsInfo(this.hass),
      fetchNetworkInfo(this.hass),
      fetchHassioResolution(this.hass),
    ]);

    this.supervisor = {
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
