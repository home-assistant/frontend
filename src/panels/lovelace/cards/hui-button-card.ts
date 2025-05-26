import { consume } from "@lit/context";
import type {
  HassConfig,
  HassEntities,
  HassEntity,
} from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  stateColorBrightness,
  stateColorCss,
} from "../../../common/entity/state_color";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { iconColorCSS } from "../../../common/style/icon_color_css";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-card";
import "../../../components/ha-ripple";
import { CLIMATE_HVAC_ACTION_TO_MODE } from "../../../data/climate";
import {
  configContext,
  entitiesContext,
  localeContext,
  localizeContext,
  statesContext,
  themesContext,
} from "../../../data/context";
import type { EntityRegistryDisplayEntry } from "../../../data/entity_registry";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { FrontendLocaleData } from "../../../data/translation";
import type { Themes } from "../../../data/ws-themes";
import type { HomeAssistant } from "../../../types";
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

  public hass!: HomeAssistant;

  @state() private _config?: ButtonCardConfig;

  @state()
  @consume<any>({ context: statesContext, subscribe: true })
  @transform({
    transformer: function (this: HuiButtonCard, value: HassEntities) {
      return this._config?.entity ? value[this._config?.entity] : undefined;
    },
    watch: ["_config"],
  })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: themesContext, subscribe: true })
  _themes!: Themes;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  _localize!: LocalizeFunc;

  @state()
  @consume({ context: localeContext, subscribe: true })
  _locale!: FrontendLocaleData;

  @state()
  @consume({ context: configContext, subscribe: true })
  _hassConfig!: HassConfig;

  @state()
  @consume<any>({ context: entitiesContext, subscribe: true })
  @transform<HomeAssistant["entities"], EntityRegistryDisplayEntry>({
    transformer: function (this: HuiButtonCard, value) {
      return this._config?.entity ? value[this._config?.entity] : undefined;
    },
    watch: ["_config"],
  })
  _entity?: EntityRegistryDisplayEntry;

  private _getStateColor(stateObj: HassEntity, config: ButtonCardConfig) {
    const domain = stateObj ? computeStateDomain(stateObj) : undefined;
    return config && (config.state_color ?? domain === "light");
  }

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
      state_color: true,
      ...config,
    };
  }

  protected render() {
    if (!this._config || !this._localize || !this._locale) {
      return nothing;
    }
    const stateObj = this._stateObj;

    if (this._config.entity && !stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name = this._config.show_name
      ? this._config.name || (stateObj ? computeStateName(stateObj) : "")
      : "";

    const colored = stateObj && this._getStateColor(stateObj, this._config);

    return html`
      <ha-card
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        role="button"
        aria-label=${this._config.name ||
        (stateObj ? computeStateName(stateObj) : "")}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
        style=${styleMap({
          "--state-color": colored ? this._computeColor(stateObj) : undefined,
        })}
      >
        <ha-ripple></ha-ripple>
        ${this._config.show_icon
          ? html`
              <ha-state-icon
                tabindex="-1"
                data-domain=${ifDefined(
                  stateObj ? computeStateDomain(stateObj) : undefined
                )}
                data-state=${ifDefined(stateObj?.state)}
                .icon=${this._config.icon}
                .hass=${this.hass}
                .stateObj=${stateObj}
                style=${styleMap({
                  filter: colored ? stateColorBrightness(stateObj) : undefined,
                  height: this._config.icon_height
                    ? this._config.icon_height
                    : "",
                })}
              ></ha-state-icon>
            `
          : ""}
        ${this._config.show_name
          ? html`<span tabindex="-1" .title=${name}>${name}</span>`
          : ""}
        ${this._config.show_state && stateObj
          ? html`<span class="state">
              ${this.hass.formatEntityState(stateObj)}
            </span>`
          : ""}
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
    const oldThemes = changedProps.get("_themes") as
      | HomeAssistant["themes"]
      | undefined;
    const oldConfig = changedProps.get("_config") as
      | ButtonCardConfig
      | undefined;

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
          font-size: 16.8px;
          height: 100%;
          box-sizing: border-box;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        ha-card:focus {
          outline: none;
        }

        ha-state-icon {
          width: 40%;
          height: auto;
          max-height: 80%;
          color: var(--state-color);
          --mdc-icon-size: 100%;
          transition: transform 180ms ease-in-out;
          pointer-events: none;
        }

        ha-state-icon + span {
          margin-top: 8px;
        }

        ha-state-icon,
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
        :host(:active) ha-state-icon {
          transform: scale(1.2);
        }

        .state {
          font-size: 0.9rem;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }

  private _computeColor(stateObj: HassEntity): string | undefined {
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
