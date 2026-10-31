import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { live } from "lit/directives/live";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../../common/decorators/consume";
import { computeCssColor } from "../../../common/color/compute-color";
import { DOMAINS_TOGGLE } from "../../../common/const";
import {
  consumeEntityRegistryEntry,
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { stateActive } from "../../../common/entity/state_active";
import {
  stateColorBrightness,
  stateColorCss,
} from "../../../common/entity/state_color";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { iconColorCSS } from "../../../common/style/icon_color_css";
import "../../../components/ha-card";
import "../../../components/ha-ripple";
import { CLIMATE_HVAC_ACTION_TO_MODE } from "../../../data/climate";
import {
  apiContext,
  configContext,
  connectionContext,
  formattersContext,
  uiContext,
} from "../../../data/context";
import type { EntityRegistryDisplayEntry } from "../../../data/entity/entity_registry";
import {
  isMediaSourceContentId,
  resolveMediaSource,
} from "../../../data/media_source";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { Themes } from "../../../data/ws-themes";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantFormatters,
  HomeAssistantUI,
} from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { hasAction } from "../common/has-action";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import type { ButtonCardConfig } from "./types";

const EMPTY_STATE_OBJ = {
  state: "unavailable",
  attributes: {
    friendly_name: "",
  },
  entity_id: "___.empty",
  context: {
    id: "",
    parent_id: null,
    user_id: null,
  },
  last_changed: "",
  last_updated: "",
} satisfies HassEntity;

export const getEntityDefaultButtonAction = (entityId?: string) =>
  entityId && DOMAINS_TOGGLE.has(computeDomain(entityId))
    ? "toggle"
    : "more-info";

