import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { uid } from "../common/util/uid";
import "./ha-tooltip";

@customElement("ha-label")
class HaLabel extends LitElement {
  @property({ type: Boolean, reflect: true }) dense = false;

  @property({ attribute: "description" })
  public description?: string;

  private _elementId = "label-" + uid();

  protected render(): TemplateResult {
    return html`
      <ha-tooltip
        .for=${this._elementId}
        .disabled=${!this.description?.trim()}
      >
        ${this.description}
      </ha-tooltip>
      <div class="container" .id=${this._elementId}>
        <span class="content">
          <slot name="icon"></slot>
          <slot></slot>
        </span>
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
          height: 32px;
          border-radius: var(--ha-border-radius-xl);
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

        .container {
          display: flex;
          align-items: center;
          position: relative;
          height: 100%;
          padding: 0 16px;
        }

        span {
          display: inline-flex;
        }

        :host([dense]) {
          height: 20px;
          border-radius: var(--ha-border-radius-md);
        }
        :host([dense]) .container {
          padding: 0 12px;
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
