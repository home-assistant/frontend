import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { HASSDomTargetEvent } from "../../common/dom/fire_event";
import { BRANCH_HEIGHT, SPACING } from "./hat-graph-const";

interface BranchConfig {
  x: number;
  height: number;
  start: boolean;
  end: boolean;
  track: boolean;
  // A branch the run entered but never finished, because a step in it raised.
  // Its incoming curve is tracked, everything leaving it is not.
  trackEnd: boolean;
}

/**
 * @attribute active
 * @attribute track
 */
@customElement("hat-graph-branch")
export class HatGraphBranch extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ type: Boolean }) selected = false;

  @property({ type: Boolean }) start = false;

  @property({ type: Boolean }) short = false;

  @state() _branches: BranchConfig[] = [];

  private _totalWidth = 0;

  private _maxHeight = 0;

  @query("#branches slot") private _slot?: HTMLSlotElement;

  // The branch children are Lit rendered by the parent, so their track
  // attribute can flip (another trace, another run) without a slot change,
  // and nested nodes can change without the assigned elements changing.
  private _trackObserver = new MutationObserver((mutations) => {
    if (
      this._slot &&
      mutations.some(
        (m) =>
          m.type === "childList" || (m.target as Element).parentElement === this
      )
    ) {
      this._updateBranches(this._slot);
    }
  });

  public connectedCallback() {
    super.connectedCallback();
    this._trackObserver.observe(this, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ["track", "unfinished"],
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._trackObserver.disconnect();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    // The branches are read from the DOM, so they are refreshed on every
    // update to pick up size changes as well.
    if (this._slot) {
      this._updateBranches(this._slot);
    }
  }

  private _handleSlotChange(ev: HASSDomTargetEvent<HTMLSlotElement>) {
    this._updateBranches(ev.target as HTMLSlotElement);
  }

  private _updateBranches(slot: HTMLSlotElement) {
    let total_width = 0;
    const heights: number[] = [];
    const branches: BranchConfig[] = [];
    slot.assignedElements().forEach((c) => {
      const width = c.clientWidth;
      const height = c.clientHeight;
      branches.push({
        x: width / 2 + total_width,
        height,
        start: c.hasAttribute("graph-start"),
        end: c.hasAttribute("graph-end"),
        track: c.hasAttribute("track"),
        trackEnd: c.hasAttribute("track") && !c.hasAttribute("unfinished"),
      });
      total_width += width;
      heights.push(height);
    });
    // Tracked branches are drawn last, so they are never covered by the
    // untracked ones where the paths overlap.
    branches.sort((a, b) => Number(a.track) - Number(b.track));
    if (
      total_width === this._totalWidth &&
      Math.max(...heights) === this._maxHeight &&
      JSON.stringify(branches) === JSON.stringify(this._branches)
    ) {
      // Nothing changed, don't trigger another update.
      return;
    }
    this._totalWidth = total_width;
    this._maxHeight = Math.max(...heights);
    this._branches = branches;
  }

  render() {
    return html`
      <slot name="head"></slot>
      ${
        !this.start
          ? html`
              <svg id="top" width=${this._totalWidth}>
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
                      C ${this._totalWidth / 2} ${BRANCH_HEIGHT / 2}
                        ${branch.x} ${BRANCH_HEIGHT / 2}
                        ${branch.x} ${BRANCH_HEIGHT}
                      "/>
                `
                )}
              </svg>
            `
          : nothing
      }
      <div id="branches">
        <svg id="lines" width=${this._totalWidth} height=${this._maxHeight}>
          ${this._branches.map((branch) => {
            if (branch.end) return "";
            return svg`
                    <path
                      class=${classMap({
                        track: branch.trackEnd,
                      })}
                      d="
                        M ${branch.x} ${branch.height}
                        v ${this._maxHeight - branch.height}
                        "/>
                  `;
          })}
        </svg>
        <slot @slotchange=${this._handleSlotChange}></slot>
      </div>

      ${
        !this.short
          ? html`
              <svg id="bottom" width=${this._totalWidth}>
                ${this._branches.map((branch) => {
                  if (branch.end) return "";
                  return svg`
                  <path
                    class=${classMap({
                      track: branch.trackEnd,
                    })}
                    d="
                      M ${branch.x} 0
                      V ${SPACING}
                      C ${branch.x} ${SPACING + BRANCH_HEIGHT / 2}
                        ${this._totalWidth / 2} ${SPACING + BRANCH_HEIGHT / 2}
                        ${this._totalWidth / 2} ${BRANCH_HEIGHT + SPACING}
                      "/>
                `;
                })}
              </svg>
            `
          : nothing
      }
    `;
  }

  static styles = css`
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
      position: relative;
      z-index: 2;
    }
    path {
      stroke: var(--connector-clr, var(--stroke-clr));
      stroke-width: 1;
      stroke-dasharray: 4 3;
      fill: none;
    }
    path.track {
      stroke: var(--track-clr);
      stroke-width: 2;
      stroke-dasharray: none;
    }
    :host([disabled]) path {
      stroke: var(--disabled-clr);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-graph-branch": HatGraphBranch;
  }
}
