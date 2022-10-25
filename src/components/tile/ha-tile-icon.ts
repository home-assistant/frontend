import { CSSResultGroup, html, css, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-icon";
import "../ha-svg-icon";

@customElement("ha-tile-icon")
export class HaTileIcon extends LitElement {
  @property() public iconPath?: string;

  @property() public icon?: string;

  protected render(): TemplateResult {
    return html`
      <div class="shape">
        ${this.icon
          ? html`<ha-icon .icon=${this.icon}></ha-icon>`
          : html`<ha-svg-icon .path=${this.iconPath}></ha-svg-icon>`}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --icon-color: rgb(var(--color));
        --shape-color: rgba(var(--color), 0.2);
        --mdc-icon-size: 24px;
      }
      .shape {
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--shape-color);
        transition: background-color 180ms ease-in-out, color 180ms ease-in-out;
      }
      .shape ha-icon,
      .shape ha-svg-icon {
        display: flex;
        color: var(--icon-color);
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
