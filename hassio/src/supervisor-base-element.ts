import { Collection, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
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
  subscribeSupervisorEvents,
  Supervisor,
  SupervisorObject,
  supervisorCollection,
} from "../../src/data/supervisor/supervisor";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
import { urlSyncMixin } from "../../src/state/url-sync-mixin";
import { getTranslation } from "../../src/util/common-translation";

declare global {
  interface HASSDomEvents {
    "supervisor-update": Partial<Supervisor>;
    "supervisor-colllection-refresh": { colllection: SupervisorObject };
  }
}

export class SupervisorBaseElement extends urlSyncMixin(
  ProvideHassLitMixin(LitElement)
) {
  @property({ attribute: false }) public supervisor: Partial<Supervisor> = {
    localize: () => "",
  };

  @internalProperty() private _unsubs: Record<string, UnsubscribeFunc> = {};

  @internalProperty() private _collections: Record<
    string,
    Collection<unknown>
  > = {};

  @internalProperty() private _resources?: Record<string, any>;

  @internalProperty() private _language = "en";

  public connectedCallback(): void {
    super.connectedCallback();
    this._initializeLocalize();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    Object.keys(this._unsubs).forEach((unsub) => {
      this._unsubs[unsub]();
    });
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (changedProperties.has("_language")) {
      if (changedProperties.get("_language") !== this._language) {
        this._initializeLocalize();
      }
    }
  }

  protected _updateSupervisor(obj: Partial<Supervisor>): void {
    this.supervisor = { ...this.supervisor, ...obj };
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    if (this._language !== this.hass.language) {
      this._language = this.hass.language;
    }
    this._initializeLocalize();
    this._initSupervisor();
  }

  private async _initializeLocalize() {
    const { language, data } = await getTranslation(
      null,
      this._language,
      "/api/hassio/app/static/translations"
    );

    this._resources = {
      [language]: data,
    };

    this.supervisor = {
      ...this.supervisor,
      localize: await computeLocalize(
        this.constructor.prototype,
        this._language,
        this._resources
      ),
    };
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

      Object.keys(this._collections).forEach((collection) => {
        if (
          this.supervisor === undefined ||
          this.supervisor[collection] === undefined
        ) {
          this._updateSupervisor({
            [collection]: this._collections[collection].state,
          });
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
}
