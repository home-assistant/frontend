import type { ContextType } from "@lit/context";
import type {
  Connection,
  HassConfig,
  HassEntities,
  HassEntity,
} from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { resolveThemeColor } from "../../../common/color/compute-color";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { getEntityLocation } from "../../../common/entity/get_entity_location";
import { entityMapColor } from "../../../common/map/entity-map-colors";
import type { MapLatLng } from "../../../common/map/map-engine";
import type {
  HaMapEntity,
  HaMapPaths,
  HaMapPathPoint,
} from "../../../components/map/ha-map";
import "../../../components/map/ha-map";
import {
  configContext,
  connectionContext,
  entitiesContext,
  formattersContext,
  fullEntitiesContext,
  statesContext,
  uiContext,
} from "../../../data/context";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../../../data/entity/entity_registry";
import type { HistoryStates } from "../../../data/history";
import { subscribeHistoryStatesTimeWindow } from "../../../data/history";
import type { Themes } from "../../../data/ws-themes";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantFormatters,
} from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import type {
  LovelaceCardFeatureContext,
  LovelaceCardFeaturePosition,
  MapCardFeatureConfig,
} from "./types";

export const supportsMapCardFeatureFromState = (
  stateObj: HassEntity,
  states: HassEntities
): boolean => getEntityLocation(stateObj, states) !== undefined;

export const findRelatedLocationEntity = (
  entities: Record<string, EntityRegistryDisplayEntry> | undefined,
  states: HassEntities | undefined,
  entityId: string
): string | undefined => {
  if (!entities || !states) return undefined;
  const deviceId = entities[entityId]?.device_id;
  if (!deviceId) return undefined;

  for (const entry of Object.values(entities)) {
    if (entry.device_id === deviceId && entry.entity_id !== entityId) {
      const stateObj = states[entry.entity_id];
      if (stateObj && getEntityLocation(stateObj, states) !== undefined) {
        return entry.entity_id;
      }
    }
  }
  return undefined;
};

export const supportsMapCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
): boolean => {
  if (!context.entity_id) return false;
  const stateObj = hass.states[context.entity_id];
  if (stateObj && supportsMapCardFeatureFromState(stateObj, hass.states)) {
    return true;
  }
  return (
    findRelatedLocationEntity(hass.entities, hass.states, context.entity_id) !==
    undefined
  );
};

