import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import { css, type LitElement } from "lit";
import type { Ref } from "lit/directives/ref";
import { parseAnimationDuration } from "../util/parse-animation-duration";

type FilterPanelHost = ReactiveControllerHost &
  LitElement & { expanded: boolean };

const EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * Layout the controller relies on: the filter is a flex column made of its
 * header (`ha-expansion-panel`) and a `.content` wrapper. Collapsed, it is as
 * tall as its header; expanded, it fills what is left of the pane and hands
 * that space down to the list through the wrapper.
 */
export const filterPanelStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    border-bottom: 1px solid var(--divider-color);
  }
  :host([expanded]) {
    flex: 1;
    height: 0;
  }
  ha-expansion-panel {
    flex: none;
    --ha-card-border-radius: var(--ha-border-radius-square);
  }
  ha-expansion-panel::part(summary) {
    user-select: none;
  }
  .content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
`;

const panels = new Set<FilterPanelController>();

let pending: Set<FilterPanelController> | undefined;

const flush = () => {
  const batch = [...pending!].filter((panel) => panel.host.isConnected);
  pending = undefined;
  batch.forEach((panel) => panel.prepare());
  batch.forEach((panel) => panel.measure());
  batch.forEach((panel) => panel.play());
};

// Filters that change in the same frame (one closing while another opens) are
// animated as one batch: every filter is measured before any of them has
// changed the DOM, and the closing ones are parked at their final height so
// the opening one reads its own final height from the real layout.
const enqueue = (panel: FilterPanelController) => {
  if (!pending) {
    pending = new Set();
    panels.forEach((other) => other.snapshot());
    requestAnimationFrame(flush);
  }
  pending.add(panel);
};

const clearInlineStyles = (element?: HTMLElement) => {
  element?.style.removeProperty("height");
  element?.style.removeProperty("flex");
  element?.style.removeProperty("overflow");
};

/**
 * Animates a filter of the filter pane between its collapsed and expanded
 * heights whenever `expanded` changes, and tells the host when to render its
 * content: from the moment it expands until its collapse animation has ended.
 *
 * During the animation the content keeps its final size and the host clips
 * it, so the list is revealed rather than resized.
 */
export class FilterPanelController implements ReactiveController {
  public showContent = false;

  public host: FilterPanelHost;

  private _content: Ref<HTMLElement>;

  private _expanded?: boolean;

  private _first = 0;

  private _last = 0;

  private _contentHeight = 0;

  private _animation?: Animation;

  constructor(host: FilterPanelHost, content: Ref<HTMLElement>) {
    this.host = host;
    this._content = content;
    host.addController(this);
  }

  public hostConnected() {
    panels.add(this);
  }

  public hostDisconnected() {
    panels.delete(this);
    this._animation?.cancel();
    this._animation = undefined;
    clearInlineStyles(this.host);
    clearInlineStyles(this._content.value);
  }

  public hostUpdate() {
    const expanded = this.host.expanded;
    if (this._expanded === undefined) {
      this._expanded = expanded;
      this.showContent = expanded;
      return;
    }
    if (expanded === this._expanded) {
      return;
    }
    this._expanded = expanded;
    if (!this.host.isConnected) {
      this.showContent = expanded;
      return;
    }
    if (expanded) {
      this.showContent = true;
    }
    enqueue(this);
  }

  public snapshot() {
    this._first = this.host.getBoundingClientRect().height;
  }

  public prepare() {
    this._animation?.cancel();
    this._animation = undefined;
    const host = this.host;
    const content = this._content.value;
    clearInlineStyles(host);
    clearInlineStyles(content);
    if (host.expanded) {
      return;
    }
    this._last =
      host.getBoundingClientRect().height -
      (content?.getBoundingClientRect().height ?? 0);
    this._contentHeight = this._first - this._last;
    host.style.flex = "none";
    host.style.height = `${this._last}px`;
  }

  public measure() {
    if (!this.host.expanded) {
      return;
    }
    this._last = this.host.getBoundingClientRect().height;
    this._contentHeight =
      this._content.value?.getBoundingClientRect().height ?? 0;
  }

  public play() {
    const host = this.host;
    if (this._first === this._last) {
      this._finish();
      return;
    }
    const content = this._content.value;
    host.style.flex = "none";
    host.style.overflow = "hidden";
    if (content) {
      content.style.flex = "none";
      content.style.height = `${this._contentHeight}px`;
    }
    const animation = host.animate(
      [{ height: `${this._first}px` }, { height: `${this._last}px` }],
      {
        duration:
          parseAnimationDuration(
            getComputedStyle(host).getPropertyValue(
              "--ha-animation-duration-normal"
            )
          ) || 250,
        easing: EASING,
        fill: "forwards",
      }
    );
    animation.onfinish = () => this._finish(animation);
    this._animation = animation;
  }

  private async _finish(animation?: Animation) {
    if (!this.host.expanded) {
      this.showContent = false;
      this.host.requestUpdate();
      await this.host.updateComplete;
    }
    if (this._animation !== animation) {
      return;
    }
    clearInlineStyles(this.host);
    clearInlineStyles(this._content.value);
    this._animation?.cancel();
    this._animation = undefined;
  }
}
