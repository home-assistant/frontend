import { mdiCircleOutline } from "@mdi/js";
import { LitElement, customElement, html, css, property } from "lit-element";
import "../../../../components/ha-svg-icon";

@customElement("ha-timeline")
class HaTimeline extends LitElement {
  @property({ type: Boolean }) public lastItem = false;

  @property({ type: String }) public icon?: string;

  protected render() {
    return html`
      <div class="timeline-start">
        <ha-svg-icon .path=${this.icon || mdiCircleOutline}></ha-svg-icon>
        ${this.lastItem ? "" : html`<div class="line"></div>`}
      </div>
      <div class="content"><slot></slot></div>
    `;
  }

  static get styles() {
    return css`
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-timeline": HaTimeline;
  }
}
