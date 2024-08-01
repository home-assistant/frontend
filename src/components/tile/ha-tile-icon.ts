import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement } from "lit/decorators";
import "../ha-icon";
import "../ha-svg-icon";

@customElement("ha-tile-icon")
export class HaTileIcon extends LitElement {
  protected render(): TemplateResult {
    return html`
      <div class="shape">
        <slot></slot>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --tile-icon-color: var(--disabled-color);
        --mdc-icon-size: 22px;
      }
      .shape::before {
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
      .shape {
        position: relative;
        width: 36px;
        height: 36px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 180ms ease-in-out;
        overflow: hidden;
      }
      .shape ::slotted(*) {
        display: flex;
        color: var(--tile-icon-color);
        transition: color 180ms ease-in-out;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-icon": HaTileIcon;
  }
}
