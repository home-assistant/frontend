import { css, html, LitElement, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { BRANCH_HEIGHT, SPACING } from "./hat-graph-const";

interface BranchConfig {
  x: number;
  height: number;
  start: boolean;
  end: boolean;
  track: boolean;
}

/**
 * @attribute active
 * @attribute track
 */
@customElement("hat-graph-branch")
export class HatGraphBranch extends LitElement {
  @property({ reflect: true, type: Boolean }) disabled?: boolean;

  @property({ type: Boolean }) selected?: boolean;

  @property({ type: Boolean }) start = false;

  @property({ type: Boolean }) short = false;

  @state() _branches: BranchConfig[] = [];

  private _totalWidth = 0;

  private _maxHeight = 0;

  private _updateBranches(ev: Event) {
    let total_width = 0;
    const heights: number[] = [];
    const branches: BranchConfig[] = [];
    (ev.target as HTMLSlotElement).assignedElements().forEach((c) => {
      const width = c.clientWidth;
      const height = c.clientHeight;
      branches.push({
        x: width / 2 + total_width,
        height,
        start: c.hasAttribute("graphStart"),
        end: c.hasAttribute("graphEnd"),
        track: c.hasAttribute("track"),
      });
      total_width += width;
      heights.push(height);
    });
    this._totalWidth = total_width;
    this._maxHeight = Math.max(...heights);
    this._branches = branches.sort((a, b) => {
      if (a.track && !b.track) {
        return 1;
      }
      if (a.track && b.track) {
        return 0;
      }
      return -1;
    });
  }

  render() {
    return html`
      <slot name="head"></slot>
      ${!this.start
        ? svg`
            <svg
              id="top"
              width="${this._totalWidth}"
            >
              ${this._branches.map((branch) =>
                branch.start
                  ? ""
                  : svg`
                  <path
                    class=${classMap({
                      track: branch.track,
                    })}
                    d="
                      M ${this._totalWidth / 2} 0
                      L ${branch.x} ${BRANCH_HEIGHT}
                      "/>
                `
              )}
            </svg>
          `
        : ""}
      <div id="branches">
        <svg id="lines" width=${this._totalWidth} height=${this._maxHeight}>
          ${this._branches.map((branch) => {
            if (branch.end) return "";
            return svg`
                    <path
                      class=${classMap({
                        track: branch.track,
                      })}
                      d="
                        M ${branch.x} ${branch.height}
                        v ${this._maxHeight - branch.height}
                        "/>
                  `;
          })}
        </svg>
        <slot @slotchange=${this._updateBranches}></slot>
      </div>

      ${!this.short
        ? svg`
            <svg
              id="bottom"
              width="${this._totalWidth}"
            >
              ${this._branches.map((branch) => {
                if (branch.end) return "";
                return svg`
                  <path
                    class=${classMap({
                      track: branch.track,
                    })}
                    d="
                      M ${branch.x} 0
                      V ${SPACING}
                      L ${this._totalWidth / 2} ${BRANCH_HEIGHT + SPACING}
                      "/>
                `;
              })}
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
      }
      :host(:focus) {
        outline: none;
      }
      #branches {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: start;
      }
      ::slotted(*) {
        z-index: 1;
      }
      ::slotted([slot="head"]) {
        margin-bottom: calc(var(--hat-graph-branch-height) / -2);
      }
      #lines {
        position: absolute;
      }
      #top {
        height: var(--hat-graph-branch-height);
      }
      #bottom {
        height: calc(var(--hat-graph-branch-height) + var(--hat-graph-spacing));
      }
      path {
        stroke: var(--stroke-clr);
        stroke-width: 2;
        fill: none;
      }
      path.track {
        stroke: var(--track-clr);
      }
      :host([disabled]) path {
        stroke: var(--disabled-clr);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-graph-branch": HatGraphBranch;
  }
}
