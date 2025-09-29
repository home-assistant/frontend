import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@home-assistant/webawesome/dist/components/dialog/dialog";
import { mdiClose } from "@mdi/js";
import type { HomeAssistant } from "../types";
import "./ha-dialog-header";
import "./ha-icon-button";

export type DialogWidth = "small" | "medium" | "large" | "full";
export type DialogWidthOnTitleClick = DialogWidth | "none";

/**
 * Home Assistant dialog component
 *
 * @element ha-wa-dialog
 * @extends {LitElement}
 *
 * @summary
 * A stylable dialog built using the `wa-dialog` component, providing the standard header (ha-dialog-header),
 * body, and footer (when used in conjunction with `ha-dialog-footer`) with slots, sizing, and keyboard handling.
 *
 * @slot heading - Replace the entire header area.
 * @slot navigationIcon - Leading header action (e.g. close/back button).
 * @slot title - Header title. Click can toggle width if `width-on-title-click` is not "none".
 * @slot subtitle - Header subtitle, shown under the title.
 * @slot actionItems - Trailing header actions (e.g. buttons, menus).
 * @slot - Dialog content body.
 * @slot footer - Dialog footer content; typically action buttons.
 *
 * @csspart dialog - The dialog surface.
 * @csspart header - The header container.
 * @csspart body - The scrollable body container.
 * @csspart footer - The footer container.
 *
 * @cssprop --dialog-content-padding - Padding for the dialog content sections. Defaults to 24px.
 * @cssprop --ha-dialog-show-duration - Show animation duration. Defaults to 200ms.
 * @cssprop --ha-dialog-hide-duration - Hide animation duration. Defaults to 200ms.
 * @cssprop --ha-dialog-surface-background - Dialog background color. Defaults to surface.
 * @cssprop --ha-dialog-border-radius - Border radius of the dialog surface. Defaults to 24px.
 * @cssprop --dialog-z-index - Z-index for the dialog. Defaults to 8.
 * @cssprop --dialog-surface-position - CSS position of the dialog surface. Defaults to relative.
 * @cssprop --dialog-surface-margin-top - Top margin for the dialog surface. Defaults to auto.
 * @cssprop --ha-dialog-expand-duration - Duration for width transitions when changing width. Defaults to 200ms.
 *
 * @attr {boolean} open - Controls the dialog open state.
 * @attr {("small"|"medium"|"large"|"full")} width - Preferred dialog width preset. Defaults to "medium".
 * @attr {("none"|"small"|"medium"|"large"|"full")} width-on-title-click - Target width when clicking the title. "none" disables.
 * @attr {boolean} scrim-dismissable - Allows closing the dialog by clicking the scrim/overlay. Defaults to true.
 * @attr {string} header-title - Header title text when no custom title slot is provided.
 * @attr {string} header-subtitle - Header subtitle text when no custom subtitle slot is provided.
 * @attr {boolean} flexcontent - Makes the dialog body a flex container for flexible layouts.
 *
 * @event opened - Fired when the dialog is shown.
 * @event closed - Fired after the dialog is hidden.
 */
