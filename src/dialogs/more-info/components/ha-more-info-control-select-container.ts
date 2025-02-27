import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

@customElement("ha-more-info-control-select-container")
export class HaMoreInfoControlSelectContainer extends LitElement {
  protected render(): TemplateResult {
    const classname = `items-${this.childElementCount}`;

    return html`
      <div class="controls">
        <div
          class="controls-scroll ${classMap({
            [classname]: true,
            multiline: this.childElementCount >= 4,
          })}"
        >
          <slot></slot>
        </div>
      </div>
    `;
  }

  static styles = css`
    .controls {
      display: flex;
      flex-direction: row;
      justify-content: center;
    }
    .controls-scroll {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      gap: 12px;
      margin: auto;
      overflow: auto;
      -ms-overflow-style: none; /* IE and Edge */
      scrollbar-width: none; /* Firefox */
      margin: -2px -24px;
      padding: 2px 24px;
    }
    .controls-scroll::-webkit-scrollbar {
      display: none;
    }

    ::slotted(*) {
      min-width: 120px;
      max-width: 160px;
      flex: none;
    }

    @media all and (hover: hover),
      all and (min-width: 600px) and (min-height: 501px) {
      .controls-scroll {
        justify-content: center;
        flex-wrap: wrap;
        width: 100%;
        max-width: 450px;
      }
      .controls-scroll.items-4 {
        max-width: 300px;
      }
      .controls-scroll.items-3 ::slotted(*) {
        max-width: 140px;
      }
      .multiline ::slotted(*) {
        width: 140px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-control-select-container": HaMoreInfoControlSelectContainer;
  }
}
