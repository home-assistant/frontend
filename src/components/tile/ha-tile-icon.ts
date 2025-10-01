import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-icon";
import "../ha-svg-icon";

/**
 * Home Assistant tile icon component
 *
 * @element ha-tile-icon
 *
 * @summary
 * A tile icon component, used in tile card in Home Assistant to display an icon or image.
 *
 * @slot - Additional content (for example, a badge).
 * @slot icon - The icon container (usually for icons).
 *
 * @cssprop --ha-tile-icon-border-radius - The border radius of the tile icon. defaults to `var(--ha-border-radius-pill)`.
 *
 * @attr {boolean} interactive - Whether the icon is interactive (hover and focus styles).
 * @attr {string} image-url - The URL of the image to display instead of an icon.
 */
@customElement("ha-tile-icon")
export class HaTileIcon extends LitElement {
  @property({ type: Boolean, reflect: true })
  public interactive = false;

  @property({ attribute: "image-url", type: String })
  public imageUrl?: string;

  protected render(): TemplateResult {
    if (this.imageUrl) {
      return html`
        <div class="container">
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
