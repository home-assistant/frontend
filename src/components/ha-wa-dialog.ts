import "@home-assistant/webawesome/dist/components/dialog/dialog";
import type WaDialog from "@home-assistant/webawesome/dist/components/dialog/dialog";
import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import { ScrollableFadeMixin } from "../mixins/scrollable-fade-mixin";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import { isIosApp } from "../util/is_ios";
import "./ha-dialog-header";
import "./ha-icon-button";

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
 * @slot headerTitle - Custom title content (used when header-title is not set).
 * @slot headerSubtitle - Custom subtitle content (used when header-subtitle is not set).
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
 * @cssprop --dialog-surface-margin-top - Top margin for the dialog surface.
 *
 * @attr {boolean} open - Controls the dialog open state.
 * @attr {("alert"|"standard")} type - Dialog type. Defaults to "standard".
 * @attr {("small"|"medium"|"large"|"full")} width - Preferred dialog width preset. Defaults to "medium".
 * @attr {boolean} prevent-scrim-close - Prevents closing the dialog by clicking the scrim/overlay. Defaults to false.
 * @attr {string} header-title - Header title text. If not set, the headerTitle slot is used.
 * @attr {string} header-subtitle - Header subtitle text. If not set, the headerSubtitle slot is used.
 * @attr {("above"|"below")} header-subtitle-position - Position of the subtitle relative to the title. Defaults to "below".
 * @attr {boolean} flexcontent - Makes the dialog body a flex container for flexible layouts.
 *
 * @event opened - Fired when the dialog is shown.
 * @event closed - Fired after the dialog is hidden.
 *
 * @remarks
 * **Focus Management:**
 * To automatically focus an element when the dialog opens, add the `autofocus` attribute to it.
 * Components with `delegatesFocus: true` (like `ha-form`) will forward focus to their first focusable child.
 * Example: `<ha-form autofocus .schema=${schema}></ha-form>`
 *
 * @see https://github.com/home-assistant/frontend/issues/27143
 */
@customElement("ha-wa-dialog")
export class HaWaDialog extends ScrollableFadeMixin(LitElement) {
  @property({ attribute: false }) public hass?: HomeAssistant;

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

  @property({ type: Boolean, reflect: true, attribute: "prevent-scrim-close" })
  public preventScrimClose = false;

  @property({ attribute: "header-title" })
  public headerTitle?: string;

  @property({ attribute: "header-subtitle" })
  public headerSubtitle?: string;

  @property({ type: String, attribute: "header-subtitle-position" })
  public headerSubtitlePosition: "above" | "below" = "below";

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @property({ type: Boolean, attribute: "without-header" })
  public withoutHeader = false;

  @state()
  private _open = false;

  @query(".body") public bodyContainer!: HTMLDivElement;

  @state()
  private _bodyScrolled = false;

  private _escapePressed = false;

