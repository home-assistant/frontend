import { mdiCircleOutline } from "@mdi/js";
import {
  LitElement,
  customElement,
  html,
  css,
  property,
  TemplateResult,
  internalProperty,
} from "lit-element";
import { buttonLinkStyle } from "../../resources/styles";
import "../ha-svg-icon";

@customElement("ha-timeline")
class HaTimeline extends LitElement {
  @property({ type: Boolean }) public lastItem = false;

  @property({ type: String }) public icon?: string;

  @property({ attribute: false }) public moreItems?: TemplateResult[];

  @internalProperty() private _showMore = false;

  protected render() {
    return html`
      <div class="timeline-start">
        <ha-svg-icon .path=${this.icon || mdiCircleOutline}></ha-svg-icon>
        ${this.lastItem ? "" : html`<div class="line"></div>`}
      </div>
      <div class="content">
        <slot></slot>
        ${!this.moreItems
          ? ""
          : html`
              <div>
                ${this._showMore
                  ? this.moreItems
                  : html`
                      <button class="link" @click=${this._handleShowMore}>
                        Show ${this.moreItems.length} more items
                      </button>
                    `}
              </div>
            `}
      </div>
    `;
  }

  private _handleShowMore() {
    this._showMore = true;
  }

  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: row;
        }
        :host(:not([lastItem])) {
          min-height: 50px;
        }
        .timeline-start {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-right: 4px;
        }
        ha-svg-icon {
          color: var(
            --timeline-ball-color,
            var(--timeline-color, var(--secondary-text-color))
          );
        }
        .line {
          flex: 1;
          width: 2px;
          background-color: var(
            --timeline-line-color,
            var(--timeline-color, var(--secondary-text-color))
          );
          margin: 4px 0;
        }
        .content {
          margin-top: 2px;
        }
        :host(:not([lastItem])) .content {
          padding-bottom: 16px;
        }
      `,
      buttonLinkStyle,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-timeline": HaTimeline;
  }
}
