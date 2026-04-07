import TabGroup from "@home-assistant/webawesome/dist/components/tab-group/tab-group";
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

  /** When true (default), each tab trigger grows to fill the tab row evenly. */
  @property({ type: Boolean, reflect: true, attribute: "fill-tabs" })
  fillTabs = true;

  connectedCallback(): void {
    super.connectedCallback();
    // Prevent the tab group from consuming Alt+Arrow and Cmd+Arrow keys,
    // which browsers use for back/forward navigation.
    this.addEventListener("keydown", this._handleKeyDown, true);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._handleKeyDown, true);
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.metaKey) {
      event.stopPropagation();
    }
  };

  protected override handleClick(event: MouseEvent) {
    if (this._dragScrollController.scrolled) {
      return;
    }
    super.handleClick(event);
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

        :host([fill-tabs]) .tab-group-top .tabs ::slotted(ha-tab-group-tab),
        :host([fill-tabs]) .tab-group-bottom .tabs ::slotted(ha-tab-group-tab) {
          flex: 1;
          --ha-tab-base-width: 100%;
          --ha-tab-base-justify-content: center;
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