@customElement("ha-wa-dialog")
export class HaWaDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public open = false;

  @property({ type: String, reflect: true, attribute: "width" })
  public width: DialogWidth = "medium";

  @property({
    type: String,
    reflect: true,
    attribute: "width-on-title-click",
  })
  public widthOnTitleClick: DialogWidthOnTitleClick = "none";

  @property({ type: Boolean, reflect: true, attribute: "scrim-dismissable" })
  public scrimDismissable = true;

  @property({ type: String, attribute: "header-title" })
  public headerTitle = "";

  @property({ type: String, attribute: "header-subtitle" })
  public headerSubtitle = "";

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @state()
  private _open = false;

  @state()
  private _sizeChanged = false;

  protected updated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
    super.updated(changedProperties);

    if (changedProperties.has("open")) {
      if (this.open) {
        this._open = this.open;
      }
    }

    if (changedProperties.has("width")) {
      this._sizeChanged = false;
    }

    this.classList.toggle("size-changed", this._sizeChanged);
  }

  protected render() {
    return html`
      <wa-dialog
        .open=${this._open}
        .lightDismiss=${this.scrimDismissable}
        without-header
        @wa-show=${this._handleShow}
        @wa-after-hide=${this._handleAfterHide}
      >
        <slot name="heading">
          <ha-dialog-header>
            <slot name="navigationIcon" slot="navigationIcon">
              <ha-icon-button
                data-dialog="close"
                .label=${this.hass?.localize("ui.common.close") ?? "Close"}
                .path=${mdiClose}
              ></ha-icon-button>
            </slot>
            <slot name="title" slot="title">
              <span @click=${this.toggleWidth} class="title">
                ${this.headerTitle}
              </span>
            </slot>
            <slot name="subtitle" slot="subtitle">
              <span>${this.headerSubtitle}</span>
            </slot>
            <slot name="actionItems" slot="actionItems"></slot>
          </ha-dialog-header>
        </slot>
        <div class="body ha-scrollbar">
          <slot></slot>
        </div>
        <slot name="footer" slot="footer"></slot>
      </wa-dialog>
    `;
  }

  private _handleShow = () => {
    this._open = true;
    this.dispatchEvent(new CustomEvent("opened"));

    this.updateComplete.then(() => {
      const focusElement = this.querySelector(
        "[dialogInitialFocus]"
      ) as HTMLElement;
      focusElement?.focus();
    });
    window.addEventListener("keydown", this._onKeyDown, true);
  };

  private _handleAfterHide = () => {
    this._open = false;
    this.dispatchEvent(new CustomEvent("closed"));
    window.removeEventListener("keydown", this._onKeyDown, true);
  };

  public toggleWidth = () => {
    if (this.widthOnTitleClick === "none") {
      return;
    }

    this._sizeChanged = !this._sizeChanged;
  };

  private _onKeyDown = (ev: KeyboardEvent) => {
    if (!this._open || ev.defaultPrevented || ev.key !== "Enter") {
      return;
    }

    const footer = this.querySelector("ha-dialog-footer") as HTMLElement | null;
    if (!footer) return;

    const primaryAction = footer.querySelector(
      '[slot="primaryAction"]'
    ) as HTMLElement | null;
    if (!primaryAction) return;

    const isDisabled =
      (primaryAction as any).disabled ?? primaryAction.hasAttribute("disabled");
    if (isDisabled) return;

    primaryAction.click();
    ev.preventDefault();
    ev.stopPropagation();
  };

  static styles = css`
    :host([scrolled]) wa-dialog::part(header) {
      max-width: 100%;
      border-bottom: 1px solid
        var(--dialog-scroll-divider-color, var(--divider-color));
    }

    wa-dialog {
      --full-width: min(
        calc(
          100vw - var(--safe-area-inset-left, 0px) - var(
              --safe-area-inset-right,
              0px
            )
        ),
        95vw
      );
      --width: min(580px, 95vw);
      --spacing: var(--dialog-content-padding, 24px);
      --show-duration: var(--ha-dialog-show-duration, 200ms);
      --hide-duration: var(--ha-dialog-hide-duration, 200ms);
      --wa-color-surface-raised: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      --wa-panel-border-radius: var(--ha-dialog-border-radius, 24px);
      z-index: var(--dialog-z-index, 8);
      max-width: 100%;
    }

    :host([width="small"]),
    :host(.size-changed[width-on-title-click="small"]) wa-dialog {
      --width: min(320px, var(--full-width));
    }

    :host([width="large"]),
    :host(.size-changed[width-on-title-click="large"]) wa-dialog {
      --width: min(720px, var(--full-width));
    }

    :host([width="full"]),
    :host(.size-changed[width-on-title-click="full"]) wa-dialog {
      --width: var(--full-width);
    }

    wa-dialog::part(dialog) {
      min-width: var(--width, var(--full-width));
      max-width: var(--width, var(--full-width));
      max-height: 100vh;
      position: var(--dialog-surface-position, relative);
      margin-top: var(--dialog-surface-margin-top, auto);
      transition:
        min-width var(--ha-dialog-expand-duration, 200ms) ease-in-out,
        max-width var(--ha-dialog-expand-duration, 200ms) ease-in-out;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      :host {
        --ha-dialog-border-radius: 0px;
      }

      wa-dialog::part(dialog) {
        min-height: 100vh;
      }
    }

    wa-dialog::part(header) {
      max-width: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
      padding: 24px 24px 16px 24px;
      gap: 4px;
    }
    :host([has-custom-heading]) wa-dialog::part(header) {
      max-width: 100%;
      padding: 0;
    }

    wa-dialog::part(close-button),
    wa-dialog::part(close-button__base) {
      display: none;
    }

    .header-title-container {
      display: flex;
      align-items: center;
    }

    .header-title {
      margin: 0;
      margin-bottom: 0;
      color: var(--mdc-dialog-heading-ink-color, rgba(0, 0, 0, 0.87));
      font-size: var(--mdc-typography-headline6-font-size, 1.574rem);
      line-height: var(--mdc-typography-headline6-line-height, 2rem);
      font-weight: var(
        --mdc-typography-headline6-font-weight,
        var(--ha-font-weight-normal)
      );
      letter-spacing: var(--mdc-typography-headline6-letter-spacing, 0.0125em);
      text-decoration: var(--mdc-typography-headline6-text-decoration, inherit);
      text-transform: var(--mdc-typography-headline6-text-transform, inherit);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 12px;
    }

    wa-dialog::part(body) {
      padding: 0;
      display: flex;
      flex-direction: column;
      max-width: 100%;
      overflow: hidden;
    }

    .body {
      position: var(--dialog-content-position, relative);
      padding: 0 var(--dialog-content-padding, 24px)
        var(--dialog-content-padding, 24px) var(--dialog-content-padding, 24px);
      overflow: auto;
      flex-grow: 1;
    }
    :host([flexcontent]) .body {
      max-width: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    :host([hideactions]) wa-dialog::part(body) {
      padding-bottom: var(--dialog-content-padding, 24px);
    }

    wa-dialog::part(footer) {
      padding: 0;
    }

    ::slotted([slot="footer"]) {
      display: flex;
      padding: 12px 16px 16px 16px;
      gap: 12px;
      justify-content: flex-end;
      align-items: center;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-wa-dialog": HaWaDialog;
  }
}
