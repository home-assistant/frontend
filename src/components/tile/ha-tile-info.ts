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
    :host {
      --tile-info-primary-font-size: var(
        --ha-tile-info-primary-font-size,
        var(--ha-font-size-m)
      );
      --tile-info-primary-font-weight: var(
        --ha-tile-info-primary-font-weight,
        var(--ha-font-weight-medium)
      );
      --tile-info-primary-line-height: var(
        --ha-tile-info-primary-line-height,
        var(--ha-line-height-normal)
      );
      --tile-info-primary-letter-spacing: var(
        --ha-tile-info-primary-letter-spacing,
        0.1px
      );
      --tile-info-primary-color: var(
        --ha-tile-info-primary-color,
        var(--primary-text-color)
      );
      --tile-info-secondary-font-size: var(
        --ha-tile-info-secondary-font-size,
        var(--ha-font-size-s)
      );
      --tile-info-secondary-font-weight: var(
        --ha-tile-info-secondary-font-weight,
        var(--ha-font-weight-normal)
      );
      --tile-info-secondary-line-height: var(
        --ha-tile-info-secondary-line-height,
        var(--ha-line-height-condensed)
      );
      --tile-info-secondary-letter-spacing: var(
        --ha-tile-info-secondary-letter-spacing,
        0.4px
      );
      --tile-info-secondary-color: var(
        --ha-tile-info-secondary-color,
        var(--primary-text-color)
      );
    }
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
      font-size: var(--tile-info-primary-font-size);
      font-weight: var(--tile-info-primary-font-weight);
      line-height: var(--tile-info-primary-line-height);
      letter-spacing: var(--tile-info-primary-letter-spacing);
      color: var(--tile-info-primary-color);
    }
    .secondary {
      font-size: var(--tile-info-secondary-font-size);
      font-weight: var(--tile-info-secondary-font-weight);
      line-height: var(--tile-info-secondary-line-height);
      letter-spacing: var(--tile-info-secondary-letter-spacing);
      color: var(--tile-info-secondary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-info": HaTileInfo;
  }
}
