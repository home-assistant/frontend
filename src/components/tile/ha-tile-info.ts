import type { TemplateResult } from "lit";
import { html, css, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-tile-info")
export class HaTileInfo extends LitElement {
  @property() public primary?: string;

  @property() public secondary?: string | TemplateResult<1>;

  @property({ type: Boolean, reflect: true }) public state_on_top = false;

  protected render() {
    return html`
      <div class="info">
        <span class="primary"
          >${this.state_on_top ? this.secondary : this.primary}</span
        >
        ${this.secondary
          ? html`<span class="secondary"
              >${this.state_on_top ? this.primary : this.secondary}</span
            >`
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
      color: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-info": HaTileInfo;
  }
}
