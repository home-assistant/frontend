import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

@customElement("ha-expansion-panel")
class HaExpansionPanel extends LitElement {
  @property({ type: String }) title = "";

  @property({ type: Boolean }) expanded = false;

  protected render(): TemplateResult {
    return html`
      <div
        class="summary ${this.expanded ? "expanded" : ""}"
        @click=${this._togglePanel}
      >
        <div class="summary-content">
          <span class="summary-title">
            ${this.title}
          </span>
        </div>
        <div class="summary-icon ${this.expanded ? "expanded" : ""}">
          <svg viewBox="0 0 24 24">
            <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"></path>
          </svg>
        </div>
      </div>
      <div class="container ${this.expanded ? "expanded" : ""}">
        <slot></slot>
      </div>
    `;
  }

  private _togglePanel(): void {
    this.expanded = !this.expanded;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        width: 100%;
        box-shadow: 0px 2px 1px -1px rgba(0, 0, 0, 0.2),
          0px 1px 1px 0px rgba(0, 0, 0, 0.14),
          0px 1px 3px 0px rgba(0, 0, 0, 0.12);
      }

      .summary {
        display: flex;
        padding: 0px 16px;
        min-height: 48px;
        transition: min-height 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
          background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
        color: inherit;
        border: 0;
        cursor: pointer;
        margin: 0;
        outline: 0;
        position: relative;
        align-items: center;
        user-select: none;
        border-radius: 0;
        vertical-align: middle;
        -moz-appearance: none;
        justify-content: center;
        text-decoration: none;
        background-color: transparent;
        -webkit-appearance: none;
        -webkit-tap-highlight-color: transparent;
      }
      .summary.expanded {
        min-height: 64px;
      }

      .summary-content {
        margin: 12px 0;
        display: flex;
        flex-grow: 1;
        transition: margin 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
      }

      .summary-title {
        margin: 0;
        line-height: 1.5;
        letter-spacing: 0.00938em;
        font-size: 0.9375rem;
        font-family: "Roboto", "Helvetica", "Arial", sans-serif;
      }

      .summary-icon {
        width: 1em;
        height: 1em;
        display: inline-block;
        font-size: 1.5rem;
        flex-shrink: 0;
        user-select: none;
        transform: rotate(0deg);
        transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
      }

      .summary-icon.expanded {
        transform: rotate(180deg);
      }

      .container {
        height: 0;
        overflow: hidden;
        transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
        min-height: 0px;
        transition-duration: 222ms;
      }

      .container.expanded {
        height: auto;
      }

      slot {
        display: block;
        padding: 8px 16px 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-expansion-panel": HaExpansionPanel;
  }
}
