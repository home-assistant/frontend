import { mdiChevronDown } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import { nextRender } from "../common/util/render-status";
import "./ha-svg-icon";

@customElement("ha-expansion-panel")
class HaExpansionPanel extends LitElement {
  @property({ type: Boolean, reflect: true }) expanded = false;

  @property({ type: Boolean, reflect: true }) outlined = false;

  @property() header?: string;

  @property() secondary?: string;

  @query(".container") private _container!: HTMLDivElement;

  protected render(): TemplateResult {
    return html`
      <div class="summary" @click=${this._toggleContainer}>
        <slot class="header" name="header">
          ${this.header}
          <slot class="secondary" name="secondary">${this.secondary}</slot>
        </slot>
        <ha-svg-icon
          .path=${mdiChevronDown}
          class="summary-icon ${classMap({ expanded: this.expanded })}"
        ></ha-svg-icon>
      </div>
      <div
        class="container ${classMap({ expanded: this.expanded })}"
        @transitionend=${this._handleTransitionEnd}
      >
        <slot></slot>
      </div>
    `;
  }

  private _handleTransitionEnd() {
    this._container.style.removeProperty("height");
  }

  private async _toggleContainer(): Promise<void> {
    const newExpanded = !this.expanded;
    fireEvent(this, "expanded-will-change", { expanded: newExpanded });

    if (newExpanded) {
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      :host([outlined]) {
        box-shadow: none;
        border-width: 1px;
        border-style: solid;
        border-color: var(
          --ha-card-border-color,
          var(--divider-color, #e0e0e0)
        );
        border-radius: var(--ha-card-border-radius, 4px);
        padding: 0 8px;
      }

      .summary {
        display: flex;
        padding: var(--expansion-panel-summary-padding, 0);
        min-height: 48px;
        align-items: center;
        cursor: pointer;
        overflow: hidden;
        font-weight: 500;
      }

      .summary-icon {
        transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
        margin-left: auto;
      }

      .summary-icon.expanded {
        transform: rotate(180deg);
      }

      .container {
        overflow: hidden;
        transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1);
        height: 0px;
      }

      .container.expanded {
        height: auto;
      }

      .header {
        display: block;
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
