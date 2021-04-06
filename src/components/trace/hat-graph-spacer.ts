import { css, customElement, LitElement, property, svg } from "lit-element";

import { NODE_SIZE, SPACING } from "./hat-graph";

@customElement("hat-graph-spacer")
export class HatGraphSpacer extends LitElement {
  @property({ reflect: true, type: Boolean }) disabled?: boolean;

  render() {
    return svg`
    <svg
    width="${SPACING}px"
    height="${SPACING + NODE_SIZE + 1}px"
    viewBox="-${SPACING / 2} 0 10 ${SPACING + NODE_SIZE + 1}"
    >
          <path
            class="connector"
            d="
              M 0 ${SPACING + NODE_SIZE + 1}
              L 0 0
            "
            line-caps="round"
          />
      }
      </svg>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
      }
      :host(.track) {
        --stroke-clr: var(--track-clr);
        --icon-clr: var(--default-icon-clr);
      }
      :host-context([disabled]) {
        --stroke-clr: var(--disabled-clr);
      }
      path.connector {
        stroke: var(--stroke-clr);
        stroke-width: 2;
        fill: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-graph-spacer": HatGraphSpacer;
  }
}
