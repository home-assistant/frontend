import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-svg-icon";

@customElement("ha-automation-row")
export class HaAutomationRow extends LitElement {
  @property() header?: string;

  @property() secondary?: string;

  protected render(): TemplateResult {
    return html`
      <div class="top">
        <div
          id="summary"
          @click=${this._toggleContainer}
          @keydown=${this._toggleContainer}
          role="button"
        >
          <slot name="leading-icon"></slot>
          <slot name="header">
            <div class="header">
              ${this.header}
              <slot class="secondary" name="secondary">${this.secondary}</slot>
            </div>
          </slot>
          <slot name="icons"></slot>
        </div>
      </div>
    `;
  }

  private async _toggleContainer(ev): Promise<void> {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();

    this.click();
  }

  static styles = css`
    :host {
      display: block;
    }

    .top {
      display: flex;
      align-items: center;
      border-radius: var(--ha-card-border-radius, 12px);
    }

    .top.expanded {
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
    }

    .top.focused {
      background: var(--input-fill-color);
    }

    :host([outlined]) {
      box-shadow: none;
      border-width: 1px;
      border-style: solid;
      border-color: var(--outline-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }

    .summary-icon {
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
      direction: var(--direction);
      margin-left: 8px;
      margin-inline-start: 8px;
      margin-inline-end: initial;
    }

    :host([left-chevron]) .summary-icon,
    ::slotted([slot="leading-icon"]) {
      margin-left: 0;
      margin-right: 8px;
      margin-inline-start: 0;
      margin-inline-end: 8px;
    }

    #summary {
      flex: 1;
      display: flex;
      padding: var(--expansion-panel-summary-padding, 0 8px);
      min-height: 48px;
      align-items: center;
      cursor: pointer;
      overflow: hidden;
      font-weight: var(--ha-font-weight-medium);
      outline: none;
    }
    #summary.noCollapse {
      cursor: default;
    }

    .summary-icon.expanded {
      transform: rotate(180deg);
    }

    .header,
    ::slotted([slot="header"]) {
      flex: 1;
      overflow-wrap: anywhere;
    }

    .container {
      padding: var(--expansion-panel-content-padding, 0 8px);
      overflow: hidden;
      transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1);
      height: 0px;
    }

    .container.expanded {
      height: auto;
    }

    .secondary {
      display: block;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row": HaAutomationRow;
  }
}