  protected get scrollableElement(): HTMLElement | null {
    return this.bodyContainer;
  }

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
        aria-labelledby=${ifDefined(
          this.ariaLabelledBy ||
            (this.headerTitle !== undefined ? "ha-wa-dialog-title" : undefined)
        )}
        aria-describedby=${ifDefined(this.ariaDescribedBy)}
        @keydown=${this._handleKeyDown}
        @wa-hide=${this._handleHide}
        @wa-show=${this._handleShow}
        @wa-after-show=${this._handleAfterShow}
        @wa-after-hide=${this._handleAfterHide}
      >
        ${!this.withoutHeader
          ? html` <slot name="header">
              <ha-dialog-header
                .subtitlePosition=${this.headerSubtitlePosition}
                .showBorder=${this._bodyScrolled}
              >
                <slot name="headerNavigationIcon" slot="navigationIcon">
                  <ha-icon-button
                    data-dialog="close"
                    .label=${this.hass?.localize("ui.common.close") ?? "Close"}
                    .path=${mdiClose}
                  ></ha-icon-button>
                </slot>
                ${this.headerTitle !== undefined
                  ? html`<span
                      slot="title"
                      class="title"
                      id="ha-wa-dialog-title"
                    >
                      ${this.headerTitle}
                    </span>`
                  : html`<slot name="headerTitle" slot="title"></slot>`}
                ${this.headerSubtitle !== undefined
                  ? html`<span slot="subtitle">${this.headerSubtitle}</span>`
                  : html`<slot name="headerSubtitle" slot="subtitle"></slot>`}
                <slot name="headerActionItems" slot="actionItems"></slot>
              </ha-dialog-header>
            </slot>`
          : nothing}
        <div class="content-wrapper">
          <div class="body ha-scrollbar" @scroll=${this._handleBodyScroll}>
            <slot></slot>
          </div>
          ${this.renderScrollableFades()}
        </div>
        <slot name="footer" slot="footer"></slot>
      </wa-dialog>
    `;
  }

  private _handleShow = async () => {
    this._open = true;
    fireEvent(this, "opened");

    await this.updateComplete;

    requestAnimationFrame(() => {
      if (this.hass && isIosApp(this.hass)) {
        const element = this.querySelector("[autofocus]");
        if (element !== null) {
          if (!element.id) {
            element.id = "ha-wa-dialog-autofocus";
          }
          this.hass?.auth.external?.fireMessage({
            type: "focus_element",
            payload: {
              element_id: element.id,
            },
          });
        }
        return;
      }
      (this.querySelector("[autofocus]") as HTMLElement | null)?.focus();
    });
  };

  private _handleAfterShow = () => {
    fireEvent(this, "after-show");
  };

  private _handleAfterHide = (ev: CustomEvent<{ source: Element }>) => {
    if (ev.eventPhase === Event.AT_TARGET) {
      this._open = false;
      fireEvent(this, "closed");
    }
  };

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._open = false;
  }

  @eventOptions({ passive: true })
  private _handleBodyScroll(ev: Event) {
    this._bodyScrolled = (ev.target as HTMLDivElement).scrollTop > 0;
  }

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Escape") {
      this._escapePressed = true;
    }
  }

  private _handleHide(ev: CustomEvent<{ source: Element }>) {
    if (
      this.preventScrimClose &&
      this._escapePressed &&
      ev.detail.source === (ev.target as WaDialog).dialog
    ) {
      ev.preventDefault();
    }
    this._escapePressed = false;
  }

  static get styles() {
    return [
      ...super.styles,
      haStyleScrollbar,
      css`
        wa-dialog {
          --full-width: var(
            --ha-dialog-width-full,
            min(95vw, var(--safe-width))
          );
          --width: min(var(--ha-dialog-width-md, 580px), var(--full-width));
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
          max-width: var(--ha-dialog-max-width, var(--safe-width));
        }
        @media (prefers-reduced-motion: reduce) {
          wa-dialog {
            --show-duration: 0ms;
            --hide-duration: 0ms;
          }
        }

        :host([width="small"]) wa-dialog {
          --width: min(var(--ha-dialog-width-sm, 320px), var(--full-width));
        }

        :host([width="large"]) wa-dialog {
          --width: min(var(--ha-dialog-width-lg, 1024px), var(--full-width));
        }

        :host([width="full"]) wa-dialog {
          --width: var(--full-width);
        }

        wa-dialog::part(dialog) {
          color: var(--primary-text-color);
          min-width: var(--width, var(--full-width));
          max-width: var(--width, var(--full-width));
          max-height: var(
            --ha-dialog-max-height,
            calc(var(--safe-height) - var(--ha-space-20))
          );
          min-height: var(--ha-dialog-min-height);
          margin-top: var(--dialog-surface-margin-top, auto);
          /* Used to offset the dialog from the safe areas when space is limited */
          transform: translate(
            calc(
              var(--safe-area-offset-left, 0px) - var(
                  --safe-area-offset-right,
                  0px
                )
            ),
            calc(
              var(--safe-area-offset-top, 0px) - var(
                  --safe-area-offset-bottom,
                  0px
                )
            )
          );
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          :host([type="standard"]) {
            --ha-dialog-border-radius: 0;

            wa-dialog {
              /* Make the container fill the whole screen width and not the safe width */
              --full-width: var(--ha-dialog-width-full, 100vw);
              --width: var(--full-width);
            }

            wa-dialog::part(dialog) {
              /* Make the dialog fill the whole screen height and not the safe height */
              min-height: var(--ha-dialog-min-height, 100vh);
              min-height: var(--ha-dialog-min-height, 100dvh);
              max-height: var(--ha-dialog-max-height, 100vh);
              max-height: var(--ha-dialog-max-height, 100dvh);
              margin-top: 0;
              margin-bottom: 0;
              /* Use safe area as padding instead of the container size */
              padding-top: var(--safe-area-inset-top);
              padding-bottom: var(--safe-area-inset-bottom);
              padding-left: var(--safe-area-inset-left);
              padding-right: var(--safe-area-inset-right);
              /* Reset the transform to center the dialog */
              transform: none;
            }
          }
        }

        .header-title-container {
          display: flex;
          align-items: center;
        }

        .header-title {
          margin: 0;
          margin-bottom: 0;
          color: var(--ha-dialog-header-title-color, var(--primary-text-color));
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

        .content-wrapper {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .body {
          position: var(--dialog-content-position, relative);
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

        wa-dialog::part(footer) {
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
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-wa-dialog": HaWaDialog;
  }

  interface HASSDomEvents {
    opened: undefined;
    "after-show": undefined;
    closed: undefined;
  }
}
