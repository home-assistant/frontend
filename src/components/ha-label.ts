import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-label")
class HaLabel extends LitElement {
  protected render(): TemplateResult {
    return html`
        <span class="label">
            <slot name="icon"></slot>
            <slot></slot>
        </div>
      `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          --ha-label-text-color: var(--primary-text-color);
          --ha-label-icon-color: var(--primary-text-color);
          --ha-label-background-color: rgba(
            var(--rgb-primary-text-color),
            0.15
          );
        }
        .label {
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.1px;
          vertical-align: middle;
          height: 32px;
          padding: 0 16px;
          border-radius: 18px;
          background-color: var(--ha-label-background-color);
          color: var(--ha-label-text-color);
          --mdc-icon-size: 18px;
        }
        ::slotted([slot="icon"]) {
          margin-right: 8px;
          margin-left: -8px;
          display: flex;
          color: var(--ha-label-icon-color);
        }
        span {
          display: inline-flex;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-label": HaLabel;
  }
}
