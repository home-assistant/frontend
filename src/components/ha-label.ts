import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "@material/web/ripple/ripple";

@customElement("ha-label")
class HaLabel extends LitElement {
  @property({ type: Boolean, reflect: true }) dense = false;

  protected render(): TemplateResult {
    return html`
      <span class="content">
        <slot name="icon"></slot>
        <slot></slot>
        <md-ripple></md-ripple>
      </span>
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
          --ha-label-background-opacity: 1;

          position: relative;
          box-sizing: border-box;
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
          color: var(--ha-label-text-color);
          --mdc-icon-size: 12px;
          text-wrap: nowrap;
        }
        .content > * {
          position: relative;
          display: inline-flex;
          flex-direction: row;
          align-items: center;
        }
        :host:before {
          position: absolute;
          content: "";
          inset: 0;
          border-radius: inherit;
          background-color: var(--ha-label-background-color);
          opacity: var(--ha-label-background-opacity);
        }
        ::slotted([slot="icon"]) {
          margin-right: 8px;
          margin-left: -8px;
          margin-inline-start: -8px;
          margin-inline-end: 8px;
          display: flex;
        }

        span {
          display: inline-flex;
        }

        :host([dense]) {
          height: 20px;
          padding: 0 12px;
          border-radius: 10px;
        }
        :host([dense]) ::slotted([slot="icon"]) {
          margin-right: 4px;
          margin-left: -4px;
          margin-inline-start: -4px;
          margin-inline-end: 4px;
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
