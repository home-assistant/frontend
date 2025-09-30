import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import "../../../components/ha-card";
import "../../../components/ha-ripple";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import type { LovelaceCardFeaturePosition } from "../card-features/types";

@customElement("hui-tile")
export class HuiTile extends LitElement {
  @property({ type: Boolean }) public vertical = false;

  @property() public color?: string;

  @property({ attribute: false, type: Boolean }) public hasCardAction = false;

  @property({ attribute: false, type: Boolean }) public hasIconAction = false;

  @property({ attribute: false }) public onAction?: (
    ev: ActionHandlerEvent
  ) => void;

  @property({ attribute: false }) public onIconAction?: (
    ev: CustomEvent
  ) => void;

  @property({ attribute: false }) public tapAction?: any;

  @property({ attribute: false }) public holdAction?: any;

  @property({ attribute: false }) public doubleTapAction?: any;

  @property({ attribute: false }) public iconTapAction?: any;

  @property({ attribute: false }) public iconHoldAction?: any;

  @property({ attribute: false }) public iconDoubleTapAction?: any;

  @property({ attribute: false })
  public featurePosition?: LovelaceCardFeaturePosition;

  private _handleAction(ev: ActionHandlerEvent) {
    this.onAction?.(ev);
  }

  protected render() {
    const contentClasses = { vertical: Boolean(this.vertical) };

    const style = {
      "--tile-color": this.color,
    };

    const containerOrientationClass =
      this.featurePosition === "inline" ? "horizontal" : "";

    return html`
      <ha-card style=${styleMap(style)}>
        <div
          class="background"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this.holdAction),
            hasDoubleClick: hasAction(this.doubleTapAction),
          })}
          role=${ifDefined(this.hasCardAction ? "button" : undefined)}
          tabindex=${ifDefined(this.hasCardAction ? "0" : undefined)}
          aria-labelledby="info"
        >
          <ha-ripple .disabled=${!this.hasCardAction}></ha-ripple>
        </div>
        <div class="container ${containerOrientationClass}">
          <div class="content ${classMap(contentClasses)}">
            <slot name="icon"></slot>
            <slot name="info"></slot>
          </div>
          <slot name="features"></slot>
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
    .vertical ::slotted(ha-tile-info) {
      width: 100%;
      flex: none;
    }
    ::slotted(ha-tile-icon) {
      --tile-icon-color: var(--tile-color);
      position: relative;
      padding: 6px;
      margin: -6px;
    }
    ::slotted(ha-tile-info) {
      position: relative;
      min-width: 0;
      transition: background-color 180ms ease-in-out;
      box-sizing: border-box;
    }
    ::slotted(features) {
      --feature-color: var(--tile-color);
      padding: 0 12px 12px 12px;
    }
    .container.horizontal ::slotted(hui-card-features) {
      width: calc(50% - var(--column-gap, 0px) / 2 - 12px);
      flex: none;
      --feature-height: 36px;
      padding: 0 12px;
      padding-inline-start: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile": HuiTile;
  }
}
