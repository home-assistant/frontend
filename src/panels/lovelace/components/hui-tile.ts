import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import "../../../components/ha-card";
import "../../../components/ha-ripple";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import "../../../components/tile/ha-tile-badge";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import "../../../state-display/state-display";
import type { HomeAssistant } from "../../../types";
import "../card-features/hui-card-features";
import type { LovelaceCardFeatureContext } from "../card-features/types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { renderTileBadge } from "../cards/tile/badges/tile-badge";

export interface TileConfig {
  name: string;
  stateContent?: any;
  hideState?: boolean;
  icon?: string;
  color?: string;
  showEntityPicture?: boolean;
  vertical?: boolean;
  features?: any[];
  featuresPosition?: string;
  tapAction?: any;
  holdAction?: any;
  doubleTapAction?: any;
  iconTapAction?: any;
  iconHoldAction?: any;
  iconDoubleTapAction?: any;
}

export interface TileState {
  active: boolean;
  color?: string;
  imageUrl?: string;
  stateDisplay?: any;
}

@customElement("hui-tile")
export class HuiTile extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public config?: TileConfig;

  @property({ attribute: false }) public state?: TileState;

  @property({ attribute: false })
  public featureContext?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public domain?: string;

  @property({ attribute: false }) public entityId?: string;

  @property({ attribute: false, type: Boolean }) public hasCardAction = false;

  @property({ attribute: false, type: Boolean }) public hasIconAction = false;

  @property({ attribute: false }) public onAction?: (
    ev: ActionHandlerEvent
  ) => void;

  @property({ attribute: false }) public onIconAction?: (
    ev: CustomEvent
  ) => void;

  private get _featurePosition() {
    if (this.config?.vertical) {
      return "bottom";
    }
    return this.config?.featuresPosition || "bottom";
  }

  private get _displayedFeatures() {
    const features = this.config?.features || [];
    const featurePosition = this._featurePosition;

    if (featurePosition === "inline") {
      return features.slice(0, 1);
    }
    return features;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    this.onAction?.(ev);
  }

  private _handleIconAction(ev: CustomEvent) {
    this.onIconAction?.(ev);
  }

  protected render() {
    if (!this.config || !this.state || !this.hass) {
      return nothing;
    }

    const contentClasses = { vertical: Boolean(this.config.vertical) };
    const name = this.config.name;
    const active = this.state.active;
    const color = this.state.color;
    const stateDisplay = this.config.hideState
      ? nothing
      : this.state.stateDisplay;

    const style = {
      "--tile-color": color,
    };

    const imageUrl = this.state.imageUrl;
    const featurePosition = this._featurePosition;
    const features = this._displayedFeatures;
    const containerOrientationClass =
      featurePosition === "inline" ? "horizontal" : "";

    return html`
      <ha-card style=${styleMap(style)} class=${classMap({ active })}>
        <div
          class="background"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this.config!.holdAction),
            hasDoubleClick: hasAction(this.config!.doubleTapAction),
          })}
          role=${ifDefined(this.hasCardAction ? "button" : undefined)}
          tabindex=${ifDefined(this.hasCardAction ? "0" : undefined)}
          aria-labelledby="info"
        >
          <ha-ripple .disabled=${!this.hasCardAction}></ha-ripple>
        </div>
        <div class="container ${containerOrientationClass}">
          <div class="content ${classMap(contentClasses)}">
            <ha-tile-icon
              role=${ifDefined(this.hasIconAction ? "button" : undefined)}
              tabindex=${ifDefined(this.hasIconAction ? "0" : undefined)}
              @action=${this._handleIconAction}
              .actionHandler=${actionHandler({
                hasHold: hasAction(this.config!.iconHoldAction),
                hasDoubleClick: hasAction(this.config!.iconDoubleTapAction),
              })}
              .interactive=${this.hasIconAction}
              .imageUrl=${imageUrl}
              data-domain=${ifDefined(this.domain)}
              data-state=${ifDefined(
                this.entityId
                  ? this.hass.states[this.entityId]?.state
                  : undefined
              )}
              class=${classMap({ image: Boolean(imageUrl) })}
            >
              <ha-state-icon
                slot="icon"
                .icon=${this.config.icon}
                .stateObj=${this.entityId
                  ? this.hass.states[this.entityId]
                  : undefined}
                .hass=${this.hass}
              ></ha-state-icon>
              ${this.entityId
                ? renderTileBadge(this.hass.states[this.entityId], this.hass)
                : nothing}
            </ha-tile-icon>
            <ha-tile-info id="info">
              <span slot="primary" class="primary">${name}</span>
              ${stateDisplay
                ? html`<span slot="secondary">${stateDisplay}</span>`
                : nothing}
            </ha-tile-info>
          </div>
          ${features.length > 0
            ? html`
                <hui-card-features
                  .hass=${this.hass}
                  .context=${this.featureContext || {}}
                  .color=${this.config.color}
                  .features=${features}
                ></hui-card-features>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      --tile-color: var(--state-inactive-color);
      -webkit-tap-highlight-color: transparent;
    }
    ha-card:has(.background:focus-visible) {
      --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
      --shadow-focus: 0 0 0 1px var(--tile-color);
      border-color: var(--tile-color);
      box-shadow: var(--shadow-default), var(--shadow-focus);
    }
    ha-card {
      --ha-ripple-color: var(--tile-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
      height: 100%;
      transition:
        box-shadow 180ms ease-in-out,
        border-color 180ms ease-in-out;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    ha-card.active {
      --tile-color: var(--state-icon-color);
    }
    [role="button"] {
      cursor: pointer;
      pointer-events: auto;
    }
    [role="button"]:focus {
      outline: none;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      border-radius: var(--ha-card-border-radius, 12px);
      margin: calc(-1 * var(--ha-card-border-width, 1px));
      overflow: hidden;
    }
    .container {
      margin: calc(-1 * var(--ha-card-border-width, 1px));
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .container.horizontal {
      flex-direction: row;
    }

    .content {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 10px;
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      pointer-events: none;
      gap: 10px;
    }

    .vertical {
      flex-direction: column;
      text-align: center;
      justify-content: center;
    }
    .vertical ha-tile-info {
      width: 100%;
      flex: none;
    }
    ha-tile-icon {
      --tile-icon-color: var(--tile-color);
      position: relative;
      padding: 6px;
      margin: -6px;
    }
    ha-tile-badge {
      position: absolute;
      top: 3px;
      right: 3px;
      inset-inline-end: 3px;
      inset-inline-start: initial;
    }
    ha-tile-info {
      position: relative;
      min-width: 0;
      transition: background-color 180ms ease-in-out;
      box-sizing: border-box;
    }
    hui-card-features {
      --feature-color: var(--tile-color);
      padding: 0 12px 12px 12px;
    }
    .container.horizontal hui-card-features {
      width: calc(50% - var(--column-gap, 0px) / 2 - 12px);
      flex: none;
      --feature-height: 36px;
      padding: 0 12px;
      padding-inline-start: 0;
    }

    ha-tile-icon[data-domain="alarm_control_panel"][data-state="pending"],
    ha-tile-icon[data-domain="alarm_control_panel"][data-state="arming"],
    ha-tile-icon[data-domain="alarm_control_panel"][data-state="triggered"],
    ha-tile-icon[data-domain="lock"][data-state="jammed"] {
      animation: pulse 1s infinite;
    }

    /* Make sure we display the whole image */
    ha-tile-icon.image[data-domain="update"] {
      --tile-icon-border-radius: 0;
    }
    /* Make sure we display the almost the whole image but it often use text */
    ha-tile-icon.image[data-domain="media_player"] {
      --tile-icon-border-radius: min(
        var(--ha-tile-icon-border-radius, var(--ha-border-radius-sm)),
        var(--ha-border-radius-sm)
      );
    }

    @keyframes pulse {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile": HuiTile;
  }
}
