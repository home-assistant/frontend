import { mdiChevronUp } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-icon-button";

@customElement("ha-automation-row")
export class HaAutomationRow extends LitElement {
  @property({ attribute: "left-chevron", type: Boolean })
  public leftChevron = false;

  @property({ type: Boolean, reflect: true })
  public collapsed = false;

  protected render(): TemplateResult {
    return html`
      <div class="row" tabindex="0" role="button" @keydown=${this._click}>
        ${this.leftChevron
          ? html`
              <ha-icon-button
                class="expand-button"
                .path=${mdiChevronUp}
                @click=${this._handleExpand}
                @keydown=${this._handleExpand}
              ></ha-icon-button>
            `
          : nothing}
        <slot name="leading-icon"></slot>
        <slot class="header" name="header"></slot>
        <slot name="icons"></slot>
      </div>
    `;
  }

  private async _handleExpand(ev) {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.stopPropagation();
    ev.preventDefault();

    fireEvent(this, "toggle-collapsed");
  }

  private async _click(ev): Promise<void> {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();

    this.click();
  }

  static styles = css`
    :host {
      display: block;
    }
    .row {
      display: flex;
      padding: 0 8px;
      min-height: 48px;
      align-items: center;
      cursor: pointer;
      overflow: hidden;
      font-weight: var(--ha-font-weight-medium);
      outline: none;
      border-radius: var(--ha-card-border-radius, 12px);
    }
    .row:focus {
      outline: var(--wa-focus-ring);
      outline-offset: -2px;
    }
    .expand-button {
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
      color: var(--color-on-neutral-quiet);
    }
    ::slotted([slot="leading-icon"]) {
      color: var(--color-on-neutral-quiet);
    }
    :host([collapsed]) .expand-button {
      transform: rotate(180deg);
    }
    ::slotted([slot="header"]) {
      flex: 1;
      overflow-wrap: anywhere;
      margin: 0 12px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row": HaAutomationRow;
  }

  interface HASSDomEvents {
    "toggle-collapsed": undefined;
  }
}
