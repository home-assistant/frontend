import type { TemplateResult } from "lit";
import { html, css, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-tile-info")
export class HaTileInfo extends LitElement {
  @property() public primary?: string;

  @property() public secondary?: string | TemplateResult<1>;

  protected render() {
    return html`
      <div class="info">
        <span class="primary">${this.primary}</span>
        ${this.secondary
          ? html`<span class="secondary">${this.secondary}</span>`
          : nothing}
      </div>
    `;
  }

  static styles = css`
    .info {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
    }
    span {
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      width: 100%;
    }
    .primary {
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-normal);
      letter-spacing: 0.1px;
      color: var(--primary-text-color);
    }
    .secondary {
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
      letter-spacing: 0.4px;
      color: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-info": HaTileInfo;
  }
}
