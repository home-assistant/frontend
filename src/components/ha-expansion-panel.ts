import { mdiChevronDown } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import { nextRender } from "../common/util/render-status";
import "./ha-svg-icon";

@customElement("ha-expansion-panel")
export class HaExpansionPanel extends LitElement {
  @property({ type: Boolean, reflect: true }) expanded = false;

  @property({ type: Boolean, reflect: true }) outlined = false;

  @property({ type: Boolean, reflect: true }) leftChevron = false;

  @property() header?: string;

  @property() secondary?: string;

  @state() _showContent = this.expanded;

  @query(".container") private _container!: HTMLDivElement;

  protected render(): TemplateResult {
    return html`
      <div class="top ${classMap({ expanded: this.expanded })}">
        <div
          id="summary"
          @click=${this._toggleContainer}
          @keydown=${this._toggleContainer}
          @focus=${this._focusChanged}
          @blur=${this._focusChanged}
          role="button"
          tabindex="0"
          aria-expanded=${this.expanded}
          aria-controls="sect1"
        >
          ${this.leftChevron
            ? html`
                <ha-svg-icon
                  .path=${mdiChevronDown}
                  class="summary-icon ${classMap({ expanded: this.expanded })}"
                ></ha-svg-icon>
              `
            : ""}
          <slot name="header">
            <div class="header">
              ${this.header}
              <slot class="secondary" name="secondary">${this.secondary}</slot>
            </div>
          </slot>
          ${!this.leftChevron
            ? html`
                <ha-svg-icon
                  .path=${mdiChevronDown}
                  class="summary-icon ${classMap({ expanded: this.expanded })}"
                ></ha-svg-icon>
              `
            : ""}
        </div>
        <slot name="icons"></slot>
      </div>
      <div
        class="container ${classMap({ expanded: this.expanded })}"
        @transitionend=${this._handleTransitionEnd}
        role="region"
        aria-labelledby="summary"
        aria-hidden=${!this.expanded}
        tabindex="-1"
      >
        ${this._showContent ? html`<slot></slot>` : ""}
      </div>
    `;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has("expanded") && this.expanded) {
      this._showContent = this.expanded;
      setTimeout(() => {
        // Verify we're still expanded
        if (this.expanded) {
          this._container.style.overflow = "initial";
        }
      }, 300);
    }
  }

  private _handleTransitionEnd() {
    this._container.style.removeProperty("height");
    this._container.style.overflow = this.expanded ? "initial" : "hidden";
    this._showContent = this.expanded;
  }

  private async _toggleContainer(ev): Promise<void> {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    const newExpanded = !this.expanded;
    fireEvent(this, "expanded-will-change", { expanded: newExpanded });
    this._container.style.overflow = "hidden";

    if (newExpanded) {
      this._showContent = true;
      // allow for dynamic content to be rendered
      await nextRender();
    }

    const scrollHeight = this._container.scrollHeight;
    this._container.style.height = `${scrollHeight}px`;

    if (!newExpanded) {
      setTimeout(() => {
        this._container.style.height = "0px";
      }, 0);
    }

    this.expanded = newExpanded;
    fireEvent(this, "expanded-changed", { expanded: this.expanded });
  }

  private _focusChanged(ev) {
    this.shadowRoot!.querySelector(".top")!.classList.toggle(
      "focused",
      ev.type === "focus"
    );
  }

  static get styles(): CSSResultGroup {
    return css`
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
        margin-left: 8px;
      }

      :host([leftchevron]) .summary-icon {
        margin-left: 0;
        margin-right: 8px;
      }

      #summary {
        flex: 1;
        display: flex;
        padding: var(--expansion-panel-summary-padding, 0 8px);
        min-height: 48px;
        align-items: center;
        cursor: pointer;
        overflow: hidden;
        font-weight: 500;
        outline: none;
      }

      .summary-icon {
        transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
        direction: var(--direction);
      }

      .summary-icon.expanded {
        transform: rotate(180deg);
      }

      .header,
      ::slotted([slot="header"]) {
        flex: 1;
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
        font-size: 12px;
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
    "expanded-changed": {
      expanded: boolean;
    };
    "expanded-will-change": {
      expanded: boolean;
    };
  }
}
