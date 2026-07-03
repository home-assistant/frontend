import { consume } from "@lit/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import type {
  Connection,
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import "../../../components/ha-control-select";
import { apiContext, connectionContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import {
  getExtendedEntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity/entity_registry";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConnection,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const OPTION_MIN_WIDTH = 30;

type NumericFavoriteEntity = HassEntity & {
  attributes: HassEntity["attributes"] & {
    current_position?: number;
    current_tilt_position?: number;
  };
};

export interface NumericFavoriteCardFeatureDefinition<
  TEntity extends NumericFavoriteEntity,
> {
  domain: string;
  supportsPosition: (stateObj: TEntity) => boolean;
  getFavoritePositions: (
    entry?: ExtEntityRegistryEntry | null
  ) => number[] | undefined;
  getCurrentValue: (stateObj: TEntity) => number | undefined;
  normalizeFavoritePositions: (positions?: number[]) => number[];
  defaultFavoritePositions: number[];
  setPositionService: string;
  serviceDataKey: string;
  setPositionLabelKey: LocalizeKeys;
  featureLabelKey: LocalizeKeys;
}

const supportsNumericFavoriteCardFeatureFromState = <
  TEntity extends NumericFavoriteEntity,
>(
  stateObj: TEntity,
  definition: NumericFavoriteCardFeatureDefinition<TEntity>
) =>
  computeDomain(stateObj.entity_id) === definition.domain &&
  definition.supportsPosition(stateObj);

export const supportsNumericFavoriteCardFeature = <
  TEntity extends NumericFavoriteEntity,
>(
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext,
  definition: NumericFavoriteCardFeatureDefinition<TEntity>
) => {
  const stateObj = context.entity_id
    ? (hass.states[context.entity_id] as TEntity | undefined)
    : undefined;

  if (!stateObj) {
    return false;
  }

  return supportsNumericFavoriteCardFeatureFromState(stateObj, definition);
};

export abstract class HuiNumericFavoriteCardFeatureBase<
  TEntity extends NumericFavoriteEntity,
  TConfig extends LovelaceCardFeatureConfig,
>
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  protected _stateObj?: TEntity;

  @state()
  @consumeLocalize()
  protected _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  protected _api!: HomeAssistantApi;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  protected _connection?: Connection;

  @state() protected _config?: TConfig;

  @state() protected _entry?: ExtEntityRegistryEntry | null;

  @state() protected _currentPosition?: number;

  private _unsubEntityRegistry?: UnsubscribeFunc;

  private _subscribedEntityId?: string;

  private _subscribedConnection?: HomeAssistant["connection"];

  private _resizeController = new ResizeController<number | undefined>(this, {
    callback: (entries: { contentRect?: { width: number } }[]) => {
      const width = entries[0]?.contentRect?.width;
      if (!width) {
        return undefined;
      }
      return Math.max(1, Math.floor(width / OPTION_MIN_WIDTH));
    },
  });

  protected abstract get _definition(): NumericFavoriteCardFeatureDefinition<TEntity>;

  public connectedCallback() {
    super.connectedCallback();
    this._refreshEntitySubscription();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeEntityRegistry();
  }

  public setConfig(config: LovelaceCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    this._config = config as TConfig;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);

    if (changedProp.has("_stateObj") && this._stateObj) {
      this._currentPosition = this._definition.getCurrentValue(this._stateObj);
    }

    if (changedProp.has("context") || changedProp.has("_connection")) {
      this._refreshEntitySubscription();
    }
  }

  private _refreshEntitySubscription(): void {
    this._ensureEntitySubscription().catch(() => undefined);
  }

  private _unsubscribeEntityRegistry(): void {
    if (this._unsubEntityRegistry) {
      this._unsubEntityRegistry();
      this._unsubEntityRegistry = undefined;
    }
  }

  private async _loadEntityEntry(entityId: string): Promise<void> {
    try {
      const entry = await getExtendedEntityRegistryEntry(this._api, entityId);

      if (this.context?.entity_id === entityId) {
        this._entry = entry;
      }
    } catch (_err) {
      if (this.context?.entity_id === entityId) {
        this._entry = null;
      }
    }
  }

  private async _subscribeEntityEntry(entityId: string): Promise<void> {
    this._unsubscribeEntityRegistry();

    await this._loadEntityEntry(entityId);

    try {
      this._unsubEntityRegistry = subscribeEntityRegistry(
        this._connection!,
        async (entries) => {
          if (this.context?.entity_id !== entityId) {
            return;
          }

          if (entries.some((entry) => entry.entity_id === entityId)) {
            await this._loadEntityEntry(entityId);
            return;
          }

          this._entry = null;
        }
      );
    } catch (_err) {
      this._unsubEntityRegistry = undefined;
    }
  }

  private async _ensureEntitySubscription(): Promise<void> {
    const entityId = this.context?.entity_id;
    const connection = this._connection;

    if (!entityId || !connection) {
      this._unsubscribeEntityRegistry();
      this._subscribedEntityId = undefined;
      this._subscribedConnection = undefined;
      this._entry = undefined;
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

  private async _valueChanged(
    ev: HASSDomEvent<HASSDomEvents["value-changed"]>
  ) {
    const value = ev.detail.value;

    if (value == null || !this._stateObj) {
      return;
    }

    const position = Number(value);

    if (isNaN(position)) {
      return;
    }

    const oldPosition = this._definition.getCurrentValue(this._stateObj);

    if (position === oldPosition) {
      return;
    }

    this._currentPosition = position;

    try {
      await this._api.callService(
        this._definition.domain,
        this._definition.setPositionService,
        {
          entity_id: this._stateObj.entity_id,
          [this._definition.serviceDataKey]: position,
        }
      );
    } catch (_err) {
      this._currentPosition = oldPosition;
    }
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsNumericFavoriteCardFeatureFromState(
        this._stateObj,
        this._definition
      )
    ) {
      return null;
    }

    const positions = this._definition.normalizeFavoritePositions(
      this._definition.getFavoritePositions(this._entry) ??
        this._definition.defaultFavoritePositions
    );

    if (positions.length === 0) {
      return null;
    }

    const maxVisible = this._resizeController.value;
    const visiblePositions =
      maxVisible != null ? positions.slice(0, maxVisible) : positions;

    const options = visiblePositions.map((position) => ({
      value: String(position),
      label: `${position}%`,
      ariaLabel: this._localize(this._definition.setPositionLabelKey, {
        value: `${position}%`,
      }),
    }));

    const currentValue =
      this._currentPosition != null ? String(this._currentPosition) : undefined;

    const color = this.color
      ? computeCssColor(this.color)
      : stateColorCss(this._stateObj);

    return html`
      <ha-control-select
        style=${styleMap({ "--feature-color": color })}
        .options=${options}
        .value=${currentValue}
        @value-changed=${this._valueChanged}
        .label=${this._localize(this._definition.featureLabelKey)}
        .disabled=${this._stateObj.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        :host {
          display: block;
        }
      `,
    ];
  }
}
