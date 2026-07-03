import { consume } from "@lit/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
import type {
  Connection,
  UnsubscribeFunc,
  HassEntity,
} from "home-assistant-js-websocket";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { apiContext, connectionContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  computeDefaultFavoriteColors,
  type LightEntity,
  type LightColor,
  lightSupportsFavoriteColors,
} from "../../../data/light";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConnection,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LightColorFavoritesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";
import {
  type EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity/entity_registry";
import "../../../dialogs/more-info/components/lights/ha-favorite-color-button";
import { actionHandler } from "../common/directives/action-handler-directive";
import { getMoreInfoHintCardFeatureEditor } from "./get-more-info-hint-card-feature-editor";

const PILL_GAP = 8;
const PILL_MIN_SIZE = 32;

const supportsLightColorFavoritesCardFeatureFromState = (
  stateObj: HassEntity
) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "light" && lightSupportsFavoriteColors(stateObj);
};

export const supportsLightColorFavoritesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsLightColorFavoritesCardFeatureFromState(stateObj);
};

@customElement("hui-light-color-favorites-card-feature")
class HuiLightColorFavoritesCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: LightEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection?: Connection;

  @state() private _config?: LightColorFavoritesCardFeatureConfig;

  @state() private _entry?: EntityRegistryEntry | null;

  @state() private _favoriteColors: LightColor[] = [];

  private _unsubEntityRegistry?: UnsubscribeFunc;

  private _resizeController = new ResizeController(this, {
    callback: (entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        return Math.floor((width + PILL_GAP) / (PILL_MIN_SIZE + PILL_GAP));
      }
      return 0;
    },
  });

  public connectedCallback() {
    super.connectedCallback();
    this._subscribeEntityEntry();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeEntityRegistry();
  }

  private _unsubscribeEntityRegistry() {
    if (this._unsubEntityRegistry) {
      this._unsubEntityRegistry();
      this._unsubEntityRegistry = undefined;
    }
  }

  private _subscribeEntityEntry() {
    if (this._connection && this.context?.entity_id) {
      const id = this.context.entity_id;
      try {
        this._unsubEntityRegistry = subscribeEntityRegistry(
          this._connection,
          (entries) => {
            const entry = entries.find((e) => e.entity_id === id);
            if (entry) {
              this._entry = entry;
            }
          }
        );
      } catch (_e) {
        this._entry = null;
      }
    }
  }

  private get _maxVisible() {
    return this._resizeController.value ?? 0;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("context") || changedProps.has("_connection")) {
      this._unsubscribeEntityRegistry();
      this._subscribeEntityEntry();
    }

    if (changedProps.has("_entry")) {
      if (this._entry?.options?.light?.favorite_colors) {
        this._favoriteColors = this._entry.options.light.favorite_colors;
      } else if (this._entry && this._stateObj) {
        this._favoriteColors = computeDefaultFavoriteColors(this._stateObj);
      } else {
        this._favoriteColors = [];
      }
    }
  }

  static getStubConfig(): LightColorFavoritesCardFeatureConfig {
    return {
      type: "light-color-favorites",
    };
  }

  public static getConfigElement = getMoreInfoHintCardFeatureEditor;

  public setConfig(config: LightColorFavoritesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsLightColorFavoritesCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const visibleColors = this._favoriteColors.slice(0, this._maxVisible);

    return html`
      <div class="container">
        ${visibleColors.map(
          (color, index) => html`
            <ha-favorite-color-button
              .label=${this._localize(
                `ui.dialogs.more_info_control.light.favorite_color.set`,
                { number: index }
              )}
              .disabled=${this._stateObj!.state === UNAVAILABLE}
              .color=${color}
              .index=${index}
              .actionHandler=${actionHandler({
                disabled: this._stateObj!.state === UNAVAILABLE,
              })}
              @action=${this._handleColorAction}
            >
            </ha-favorite-color-button>
          `
        )}
      </div>
    `;
  }

  private _handleColorAction(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target! as any).index!;

    const favorite = this._favoriteColors[index];
    this._api.callService("light", "turn_on", {
      entity_id: this._stateObj!.entity_id,
      ...favorite,
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        :host {
          display: block;
          --min-width: ${unsafeCSS(PILL_MIN_SIZE)}px;
          --gap: ${unsafeCSS(PILL_GAP)}px;
        }
        .container {
          position: relative;
          display: flex;
          user-select: none;
          flex-wrap: nowrap;
          align-items: center;
          gap: var(--gap);
          height: var(--feature-height);
        }

        ha-favorite-color-button {
          --ha-favorite-color-button-border-radius: var(
            --feature-border-radius
          );
          height: 100%;
          min-width: var(--min-width);
          width: 100%;
          flex: 1 1 var(--min-width);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-color-favorites-card-feature": HuiLightColorFavoritesCardFeature;
  }
}
