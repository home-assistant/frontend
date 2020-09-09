import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-svg-icon";
import { mdiChevronDown } from "@mdi/js";

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
          <ha-svg-icon path=${mdiChevronDown}></ha-svg-icon>
        </div>
      </div>
      <div class="container ${this.expanded ? "expanded" : ""}">
        <slot></slot>
      </div>
    `;
  }

  private _togglePanel(): void {
    this.expanded = !this.expanded;
    fireEvent(this, this.expanded ? "expanded" : "collapsed");
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
        overflow: hidden;
      }

      .summary-title {
        margin: 0;
        line-height: 1.2;
        overflow: hidden;
      }

      .summary-icon {
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

  // for fire event
  interface HASSDomEvents {
    expanded: undefined;
    collapsed: undefined;
  }
}
