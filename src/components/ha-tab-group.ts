import TabGroup from "@home-assistant/webawesome/dist/components/tab-group/tab-group";
import type Tab from "@home-assistant/webawesome/dist/components/tab/tab";
import { WaTabShowEvent } from "@home-assistant/webawesome/dist/events/tab-show";
import { css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { DragScrollController } from "../common/controllers/drag-scroll-controller";

@customElement("ha-tab-group")
export class HaTabGroup extends TabGroup {
  private _dragScrollController = new DragScrollController(this, {
    selector: ".nav",
  });

  @property({ attribute: "tab-tag" }) override tabTag = "ha-tab-group-tab";

  @property({ attribute: "tab-only", type: Boolean }) tabOnly = true;

  connectedCallback(): void {
    super.connectedCallback();
    // Prevent the tab group from consuming Alt+Arrow and Cmd+Arrow keys,
    // which browsers use for back/forward navigation.
    this.addEventListener("keydown", this._handleKeyDown, true);
    this.addEventListener("keydown", this._handleTabKeyDown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._handleKeyDown, true);
    this.removeEventListener("keydown", this._handleTabKeyDown);
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.metaKey) {
      event.stopPropagation();
    }
  };

  // Bubbles here after the tab group handled the key inside its shadow root.
  private _handleTabKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      this._showIgnoredTab(event);
    }
  };

  protected override handleClick(event: MouseEvent) {
    if (this._dragScrollController.scrolled) {
      return;
    }
    super.handleClick(event);
    this._showIgnoredTab(event);
  }

  /**
   * Web Awesome does not activate disabled tabs. When a disabled tab is made
   * active, like the tab of a hidden dashboard view, the group keeps tracking
   * the previous tab as active and ignores it when it is picked again. Show
   * the picked tab ourselves when the group did not.
   */
  private _showIgnoredTab(event: Event) {
    const tab = (event.target as HTMLElement).closest<Tab>(this.tabTag);
    if (tab?.closest(this.localName) === this && !tab.disabled && !tab.active) {
      this.dispatchEvent(new WaTabShowEvent({ name: tab.panel }));
    }
  }

  static get styles(): CSSResultGroup {
    return [
      TabGroup.styles,
      css`
        :host {
          --track-width: 2px;
          --track-color: var(--ha-tab-track-color, var(--divider-color));
          --indicator-color: var(
            --ha-tab-indicator-color,
            var(--primary-color)
          );
          --wa-color-neutral-on-quiet: var(--indicator-color);
        }

        .tab-group-top ::slotted(ha-tab-group-tab[active]) {
          border-block-end: solid var(--track-width) var(--indicator-color);
          margin-block-end: calc(-1 * var(--track-width));
        }

        .tab-group-start ::slotted(ha-tab-group-tab[active]) {
          border-inline-end: solid var(--track-width) var(--indicator-color);
          margin-inline-end: calc(-1 * var(--track-width));
        }

        .tab-group-end ::slotted(ha-tab-group-tab[active]) {
          border-inline-start: solid var(--track-width) var(--indicator-color);
          margin-inline-start: calc(-1 * var(--track-width));
        }

        .scroll-button::part(base):hover {
          background-color: transparent;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tab-group": HaTabGroup;
  }
}
