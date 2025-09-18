import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@home-assistant/webawesome/dist/components/dialog/dialog";
import { mdiClose } from "@mdi/js";
import type { HomeAssistant } from "../types";
import "./ha-dialog-header";
import "./ha-icon-button";

export type DialogSize = "small" | "medium" | "large" | "full";
export type DialogSizeOnTitleClick = DialogSize | "none";

@customElement("ha-wa-dialog")
export class HaWaDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public open = false;

  @property({ type: String, reflect: true, attribute: "dialog-size" })
  public dialogSize: DialogSize = "medium";

  @property({ type: String, reflect: true, attribute: "current-dialog-size" })
  public currentDialogSize: DialogSize = this.dialogSize;

  @property({
    type: String,
    reflect: true,
    attribute: "dialog-size-on-title-click",
  })
  public dialogSizeOnTitleClick: DialogSizeOnTitleClick = "none";

  // TODO: Should this be scrim, overlay, or match WA with lightDismiss?
  @property({ type: Boolean, reflect: true, attribute: "scrim-dismissable" })
  public scrimDismissable = false;

  @property({ type: String, attribute: "header-title" })
  public headerTitle = "";

  @property({ type: String, attribute: "header-subtitle" })
  public headerSubtitle = "";

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @state()
  private _open = false;

  protected updated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
    super.updated(changedProperties);

    if (changedProperties.has("open")) {
      this._open = this.open;
    }

    if (changedProperties.has("dialogSize")) {
      this.currentDialogSize = this.dialogSize;
    }
  }

  protected render() {
    return html`
      <wa-dialog
        .open=${this._open}
        .lightDismiss=${this.scrimDismissable}
        .withoutHeader=${true}
        @wa-show=${this._handleShow}
        @wa-hide=${this._handleHide}
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
              <span @click=${this.toggleSize} class="title">
                ${this.headerTitle}
              </span>
            </slot>
            <slot name="subtitle" slot="subtitle">
              <span>${this.headerSubtitle}</span>
            </slot>
            <slot name="actionItems" slot="actionItems"> </slot>
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
  };

  private _handleHide = () => {
    this._open = false;
    this.dispatchEvent(new CustomEvent("closed"));
  };

  public toggleSize = () => {
    if (this.dialogSizeOnTitleClick === "none") {
      return;
    }

    this.currentDialogSize =
      this.currentDialogSize === this.dialogSizeOnTitleClick
        ? this.dialogSize
        : this.dialogSizeOnTitleClick;
  };

  static override styles = css`
    :host([scrolled]) wa-dialog::part(header) {
      max-width: 100%;
      border-bottom: 1px solid
        var(--dialog-scroll-divider-color, var(--divider-color));
    }

    wa-dialog {
      --width: min(580px, 95vw);
      --spacing: var(--dialog-content-padding, 24px);
      --show-duration: 200ms;
      --hide-duration: 200ms;
      --wa-color-surface-raised: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      --wa-panel-border-radius: var(--ha-dialog-border-radius, 24px);
      z-index: var(--dialog-z-index, 8);
      max-width: 100%;
    }

    :host([current-dialog-size="small"]) wa-dialog {
      --width: min(320px, 95vw);
    }

    :host([current-dialog-size="large"]) wa-dialog {
      --width: min(720px, 95vw);
    }

    :host([current-dialog-size="full"]) wa-dialog {
      --width: 95vw;
    }

    wa-dialog::part(dialog) {
      min-width: var(--width, 100vw);
      max-width: var(--width, 100vw);
      max-height: 100vh;
      position: var(--dialog-surface-position, relative);
      margin-top: var(--dialog-surface-margin-top, auto);
      transition:
        min-width 200ms ease-in-out,
        max-width 200ms ease-in-out;
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      :host {
        --ha-dialog-border-radius: 0px;
      }

      wa-dialog {
        --width: 100vw;
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
    }

    .body {
      position: var(--dialog-content-position, relative);
      padding: 0 var(--dialog-content-padding, 24px)
        var(--dialog-content-padding, 24px) var(--dialog-content-padding, 24px);
    }
    :host([flexcontent]) wa-dialog::part(body) {
      max-width: 100%;
      overflow: auto;
      display: flex;
      flex-direction: column;
    }
    :host([hideactions]) wa-dialog::part(body) {
      padding-bottom: var(--dialog-content-padding, 24px);
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
