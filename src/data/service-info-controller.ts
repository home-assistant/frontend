import { ContextConsumer, type Context } from "@lit/context";
import type { Connection, HassConfig } from "home-assistant-js-websocket";
import type { ReactiveController, ReactiveControllerHost } from "lit";
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

type ServiceInfoHost = ReactiveControllerHost & HTMLElement;

/**
 * Reactive controller that prepares display data for a service action
 * (e.g. `light.turn_on`): loads service translations, resolves the localized
 * service name, and resolves the service icon (with a synchronous domain
 * fallback that upgrades once the full icon is loaded).
 *
 * Pulls connection, config, services, and i18n from Lit context, so the
 * caller only needs to feed in the service ID via `updateService()`.
 */
export class ServiceInfoController implements ReactiveController {
  private _host: ServiceInfoHost;

  private _connection?: Connection;

  private _config?: HassConfig;

  private _services?: HomeAssistant["services"];

  private _i18n?: HomeAssistantInternationalization;

  private _service?: string;

  private _resolvedService?: string;

  private _resolvedLanguage?: string;

  private _info: ServiceInfo = DEFAULT_SERVICE_INFO;

  constructor(host: ServiceInfoHost) {
    this._host = host;
    host.addController(this);

    this._consume(connectionContext, (value) => {
      this._connection = value.connection;
    });
    this._consume(configContext, (value) => {
      this._config = value.config;
    });
    this._consume(servicesContext, (value) => {
      this._services = value;
    });
    this._consume(internationalizationContext, (value) => {
      this._i18n = value;
    });
  }

  private _consume<T>(
    context: Context<unknown, T>,
    assign: (value: T) => void
  ): void {
    new ContextConsumer(this._host, {
      context,
      subscribe: true,
      callback: (value) => {
        assign(value);
        this._resolve();
      },
    });
  }

  get info(): ServiceInfo {
    return this._info;
  }

  hostConnected(): void {
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
      this._host.requestUpdate();
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
    this._host.requestUpdate();

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
      this._host.requestUpdate();
    });

    if (serviceChanged) {
      serviceIcon(this._connection, this._config, service).then((icon) => {
        if (this._resolvedService !== service) return;
        this._info = { ...this._info, icon };
        this._host.requestUpdate();
      });
    }
  }
}
