import { LitElement, property, PropertyValues } from "lit-element";
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
  subscribeSupervisorEvents,
  Supervisor,
} from "../../src/data/supervisor/supervisor";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
import { urlSyncMixin } from "../../src/state/url-sync-mixin";

declare global {
  interface HASSDomEvents {
    "supervisor-update": Partial<Supervisor>;
  }
}

export class SupervisorBaseElement extends urlSyncMixin(
  ProvideHassLitMixin(LitElement)
) {
  @property({ attribute: false }) public supervisor?: Supervisor;

  private _unsubEvents?: () => void;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) {
      this._unsubEvents();
      this._unsubEvents = undefined;
    }
  }

  protected _updateSupervisor(obj: Partial<Supervisor>): void {
    this.supervisor = { ...this.supervisor!, ...obj };
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this.addEventListener("supervisor-update", (ev) =>
      this._updateSupervisor(ev.detail)
    );

    if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
      this._unsubEvents = subscribeSupervisorEvents(this.hass, (store) => {
        if (!store) {
          return;
        }
        this._updateSupervisor(store);
      });
    } else {
      this._initSupervisor();
    }
  }

  private async _initSupervisor(): Promise<void> {
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
  }
}
