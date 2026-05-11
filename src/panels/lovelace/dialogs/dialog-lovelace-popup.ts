import "@home-assistant/webawesome/dist/components/divider/divider";
import "@home-assistant/webawesome/dist/components/popover/popover";
import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../../common/dom/fire_event";
import { listenMediaQuery } from "../../../common/dom/media_query";
import { ADAPTIVE_DIALOG_MEDIA_QUERY } from "../../../components/ha-adaptive-dialog";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-bottom-sheet";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-header";
import "../../../components/ha-icon-button";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import "../sections/hui-section";

type DesktopPopupMode = "popover" | "dialog";

type MobilePopupMode = "bottom-sheet" | "dialog";

type WaPopoverElement = HTMLElement & {
  anchor: Element | null;
};

export interface LovelacePopupDialogParams {
  hass: HomeAssistant;
  title?: string;
  desktopMode?: DesktopPopupMode;
  mobileMode?: MobilePopupMode;
  cards: LovelaceCardConfig[];
}

@customElement("dialog-lovelace-popup")
export class DialogLovelacePopup extends DialogMixin<LovelacePopupDialogParams>(
  LitElement
) {
  @property({ attribute: false }) public params?: LovelacePopupDialogParams;

  @property({ attribute: false }) public override dialogAnchor?: Element;

  @state() private _narrow = false;

  @state() private _open = true;

  private _unsubMediaQuery?: () => void;

  private _syncPopoverAnchorAnimationFrame?: number;

  connectedCallback() {
    super.connectedCallback();
    this._unsubMediaQuery = listenMediaQuery(
      ADAPTIVE_DIALOG_MEDIA_QUERY,
      (matches) => {
        this._narrow = matches;
      }
    );
  }

  disconnectedCallback() {
    if (this._syncPopoverAnchorAnimationFrame !== undefined) {
      cancelAnimationFrame(this._syncPopoverAnchorAnimationFrame);
      this._syncPopoverAnchorAnimationFrame = undefined;
    }
    this._unsubMediaQuery?.();
    this._unsubMediaQuery = undefined;
    super.disconnectedCallback();
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("params")) {
      this._open = true;
    }
  }

  protected updated() {
    if (this._presentationMode !== "popover") {
      return;
    }

    this._syncPopoverAnchor();
    if (this._syncPopoverAnchorAnimationFrame !== undefined) {
      return;
    }

    this._syncPopoverAnchorAnimationFrame = requestAnimationFrame(() => {
      this._syncPopoverAnchorAnimationFrame = undefined;
      this._syncPopoverAnchor();
    });
  }

  private _syncPopoverAnchor() {
    const popover =
      this.renderRoot.querySelector<WaPopoverElement>("wa-popover");
    const anchor = this.dialogAnchor ?? null;
    if (popover && popover.anchor !== anchor) {
      popover.anchor = anchor;
    }
  }

  public override closeDialog(_historyState?: any): Promise<boolean> | boolean {
    if (this._presentationMode === "popover") {
      this._open = false;
      return true;
    }
    return super.closeDialog(_historyState);
  }

  private get _presentationMode(): DesktopPopupMode | MobilePopupMode {
    if (!this.params) {
      return "popover";
    }
    return this._narrow
      ? (this.params.mobileMode ?? "bottom-sheet")
      : (this.params.desktopMode ?? "popover");
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    const presentationMode = this._presentationMode;

    const content = html`
      ${this.params.title ? html`<wa-divider></wa-divider>` : nothing}
      <hui-section
        .hass=${this.params.hass}
        .config=${{ cards: this.params.cards }}
        .index=${0}
        .viewIndex=${0}
        import-only
      ></hui-section>
    `;

    if (presentationMode === "popover") {
      return html`
        <wa-popover
          .open=${this._open}
          .anchor=${this.dialogAnchor ?? null}
          auto-size="vertical"
          auto-size-padding="16"
          without-arrow
          trap-focus
          role="dialog"
          aria-modal="true"
          aria-labelledby=${ifDefined(
            this.params.title ? "ha-dialog-title" : undefined
          )}
          @wa-show=${this._handlePopoverShow}
          @wa-after-hide=${this._handlePopoverAfterHide}
        >
          <div class="popover-surface" @click=${this._handleCloseAction}>
            ${this._renderHeader()} ${content}
          </div>
        </wa-popover>
      `;
    }

    if (presentationMode === "bottom-sheet") {
      return html`
        <ha-bottom-sheet .open=${this._open} @click=${this._handleCloseAction}>
          ${this._renderHeader("header")} ${content}
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        .headerTitle=${this.params.title}
        ?withoutHeader=${!this.params.title}
        width="large"
      >
        ${content}
      </ha-dialog>
    `;
  }

  private _renderHeader(slot?: string) {
    if (!this.params?.title) {
      return nothing;
    }

    return html`
      <ha-dialog-header slot=${ifDefined(slot)}>
        <ha-icon-button
          data-dialog="close"
          slot="navigationIcon"
          .label=${this.params.hass.localize("ui.common.close")}
          .path=${mdiClose}
        ></ha-icon-button>
        <span slot="title" class="title" id="ha-dialog-title">
          ${this.params.title}
        </span>
      </ha-dialog-header>
    `;
  }

  private _handleCloseAction(ev: Event) {
    if (
      ev
        .composedPath()
        .some(
          (node) =>
            node instanceof HTMLElement &&
            (node.getAttribute("data-dialog") === "close" ||
              node.closest('[data-dialog="close"]') !== null)
        )
    ) {
      this._open = false;
    }
  }

  private _handlePopoverShow(ev: Event) {
    if (ev.eventPhase === Event.AT_TARGET) {
      this._open = true;
      fireEvent(this, "opened");
    }
  }

  private _handlePopoverAfterHide(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }
    this._open = false;
    fireEvent(this, "closed");
  }

  static styles = css`
    ha-dialog,
    ha-bottom-sheet {
      --dialog-content-padding: var(--ha-space-4);
    }

    wa-popover {
      --width: min(var(--ha-dialog-width-lg, 1024px), 95vw);
      --wa-color-surface-raised: var(
        --ha-dialog-surface-background,
        var(--card-background-color, var(--ha-color-surface-default))
      );
      --wa-panel-border-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-3xl)
      );
    }

    wa-popover::part(dialog)::backdrop {
      background: none;
    }

    wa-popover::part(body) {
      padding: 0;
      border-color: transparent;
      box-shadow: var(--dialog-box-shadow, var(--wa-shadow-l));
      min-width: var(--width);
      max-width: var(--width);
      max-height: calc(var(--safe-height) - var(--ha-space-20));
      overflow: hidden;
      color: var(--primary-text-color);
    }

    .popover-surface {
      display: flex;
      flex-direction: column;
      max-height: inherit;
      overflow: auto;
      padding: var(--ha-space-4);
    }

    .popover-surface ha-dialog-header {
      margin: calc(-1 * var(--ha-space-4)) calc(-1 * var(--ha-space-4)) 0;
    }

    hui-section {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lovelace-popup": DialogLovelacePopup;
  }
}
