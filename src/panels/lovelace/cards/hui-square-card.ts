import "@material/mwc-ripple";
import type { Ripple } from "@material/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import {
  customElement,
  eventOptions,
  property,
  queryAsync,
  state,
} from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeActiveState } from "../../../common/entity/compute_active_state";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateIcon } from "../../../common/entity/state_icon";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { iconColorCSS } from "../../../common/style/icon_color_css";
import { LightEntity } from "../../../data/light";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { SquareCardConfig } from "./types";
import "../../../components/ha-card";

@customElement("hui-square-card")
export class HuiSquareCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-square-card-editor");
    return document.createElement("hui-square-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): SquareCardConfig {
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

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SquareCardConfig;

  @queryAsync("mwc-ripple") private _ripple!: Promise<Ripple | null>;

  @state() private _shouldRenderRipple = false;

  public getCardSize(): number {
    return (
      (this._config?.show_icon ? 4 : 0) + (this._config?.show_name ? 1 : 0)
    );
  }

  public setConfig(config: SquareCardConfig): void {
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !oldHass ||
      oldHass.themes !== this.hass!.themes ||
      oldHass.locale !== this.hass!.locale
    ) {
      return true;
    }

    return (
      Boolean(this._config!.entity) &&
      oldHass.states[this._config!.entity!] !==
        this.hass!.states[this._config!.entity!]
    );
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }
    const stateObj = this._config.entity
      ? this.hass.states[this._config.entity]
      : undefined;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html` <ha-card
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
      tabindex=${ifDefined(
        hasAction(this._config.tap_action) ? "0" : undefined
      )}
    >
      <div class="wrapper">
        <div class="box icon">
          <ha-icon
            data-domain=${ifDefined(
              stateObj ? computeStateDomain(stateObj) : undefined
            )}
            data-state=${ifDefined(
              stateObj ? computeActiveState(stateObj) : undefined
            )}
            .icon=${stateObj ? stateIcon(stateObj) : ""}
            style=${styleMap({
              filter: stateObj ? this._computeBrightness(stateObj) : "",
              color: stateObj ? this._computeColor(stateObj) : "",
            })}
          ></ha-icon>
        </div>
        <div class="box secondary">
          ${stateObj && computeStateDomain(stateObj) === "light"
            ? stateObj.state === "on"
              ? html`<svg
                  class="circle-state"
                  viewbox="0 0 100 100"
                  style=${stateObj.attributes.brightness
                    ? "--percentage:" + stateObj.attributes.brightness / 2.55
                    : ""}
                >
                  <path
                    stroke-width="4"
                    stroke="var(--secondary-text-color)"
                    fill="none"
                    d="M50 10
                a 40 40 0 0 1 0 80
                a 40 40 0 0 1 0 -80"
                  ></path>
                  <text
                    x="50"
                    y="50"
                    fill="var(--secondary-text-color)"
                    text-anchor="middle"
                    dy="7"
                    font-size="1.8rem"
                  >
                    ${Math.floor(stateObj.attributes.brightness / 2.55)} %
                  </text>
                </svg>`
              : html``
            : html`<span
                >${computeStateDomain(stateObj) === "climate"
                  ? html`${stateObj.attributes.current_temperature}°`
                  : html`<ha-relative-time
                      .hass=${this.hass}
                      .datetime=${stateObj.last_changed}
                      .includeTense=${false}
                      .abbreviate=${true}
                    ></ha-relative-time>`}
              </span>`}
        </div>
        <div class="box name">
          <span> ${stateObj ? computeStateName(stateObj) : ""} </span>
        </div>
        <div class="box state">
          ${stateObj
            ? html`<span class="state">
                ${computeStateDisplay(
                  this.hass.localize,
                  stateObj,
                  this.hass.locale,
                  undefined,
                  true
                )}
              </span>`
            : ""}
        </div>
      </div>
      ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : ""}
    </ha-card>`;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | SquareCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
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
    return css`
      ha-card {
        cursor: pointer;
        padding: 4% 0;
        height: 100%;
        box-sizing: border-box;
      }

      ha-card:focus {
        outline: none;
      }

      .wrapper {
        display: grid;
        grid-gap: 4px;
        grid-template-columns: [col] 50% [col] 50%;
        grid-template-rows: [row] auto [row] [row];
        padding: 0% 4% 0% 4%;
      }

      .box {
        border-radius: 5px;
        display: inline-grid;
      }

      .icon {
        grid-column: col / span 1;
        grid-row: row;
      }
      .secondary {
        grid-column: col 2 / span 1;
        grid-row: row;
        align-content: center;
        justify-content: end;
        padding-right: 8px;
      }
      .name {
        grid-column: col / span 2;
        grid-row: row 2;
        padding-top: 48px;
      }
      .state {
        grid-column: col / span 2;
        grid-row: row 3;
      }

      .circle-state {
        stroke-dasharray: calc((251.2 / 100) * var(--percentage)), 251.2;
        margin: 0;
        width: 40px;
        height: 40px;
      }

      ha-icon {
        height: auto;
        color: var(--paper-item-icon-color, #44739e);
        --mdc-icon-size: 50%;
      }

      .state,
      .secondary span {
        font-size: 0.9rem;
        color: var(--secondary-text-color);
      }

      .name,
      .state {
        justify-content: start;
      }

      ${iconColorCSS}
    `;
  }

  private _computeBrightness(stateObj: HassEntity | LightEntity): string {
    if (!stateObj.attributes.brightness || !this._config?.state_color) {
      return "";
    }
    const brightness = stateObj.attributes.brightness;
    return `brightness(${(brightness + 245) / 5}%)`;
  }

  private _computeColor(stateObj: HassEntity | LightEntity): string {
    if (this._config?.state_color && stateObj.attributes.rgb_color) {
      return `rgb(${stateObj.attributes.rgb_color.join(",")})`;
    }
    return "";
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-square-card": HuiSquareCard;
  }
}
