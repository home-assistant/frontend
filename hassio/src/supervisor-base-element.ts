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
import { fetchSupervisorStore } from "../../src/data/supervisor/store";
import {
  getSupervisorEventCollection,
  subscribeSupervisorEvents,
  Supervisor,
  SupervisorObject,
  supervisorCollection,
} from "../../src/data/supervisor/supervisor";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
import { urlSyncMixin } from "../../src/state/url-sync-mixin";

declare global {
  interface HASSDomEvents {
    "supervisor-update": Partial<Supervisor>;
    "supervisor-colllection-refresh": { colllection: SupervisorObject };
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
    const colllection = ev.detail.colllection;
    if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
      this._collections[colllection].refresh();
      return;
    }

    const response = await this.hass.callApi<HassioResponse<any>>(
      "GET",
      `hassio${supervisorCollection[colllection]}`
    );
    this._updateSupervisor({ [colllection]: response.data });
  }

  private async _initSupervisor(): Promise<void> {
    this.addEventListener(
      "supervisor-colllection-refresh",
      this._handleSupervisorStoreRefreshEvent
    );

    if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
      Object.keys(supervisorCollection).forEach((colllection) => {
        this._unsubs[colllection] = subscribeSupervisorEvents(
          this.hass,
          (data) => this._updateSupervisor({ [colllection]: data }),
          colllection,
          supervisorCollection[colllection]
        );
        if (this._collections[colllection]) {
          this._collections[colllection].refresh();
        } else {
          this._collections[colllection] = getSupervisorEventCollection(
            this.hass.connection,
            colllection,
            supervisorCollection[colllection]
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

    this.supervisor = {
      addon,
      supervisor,
      host,
      core,
      info,
      os,
      network,
      resolution,
      store,
    };

    this.addEventListener("supervisor-update", (ev) =>
      this._updateSupervisor(ev.detail)
    );
  }
}
