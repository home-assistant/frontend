import {
  css,
  LitElement,
  PropertyValues,
  html,
  TemplateResult,
  svg,
} from "lit";
import { customElement, property } from "lit/decorators";
import { NODE_SIZE, SPACING } from "./hat-graph-const";

/**
 * @attribute active
 * @attribute track
 */
@customElement("hat-graph-node")
export class HatGraphNode extends LitElement {
  @property() iconPath?: string;

  @property({ reflect: true, type: Boolean }) disabled?: boolean;

  @property({ reflect: true, type: Boolean }) notEnabled = false;

  @property({ reflect: true, type: Boolean }) graphStart?: boolean;

  @property({ type: Boolean, attribute: "nofocus" }) noFocus = false;

  @property({ reflect: true, type: Number }) badge?: number;

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("noFocus")) {
      if (!this.hasAttribute("tabindex") && !this.noFocus) {
        this.setAttribute("tabindex", "0");
      } else if (changedProps.get("noFocus") !== undefined && this.noFocus) {
        this.removeAttribute("tabindex");
      }
    }
  }

  protected render(): TemplateResult {
    const height = NODE_SIZE + (this.graphStart ? 2 : SPACING + 1);
    const width = SPACING + NODE_SIZE;
    return html`
      <svg
        width="${width}px"
        height="${height}px"
        viewBox="-${Math.ceil(width / 2)} -${this.graphStart
          ? Math.ceil(height / 2)
          : Math.ceil((NODE_SIZE + SPACING * 2) / 2)} ${width} ${height}"
      >
        ${this.graphStart
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
          `}
        <g class="node">
          <circle cx="0" cy="0" r=${NODE_SIZE / 2} />
          }
          ${this.badge
            ? svg`
        <g class="number">
          <circle
            cx="8"
            cy=${-NODE_SIZE / 2}
            r="8"
          ></circle>
          <text
            x="8"
            y=${-NODE_SIZE / 2}
            text-anchor="middle"
            alignment-baseline="middle"
          >${this.badge > 9 ? "9+" : this.badge}</text>
        </g>
      `
            : ""}
          <g style="pointer-events: none" transform="translate(${-12} ${-12})">
            ${this.iconPath ? svg`<path class="icon" d=${this.iconPath}/>` : ""}
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
        min-width: calc(var(--hat-graph-node-size) + var(--hat-graph-spacing));
        height: calc(
          var(--hat-graph-node-size) + var(--hat-graph-spacing) + 1px
        );
      }
      :host([graphStart]) {
        height: calc(var(--hat-graph-node-size) + 2px);
      }
      :host([track]) {
        --stroke-clr: var(--track-clr);
        --icon-clr: var(--default-icon-clr);
      }
      :host([active]) circle {
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
      :host([notEnabled]) circle {
        --stroke-clr: var(--disabled-clr);
      }
      :host([notEnabled][active]) circle {
        --stroke-clr: var(--disabled-active-clr);
      }
      :host([notEnabled]:hover) circle {
        --stroke-clr: var(--disabled-hover-clr);
      }
      svg {
        width: 100%;
        height: 100%;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-graph-node": HatGraphNode;
  }
}
