import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  computeDefaultFavoriteColors,
  type LightEntity,
  type LightColor,
  lightSupportsFavoriteColors,
} from "../../../data/light";
import type { HomeAssistant } from "../../../types";
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
import { debounce } from "../../../common/util/debounce";

export const supportsLightColorFavoritesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "light" && lightSupportsFavoriteColors(stateObj);
};

@customElement("hui-light-color-favorites-card-feature")
class HuiLightColorFavoritesCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: LightColorFavoritesCardFeatureConfig;

  @state() private _entry?: EntityRegistryEntry | null;

  @state() private _favoriteColors: LightColor[] = [];

  @state() private _maxVisible = 0;

  @query(".container") private _container!: HTMLDivElement;

  private _resizeObserver?: ResizeObserver;

  private _unsubEntityRegistry?: UnsubscribeFunc;

  public connectedCallback() {
    super.connectedCallback();
    this._subscribeEntityEntry();
    this.updateComplete.then(() => this._attachObserver());
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeEntityRegistry();
    this._resizeObserver?.disconnect();
  }

  private _unsubscribeEntityRegistry() {
    if (this._unsubEntityRegistry) {
      this._unsubEntityRegistry();
      this._unsubEntityRegistry = undefined;
    }
  }

  private _subscribeEntityEntry() {
    if (this.hass && this.context?.entity_id) {
      const id = this.context.entity_id;
      try {
        this._unsubEntityRegistry = subscribeEntityRegistry(
          this.hass!.connection,
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

  private _measure() {
    const w = this._container.clientWidth;
    const pillMin = 32 + 8;
    this._maxVisible = Math.floor(w / pillMin);
  }

  private _attachObserver(): void {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measure(), 250, false)
      );
    }
    this._resizeObserver.observe(this._container);
  }

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id] as LightEntity | undefined;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("context")) {
      this._unsubscribeEntityRegistry();
      this._subscribeEntityEntry();
    }

    if (changedProps.has("_entry") || changedProps.has("_maxVisible")) {
      if (this._entry) {
        if (this._entry.options?.light?.favorite_colors) {
          this._favoriteColors =
            this._entry.options.light.favorite_colors.slice(
              0,
              this._maxVisible
            );
        } else if (this._stateObj) {
          this._favoriteColors = computeDefaultFavoriteColors(
            this._stateObj
          ).slice(0, this._maxVisible);
        }
      }
    }
  }

  static getStubConfig(): LightColorFavoritesCardFeatureConfig {
    return {
      type: "light-color-favorites",
    };
  }

  public setConfig(config: LightColorFavoritesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsLightColorFavoritesCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    return html`
      <div class="container">
        ${this._favoriteColors.map(
          (color, index) => html`
            <div class="color">
              <ha-favorite-color-button
                wide
                .label=${this.hass!.localize(
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
            </div>
          `
        )}
      </div>
    `;
  }

  private _handleColorAction(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target! as any).index!;

    const favorite = this._favoriteColors[index];
    this.hass!.callService("light", "turn_on", {
      entity_id: this._stateObj!.entity_id,
      ...favorite,
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        .container {
          position: relative;
          display: flex;
          user-select: none;
          flex-wrap: nowrap;
          align-items: center;
          gap: 8px;
        }

        .color {
          position: relative;
          display: block;
          flex: 1 1 32px;
          min-width: 32px;
          height: 40px;
        }
        ha-favorite-color-button {
          --ha-favorite-color-button-border-radius: var(--ha-border-radius-md);
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
