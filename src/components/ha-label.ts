import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-label")
class HaLabel extends LitElement {
  @property({ type: Boolean, reflect: true }) dense = false;

  protected render(): TemplateResult {
    return html`
      <span class="content">
        <slot name="icon"></slot>
        <slot></slot>
      </span>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          --ha-label-text-color: var(--primary-text-color);
          --ha-label-icon-color: var(--primary-text-color);
          --ha-label-background-color: rgb(
            from var(--primary-text-color) r g b / 0.15
          );
          --ha-label-background-opacity: 1;
          border: 1px solid var(--outline-color);
          position: relative;
          box-sizing: border-box;
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          font-size: var(--ha-font-size-s);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
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
