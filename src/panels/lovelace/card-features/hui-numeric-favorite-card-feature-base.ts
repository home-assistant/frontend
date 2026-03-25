import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import type { LocalizeKeys } from "../../../common/translations/localize";
import "../../../components/ha-control-select";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import {
  getExtendedEntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

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

  return (
    computeDomain(stateObj.entity_id) === definition.domain &&
    definition.supportsPosition(stateObj)
  );
};

export abstract class HuiNumericFavoriteCardFeatureBase<
  TEntity extends NumericFavoriteEntity,
  TConfig extends LovelaceCardFeatureConfig,
>
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state() protected _config?: TConfig;

  @state() protected _entry?: ExtEntityRegistryEntry | null;

  @state() protected _currentPosition?: number;

  private _unsubEntityRegistry?: UnsubscribeFunc;

  private _subscribedEntityId?: string;

  private _subscribedConnection?: HomeAssistant["connection"];

  protected abstract get _definition(): NumericFavoriteCardFeatureDefinition<TEntity>;

  protected get _stateObj(): TEntity | undefined {
    if (!this.hass || !this.context?.entity_id) {
      return undefined;
    }

    return this.hass.states[this.context.entity_id] as TEntity | undefined;
  }

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

    if (
      (changedProp.has("hass") || changedProp.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = this.context?.entity_id
        ? (oldHass?.states[this.context.entity_id] as TEntity | undefined)
        : undefined;

      if (oldStateObj !== this._stateObj) {
        this._currentPosition = this._definition.getCurrentValue(
          this._stateObj
        );
      }
    }

    if (
      changedProp.has("context") &&
      (changedProp.get("context") as LovelaceCardFeatureContext | undefined)
        ?.entity_id !== this.context?.entity_id
    ) {
      this._refreshEntitySubscription();
    }

    if (
      changedProp.has("hass") &&
      (changedProp.get("hass") as HomeAssistant | undefined)?.connection !==
        this.hass?.connection
    ) {
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
    if (!this.hass) {
      return;
    }

    try {
      const entry = await getExtendedEntityRegistryEntry(this.hass, entityId);

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
        this.hass!.connection,
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
    const connection = this.hass?.connection;

    if (!this.hass || !entityId || !connection) {
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

    if (value == null || !this.hass || !this._stateObj) {
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
      await this.hass.callService(
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
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsNumericFavoriteCardFeature(
        this.hass,
        this.context,
        this._definition
      )
    ) {
      return null;
    }

    const positions = this._definition.normalizeFavoritePositions(
      this._definition.getFavoritePositions(this._entry) ??
        this._definition.defaultFavoritePositions
    );

    const hass = this.hass;

    if (positions.length === 0 || !hass) {
      return null;
    }

    const options = positions.map((position) => ({
      value: String(position),
      label: `${position}%`,
      ariaLabel: hass.localize(this._definition.setPositionLabelKey, {
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
        .label=${hass.localize(this._definition.featureLabelKey)}
        .disabled=${this._stateObj.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}
