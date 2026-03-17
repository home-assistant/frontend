import "@home-assistant/webawesome/dist/components/popover/popover";
import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { listenMediaQuery } from "../common/dom/media_query";
import type { HomeAssistant } from "../types";
import "./ha-bottom-sheet";
import "./ha-dialog";
import "./ha-dialog-header";
import "./ha-icon-button";
import type { DialogWidth } from "./ha-dialog";

type DesktopDialogMode = "dialog" | "popover";

type DialogSheetMode = DesktopDialogMode | "bottom-sheet";

/**
 * Home Assistant adaptive dialog component
 *
 * @element ha-adaptive-dialog
 * @extends {LitElement}
 *
 * @summary
 * A responsive dialog component that automatically switches between a full dialog (ha-dialog),
 * an anchored popover on desktop, and a bottom sheet (ha-bottom-sheet) based on screen size.
 *
 * @slot header - Replace the entire header area.
 * @slot headerNavigationIcon - Leading header action (for example close/back button).
 * @slot headerTitle - Custom title content (used when header-title is not set).
 * @slot headerSubtitle - Custom subtitle content (used when header-subtitle is not set).
 * @slot headerActionItems - Trailing header actions (for example buttons, menus).
 * @slot - Dialog/sheet content body.
 * @slot footer - Dialog/sheet footer content.
 *
 * @cssprop --ha-dialog-surface-background - Dialog/sheet background color.
 * @cssprop --ha-dialog-surface-backdrop-filter - Dialog/sheet backdrop filter.
 * @cssprop --dialog-box-shadow - Dialog box shadow (dialog and popover mode only).
 * @cssprop --ha-dialog-border-radius - Border radius of the dialog surface (dialog and popover mode only).
 * @cssprop --ha-dialog-show-duration - Show animation duration (dialog and popover mode only).
 * @cssprop --ha-dialog-hide-duration - Hide animation duration (dialog and popover mode only).
 * @cssprop --ha-dialog-scrim-backdrop-filter - Dialog/sheet scrim backdrop filter.
 * @cssprop --dialog-backdrop-filter - Dialog/sheet scrim backdrop filter (legacy).
 * @cssprop --mdc-dialog-scrim-color - Dialog/sheet scrim color (legacy).
 * @cssprop --ha-bottom-sheet-surface-background - Bottom sheet background color (sheet mode only).
 * @cssprop --ha-bottom-sheet-surface-backdrop-filter - Bottom sheet backdrop filter (sheet mode only).
 * @cssprop --ha-bottom-sheet-scrim-backdrop-filter - Bottom sheet scrim backdrop filter (sheet mode only).
 * @cssprop --ha-bottom-sheet-scrim-color - Bottom sheet scrim color (sheet mode only).
 *
 * @attr {boolean} open - Controls the dialog/sheet open state.
 * @attr {("alert"|"standard")} type - Dialog type (dialog mode only). Defaults to "standard".
 * @attr {("small"|"medium"|"large"|"full")} width - Preferred dialog width preset (dialog and popover mode only). Defaults to "medium".
 * @attr {("dialog"|"popover")} desktop-mode - Desktop presentation. Defaults to "dialog".
 * @attr {boolean} prevent-scrim-close - Prevents closing by clicking the scrim/overlay.
 * @attr {string} header-title - Header title text. If not set, the headerTitle slot is used.
 * @attr {string} header-subtitle - Header subtitle text. If not set, the headerSubtitle slot is used.
 * @attr {("above"|"below")} header-subtitle-position - Position of the subtitle relative to the title. Defaults to "below".
 * @attr {boolean} flexcontent - Makes the content body a flex container.
 * @attr {boolean} without-header - Hides the default header.
 * @attr {boolean} allow-mode-change - When set, the component can switch between modes as the viewport changes.
 * @prop {Element | null | undefined} dialogAnchor - Anchor element used when desktop-mode is set to "popover".
 *
 * @event opened - Fired when the dialog/sheet is shown.
 * @event closed - Fired after the dialog/sheet is hidden.
 * @event after-show - Fired after show animation completes.
 *
 * @remarks
 * **Responsive behavior:**
 * The component automatically switches between dialog and bottom sheet modes based on viewport size.
 * Dialog mode is used for screens wider than 870px and taller than 500px.
 * Set `desktop-mode="popover"` together with `dialogAnchor` to show an anchored desktop popover instead.
 * Bottom sheet mode is used for mobile devices and smaller screens.
 *
 * By default, the mode is determined when opened and is then kept stable to avoid state
 * loss (like form resets) during viewport changes. Set `allow-mode-change` to opt into live
 * mode switching while the dialog is open.
 *
 * **Focus management:**
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

  @property({ reflect: true })
  public type: "alert" | "standard" = "standard";

  @property({ type: String, reflect: true, attribute: "width" })
  public width: DialogWidth = "medium";

  @property({ type: String, reflect: true, attribute: "desktop-mode" })
  public desktopMode: DesktopDialogMode = "dialog";

  @property({ type: Boolean, reflect: true, attribute: "prevent-scrim-close" })
  public preventScrimClose = false;

  @property({ attribute: false })
  public dialogAnchor?: Element | null;

  @property({ attribute: "header-title" })
  public headerTitle?: string;

  @property({ attribute: "header-subtitle" })
  public headerSubtitle?: string;

  @property({ type: String, attribute: "header-subtitle-position" })
  public headerSubtitlePosition: "above" | "below" = "below";

  @property({ type: Boolean, attribute: "allow-mode-change" })
  public allowModeChange = false;

  @property({ type: Boolean, attribute: "without-header" })
  public withoutHeader = false;

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @state() private _mode: DialogSheetMode = "dialog";

  @state() private _narrow = false;

  @state() private _popoverOpen = false;

  private _unsubMediaQuery?: () => void;

  private _allowPopoverHide = false;

  private _openPopoverRaf?: number;

  connectedCallback() {
    super.connectedCallback();
    this._unsubMediaQuery = listenMediaQuery(
      "(max-width: 870px), (max-height: 500px)",
      (matches) => {
        this._narrow = matches;

        if (!this.open || this.allowModeChange) {
          this._updateMode();
        }
      }
    );
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (
      changedProperties.has("open") ||
      ((!this.open || this.allowModeChange) &&
        (changedProperties.has("desktopMode") ||
          changedProperties.has("dialogAnchor") ||
          changedProperties.has("allowModeChange")))
    ) {
      this._updateMode();
    }

    if (
      changedProperties.has("open") &&
      !this.open &&
      this._mode === "popover"
    ) {
      this._allowPopoverHide = true;
    }

    if (!this.open || this._mode !== "popover") {
      this._cancelPopoverOpen();
      this._popoverOpen = false;
    }
  }

  protected updated() {
    if (this.open && this._mode === "popover" && !this._popoverOpen) {
      this._schedulePopoverOpen();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cancelPopoverOpen();
    this._unsubMediaQuery?.();
    this._unsubMediaQuery = undefined;
    this._allowPopoverHide = false;
  }

  render() {
    if (this._mode === "bottom-sheet") {
      return html`
        <ha-bottom-sheet
          .ariaLabelledBy=${this.ariaLabelledBy ||
          (this.headerTitle !== undefined ? "ha-dialog-title" : undefined)}
          .ariaDescribedBy=${this.ariaDescribedBy}
          .flexContent=${this.flexContent}
          .hass=${this.hass}
          .open=${this.open}
          .preventScrimClose=${this.preventScrimClose}
        >
          ${this._renderHeader(true)}
          <slot></slot>
          <slot name="footer" slot="footer"></slot>
        </ha-bottom-sheet>
      `;
    }

    if (this._mode === "popover") {
      return html`
        <wa-popover
          .open=${this._popoverOpen}
          .anchor=${this.dialogAnchor ?? null}
          placement="bottom-start"
          auto-size="vertical"
          auto-size-padding="16"
          trap-focus
          .ariaLabelledby=${this.ariaLabelledBy ||
          (this.headerTitle !== undefined ? "ha-dialog-title" : undefined)}
          .ariaDescribedby=${this.ariaDescribedBy}
          @wa-show=${this._handlePopoverShow}
          @wa-hide=${this._handlePopoverHide}
          @wa-after-show=${this._handlePopoverAfterShow}
          @wa-after-hide=${this._handlePopoverAfterHide}
        >
          <div class="popover-surface" @click=${this._handlePopoverClick}>
            ${this._renderHeader()}
            <div class="content-wrapper">
              <div class="body"><slot></slot></div>
            </div>
            <slot name="footer"></slot>
          </div>
        </wa-popover>
      `;
    }

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this.open}
        .type=${this.type}
        .width=${this.width}
        .preventScrimClose=${this.preventScrimClose}
        .ariaLabelledBy=${this.ariaLabelledBy}
        .ariaDescribedBy=${this.ariaDescribedBy}
        .headerTitle=${this.headerTitle}
        .headerSubtitle=${this.headerSubtitle}
        .headerSubtitlePosition=${this.headerSubtitlePosition}
        .flexContent=${this.flexContent}
        .withoutHeader=${this.withoutHeader}
      >
        <slot name="headerNavigationIcon" slot="headerNavigationIcon">
          <ha-icon-button
            data-dialog="close"
            .label=${this.hass?.localize("ui.common.close") ?? "Close"}
            .path=${mdiClose}
          ></ha-icon-button>
        </slot>
        <slot name="headerTitle" slot="headerTitle"></slot>
        <slot name="headerSubtitle" slot="headerSubtitle"></slot>
        <slot name="headerActionItems" slot="headerActionItems"></slot>
        <slot></slot>
        <slot name="footer" slot="footer"></slot>
      </ha-dialog>
    `;
  }

  private _renderHeader(slotHeader = false) {
    if (this.withoutHeader) {
      return nothing;
    }

    const content = html`
      <ha-dialog-header .subtitlePosition=${this.headerSubtitlePosition}>
        <slot name="headerNavigationIcon" slot="navigationIcon">
          <ha-icon-button
            data-dialog="close"
            .label=${this.hass?.localize("ui.common.close") ?? "Close"}
            .path=${mdiClose}
          ></ha-icon-button>
        </slot>
        ${this.headerTitle !== undefined
          ? html`<span slot="title" class="title" id="ha-dialog-title">
              ${this.headerTitle}
            </span>`
          : html`<slot name="headerTitle" slot="title"></slot>`}
        ${this.headerSubtitle !== undefined
          ? html`<span slot="subtitle">${this.headerSubtitle}</span>`
          : html`<slot name="headerSubtitle" slot="subtitle"></slot>`}
        <slot name="headerActionItems" slot="actionItems"></slot>
      </ha-dialog-header>
    `;

    return html`
      ${slotHeader
        ? html`<slot name="header" slot="header">${content}</slot>`
        : html`<slot name="header">${content}</slot>`}
    `;
  }

  private _updateMode() {
    this._mode = this._computeMode();
  }

  private _schedulePopoverOpen() {
    if (this._openPopoverRaf !== undefined) {
      return;
    }

    this._openPopoverRaf = requestAnimationFrame(() => {
      this._openPopoverRaf = undefined;

      if (this.open && this._mode === "popover") {
        this._popoverOpen = true;
      }
    });
  }

  private _cancelPopoverOpen() {
    if (this._openPopoverRaf === undefined) {
      return;
    }

    cancelAnimationFrame(this._openPopoverRaf);
    this._openPopoverRaf = undefined;
  }

  private _computeMode(): DialogSheetMode {
    if (this._narrow) {
      return "bottom-sheet";
    }

    if (this.desktopMode === "popover" && this.dialogAnchor) {
      return "popover";
    }

    return "dialog";
  }

  private _handlePopoverClick(ev: Event) {
    const path = ev.composedPath();

    const shouldClose = path.some((node) => {
      if (!(node instanceof HTMLElement)) {
        return false;
      }

      return (
        node.getAttribute("data-dialog") === "close" ||
        node.getAttribute("data-popover") === "close" ||
        node.closest('[data-dialog="close"], [data-popover="close"]') !== null
      );
    });

    const isHeaderNavigationClick = path.some(
      (node) =>
        node instanceof HTMLSlotElement && node.name === "headerNavigationIcon"
    );

    if (!shouldClose && !isHeaderNavigationClick) {
      return;
    }

    this._allowPopoverHide = true;
    this.open = false;
  }

  private _handlePopoverShow(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }

    fireEvent(this, "opened");
  }

  private _handlePopoverHide(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }

    if (this.preventScrimClose && !this._allowPopoverHide) {
      ev.preventDefault();
    }
  }

  private _handlePopoverAfterShow(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }

    fireEvent(this, "after-show");
  }

  private _handlePopoverAfterHide(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }

    this._allowPopoverHide = false;
    fireEvent(this, "closed");
  }

  static get styles() {
    return [
      css`
        wa-popover {
          --full-width: var(
            --ha-dialog-width-full,
            min(95vw, var(--safe-width))
          );
          --width: min(var(--ha-dialog-width-md, 580px), var(--full-width));
          --show-duration: var(--ha-dialog-show-duration, 200ms);
          --hide-duration: var(--ha-dialog-hide-duration, 200ms);
          --wa-color-surface-raised: var(
            --ha-dialog-surface-background,
            var(--card-background-color, var(--ha-color-surface-default))
          );
          --wa-panel-border-radius: var(
            --ha-dialog-border-radius,
            var(--ha-border-radius-3xl)
          );
          --wa-color-surface-border: transparent;
          --max-width: var(--width);
        }

        :host([width="small"]) wa-popover {
          --width: min(var(--ha-dialog-width-sm, 320px), var(--full-width));
        }

        :host([width="large"]) wa-popover {
          --width: min(var(--ha-dialog-width-lg, 1024px), var(--full-width));
        }

        :host([width="full"]) wa-popover {
          --width: var(--full-width);
        }

        wa-popover::part(body) {
          padding: 0;
          box-shadow: var(--dialog-box-shadow, var(--wa-shadow-l));
          min-width: var(--width, var(--full-width));
          max-width: var(--width);
          max-height: var(
            --ha-dialog-max-height,
            calc(var(--safe-height) - var(--ha-space-20))
          );
          overflow: hidden;
          color: var(--primary-text-color);
          -webkit-backdrop-filter: var(
            --ha-dialog-surface-backdrop-filter,
            none
          );
          backdrop-filter: var(--ha-dialog-surface-backdrop-filter, none);
          -webkit-user-select: text;
          user-select: text;
        }

        .popover-surface {
          display: flex;
          flex-direction: column;
          min-height: 0;
          max-height: inherit;
        }

        ha-bottom-sheet {
          --ha-bottom-sheet-border-radius: var(--ha-border-radius-2xl);
          --ha-bottom-sheet-surface-background: var(
            --ha-dialog-surface-background,
            var(--card-background-color, var(--ha-color-surface-default))
          );
          --ha-bottom-sheet-padding: 0 var(--safe-area-inset-right)
            var(--safe-area-inset-bottom) var(--safe-area-inset-left);
          --ha-bottom-sheet-content-padding: var(
            --dialog-content-padding,
            0 var(--ha-space-6) var(--ha-space-6) var(--ha-space-6)
          );
        }

        .content-wrapper {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .body {
          position: relative;
          padding: var(
            --dialog-content-padding,
            0 var(--ha-space-6) var(--ha-space-6) var(--ha-space-6)
          );
          overflow: auto;
          flex-grow: 1;
        }

        :host([flexcontent]) .body {
          max-width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        slot[name="footer"] {
          display: block;
          padding: 0;
        }

        ::slotted([slot="footer"]) {
          display: flex;
          padding: var(--ha-space-3) var(--ha-space-4) var(--ha-space-4)
            var(--ha-space-4);
          gap: var(--ha-space-3);
          justify-content: flex-end;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
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
