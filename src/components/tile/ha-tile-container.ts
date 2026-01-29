import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { stopPropagation } from "../../common/dom/stop_propagation";
import type { ActionHandlerOptions } from "../../data/lovelace/action_handler";
import { actionHandler } from "../../panels/lovelace/common/directives/action-handler-directive";
import "../ha-ripple";

@customElement("ha-tile-container")
export class HaTileContainer extends LitElement {
  @property({ attribute: false })
  public featurePosition: "bottom" | "inline" = "bottom";

  @property({ type: Boolean })
  public vertical = false;

  @property({ type: Boolean, attribute: false })
  public interactive = false;

  @property({ attribute: false })
  public actionHandlerOptions?: ActionHandlerOptions;

  private _handleFocus(ev: FocusEvent) {
    if ((ev.target as HTMLElement).matches(":focus-visible")) {
      this.setAttribute("focused", "");
    }
  }

  private _handleBlur() {
    this.removeAttribute("focused");
  }

  protected render() {
    const containerOrientationClass =
      this.featurePosition === "inline" ? "horizontal" : "";
    const contentClasses = { vertical: this.vertical };

    return html`
      <div
        class="background"
        role=${ifDefined(this.interactive ? "button" : undefined)}
        tabindex=${ifDefined(this.interactive ? "0" : undefined)}
        aria-labelledby="info"
        .actionHandler=${actionHandler(this.actionHandlerOptions)}
        @focus=${this._handleFocus}
        @blur=${this._handleBlur}
      >
        <ha-ripple .disabled=${!this.interactive}></ha-ripple>
      </div>
      <div
        class="container ${containerOrientationClass}"
        @action=${stopPropagation}
        @click=${stopPropagation}
      >
        <div class="content ${classMap(contentClasses)}">
          <slot name="icon"></slot>
          <slot name="info" id="info"></slot>
        </div>
        <slot name="features"></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
      -webkit-tap-highlight-color: transparent;
      --ha-ripple-color: var(--tile-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
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
    .vertical ::slotted([slot="info"]) {
      width: 100%;
      flex: none;
    }

    ::slotted([slot="icon"]) {
      position: relative;
      padding: 6px;
      margin: -6px;
    }
    ::slotted([slot="icon"]:focus) {
      outline: none;
    }

    ::slotted([slot="info"]) {
      position: relative;
      min-width: 0;
      transition: background-color 180ms ease-in-out;
      box-sizing: border-box;
    }
    ::slotted([slot="features"]) {
      padding: 0 var(--ha-space-3) var(--ha-space-3) var(--ha-space-3);
    }

    .container.horizontal ::slotted([slot="features"]) {
      width: calc(50% - var(--column-gap, 0px) / 2 - var(--ha-space-3));
      flex: none;
      --feature-height: var(--ha-space-9);
      padding: 0 var(--ha-space-3);
      padding-inline-start: 0;
    }
    [role="button"] {
      cursor: pointer;
      pointer-events: auto;
    }
    [role="button"]:focus {
      outline: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-container": HaTileContainer;
  }
}
