import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
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
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
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

const PILL_GAP = 8;
const PILL_MIN_SIZE = 32;

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

  private get _maxVisible() {
    return this._resizeController.value ?? 0;
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

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-light-color-favorites-card-feature-editor");
    return document.createElement(
      "hui-light-color-favorites-card-feature-editor"
    );
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

    const visibleColors = this._favoriteColors.slice(0, this._maxVisible);

    return html`
      <div class="container">
        ${visibleColors.map(
          (color, index) => html`
            <ha-favorite-color-button
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
