import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-icon";
import "../ha-svg-icon";

@customElement("ha-tile-icon")
export class HaTileIcon extends LitElement {
  @property({ type: Boolean, attribute: "has-background" })
  public hasBackground = false;

  protected render(): TemplateResult {
    return html`
      <div class="container ${this.hasBackground ? "background" : ""}">
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
      --tile-icon-color: var(--disabled-color);
      --mdc-icon-size: 24px;
      width: 36px;
      height: 36px;
      border-radius: 18px;
      overflow: hidden;
      display: block;
    }
    .background::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background-color: var(--tile-icon-color);
      transition: background-color 180ms ease-in-out;
      opacity: 0.2;
    }
    .container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 180ms ease-in-out;
      overflow: hidden;
    }
    .container ::slotted(*) {
      display: flex;
      color: var(--tile-icon-color);
      transition: color 180ms ease-in-out;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-icon": HaTileIcon;
  }
}
