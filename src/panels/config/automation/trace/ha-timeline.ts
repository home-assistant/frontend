import { LitElement, customElement, html, css, property } from "lit-element";

@customElement("ha-timeline")
class HaTimeline extends LitElement {
  @property({ type: Boolean }) public lastItem = false;

  protected render() {
    return html`
      <div class="timeline-start">
        <div class="ball"></div>
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
        min-height: 50px;
      }
      .timeline-start {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-right: 4px;
      }
      .ball {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: var(
          --timeline-ball-color,
          var(--timeline-color, var(--divider-color))
        );
      }
      .line {
        flex: 1;
        width: 2px;
        background-color: var(
          --timeline-line-color,
          var(--timeline-color, var(--divider-color))
        );
        margin: 4px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-timeline": HaTimeline;
  }
}
