import { mdiClose } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators";
import type { HomeAssistant } from "../types";
import "./ha-bottom-sheet";
import "./ha-dialog-header";
import "./ha-icon-button";
import "./ha-wa-dialog";
import type { DialogWidth } from "./ha-wa-dialog";

type DialogSheetMode = "dialog" | "bottom-sheet";

/**
 * Home Assistant adaptive dialog component
 *
 * @element ha-adaptive-dialog
 * @extends {LitElement}
 *
 * @summary
 * A responsive dialog component that automatically switches between a full dialog (ha-wa-dialog)
 * and a bottom sheet (ha-bottom-sheet) based on screen size. Uses dialog mode on larger screens
 * (>870px width and >500px height) and bottom sheet mode on smaller screens or mobile devices.
 *
 * @slot headerNavigationIcon - Leading header action (e.g. close/back button).
 * @slot headerTitle - Custom title content (used when header-title is not set).
 * @slot headerSubtitle - Custom subtitle content (used when header-subtitle is not set).
 * @slot headerActionItems - Trailing header actions (e.g. buttons, menus).
 * @slot - Dialog/sheet content body.
 *
 * @cssprop --ha-dialog-surface-background - Dialog/sheet background color.
 * @cssprop --ha-dialog-border-radius - Border radius of the dialog surface (dialog mode only).
 * @cssprop --ha-dialog-show-duration - Show animation duration (dialog mode only).
 * @cssprop --ha-dialog-hide-duration - Hide animation duration (dialog mode only).
 *
 * @attr {boolean} open - Controls the dialog/sheet open state.
 * @attr {("small"|"medium"|"large"|"full")} width - Preferred dialog width preset (dialog mode only). Defaults to "medium".
 * @attr {string} header-title - Header title text. If not set, the headerTitle slot is used.
 * @attr {string} header-subtitle - Header subtitle text. If not set, the headerSubtitle slot is used.
 * @attr {("above"|"below")} header-subtitle-position - Position of the subtitle relative to the title. Defaults to "below".
 *
 * @event opened - Fired when the dialog/sheet is shown (dialog mode only).
 * @event closed - Fired after the dialog/sheet is hidden (dialog mode only).
 * @event after-show - Fired after show animation completes (dialog mode only).
 *
 * @remarks
 * **Responsive Behavior:**
 * The component automatically switches between dialog and bottom sheet modes based on viewport size.
 * Dialog mode is used for screens wider than 870px and taller than 500px.
 * Bottom sheet mode is used for mobile devices and smaller screens.
 *
 * **Focus Management:**
 * To automatically focus an element when opened, add the `autofocus` attribute to it.
 * Components with `delegatesFocus: true` (like `ha-form`) will forward focus to their first focusable child.
 * Example: `<ha-form autofocus .schema=${schema}></ha-form>`
 */
@customElement("ha-adaptive-dialog")
export class HaAdaptiveDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "aria-labelledby" })
  public ariaLabelledBy?: string;

  @property({ attribute: "aria-describedby" })
  public ariaDescribedBy?: string;

  @property({ type: Boolean, reflect: true })
  public open = false;

  @property({ type: String, reflect: true, attribute: "width" })
  public width: DialogWidth = "medium";

  @property({ attribute: "header-title" })
  public headerTitle?: string;

  @property({ attribute: "header-subtitle" })
  public headerSubtitle?: string;

  @property({ type: String, attribute: "header-subtitle-position" })
  public headerSubtitlePosition: "above" | "below" = "below";

  @state() private _mode: DialogSheetMode = "dialog";

  @state()
  private _bodyScrolled = false;

  connectedCallback() {
    super.connectedCallback();
    this._handleResize();
    window.addEventListener("resize", this._handleResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._handleResize);
  }

  private _handleResize = () => {
    this._mode =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches
        ? "bottom-sheet"
        : "dialog";
  };

  @eventOptions({ passive: true })
  private _handleBodyScroll(ev: Event) {
    this._bodyScrolled = (ev.target as HTMLDivElement).scrollTop > 0;
  }

  render() {
    if (this._mode === "bottom-sheet") {
      return html`
        <ha-bottom-sheet .open=${this.open} flexcontent>
          <ha-dialog-header
            slot="header"
            .subtitlePosition=${this.headerSubtitlePosition}
            .showBorder=${this._bodyScrolled}
          >
            <slot name="headerNavigationIcon" slot="navigationIcon">
              <ha-icon-button
                data-drawer="close"
                .label=${this.hass?.localize("ui.common.close") ?? "Close"}
                .path=${mdiClose}
              ></ha-icon-button>
            </slot>
            ${this.headerTitle !== undefined
              ? html`<span slot="title" class="title" id="ha-wa-dialog-title">
                  ${this.headerTitle}
                </span>`
              : html`<slot name="headerTitle" slot="title"></slot>`}
            ${this.headerSubtitle !== undefined
              ? html`<span slot="subtitle">${this.headerSubtitle}</span>`
              : html`<slot name="headerSubtitle" slot="subtitle"></slot>`}
            <slot name="headerActionItems" slot="actionItems"></slot>
          </ha-dialog-header>
          <div class="body ha-scrollbar" @scroll=${this._handleBodyScroll}>
            <slot></slot>
          </div>
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this.open}
        .width=${this.width}
        .ariaLabelledBy=${this.ariaLabelledBy}
        .ariaDescribedBy=${this.ariaDescribedBy}
        .headerTitle=${this.headerTitle}
        .headerSubtitle=${this.headerSubtitle}
        .headerSubtitlePosition=${this.headerSubtitlePosition}
        flexcontent
      >
        <slot></slot>
      </ha-wa-dialog>
    `;
  }

  static styles = css`
    ha-bottom-sheet {
      --ha-bottom-sheet-surface-background: var(
        --ha-dialog-surface-background,
        var(--card-background-color, var(--ha-color-surface-default))
      );
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-adaptive-dialog": HaAdaptiveDialog;
  }
}

