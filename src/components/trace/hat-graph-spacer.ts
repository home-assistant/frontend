import { css, LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { SPACING, NODE_SIZE } from "./hat-graph-const";

/**
 * @attribute active
 * @attribute track
 */
@customElement("hat-graph-spacer")
export class HatGraphSpacer extends LitElement {
  @property({ reflect: true, type: Boolean }) public disabled = false;

  render() {
    return html`
      <svg viewBox="-${SPACING / 2} 0 10 ${SPACING + NODE_SIZE + 1}">
        <path
          d="
              M 0 ${SPACING + NODE_SIZE + 1}
              V 0
            "
          line-caps="round"
        />
        }
      </svg>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    svg {
      width: var(--hat-graph-spacing);
      height: calc(var(--hat-graph-spacing) + var(--hat-graph-node-size) + 1px);
    }
    :host([track]) {
      --stroke-clr: var(--track-clr);
    }
    :host([track]) path {
      stroke: var(--stroke-clr);
      stroke-width: 2;
      stroke-dasharray: none;
    }
    :host-context([disabled]) {
      --stroke-clr: var(--disabled-clr);
    }
    path {
      stroke: var(--connector-clr, var(--stroke-clr));
      stroke-width: 1;
      stroke-dasharray: 4 3;
      stroke-dashoffset: 4px;
      fill: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-graph-spacer": HatGraphSpacer;
  }
}
