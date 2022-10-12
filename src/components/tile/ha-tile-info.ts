import { CSSResultGroup, html, css, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-icon";
import "../ha-svg-icon";

@customElement("ha-tile-info")
export class HaTileInfo extends LitElement {
  @property() public primary?: string;

  @property() public secondary?: string;

  protected render(): TemplateResult {
    return html`
      <div class="info">
        <span class="primary">${this.primary}</span>
        ${this.secondary
          ? html`<span class="secondary">${this.secondary}</span>`
          : null}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .info {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      span {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        width: 100%;
      }
      .primary {
        font-weight: 500;
        font-size: 14px;
        line-height: 20px;
        letter-spacing: 0.1px;
        color: var(--primary-text-color);
      }
      .secondary {
        font-weight: 400;
        font-size: 12px;
        line-height: 16px;
        letter-spacing: 0.4px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-info": HaTileInfo;
  }
}