@customElement("hui-button-card")
export class HuiButtonCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-button-card-editor");
    return document.createElement("hui-button-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): ButtonCardConfig {
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      ["light", "switch"]
    );

    return {
      type: "button",
      entity: foundEntities[0] || "",
    };
  }

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state() private _config?: ButtonCardConfig;

  @state()
  @consumeEntityState({ entityIdPath: ["_config", "entity"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

  @state()
  @consumeEntityRegistryEntry({ entityIdPath: ["_config", "entity"] })
  _entity?: EntityRegistryDisplayEntry;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, HomeAssistantConnection["hassUrl"]>({
    transformer: ({ hassUrl }) => hassUrl,
  })
  private _hassUrl?: HomeAssistantConnection["hassUrl"];

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api?: HomeAssistantApi;

  @state() private _resolvedImage?: string;

  private _resolvingImage?: string;

  public getCardSize(): number {
    return (
      (this._config?.show_icon ? 4 : 0) + (this._config?.show_name ? 1 : 0)
    );
  }

  public getGridOptions(): LovelaceGridOptions {
    if (
      this._config?.show_icon &&
      (this._config?.show_name || this._config?.show_state)
    ) {
      return {
        rows: 2,
        columns: 6,
        min_columns: 2,
        min_rows: 2,
      };
    }
    return {
      rows: 1,
      columns: 3,
      min_columns: 2,
      min_rows: 1,
    };
  }

  public setConfig(config: ButtonCardConfig): void {
    if (config.entity && !isValidEntityId(config.entity)) {
      throw new Error("Invalid entity");
    }

    this._config = {
      tap_action: {
        action: getEntityDefaultButtonAction(config.entity),
      },
      hold_action: { action: "more-info" },
      double_tap_action: { action: "none" },
      show_icon: true,
      show_name: true,
      color:
        config.color ?? (config.state_color === false ? "none" : undefined),
      ...config,
    };
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    const image =
      (typeof this._config?.image === "object" &&
        this._config.image?.media_content_id) ||
      (typeof this._config?.image === "string"
        ? this._config.image
        : undefined);

    if (image && isMediaSourceContentId(image)) {
      if (
        this._api &&
        (this._resolvingImage !== image || changedProps.has("_api"))
      ) {
        this._resolvingImage = image;
        this._resolvedImage = undefined;
        resolveMediaSource(this._api, image).then(
          (result) => {
            if (this._resolvingImage === image) {
              this._resolvedImage = result.url;
            }
          },
          () => {
            if (this._resolvingImage === image) {
              this._resolvingImage = undefined;
            }
          }
        );
      }
    } else {
      this._resolvingImage = undefined;
      this._resolvedImage = image;
    }
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }
    const stateObj = this._stateObj;

    if (this._config.entity && !stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this._localize, this._hassConfig)}
        </hui-warning>
      `;
    }

    const name = this._formatters.formatEntityName(
      stateObj || EMPTY_STATE_OBJ,
      this._config.name
    );

    const hasImage = Boolean(
      (typeof this._config.image === "object" &&
        this._config.image?.media_content_id) ||
      (typeof this._config.image === "string" && this._config.image)
    );

    return html`
      <ha-card
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        role="button"
        aria-label=${name}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
        style=${styleMap({
          "--state-color":
            this._config.color !== "none"
              ? this._computeColor(stateObj, this._config)
              : undefined,
        })}
      >
        <ha-ripple></ha-ripple>
        ${
          this._config.show_icon
            ? hasImage
              ? this._resolvedImage
                ? html`
                    <img
                      class="image"
                      alt=""
                      src=${live(
                        this._hassUrl
                          ? this._hassUrl(this._resolvedImage)
                          : this._resolvedImage
                      )}
                      style=${styleMap({
                        height: this._config.icon_height || undefined,
                        width: this._config.icon_height ? "auto" : undefined,
                      })}
                    />
                  `
                : nothing
              : html`
                  <ha-state-icon
                    tabindex="-1"
                    data-domain=${ifDefined(
                      stateObj ? computeStateDomain(stateObj) : undefined
                    )}
                    data-state=${ifDefined(stateObj?.state)}
                    .icon=${this._config.icon}
                    .stateObj=${stateObj}
                    style=${styleMap({
                      filter: stateObj
                        ? stateColorBrightness(stateObj)
                        : undefined,
                      height: this._config.icon_height
                        ? this._config.icon_height
                        : undefined,
                    })}
                  ></ha-state-icon>
                `
            : nothing
        }
        ${
          this._config.show_name
            ? html`<span tabindex="-1" .title=${name}>${name}</span>`
            : nothing
        }
        ${
          this._config.show_state && stateObj
            ? html`<span class="state">
                ${this._formatters.formatEntityState(stateObj)}
              </span>`
            : nothing
        }
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this._themes) {
      return;
    }
    if (!changedProps.has("_themes") && !changedProps.has("_config")) {
      return;
    }
    const oldThemes = changedProps.get("_themes") as Themes | undefined;
    const oldConfig = changedProps.get("_config") as
      ButtonCardConfig | undefined;

    if (
      (changedProps.has("_themes") &&
        (!oldThemes || oldThemes !== this._themes)) ||
      (changedProps.has("_config") &&
        (!oldConfig || oldConfig.theme !== this._config.theme))
    ) {
      applyThemesOnElement(this, this._themes, this._config.theme);
    }
  }

  static get styles(): CSSResultGroup {
    return [
      iconColorCSS,
      css`
        ha-card {
          --state-inactive-color: var(--state-icon-color);
          --state-color: var(--state-icon-color);
          --ha-ripple-color: var(--state-color);
          --ha-ripple-hover-opacity: 0.04;
          --ha-ripple-pressed-opacity: 0.12;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 4% 0;
          font-size: var(--ha-font-size-l);
          line-height: var(--ha-line-height-condensed);
          height: 100%;
          box-sizing: border-box;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        ha-card:focus {
          outline: none;
        }

        ha-state-icon,
        .image {
          width: 40%;
          height: auto;
          max-height: 80%;
          transition: transform 180ms ease-in-out;
          pointer-events: none;
        }

        ha-state-icon {
          color: var(--state-color);
          --mdc-icon-size: 100%;
        }

        .image {
          max-width: 100%;
          object-fit: contain;
        }

        ha-state-icon + span,
        .image + span {
          margin-top: 8px;
        }

        ha-state-icon,
        .image,
        span {
          outline: none;
        }

        ha-card:focus-visible {
          --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
          --shadow-focus: 0 0 0 1px var(--state-color, var(--state-icon-color));
          border-color: var(--state-color, var(--state-icon-color));
          box-shadow: var(--shadow-default), var(--shadow-focus);
        }

        ha-card:focus-visible ha-state-icon,
        ha-card:focus-visible .image,
        :host(:active) ha-state-icon,
        :host(:active) .image {
          transform: scale(1.2);
        }

        .state {
          font-size: 0.9rem;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }

  private _computeColor(
    stateObj: HassEntity | undefined,
    config: ButtonCardConfig
  ): string | undefined {
    if (config.color) {
      return !stateObj || stateActive(stateObj)
        ? computeCssColor(config.color)
        : undefined;
    }

    if (!stateObj) {
      return undefined;
    }

    if (stateObj.attributes.rgb_color) {
      return `rgb(${stateObj.attributes.rgb_color.join(",")})`;
    }
    if (stateObj.attributes.hvac_action) {
      const hvacAction = stateObj.attributes.hvac_action;
      if (hvacAction in CLIMATE_HVAC_ACTION_TO_MODE) {
        return stateColorCss(stateObj, CLIMATE_HVAC_ACTION_TO_MODE[hvacAction]);
      }
      return undefined;
    }
    const iconColor = stateColorCss(stateObj);
    if (iconColor) {
      return iconColor;
    }
    return undefined;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    fireEvent(this, "hass-action", {
      config: this._config!,
      action: ev.detail.action,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card": HuiButtonCard;
  }
}
