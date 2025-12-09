import { mdiClose } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../types";
import { listenMediaQuery } from "../common/dom/media_query";
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
 * @slot footer - Dialog/sheet footer content.
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
 * @attr {boolean} block-mode-change - When set, the mode is determined at mount time based on the current screen size, but subsequent mode changes are blocked. Useful for preventing forms from resetting when the viewport size changes.
 *
 * @event opened - Fired when the dialog/sheet is shown (dialog mode only).
 * @event closed - Fired after the dialog/sheet is hidden.
 * @event after-show - Fired after show animation completes (dialog mode only).
 *
 * @remarks
 * **Responsive Behavior:**
 * The component automatically switches between dialog and bottom sheet modes based on viewport size.
 * Dialog mode is used for screens wider than 870px and taller than 500px.
 * Bottom sheet mode is used for mobile devices and smaller screens.
 *
 * When `block-mode-change` is set, the mode is determined once at mount time based on the initial
 * screen size. Subsequent viewport size changes will not trigger mode switches, which is useful
 * for preventing form resets or other state loss when users resize their browser window.
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

  @property({ type: Boolean, attribute: "block-mode-change" })
  public blockModeChange = false;

  @state() private _mode: DialogSheetMode = "dialog";

  private _unsubMediaQuery?: () => void;

  private _modeSet = false;

  connectedCallback() {
    super.connectedCallback();
    this._unsubMediaQuery = listenMediaQuery(
      "(max-width: 870px), (max-height: 500px)",
      (matches) => {
        if (!this._modeSet || !this.blockModeChange) {
          this._mode = matches ? "bottom-sheet" : "dialog";
          this._modeSet = true;
        }
      }
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubMediaQuery?.();
    this._unsubMediaQuery = undefined;
    this._modeSet = false;
  }

  render() {
    if (this._mode === "bottom-sheet") {
      return html`
        <ha-bottom-sheet .open=${this.open} flexcontent>
          <ha-dialog-header
            slot="header"
            .subtitlePosition=${this.headerSubtitlePosition}
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
          <slot name="footer" slot="footer"></slot>
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
        <slot name="headerNavigationIcon" slot="headerNavigationIcon"></slot>
        <slot name="headerTitle" slot="headerTitle"></slot>
        <slot name="headerSubtitle" slot="headerSubtitle"></slot>
        <slot name="headerActionItems" slot="headerActionItems"></slot>
        <slot></slot>
        <slot name="footer" slot="footer"></slot>
      </ha-wa-dialog>
    `;
  }

  static get styles() {
    return [
      css`
        ha-bottom-sheet {
          --ha-bottom-sheet-surface-background: var(
            --ha-dialog-surface-background,
            var(--card-background-color, var(--ha-color-surface-default))
          );
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-adaptive-dialog": HaAdaptiveDialog;
  }
}
