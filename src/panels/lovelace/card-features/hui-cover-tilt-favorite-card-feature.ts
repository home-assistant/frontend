import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-select";
import type { CoverEntity } from "../../../data/cover";
import {
  DEFAULT_COVER_FAVORITE_POSITIONS,
  coverSupportsTiltPosition,
  normalizeCoverFavoritePositions,
} from "../../../data/cover";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import {
  getExtendedEntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity/entity_registry";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  CoverTiltFavoriteCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsCoverTiltFavoriteCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "cover" && coverSupportsTiltPosition(stateObj);
};

@customElement("hui-cover-tilt-favorite-card-feature")
class HuiCoverTiltFavoriteCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state() private _config?: CoverTiltFavoriteCardFeatureConfig;

  @state() private _entry?: ExtEntityRegistryEntry | null;

  @state() private _currentTiltPosition?: number;

  private _unsubEntityRegistry?: UnsubscribeFunc;

  private _subscribedEntityId?: string;

  private _subscribedConnection?: HomeAssistant["connection"];

  private get _stateObj(): CoverEntity | undefined {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!];
  }

  public connectedCallback() {
    super.connectedCallback();
    this._refreshEntitySubscription();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeEntityRegistry();
  }

  static getStubConfig(): CoverTiltFavoriteCardFeatureConfig {
    return {
      type: "cover-tilt-favorite",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-cover-tilt-favorite-card-feature-editor");
    return document.createElement(
      "hui-cover-tilt-favorite-card-feature-editor"
    );
  }

  public setConfig(config: CoverTiltFavoriteCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (
      (changedProp.has("hass") || changedProp.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context!.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentTiltPosition =
          this._stateObj.attributes.current_tilt_position ?? undefined;
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
    if (ev.detail.value == null) return;

    const tiltPosition = Number(ev.detail.value);
    if (isNaN(tiltPosition)) return;

    const oldTiltPosition = this._stateObj!.attributes.current_tilt_position;
    if (tiltPosition === oldTiltPosition) return;

    this._currentTiltPosition = tiltPosition;
    try {
      await this.hass!.callService("cover", "set_cover_tilt_position", {
        entity_id: this._stateObj!.entity_id,
        tilt_position: tiltPosition,
      });
    } catch (_err) {
      this._currentTiltPosition = oldTiltPosition ?? undefined;
    }
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsCoverTiltFavoriteCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    const positions = normalizeCoverFavoritePositions(
      this._entry?.options?.cover?.favorite_tilt_positions ??
        DEFAULT_COVER_FAVORITE_POSITIONS
    );

    if (positions.length === 0) {
      return null;
    }

    const options = positions.map((position) => ({
      value: String(position),
      label: `${position}%`,
      ariaLabel: this.hass!.localize(
        "ui.dialogs.more_info_control.cover.favorite_tilt_position.set",
        { value: `${position}%` }
      ),
    }));

    const currentValue =
      this._currentTiltPosition != null
        ? String(this._currentTiltPosition)
        : undefined;

    const color = this.color
      ? computeCssColor(this.color)
      : stateColorCss(this._stateObj);

    const style = {
      "--feature-color": color,
    };

    return html`
      <ha-control-select
        style=${styleMap(style)}
        .options=${options}
        .value=${currentValue}
        @value-changed=${this._valueChanged}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.features.types.cover-tilt-favorite.label"
        )}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-tilt-favorite-card-feature": HuiCoverTiltFavoriteCardFeature;
  }
}
