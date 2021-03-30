import { css, customElement, LitElement, property, svg } from "lit-element";

import { NODE_SIZE, SPACING } from "./hat-graph";

@customElement("hat-graph-node")
export class HatGraphNode extends LitElement {
  @property() iconPath?: string;

  @property({ reflect: true, type: Boolean }) disabled?: boolean;

  @property({ reflect: true, type: Boolean }) graphstart?: boolean;

  @property({ reflect: true, type: Boolean }) nofocus?: boolean;

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute("tabindex") && !this.nofocus)
      this.setAttribute("tabindex", "0");
  }

  updated() {
    const svgEl = this.shadowRoot?.querySelector("svg");
    if (!svgEl) {
      return;
    }
    const bbox = svgEl.getBBox();
    const extra_height = this.graphstart ? 2 : 1;
    const extra_width = SPACING;
    svgEl.setAttribute("width", `${bbox.width + extra_width}px`);
    svgEl.setAttribute("height", `${bbox.height + extra_height}px`);
    svgEl.setAttribute(
      "viewBox",
      `${Math.ceil(bbox.x - extra_width / 2)}
      ${Math.ceil(bbox.y - extra_height / 2)}
      ${bbox.width + extra_width}
      ${bbox.height + extra_height}`
    );
  }

  render() {
    return svg`
    <svg
    >
      ${
        this.graphstart
          ? ``
          : svg`
          <path
            class="connector"
            d="
              M 0 ${-SPACING - NODE_SIZE / 2}
              L 0 0
            "
            line-caps="round"
          />
          `
      }
    <g class="node">
      <circle
        cx="0"
        cy="0"
        r="${NODE_SIZE / 2}"
      />
      <g
        style="pointer-events: none"
        transform="translate(${-12} ${-12})"
      >
        ${this.iconPath ? svg`<path class="icon" d="${this.iconPath}"/>` : ""}
      </g>
    </g>
      </svg>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        --stroke-clr: var(--stroke-color, var(--secondary-text-color));
        --active-clr: var(--active-color, var(--primary-color));
        --track-clr: var(--track-color, var(--accent-color));
        --hover-clr: var(--hover-color, var(--primary-color));
        --disabled-clr: var(--disabled-color, var(--disabled-text-color));
        --default-trigger-color: 3, 169, 244;
        --rgb-trigger-color: var(--trigger-color, var(--default-trigger-color));
        --background-clr: var(--background-color, white);
        --icon-clr: var(--icon-color, black);
      }
      :host(.track) {
        --stroke-clr: var(--track-clr);
      }
      :host(.active),
      :host(:focus) {
        --stroke-clr: var(--active-clr);
        outline: none;
      }
      :host(:hover) circle {
        --stroke-clr: var(--hover-clr);
      }
      :host([disabled]) circle {
        stroke: var(--disabled-clr);
      }
      :host-context([disabled]) {
        --stroke-clr: var(--disabled-clr);
      }

      :host([nofocus]):host-context(.active),
      :host([nofocus]):host-context(:focus) {
        --stroke-clr: var(--active-clr);
      }

      circle,
      path.connector {
        stroke: var(--stroke-clr);
        stroke-width: 2;
        fill: none;
      }
      circle {
        fill: var(--background-clr);
        stroke: var(--circle-clr, var(--stroke-clr));
      }
      path.icon {
        fill: var(--icon-clr);
      }

      :host(.triggered) svg {
        overflow: visible;
      }
      :host(.triggered) circle {
        animation: glow 10s;
      }
      @keyframes glow {
        0% {
          filter: drop-shadow(0px 0px 5px rgba(var(--rgb-trigger-color), 0));
        }
        10% {
          filter: drop-shadow(0px 0px 10px rgba(var(--rgb-trigger-color), 1));
        }
        100% {
          filter: drop-shadow(0px 0px 5px rgba(var(--rgb-trigger-color), 0));
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-graph-node": HatGraphNode;
  }
}
