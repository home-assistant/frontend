import type { ReactiveController, ReactiveControllerHost } from "lit";
import type {
  ForecastAttribute,
  ModernForecastType,
  WeatherEntity,
} from "../../../../data/weather";
import { subscribeForecast } from "../../../../data/weather";
import { getForecastSource } from "../../../../data/weather_page";
import type { HomeAssistant } from "../../../../types";

export interface WeatherForecast {
  stateObj: WeatherEntity;
  forecast: ForecastAttribute[];
}

interface Subscription {
  entityId: string;
  unsub: Promise<() => void>;
}

/**
 * Subscribes to forecasts for weather page cards. For each forecast type it
 * uses the first source, in order of preference, that offers that type.
 */
export class WeatherForecastController implements ReactiveController {
  private _host: ReactiveControllerHost;

  private _types: ModernForecastType[];

  private _hass?: HomeAssistant;

  private _sources: string[] = [];

  private _connected = false;

  private _subscriptions: Partial<Record<ModernForecastType, Subscription>> =
    {};

  private _forecasts: Partial<Record<ModernForecastType, WeatherForecast>> = {};

  constructor(host: ReactiveControllerHost, types: ModernForecastType[]) {
    this._host = host;
    this._types = types;
    host.addController(this);
  }

  public get(type: ModernForecastType): WeatherForecast | undefined {
    const forecast = this._forecasts[type];
    if (!forecast || !this._hass) {
      return forecast;
    }
    // Keep the latest state, so units and attributes stay in sync.
    const stateObj = this._hass.states[forecast.stateObj.entity_id] as
      WeatherEntity | undefined;
    return stateObj ? { ...forecast, stateObj } : forecast;
  }

  public setSources(hass: HomeAssistant, sources: string[]): void {
    this._hass = hass;
    this._sources = sources;
    if (this._connected) {
      this._sync();
    }
  }

  public hostConnected(): void {
    this._connected = true;
    this._sync();
  }

  public hostDisconnected(): void {
    this._connected = false;
    for (const type of this._types) {
      this._unsubscribe(type);
    }
  }

  private _sync(): void {
    if (!this._hass) {
      return;
    }
    for (const type of this._types) {
      const source = getForecastSource(this._hass, this._sources, type);
      const current = this._subscriptions[type];
      if (current?.entityId === source?.entity_id) {
        continue;
      }
      this._unsubscribe(type);
      if (source) {
        this._subscribe(type, source.entity_id);
      }
    }
  }

  private _subscribe(type: ModernForecastType, entityId: string): void {
    const hass = this._hass!;
    const unsub = subscribeForecast(
      hass.connection,
      entityId,
      type,
      (event) => {
        const stateObj = this._hass?.states[entityId] as
          WeatherEntity | undefined;
        if (!event.forecast || !stateObj) {
          delete this._forecasts[type];
        } else {
          this._forecasts[type] = { stateObj, forecast: event.forecast };
        }
        this._host.requestUpdate();
      }
    );
    unsub.catch(() => {
      if (this._subscriptions[type]?.unsub === unsub) {
        delete this._subscriptions[type];
      }
    });
    this._subscriptions[type] = { entityId, unsub };
  }

  private _unsubscribe(type: ModernForecastType): void {
    const subscription = this._subscriptions[type];
    if (subscription) {
      subscription.unsub.then((unsub) => unsub()).catch(() => undefined);
      delete this._subscriptions[type];
    }
    if (this._forecasts[type]) {
      delete this._forecasts[type];
      this._host.requestUpdate();
    }
  }
}
