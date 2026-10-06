import type { Connection, HassConfig } from "home-assistant-js-websocket";
import {
  consumeContext,
  ContextController,
} from "../common/decorators/consume";
import { computeDomain } from "../common/entity/compute_domain";
import {
  computeServiceLabel,
  DEFAULT_SERVICE_INFO,
  type ServiceInfo,
} from "./compute-service-info";
import {
  configContext,
  connectionContext,
  internationalizationContext,
  servicesContext,
} from "./context";
import {
  DEFAULT_SERVICE_ICON,
  FALLBACK_DOMAIN_ICONS,
  serviceIcon,
} from "./icons";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
} from "../types";

/**
 * Reactive controller that prepares display data for a service action
 * (e.g. `light.turn_on`): loads service translations, resolves the localized
 * service name, and resolves the service icon (with a synchronous domain
 * fallback that upgrades once the full icon is loaded).
 *
 * Pulls connection, config, services, and i18n from Lit context, so the
 * caller only needs to feed in the service ID via `updateService()`.
 */
export class ServiceInfoController extends ContextController {
  @consumeContext({
    context: connectionContext,
    subscribe: true,
    transform: ({ connection }) => connection,
  })
  private _connection?: Connection;

  @consumeContext({
    context: configContext,
    subscribe: true,
    transform: ({ config }) => config,
  })
  private _config?: HassConfig;

  @consumeContext({ context: servicesContext, subscribe: true })
  private _services?: HomeAssistant["services"];

  @consumeContext({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  private _service?: string;

  private _resolvedService?: string;

  private _resolvedLanguage?: string;

  private _info: ServiceInfo = DEFAULT_SERVICE_INFO;

  get info(): ServiceInfo {
    return this._info;
  }

  hostConnected(): void {
    this._resolve();
  }

  // `_resolve` requests a host update only when the resolved info changes.
  protected contextUpdated(): void {
    this._resolve();
  }

  updateService(service: string | undefined): void {
    if (service === this._service) return;
    this._service = service;
    this._resolve();
  }

  private _resolve(): void {
    if (!this._connection || !this._config || !this._services || !this._i18n) {
      return;
    }

    const service = this._service;
    const language = this._i18n.language;

    const serviceChanged = service !== this._resolvedService;
    const languageChanged = language !== this._resolvedLanguage;

    if (!serviceChanged && !languageChanged) return;

    this._resolvedService = service;
    this._resolvedLanguage = language;

    if (!service) {
      this._info = DEFAULT_SERVICE_INFO;
      this.host.requestUpdate();
      return;
    }

    const domain = computeDomain(service);
    this._info = {
      label: computeServiceLabel(this._i18n.localize, this._services, service),
      iconPath: serviceChanged
        ? FALLBACK_DOMAIN_ICONS[domain] || DEFAULT_SERVICE_ICON
        : this._info.iconPath,
      icon: serviceChanged ? undefined : this._info.icon,
    };
    this.host.requestUpdate();

    this._i18n.loadBackendTranslation("services", domain).then((localize) => {
      if (
        this._resolvedService !== service ||
        this._resolvedLanguage !== language ||
        !this._services
      ) {
        return;
      }
      this._info = {
        ...this._info,
        label: computeServiceLabel(localize, this._services, service),
      };
      this.host.requestUpdate();
    });

    if (serviceChanged) {
      serviceIcon(this._connection, this._config, service).then((icon) => {
        if (this._resolvedService !== service) return;
        this._info = { ...this._info, icon };
        this.host.requestUpdate();
      });
    }
  }
}
