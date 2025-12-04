import { mdiClose } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HomeAssistant } from "../types";
import "./ha-bottom-sheet";
import "./ha-dialog-header";
import "./ha-icon-button";
import "./ha-wa-dialog";
import type { DialogWidth } from "./ha-wa-dialog";

type DialogSheetMode = "dialog" | "bottom-sheet";

/**
 * Home Assistant dialog sheet component
 *
 * @element ha-dialog-sheet
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
 * @attr {boolean} flexcontent - Makes the dialog/sheet body a flex container for flexible layouts.
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
@customElement("ha-dialog-sheet")
export class HaDialogSheet extends LitElement {
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

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @state() private _mode: DialogSheetMode = "dialog";

  @query(".body") public bodyContainer!: HTMLDivElement;

  @state()
  private _bodyScrolled = false;

  connectedCallback() {
    super.connectedCallback();
    this._updateMode();
    window.addEventListener("resize", this._updateMode);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._updateMode);
  }

  private _updateMode = () => {
    this._mode =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches
        ? "bottom-sheet"
        : "dialog";
  };

  render() {
    if (this._mode === "bottom-sheet") {
      return html`
        <ha-bottom-sheet .open=${this.open} ?flexcontent=${this.flexContent}>
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
          <slot></slot>
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
        ?flexcontent=${this.flexContent}
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
    "ha-dialog-sheet": HaDialogSheet;
  }
}
