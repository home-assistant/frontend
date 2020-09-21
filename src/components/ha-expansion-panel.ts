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
import { classMap } from "lit-html/directives/class-map";

@customElement("ha-expansion-panel")
class HaExpansionPanel extends LitElement {
  @property({ type: Boolean }) expanded = false;

  protected render(): TemplateResult {
    return html`
      <div
        class="summary ${classMap({ expanded: this.expanded })}"
        @click=${this._togglePanel}
      >
        <div class="summary-content">
          <slot name="title"></slot>
        </div>
        <div class="summary-icon">
          <ha-svg-icon .path=${mdiChevronDown}></ha-svg-icon>
        </div>
      </div>
      <div class="container ${classMap({ expanded: this.expanded })}">
        <slot name="content"></slot>
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
        position: relative;
        align-items: center;
        cursor: pointer;
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

      ::slotted([slot="title"]) {
        display: flex;
      }

      .summary-icon {
        transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
      }

      .summary.expanded .summary-icon {
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

      ::slotted([slot="content"]) {
        padding: 8px;
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
