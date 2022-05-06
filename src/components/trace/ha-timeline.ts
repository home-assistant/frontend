import { mdiCircleOutline } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { buttonLinkStyle } from "../../resources/styles";
import "../ha-svg-icon";

@customElement("ha-timeline")
export class HaTimeline extends LitElement {
  @property({ type: Boolean, reflect: true }) public label = false;

  @property({ type: Boolean, reflect: true }) public raised = false;

  @property({ reflect: true, type: Boolean }) notEnabled = false;

  @property({ type: Boolean }) public lastItem = false;

  @property({ type: String }) public icon?: string;

  @property({ attribute: false }) public moreItems?: TemplateResult[];

  @state() private _showMore = false;

  protected render() {
    return html`
      <div class="timeline-start">
        ${this.label
          ? ""
          : html`
              <ha-svg-icon .path=${this.icon || mdiCircleOutline}></ha-svg-icon>
            `}
        ${this.lastItem ? "" : html`<div class="line"></div>`}
      </div>
      <div class="content">
        <slot></slot>
        ${!this.moreItems
          ? ""
          : html`
              <div>
                ${this._showMore ||
                // If there is only 1 item hidden behind "show more", just show it
                // instead of showing the more info link. We're not animals.
                this.moreItems.length === 1
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
        :host([label]) {
          margin-top: -8px;
          font-style: italic;
          color: var(--timeline-label-color, var(--secondary-text-color));
        }
        .timeline-start {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-right: 8px;
          width: 24px;
        }
        :host([notEnabled]) ha-svg-icon {
          opacity: 0.5;
        }
        ha-svg-icon {
          color: var(
            --timeline-ball-color,
            var(--timeline-color, var(--secondary-text-color))
          );
          border-radius: 50%;
        }
        :host([raised]) ha-svg-icon {
          transform: scale(1.3);
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
        :host([label]) .content {
          margin-top: 0;
          padding-top: 6px;
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
