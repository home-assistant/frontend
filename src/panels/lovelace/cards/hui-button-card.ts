import { consume } from "@lit-labs/context";
import "@material/mwc-ripple";
import type { Ripple } from "@material/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import {
  HassConfig,
  HassEntities,
  HassEntity,
} from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, eventOptions, queryAsync, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDisplaySingleEntity } from "../../../common/entity/compute_state_display";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  stateColorCss,
  stateColorBrightness,
} from "../../../common/entity/state_color";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { iconColorCSS } from "../../../common/style/icon_color_css";
import { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-card";
import { CLIMATE_HVAC_ACTION_TO_MODE } from "../../../data/climate";
import {
  configContext,
  entitiesContext,
  localeContext,
  localizeContext,
  statesContext,
  themesContext,
} from "../../../data/context";
import { EntityRegistryDisplayEntry } from "../../../data/entity_registry";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { FrontendLocaleData } from "../../../data/translation";
import { Themes } from "../../../data/ws-themes";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { hasAction } from "../common/has-action";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { ButtonCardConfig } from "./types";

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
      tap_action: {
        action: "toggle",
      },
      entity: foundEntities[0] || "",
    };
  }

  public hass!: HomeAssistant;

  @state() private _config?: ButtonCardConfig;

  @consume<any>({ context: statesContext, subscribe: true })
  @transform({
    transformer: function (this: HuiButtonCard, value: HassEntities) {
      return this._config?.entity ? value[this._config?.entity] : undefined;
    },
    watch: ["_config"],
  })
  _stateObj?: HassEntity;

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

  @consume<any>({ context: entitiesContext, subscribe: true })
  @transform<HomeAssistant["entities"], EntityRegistryDisplayEntry>({
    transformer: function (this: HuiButtonCard, value) {
      return this._config?.entity ? value[this._config?.entity] : undefined;
    },
    watch: ["_config"],
  })
  _entity?: EntityRegistryDisplayEntry;

  @queryAsync("mwc-ripple") private _ripple!: Promise<Ripple | null>;

  @state() private _shouldRenderRipple = false;

  private getStateColor(stateObj: HassEntity, config: ButtonCardConfig) {
    const domain = stateObj ? computeStateDomain(stateObj) : undefined;
    return (
      config &&
      (config.state_color ||
        (domain === "light" && config.state_color !== false))
    );
  }

  public getCardSize(): number {
    return (
      (this._config?.show_icon ? 4 : 0) + (this._config?.show_name ? 1 : 0)
    );
  }

  public setConfig(config: ButtonCardConfig): void {
    if (config.entity && !isValidEntityId(config.entity)) {
      throw new Error("Invalid entity");
    }

    this._config = {
      tap_action: {
        action:
          config.entity && DOMAINS_TOGGLE.has(computeDomain(config.entity))
            ? "toggle"
            : "more-info",
      },
      hold_action: { action: "more-info" },
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
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name = this._config.show_name
      ? this._config.name || (stateObj ? computeStateName(stateObj) : "")
      : "";

    const colored = stateObj && this.getStateColor(stateObj, this._config);

    return html`
      <ha-card
        @action=${this._handleAction}
        @focus=${this.handleRippleFocus}
        @blur=${this.handleRippleBlur}
        @mousedown=${this.handleRippleActivate}
        @mouseup=${this.handleRippleDeactivate}
        @touchstart=${this.handleRippleActivate}
        @touchend=${this.handleRippleDeactivate}
        @touchcancel=${this.handleRippleDeactivate}
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
      >
        ${this._config.show_icon
          ? html`
              <ha-state-icon
                tabindex="-1"
                data-domain=${ifDefined(
                  stateObj ? computeStateDomain(stateObj) : undefined
                )}
                data-state=${ifDefined(stateObj?.state)}
                .icon=${this._config.icon}
                .state=${stateObj}
                style=${styleMap({
                  color: colored ? this._computeColor(stateObj) : undefined,
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
              ${computeStateDisplaySingleEntity(
                this._localize,
                stateObj,
                this._locale,
                this._hassConfig,
                this._entity
              )}
            </span>`
          : ""}
        ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : ""}
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

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    this._shouldRenderRipple = true;
    return this._ripple;
  });

  @eventOptions({ passive: true })
  private handleRippleActivate(evt?: Event) {
    this._rippleHandlers.startPress(evt);
  }

  private handleRippleDeactivate() {
    this._rippleHandlers.endPress();
  }

  private handleRippleFocus() {
    this._rippleHandlers.startFocus();
  }

  private handleRippleBlur() {
    this._rippleHandlers.endFocus();
  }

  static get styles(): CSSResultGroup {
    return [
      iconColorCSS,
      css`
        ha-card {
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
          color: var(--paper-item-icon-color, #44739e);
          --mdc-icon-size: 100%;
          --state-inactive-color: var(--paper-item-icon-color, #44739e);
        }

        ha-state-icon + span {
          margin-top: 8px;
        }

        ha-state-icon,
        span {
          outline: none;
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
