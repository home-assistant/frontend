import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@home-assistant/webawesome/dist/components/dialog/dialog";
import { mdiClose } from "@mdi/js";
import "./ha-dialog-header";
import "./ha-icon-button";
import type { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { deepQuerySelector } from "../common/dom/deep-query-selector";
import { haStyleScrollbar } from "../resources/styles";

export type DialogWidth = "small" | "medium" | "large" | "full";

/**
 * Home Assistant dialog component
 *
 * @element ha-wa-dialog
 * @extends {LitElement}
 *
 * @summary
 * A stylable dialog built using the `wa-dialog` component, providing a standardized header (ha-dialog-header),
 * body, and footer (preferably using `ha-dialog-footer`) with slots
 *
 * You can open and close the dialog declaratively by using the `data-dialog="close"` attribute.
 * @see https://webawesome.com/docs/components/dialog/#opening-and-closing-dialogs-declaratively
 *
 * @slot header - Replace the entire header area.
 * @slot headerNavigationIcon - Leading header action (e.g. close/back button).
 * @slot headerActionItems - Trailing header actions (e.g. buttons, menus).
 * @slot - Dialog content body.
 * @slot footer - Dialog footer content.
 *
 * @csspart dialog - The dialog surface.
 * @csspart header - The header container.
 * @csspart body - The scrollable body container.
 * @csspart footer - The footer container.
 *
 * @cssprop --dialog-content-padding - Padding for the dialog content sections.
 * @cssprop --ha-dialog-show-duration - Show animation duration.
 * @cssprop --ha-dialog-hide-duration - Hide animation duration.
 * @cssprop --ha-dialog-surface-background - Dialog background color.
 * @cssprop --ha-dialog-border-radius - Border radius of the dialog surface.
 * @cssprop --dialog-z-index - Z-index for the dialog.
 * @cssprop --dialog-surface-position - CSS position of the dialog surface.
 * @cssprop --dialog-surface-margin-top - Top margin for the dialog surface.
 *
 * @attr {boolean} open - Controls the dialog open state.
 * @attr {("small"|"medium"|"large"|"full")} width - Preferred dialog width preset. Defaults to "medium".
 * @attr {boolean} prevent-scrim-close - Prevents closing the dialog by clicking the scrim/overlay. Defaults to false.
 * @attr {string} header-title - Header title text when no custom title slot is provided.
 * @attr {string} header-subtitle - Header subtitle text when no custom subtitle slot is provided.
 * @attr {("above"|"below")} header-subtitle-position - Position of the subtitle relative to the title. Defaults to "below".
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

  @property({ type: Boolean, reflect: true, attribute: "prevent-scrim-close" })
  public preventScrimClose = false;

  @property({ type: String, attribute: "header-title" })
  public headerTitle = "";

  @property({ type: String, attribute: "header-subtitle" })
  public headerSubtitle = "";

  @property({ type: String, attribute: "header-subtitle-position" })
  public headerSubtitlePosition: "above" | "below" = "below";

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
  }

  protected render() {
    return html`
      <wa-dialog
        .open=${this._open}
        .lightDismiss=${!this.preventScrimClose}
        without-header
        @wa-show=${this._handleShow}
        @wa-after-hide=${this._handleAfterHide}
      >
        <slot name="header">
          <ha-dialog-header .subtitlePosition=${this.headerSubtitlePosition}>
            <slot name="headerNavigationIcon" slot="navigationIcon">
              <ha-icon-button
                data-dialog="close"
                .label=${this.hass?.localize("ui.common.close") ?? "Close"}
                .path=${mdiClose}
              ></ha-icon-button>
            </slot>
            ${this.headerTitle
              ? html`<span slot="title" class="title">
                  ${this.headerTitle}
                </span>`
              : nothing}
            ${this.headerSubtitle
              ? html`<span slot="subtitle">${this.headerSubtitle}</span>`
              : nothing}
            <slot name="headerActionItems" slot="actionItems"></slot>
          </ha-dialog-header>
        </slot>
        <div class="body ha-scrollbar">
          <slot></slot>
        </div>
        <slot name="footer" slot="footer"></slot>
      </wa-dialog>
    `;
  }

  private _handleShow = async () => {
    this._open = true;
    fireEvent(this, "opened");

    await this.updateComplete;

    const focusElement = await deepQuerySelector("[autofocus]", this);
    focusElement?.focus();
  };

  private _handleAfterHide = () => {
    this._open = false;
    fireEvent(this, "closed");
  };

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._open = false;
  }

  static styles = [
    haStyleScrollbar,
    css`
      wa-dialog {
        --full-width: var(
          --ha-dialog-width-full,
          min(
            95vw,
            calc(
              100vw - var(--safe-area-inset-left, var(--ha-space-0)) - var(
                  --safe-area-inset-right,
                  var(--ha-space-0)
                )
            )
          )
        );
        --width: var(--ha-dialog-width-md, min(580px, var(--full-width)));
        --spacing: var(--dialog-content-padding, var(--ha-space-6));
        --show-duration: var(--ha-dialog-show-duration, 200ms);
        --hide-duration: var(--ha-dialog-hide-duration, 200ms);
        --ha-dialog-surface-background: var(
          --card-background-color,
          var(--ha-color-surface-default)
        );
        --wa-color-surface-raised: var(
          --ha-dialog-surface-background,
          var(--card-background-color, var(--ha-color-surface-default))
        );
        --wa-panel-border-radius: var(
          --ha-dialog-border-radius,
          var(--ha-border-radius-3xl)
        );
        max-width: var(--ha-dialog-max-width, 100vw);
        max-width: var(--ha-dialog-max-width, 100svw);
      }

      :host([width="small"]) wa-dialog {
        --width: var(--ha-dialog-width-sm, min(320px, var(--full-width)));
      }

      :host([width="large"]) wa-dialog {
        --width: var(--ha-dialog-width-lg, min(720px, var(--full-width)));
      }

      :host([width="full"]) wa-dialog {
        --width: var(--full-width);
      }

      wa-dialog::part(dialog) {
        min-width: var(--width, var(--full-width));
        max-width: var(--width, var(--full-width));
        max-height: var(
          --ha-dialog-max-height,
          calc(100% - var(--ha-space-20))
        );
        position: var(--dialog-surface-position, relative);
        margin-top: var(--dialog-surface-margin-top, auto);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      @media all and (max-width: 450px), all and (max-height: 500px) {
        :host {
          --ha-dialog-border-radius: var(--ha-space-0);
        }

        wa-dialog {
          --full-width: var(--ha-dialog-width-full, 100vw);
        }

        wa-dialog::part(dialog) {
          min-height: var(--ha-dialog-min-height, 100vh);
          min-height: var(--ha-dialog-min-height, 100svh);
          max-height: var(--ha-dialog-max-height, 100vh);
          max-height: var(--ha-dialog-max-height, 100svh);
          padding-top: var(--safe-area-inset-top, var(--ha-space-0));
          padding-bottom: var(--safe-area-inset-bottom, var(--ha-space-0));
          padding-left: var(--safe-area-inset-left, var(--ha-space-0));
          padding-right: var(--safe-area-inset-right, var(--ha-space-0));
        }
      }

      .header-title-container {
        display: flex;
        align-items: center;
      }

      .header-title {
        margin: 0;
        margin-bottom: 0;
        color: var(
          --ha-dialog-header-title-color,
          var(--ha-color-on-surface-default, var(--primary-text-color))
        );
        font-size: var(
          --ha-dialog-header-title-font-size,
          var(--ha-font-size-2xl)
        );
        line-height: var(
          --ha-dialog-header-title-line-height,
          var(--ha-line-height-condensed)
        );
        font-weight: var(
          --ha-dialog-header-title-font-weight,
          var(--ha-font-weight-normal)
        );
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: var(--ha-space-3);
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
        padding: 0 var(--dialog-content-padding, var(--ha-space-6))
          var(--dialog-content-padding, var(--ha-space-6))
          var(--dialog-content-padding, var(--ha-space-6));
        overflow: auto;
        flex-grow: 1;
      }
      :host([flexcontent]) .body {
        max-width: 100%;
        display: flex;
        flex-direction: column;
      }

      wa-dialog::part(footer) {
        padding: var(--ha-space-0);
      }

      ::slotted([slot="footer"]) {
        display: flex;
        padding: var(--ha-space-3) var(--ha-space-4) var(--ha-space-4)
          var(--ha-space-4);
        gap: var(--ha-space-3);
        justify-content: flex-end;
        align-items: center;
        width: 100%;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-wa-dialog": HaWaDialog;
  }

  interface HASSDomEvents {
    opened: undefined;
    closed: undefined;
  }
}
