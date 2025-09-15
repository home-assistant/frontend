import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-tile-info")
export class HaTileInfo extends LitElement {
  @property() public primary?: string;

  @property() public secondary?: string;

  protected render() {
    return html`
      <div class="info">
        <slot name="primary" class="primary">
          <span>${this.primary}</span>
        </slot>
        <slot name="secondary" class="secondary">
          <span>${this.secondary}</span>
        </slot>
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
    span,
    ::slotted(*) {
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
