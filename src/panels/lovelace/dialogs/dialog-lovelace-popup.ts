import "@home-assistant/webawesome/dist/components/popover/popover";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { listenMediaQuery } from "../../../common/dom/media_query";
import { ADAPTIVE_DIALOG_MEDIA_QUERY } from "../../../components/ha-adaptive-dialog";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-bottom-sheet";
import "../../../components/ha-dialog";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import "../sections/hui-section";

type DesktopPopupMode = "popover" | "dialog";

type MobilePopupMode = "bottom-sheet" | "dialog";

type WaPopoverElement = HTMLElement & {
  anchor: Element | null;
};

export interface LovelacePopupDialogParams {
  hass: HomeAssistant;
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

  @state() private _popoverOpen = false;

  private _unsubMediaQuery?: () => void;

  private _openPopoverAnimationFrame?: number;

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
    this._cancelScheduledPopoverOpen();
    this._unsubMediaQuery?.();
    this._unsubMediaQuery = undefined;
    super.disconnectedCallback();
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("params")) {
      this._open = true;
      this._popoverOpen = false;
    }
  }

  protected updated() {
    if (this._presentationMode !== "popover") {
      this._cancelScheduledPopoverOpen();
      this._popoverOpen = false;
      return;
    }

    this._syncPopoverAnchor();

    if (!this._open) {
      this._cancelScheduledPopoverOpen();
      this._popoverOpen = false;
      return;
    }

    if (this._popoverOpen || this._openPopoverAnimationFrame !== undefined) {
      return;
    }

    this._openPopoverAnimationFrame = requestAnimationFrame(() => {
      this._openPopoverAnimationFrame = undefined;
      this._syncPopoverAnchor();

      if (this._open && this._presentationMode === "popover") {
        this._popoverOpen = true;
      }
    });
  }

  private _cancelScheduledPopoverOpen() {
    if (this._openPopoverAnimationFrame === undefined) {
      return;
    }

    cancelAnimationFrame(this._openPopoverAnimationFrame);
    this._openPopoverAnimationFrame = undefined;
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
      this._popoverOpen = false;
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
    const popupLabel = this.params.hass.localize(
      "ui.panel.lovelace.editor.action-editor.actions.show-popup"
    );

    const content = html`<hui-section
      .hass=${this.params.hass}
      .config=${{ cards: this.params.cards }}
      .index=${0}
      .viewIndex=${0}
      import-only
    ></hui-section>`;

    if (presentationMode === "popover") {
      return html`
        <wa-popover
          .open=${this._popoverOpen}
          .anchor=${this.dialogAnchor ?? null}
          auto-size="vertical"
          auto-size-padding="16"
          placement="bottom"
          without-arrow
          trap-focus
          role="dialog"
          aria-modal="true"
          aria-label=${popupLabel}
          @wa-show=${this._handlePopoverShow}
          @wa-after-hide=${this._handlePopoverAfterHide}
        >
          <div class="popover-surface">${content}</div>
        </wa-popover>
      `;
    }

    if (presentationMode === "bottom-sheet") {
      return html`
        <ha-bottom-sheet .open=${this._open} aria-label=${popupLabel}
          >${content}</ha-bottom-sheet
        >
      `;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        .withoutHeader=${true}
        width="large"
        aria-label=${popupLabel}
      >
        ${content}
      </ha-dialog>
    `;
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
    this._popoverOpen = false;
    fireEvent(this, "closed");
  }

  static styles = css`
    ha-dialog,
    ha-bottom-sheet {
      --dialog-content-padding: var(--ha-space-4);
      --ha-bottom-sheet-content-padding: var(--ha-space-4);
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
