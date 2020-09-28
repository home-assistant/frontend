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
  @property({ type: Boolean, reflect: true }) expanded = false;

  @property({ type: Boolean, reflect: true }) outlined = false;

  protected render(): TemplateResult {
    return html`
      <div class="summary" @click=${this._toggleContainer}>
        <slot name="title"></slot>
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
    const container = this.shadowRoot!.querySelector(
      ".container"
    )! as HTMLDivElement;

    if (this.expanded) {
      container.style.height = "auto";
    }
  }

  private _toggleContainer(): void {
    const container: HTMLDivElement = this.shadowRoot!.querySelector(
      ".container"
    )! as HTMLDivElement;

    const scrollHeight = container.scrollHeight;
    const animationDuration = this.getAutoHeightDuration(scrollHeight);
    container.style.height = `${scrollHeight}px`;
    container.style.transitionDuration = `${animationDuration}ms`;

    if (!this.expanded) {
      this.expanded = true;
    } else {
      setTimeout(() => {
        container.style.height = "0px";
        this.expanded = false;
      }, 0);
    }

    fireEvent(this, "expanded-changed", { expanded: this.expanded });
  }

  private getAutoHeightDuration(height: number) {
    if (!height) {
      return 0;
    }

    const constant = height / 36;

    // https://www.wolframalpha.com/input/?i=(4+%2B+15+*+(x+%2F+36+)+**+0.25+%2B+(x+%2F+36)+%2F+5)+*+10
    return Math.round((4 + 15 * constant ** 0.25 + constant / 5) * 10);
  }

  static get styles(): CSSResult {
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
      }

      .summary {
        display: flex;
        padding: 0px 16px;
        min-height: 48px;
        align-items: center;
        cursor: pointer;
        overflow: hidden;
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
        transition: height 200ms cubic-bezier(0.4, 0, 0.2, 1);
        height: 0px;
      }

      .container.expanded {
        height: auto;
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
  }
}
