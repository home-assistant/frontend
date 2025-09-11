import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-icon";
import "../ha-svg-icon";
import { classMap } from "lit/directives/class-map";

export type TileIconImageStyle = "square" | "rounded-square" | "circle";

export const DEFAULT_TILE_ICON_BORDER_STYLE = "circle";

@customElement("ha-tile-icon")
export class HaTileIcon extends LitElement {
  @property({ type: Boolean, reflect: true })
  public interactive = false;

  @property({ attribute: "border-style", type: String })
  public imageStyle?: TileIconImageStyle;

  @property({ attribute: false })
  public imageUrl?: string;

  protected render(): TemplateResult {
    if (this.imageUrl) {
      const imageStyle = this.imageStyle || DEFAULT_TILE_ICON_BORDER_STYLE;
      return html`
        <div class="container ${classMap({ [imageStyle]: this.imageUrl })}">
          <img alt="" src=${this.imageUrl} />
        </div>
        <slot></slot>
      `;
    }

    return html`
      <div class="container ${this.interactive ? "background" : ""}">
        <slot name="icon"></slot>
      </div>
      <slot></slot>
    `;
  }

  static styles = css`
    :host {
      --tile-icon-color: var(--disabled-color);
      --tile-icon-opacity: 0.2;
      --tile-icon-hover-opacity: 0.35;
      --tile-icon-border-radius: var(
        --ha-tile-icon-border-radius,
        var(--ha-border-radius-pill)
      );
      --tile-icon-size: 36px;
      --mdc-icon-size: 24px;
      position: relative;
      user-select: none;
      transition: transform 180ms ease-in-out;
    }
    :host([interactive]:active) {
      transform: scale(1.2);
    }
    :host([interactive]:hover) {
      --tile-icon-opacity: var(--tile-icon-hover-opacity);
    }
    .container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--tile-icon-size);
      height: var(--tile-icon-size);
      border-radius: var(--tile-icon-border-radius);
      overflow: hidden;
      transition: box-shadow 180ms ease-in-out;
    }
    :host([interactive]:focus-visible) .container {
      box-shadow: 0 0 0 2px var(--tile-icon-color);
    }
    .container.rounded-square {
      border-radius: 8px;
    }
    .container.square {
      border-radius: 0;
    }
    .container.background::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background-color: var(--tile-icon-color);
      transition:
        background-color 180ms ease-in-out,
        opacity 180ms ease-in-out;
      opacity: var(--tile-icon-opacity);
    }
    .container ::slotted([slot="icon"]) {
      display: flex;
      color: var(--tile-icon-color);
      transition: color 180ms ease-in-out;
      pointer-events: none;
    }
    .container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-icon": HaTileIcon;
  }
}
