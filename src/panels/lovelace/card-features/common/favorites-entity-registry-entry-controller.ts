import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { LitElement } from "lit";
import type { ExtEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import {
  getExtendedEntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";

interface FavoritesEntityRegistryEntryControllerConfig {
  getHass: () => HomeAssistant | undefined;
  getEntityId: () => string | undefined;
  getEntry: () => ExtEntityRegistryEntry | null | undefined;
  setEntry: (entry: ExtEntityRegistryEntry | null | undefined) => void;
}

export const createFavoritesEntityRegistryEntryController = (
  host: ReactiveControllerHost & LitElement,
  config: FavoritesEntityRegistryEntryControllerConfig
): FavoritesEntityRegistryEntryController =>
  new FavoritesEntityRegistryEntryController(host, config);

export class FavoritesEntityRegistryEntryController implements ReactiveController {
  private _unsubEntityRegistry?: UnsubscribeFunc;

  private _subscribedEntityId?: string;

  private _subscribedConnection?: HomeAssistant["connection"];

  constructor(
    private readonly _host: ReactiveControllerHost & LitElement,
    private readonly _config: FavoritesEntityRegistryEntryControllerConfig
  ) {
    this._host.addController(this);
  }

  public hostConnected(): void {
    this._refreshEntitySubscription();
  }

  public hostUpdated(): void {
    this._refreshEntitySubscription();
  }

  public hostDisconnected(): void {
    this._unsubscribeEntityRegistry();
  }

  private _refreshEntitySubscription(): void {
    this._ensureEntitySubscription().catch(() => undefined);
  }

  private _setEntry(entry: ExtEntityRegistryEntry | null | undefined): void {
    if (this._config.getEntry() === entry) {
      return;
    }

    this._config.setEntry(entry);
  }

  private _unsubscribeEntityRegistry(): void {
    if (this._unsubEntityRegistry) {
      this._unsubEntityRegistry();
      this._unsubEntityRegistry = undefined;
    }
  }

  private async _loadEntityEntry(entityId: string): Promise<void> {
    const hass = this._config.getHass();

    if (!hass) {
      return;
    }

    try {
      const entry = await getExtendedEntityRegistryEntry(hass, entityId);

      if (this._config.getEntityId() === entityId) {
        this._setEntry(entry);
      }
    } catch (_err) {
      if (this._config.getEntityId() === entityId) {
        this._setEntry(null);
      }
    }
  }

  private async _subscribeEntityEntry(entityId: string): Promise<void> {
    this._unsubscribeEntityRegistry();

    await this._loadEntityEntry(entityId);

    try {
      this._unsubEntityRegistry = subscribeEntityRegistry(
        this._config.getHass()!.connection,
        async (entries) => {
          if (this._config.getEntityId() !== entityId) {
            return;
          }

          if (entries.some((entry) => entry.entity_id === entityId)) {
            await this._loadEntityEntry(entityId);
            return;
          }

          this._setEntry(null);
        }
      );
    } catch (_err) {
      this._unsubEntityRegistry = undefined;
    }
  }

  private async _ensureEntitySubscription(): Promise<void> {
    const hass = this._config.getHass();
    const entityId = this._config.getEntityId();
    const connection = hass?.connection;

    if (!hass || !entityId || !connection) {
      this._unsubscribeEntityRegistry();
      this._subscribedEntityId = undefined;
      this._subscribedConnection = undefined;
      this._setEntry(undefined);
      return;
    }

    if (
      this._subscribedEntityId === entityId &&
      this._subscribedConnection === connection &&
      this._unsubEntityRegistry
    ) {
      return;
    }

    this._subscribedEntityId = entityId;
    this._subscribedConnection = connection;

    await this._subscribeEntityEntry(entityId);
  }
}
