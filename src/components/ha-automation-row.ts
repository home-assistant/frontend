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

  @property({ type: Boolean, reflect: true })
  public selected = false;

  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property({ type: Boolean, reflect: true, attribute: "building-block" })
  public buildingBlock = false;

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
        <div class="leading-icon-wrapper">
          <slot name="leading-icon"></slot>
        </div>
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
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }
    .row:focus {
      outline: var(--wa-focus-ring);
      outline-offset: -2px;
    }
    .expand-button {
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
      color: var(--ha-color-on-neutral-quiet);
    }
    :host([building-block]) .leading-icon-wrapper {
      background-color: var(--ha-color-fill-neutral-loud-resting);
      border-radius: var(--ha-border-radius-sm);
      padding: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      transform: rotate(45deg);
    }
    ::slotted([slot="leading-icon"]) {
      color: var(--ha-color-on-neutral-quiet);
    }
    :host([building-block]) ::slotted([slot="leading-icon"]) {
      color: var(--white-color);
      transform: rotate(-45deg);
    }
    :host([collapsed]) .expand-button {
      transform: rotate(180deg);
    }
    :host([selected]) .row,
    :host([selected]) .row:focus {
      outline: solid;
      outline-color: var(--primary-color);
      outline-offset: -2px;
      outline-width: 2px;
    }
    :host([disabled]) .row {
      border-top-right-radius: var(--ha-border-radius-square);
      border-top-left-radius: var(--ha-border-radius-square);
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
