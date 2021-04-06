import {
  css,
  customElement,
  html,
  LitElement,
  property,
  svg,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

export const BRANCH_HEIGHT = 20;
export const SPACING = 10;
export const NODE_SIZE = 30;

const track_converter = {
  fromAttribute: (value) => value.split(",").map((v) => parseInt(v)),
  toAttribute: (value) =>
    value instanceof Array ? value.join(",") : `${value}`,
};

export interface NodeInfo {
  path: string;
  config: any;
}

interface BranchConfig {
  x: number;
  height: number;
  start: boolean;
  end: boolean;
}

@customElement("hat-graph")
export class HatGraph extends LitElement {
  @property({ type: Number }) _num_items = 0;

  @property({ reflect: true, type: Boolean }) branching?: boolean;

  @property({ reflect: true, converter: track_converter })
  track_start?: number[];

  @property({ reflect: true, converter: track_converter }) track_end?: number[];

  @property({ reflect: true, type: Boolean }) disabled?: boolean;

  @property({ reflect: true, type: Boolean }) selected?: boolean;

  @property({ reflect: true, type: Boolean }) short = false;

  async updateChildren() {
    this._num_items = this.children.length;
  }

  render() {
    const branches: BranchConfig[] = [];
    let total_width = 0;
    let max_height = 0;
    let min_height = Number.POSITIVE_INFINITY;
    if (this.branching) {
      for (const c of Array.from(this.children)) {
        if (c.slot === "head") continue;
        const rect = c.getBoundingClientRect();
        branches.push({
          x: rect.width / 2 + total_width,
          height: rect.height,
          start: c.getAttribute("graphStart") != null,
          end: c.getAttribute("graphEnd") != null,
        });
        total_width += rect.width;
        max_height = Math.max(max_height, rect.height);
        min_height = Math.min(min_height, rect.height);
      }
    }

    return html`
      <slot name="head" @slotchange=${this.updateChildren}> </slot>
      ${this.branching
        ? svg`
            <svg
              id="top"
              width="${total_width}"
              height="${BRANCH_HEIGHT}"
            >
              ${branches.map((branch, i) => {
                if (branch.start) return "";
                return svg`
                  <path
                    class="${classMap({
                      line: true,
                      track: this.track_start?.includes(i) ?? false,
                    })}"
                    id="${this.track_start?.includes(i) ? "track-start" : ""}"
                    index=${i}
                    d="
                      M ${total_width / 2} 0
                      L ${branch.x} ${BRANCH_HEIGHT}
                      "/>
                `;
              })}
              <use xlink:href="#track-start" />
            </svg>
          `
        : ""}
      <div id="branches">
        ${this.branching
          ? svg`
              <svg
                id="lines"
                width="${total_width}"
                height="${max_height}"
              >
                ${branches.map((branch, i) => {
                  if (branch.end) return "";
                  return svg`
                    <path
                      class="${classMap({
                        line: true,
                        track: this.track_end?.includes(i) ?? false,
                      })}"
                      index=${i}
                      d="
                        M ${branch.x} ${branch.height}
                        l 0 ${max_height - branch.height}
                        "/>
                  `;
                })}
              </svg>
            `
          : ""}
        <slot @slotchange=${this.updateChildren}></slot>
      </div>

      ${this.branching && !this.short
        ? svg`
            <svg
              id="bottom"
              width="${total_width}"
              height="${BRANCH_HEIGHT + SPACING}"
            >
              ${branches.map((branch, i) => {
                if (branch.end) return "";
                return svg`
                  <path
                    class="${classMap({
                      line: true,
                      track: this.track_end?.includes(i) ?? false,
                    })}"
                    id="${this.track_end?.includes(i) ? "track-end" : ""}"
                    index=${i}
                    d="
                      M ${branch.x} 0
                      L ${branch.x} ${SPACING}
                      L ${total_width / 2} ${BRANCH_HEIGHT + SPACING}
                      "/>
                `;
              })}
              <use xlink:href="#track-end" />
            </svg>
          `
        : ""}
    `;
  }

  static get styles() {
    return css`
      :host {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        --stroke-clr: var(--stroke-color, var(--secondary-text-color));
        --active-clr: var(--active-color, var(--primary-color));
        --track-clr: var(--track-color, var(--accent-color));
        --disabled-clr: var(--disabled-color, gray);
      }
      :host(:focus) {
        outline: none;
      }
      #branches {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      :host([branching]) #branches {
        flex-direction: row;
        align-items: start;
      }
      :host([branching]) ::slotted(*) {
        z-index: 1;
      }
      :host([branching]) ::slotted([slot="head"]) {
        margin-bottom: ${-BRANCH_HEIGHT / 2}px;
      }

      #lines {
        position: absolute;
      }

      path.line {
        stroke: var(--stroke-clr);
        stroke-width: 2;
        fill: none;
      }
      path.line.track {
        stroke: var(--track-clr);
      }
      :host([disabled]) path.line {
        stroke: var(--disabled-clr);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-graph": HatGraph;
  }
}
