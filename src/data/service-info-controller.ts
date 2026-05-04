import type { ReactiveController, ReactiveControllerHost } from "lit";
import { computeDomain } from "../common/entity/compute_domain";
import {
  computeServiceLabel,
  DEFAULT_SERVICE_INFO,
  type ServiceInfo,
} from "./compute-service-info";
import {
  DEFAULT_SERVICE_ICON,
  FALLBACK_DOMAIN_ICONS,
  serviceIcon,
} from "./icons";
import type { HomeAssistant } from "../types";

/**
 * Reactive controller that prepares display data for a service action
 * (e.g. `light.turn_on`): loads service translations, resolves the localized
 * service name, and resolves the service icon (with a synchronous domain
 * fallback that upgrades once the full icon is loaded).
 */
export class ServiceInfoController implements ReactiveController {
  private _host: ReactiveControllerHost;

  private _hass?: HomeAssistant;

  private _service?: string;

  private _language?: string;

  private _info: ServiceInfo = DEFAULT_SERVICE_INFO;

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
  }

  get info(): ServiceInfo {
    return this._info;
  }

  update(hass: HomeAssistant, service: string | undefined): void {
    this._hass = hass;

    const serviceChanged = service !== this._service;
    const languageChanged = hass.language !== this._language;

    if (!serviceChanged && !languageChanged) return;

    this._service = service;
    this._language = hass.language;

    if (!service) {
      this._info = DEFAULT_SERVICE_INFO;
      return;
    }

    const domain = computeDomain(service);
    this._info = {
      label: computeServiceLabel(hass.localize, hass.services, service),
      iconPath: serviceChanged
        ? FALLBACK_DOMAIN_ICONS[domain] || DEFAULT_SERVICE_ICON
        : this._info.iconPath,
      icon: serviceChanged ? undefined : this._info.icon,
    };

    hass.loadBackendTranslation("services", domain).then((localize) => {
      if (
        this._service !== service ||
        this._language !== hass.language ||
        !this._hass
      ) {
        return;
      }
      this._info = {
        ...this._info,
        label: computeServiceLabel(localize, this._hass.services, service),
      };
      this._host.requestUpdate();
    });

    if (serviceChanged) {
      serviceIcon(hass, service).then((icon) => {
        if (this._service !== service) return;
        this._info = { ...this._info, icon };
        this._host.requestUpdate();
      });
    }
  }

  hostConnected(): void {
    if (this._hass && this._service && !this._info.icon) {
      const service = this._service;
      this._service = undefined;
      this.update(this._hass, service);
    }
  }
}
