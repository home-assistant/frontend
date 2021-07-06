import { css, LitElement, svg } from "lit";
import { customElement, property } from "lit/decorators";
import { NODE_SIZE, SPACING } from "./hat-graph";

@customElement("hat-graph-node")
export class HatGraphNode extends LitElement {
  @property() iconPath?: string;

  @property({ reflect: true, type: Boolean }) disabled?: boolean;

  @property({ reflect: true, type: Boolean }) graphStart?: boolean;

  @property({ reflect: true, type: Boolean }) nofocus?: boolean;

  @property({ reflect: true, type: Number }) badge?: number;

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute("tabindex") && !this.nofocus)
      this.setAttribute("tabindex", "0");
  }

  render() {
    const height = NODE_SIZE + (this.graphStart ? 2 : SPACING + 1);
    const width = SPACING + NODE_SIZE;
    return svg`
    <svg
    width="${width}px"
    height="${height}px"
    viewBox="-${Math.ceil(width / 2)} -${
      this.graphStart
        ? Math.ceil(height / 2)
        : Math.ceil((NODE_SIZE + SPACING * 2) / 2)
    } ${width} ${height}"
    >
      ${
        this.graphStart
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
      }
      ${
        this.badge
          ? svg`
        <g class="number">
          <circle
            cx="8"
            cy="${-NODE_SIZE / 2}"
            r="8"
          ></circle>
          <text
            x="8"
            y="${-NODE_SIZE / 2}"
            text-anchor="middle"
            alignment-baseline="middle"
          >${this.badge > 9 ? "9+" : this.badge}</text>
        </g>
      `
          : ""
      }
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
      }
      :host(.track) {
        --stroke-clr: var(--track-clr);
        --icon-clr: var(--default-icon-clr);
      }
      :host(.active) circle {
        --stroke-clr: var(--active-clr);
        --icon-clr: var(--default-icon-clr);
      }
      :host(:focus) {
        outline: none;
      }
      :host(:hover) circle {
        --stroke-clr: var(--hover-clr);
        --icon-clr: var(--default-icon-clr);
      }
      :host([disabled]) circle {
        stroke: var(--disabled-clr);
      }
      :host-context([disabled]) {
        --stroke-clr: var(--disabled-clr);
      }
      :host([nofocus]):host-context(.active),
      :host([nofocus]):host-context(:focus) {
        --circle-clr: var(--active-clr);
        --icon-clr: var(--default-icon-clr);
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
      .number circle {
        fill: var(--track-clr);
        stroke: none;
        stroke-width: 0;
      }
      .number text {
        font-size: smaller;
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