@customElement("hui-map-card-feature")
export class HuiMapCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  public static async getStubConfig(
    hass: HomeAssistant,
    context: LovelaceCardFeatureContext
  ): Promise<MapCardFeatureConfig> {
    let entityId: string | undefined;
    if (context.entity_id) {
      const stateObj = hass.states[context.entity_id];
      if (stateObj && supportsMapCardFeatureFromState(stateObj, hass.states)) {
        entityId = context.entity_id;
      } else {
        entityId = findRelatedLocationEntity(
          hass.entities,
          hass.states,
          context.entity_id
        );
      }
    }
    return {
      type: "map",
      ...(entityId ? { entity_id: entityId } : {}),
      rows: 3,
    };
  }

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @property({ attribute: false })
  public position?: LovelaceCardFeaturePosition;

  @state() private _config?: MapCardFeatureConfig;

  @consume({ context: statesContext, subscribe: true })
  private _states?: HassEntities;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntity | undefined>({
    transformer: function (this: HuiMapCardFeature, states) {
      const entityId = this._resolveTargetEntityId(states);
      return entityId && states ? states[entityId] : undefined;
    },
    watch: ["_config", "context", "_entities"],
  })
  private _targetStateObj?: HassEntity;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, string | undefined>({
    transformer: function (this: HuiMapCardFeature, states) {
      const entityId = this._resolveTargetEntityId(states);
      const stateObj = entityId && states ? states[entityId] : undefined;
      if (!stateObj || !states) {
        return undefined;
      }
      const loc = getEntityLocation(stateObj, states);
      return loc ? `${loc.latitude},${loc.longitude}` : undefined;
    },
    watch: ["_config", "context", "_entities"],
  })
  private _targetLocationKey?: string;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig?: HassConfig;

  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection?: Connection;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities?: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entityReg: EntityRegistryEntry[] = [];

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<ContextType<typeof uiContext>, Themes | undefined>({
    transformer: ({ themes }) => themes,
  })
  private _themes?: Themes;

  @state() private _stateHistory?: HistoryStates;

  private _subscribed?: Promise<(() => Promise<void>) | undefined>;

  private _subscribedEntityId?: string;

  private _subscribedHoursToShow?: number;

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-map-card-feature-editor");
    return document.createElement("hui-map-card-feature-editor");
  }

  public setConfig(config: MapCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this._config?.hours_to_show) {
      this._subscribeHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  private _resolveTargetEntityId(states?: HassEntities): string | undefined {
    if (this._config?.entity_id) {
      return this._config.entity_id;
    }
    if (!this.context?.entity_id) {
      return undefined;
    }
    const currentStates = states ?? this._states;
    if (currentStates) {
      const stateObj = currentStates[this.context.entity_id];
      if (
        stateObj &&
        supportsMapCardFeatureFromState(stateObj, currentStates)
      ) {
        return this.context.entity_id;
      }
    }
    return findRelatedLocationEntity(
      this._entities,
      currentStates,
      this.context.entity_id
    );
  }

  private get _targetEntityId(): string | undefined {
    return this._resolveTargetEntityId();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    const targetEntityId = this._targetEntityId;
    const hoursToShow = this._config?.hours_to_show;

    if (
      this._subscribed &&
      (this._subscribedEntityId !== targetEntityId ||
        this._subscribedHoursToShow !== hoursToShow ||
        !this.isConnected)
    ) {
      this._unsubscribeHistory();
      this._stateHistory = undefined;
    }

    if (
      this.isConnected &&
      !this._subscribed &&
      hoursToShow &&
      targetEntityId
    ) {
      this._subscribeHistory();
    }
  }

  private _unsubscribeHistory() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.()).catch(() => undefined);
      this._subscribed = undefined;
      this._subscribedEntityId = undefined;
      this._subscribedHoursToShow = undefined;
    }
  }

  private _subscribeHistory() {
    const entityId = this._targetEntityId;
    const hoursToShow = this._config?.hours_to_show;
    if (
      !this._hassConfig ||
      !isComponentLoaded(this._hassConfig, "history") ||
      !this._connection ||
      !this._states ||
      !entityId ||
      !hoursToShow ||
      this._subscribed
    ) {
      return;
    }

    this._subscribedEntityId = entityId;
    this._subscribedHoursToShow = hoursToShow;
    const currentStates = () => this._states ?? {};

    const subPromise = subscribeHistoryStatesTimeWindow(
      {
        connection: this._connection,
        get states() {
          return currentStates();
        },
      },
      (combinedHistory) => {
        if (this._subscribed !== subPromise) {
          return;
        }
        this._stateHistory = combinedHistory;
      },
      hoursToShow,
      [entityId],
      false,
      false,
      false
    ).catch(() => {
      if (this._subscribed === subPromise) {
        this._subscribed = undefined;
        this._subscribedEntityId = undefined;
        this._subscribedHoursToShow = undefined;
      }
      return undefined;
    });

    this._subscribed = subPromise;
  }

  private _getColor(entityId: string, customColor?: string): string {
    if (customColor) {
      return resolveThemeColor(customColor, getComputedStyle(this));
    }
    return entityMapColor(entityId, this._entityReg, getComputedStyle(this));
  }

  private _getHistoryPaths = memoizeOne(
    (
      _targetEntityId: string,
      hoursToShow: number | undefined,
      history: HistoryStates | undefined,
      _entityReg: EntityRegistryEntry[],
      customColor?: string,
      formatEntityName?: HomeAssistant["formatEntityName"],
      targetStateObj?: HassEntity,
      _themes?: Themes
    ): HaMapPaths[] | undefined => {
      if (!history || !hoursToShow || hoursToShow <= 0) {
        return undefined;
      }

      const paths: HaMapPaths[] = [];

      for (const entityId of Object.keys(history)) {
        if (computeDomain(entityId) === "zone") {
          continue;
        }
        const entityStates = history[entityId];
        if (!entityStates?.length) {
          continue;
        }
        const points: HaMapPathPoint[] = [];
        for (const entityState of entityStates) {
          const latitude = entityState.a?.latitude;
          const longitude = entityState.a?.longitude;
          if (typeof latitude !== "number" || typeof longitude !== "number") {
            continue;
          }
          points.push({
            point: [latitude, longitude] as MapLatLng,
            timestamp: new Date(entityState.lu * 1000),
          });
        }

        if (!points.length) {
          continue;
        }

        const name =
          targetStateObj && formatEntityName
            ? formatEntityName(targetStateObj)
            : entityId;

        paths.push({
          points,
          name,
          fullDatetime: hoursToShow > 144,
          color: this._getColor(entityId, customColor),
          gradualOpacity: 0.8,
        });
      }
      return paths.length ? paths : undefined;
    }
  );

  private _mapEntities = memoizeOne(
    (
      entityId: string,
      _entityReg: EntityRegistryEntry[],
      customColor?: string,
      _themes?: Themes
    ): HaMapEntity[] => [
      {
        entity_id: entityId,
        color: this._getColor(entityId, customColor),
      },
    ]
  );

  private _handleShieldClick(ev: MouseEvent) {
    ev.stopPropagation();
    if (this._targetEntityId) {
      fireEvent(this, "hass-more-info", {
        entityId: this._targetEntityId,
      });
    }
  }

  private _handleShieldKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._handleShieldClick(ev as unknown as MouseEvent);
    }
  }

  protected render() {
    const targetEntityId = this._targetEntityId;
    const targetStateObj = this._targetStateObj;

    if (
      !this._config ||
      !targetEntityId ||
      !targetStateObj ||
      !this._targetLocationKey
    ) {
      return nothing;
    }

    const isInteractive = this._config.interactive ?? false;
    const chosenColor = this._config.color || this.color;

    const content = html`
      <ha-map
        ?inert=${!isInteractive}
        .entities=${this._mapEntities(
          targetEntityId,
          this._entityReg,
          chosenColor,
          this._themes
        )}
        .paths=${this._getHistoryPaths(
          targetEntityId,
          this._config.hours_to_show,
          this._stateHistory,
          this._entityReg,
          chosenColor,
          this._formatters?.formatEntityName,
          targetStateObj,
          this._themes
        )}
        .autoFit=${this._config.auto_fit ?? true}
        .zoom=${this._config.default_zoom ?? 14}
        render-passive
        interactive-zones
      ></ha-map>
      ${
        !isInteractive
          ? html`
              <div
                class="shield"
                role="button"
                tabindex="0"
                aria-label=${
                  targetStateObj && this._formatters?.formatEntityName
                    ? this._formatters.formatEntityName(targetStateObj)
                    : targetEntityId
                }
                @click=${this._handleShieldClick}
                @keydown=${this._handleShieldKeyDown}
              ></div>
            `
          : nothing
      }
    `;

    if (this.position === "inline") {
      const rows = Math.max(2, this._config.rows ?? 2);
      return html`
        <div
          class=${classMap({
            container: true,
            inline: true,
            interactive: isInteractive,
          })}
          style=${styleMap({
            height: `calc(${rows} * var(--row-height, var(--ha-section-grid-row-height, 56px)) + ${rows - 1} * var(--row-gap, var(--ha-section-grid-row-gap, 8px)) - 2 * var(--ha-space-2, 8px))`,
          })}
        >
          ${content}
        </div>
      `;
    }

    const rows = Math.max(2, this._config.rows ?? 3);
    return html`
      <div
        class=${classMap({
          container: true,
          interactive: isInteractive,
        })}
        style=${styleMap({
          height: `calc(${rows} * var(--row-height, var(--ha-section-grid-row-height, 56px)) + ${rows} * var(--row-gap, var(--ha-section-grid-row-gap, 8px)) - var(--ha-space-3, 12px))`,
        })}
      >
        ${content}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      position: relative;
      pointer-events: none;
    }

    .container {
      display: block;
      width: 100%;
      border-radius: var(
        --feature-border-radius,
        var(--ha-card-features-border-radius, var(--ha-border-radius-lg))
      );
      overflow: hidden;
      position: relative;
    }

    .container.inline {
      margin: var(--ha-space-2, 8px) 0;
    }

    .container.interactive {
      pointer-events: auto;
    }

    .shield {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      cursor: pointer;
      pointer-events: auto;
      touch-action: pan-y;
    }

    ha-map {
      border: none;
      height: 100%;
      width: 100%;
      border-radius: inherit;
      overflow: hidden;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card-feature": HuiMapCardFeature;
  }
}
