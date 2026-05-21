import "@home-assistant/webawesome/dist/components/popover/popover";
import {
  css,
  html,
  LitElement,
  nothing,
  type CSSResultGroup,
  type PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-bottom-sheet";

/**
 * Responsive popover for picker UIs: anchored `wa-popover` on desktop,
 * `ha-bottom-sheet` on narrow viewports. Anchor drives the width.
 */
@customElement("ha-picker-popover")
export class HaPickerPopover extends LitElement {
  @property({ type: Boolean, reflect: true }) public open = false;

  @property({ attribute: false }) public anchor?: HTMLElement | null;

  @property() public label?: string;

  @property() public placement:
    | "bottom"
    | "top"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "right-start"
    | "right-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end" = "bottom-start";

  @state() private _bodyWidth = 0;

  @state() private _narrow = false;

  @state() private _openedNarrow = false;

  // Kept true across the hide animation so wa-popover can finish its
  // transition; cleared on wa-after-hide.
  @state() private _mounted = false;

  // Flipped one rAF after mount so wa-popover sees a false→true edge
  // and runs the show flow.
  @state() private _showing = false;

  // Defers slot projection until after the show animation so a
  // virtualized list inside isn't measured at the scaled size.
  @state() private _contentReady = false;

  private _openFrame?: number;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("open")) {
      if (this.open) {
        this._measureAnchor();
        this._openedNarrow = this._narrow;
        this._mounted = true;
      } else {
        this._showing = false;
      }
    }
    if (changedProperties.has("anchor") && this.open) {
      this._measureAnchor();
    }
  }

  private _measureAnchor() {
    if (this.anchor) {
      this._bodyWidth = this.anchor.offsetWidth;
    }
  }

  protected updated() {
    if (this.open && this._mounted && !this._showing) {
      this._scheduleShow();
    }
  }

  private _scheduleShow() {
    if (this._openFrame !== undefined) return;
    this._openFrame = requestAnimationFrame(() => {
      this._openFrame = undefined;
      if (this.open && this._mounted) {
        this._showing = true;
      }
    });
  }

  private _cancelShow() {
    if (this._openFrame === undefined) return;
    cancelAnimationFrame(this._openFrame);
    this._openFrame = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    this._handleResize();
    window.addEventListener("resize", this._handleResize);
    this.addEventListener("picker-close-request", this._handleCloseRequest);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._handleResize);
    this.removeEventListener("picker-close-request", this._handleCloseRequest);
    this._cancelShow();
  }

  private _handleCloseRequest = (ev: Event) => {
    ev.stopPropagation();
    this._showing = false;
  };

  private _handleResize = () => {
    this._narrow =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches;

    if (!this._openedNarrow && this.open) {
      this._measureAnchor();
    }
  };

  private _handleShown = () => {
    this._contentReady = true;
    fireEvent(this, "opened");
    // Native [autofocus] fires before the popover is visible; refocus
    // a slotted search component after projection.
    requestAnimationFrame(() => {
      const focusable = this.querySelector(
        "ha-picker-search-list, ha-picker-search"
      ) as (HTMLElement & { focus?: () => void }) | null;
      focusable?.focus?.();
    });
  };

  private _handleHidden = (ev: Event) => {
    ev.stopPropagation();
    this._mounted = false;
    this._showing = false;
    this._contentReady = false;
    fireEvent(this, "closed");
  };

  protected render() {
    if (!this._mounted) return nothing;

    if (this._openedNarrow) {
      return html`
        <ha-bottom-sheet
          flexcontent
          .open=${this._showing}
          @wa-after-show=${this._handleShown}
          @closed=${this._handleHidden}
          role="dialog"
          aria-modal="true"
          aria-label=${this.label ?? ""}
        >
          <div class="content">
            ${this._contentReady ? html`<slot></slot>` : nothing}
          </div>
        </ha-bottom-sheet>
      `;
    }

    return html`
      <wa-popover
        .open=${this._showing}
        style=${styleMap({ "--body-width": `${this._bodyWidth}px` })}
        without-arrow
        distance="-4"
        .placement=${this.placement}
        .anchor=${this.anchor ?? null}
        auto-size="vertical"
        auto-size-padding="16"
        @wa-after-show=${this._handleShown}
        @wa-after-hide=${this._handleHidden}
        trap-focus
        role="dialog"
        aria-modal="true"
        aria-label=${this.label ?? ""}
      >
        <div class="content">
          ${this._contentReady ? html`<slot></slot>` : nothing}
        </div>
      </wa-popover>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: contents;
    }

    wa-popover {
      --wa-space-l: 0;
      /* Disable wa-popover's built-in 25rem cap. */
      --max-width: none;
    }

    wa-popover::part(dialog)::backdrop {
      background: none;
    }

    wa-popover::part(body) {
      width: var(--ha-picker-popover-width, max(var(--body-width), 250px));
      max-width: var(
        --ha-picker-popover-max-width,
        var(--ha-picker-popover-width, max(var(--body-width), 250px))
      );
      max-height: 500px;
      height: 70vh;
      overflow: hidden;
      padding: 0;
    }

    @media (max-height: 1000px) {
      wa-popover::part(body) {
        max-height: 400px;
      }
    }

    .content {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    ha-bottom-sheet {
      --ha-bottom-sheet-height: 90vh;
      --ha-bottom-sheet-height: calc(100dvh - var(--ha-space-12));
      --ha-bottom-sheet-max-height: var(--ha-bottom-sheet-height);
      --ha-bottom-sheet-max-width: 600px;
      --ha-bottom-sheet-padding: 0;
      --ha-bottom-sheet-surface-background: var(--card-background-color);
      --ha-bottom-sheet-border-radius: var(--ha-border-radius-2xl);
      --ha-bottom-sheet-content-padding: 0 var(--safe-area-inset-right)
        var(--safe-area-inset-bottom) var(--safe-area-inset-left);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-popover": HaPickerPopover;
  }
}
