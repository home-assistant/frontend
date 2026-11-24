import {
  mdiChevronUp,
  mdiClose,
  mdiCogOutline,
  mdiDeleteSweepOutline,
  mdiDotsVertical,
  mdiPlusMinusVariant,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-card";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-snap-bottom-sheet";
import type {
  BottomSheetPosition,
  HaSnapBottomSheet,
} from "../../../../components/ha-snap-bottom-sheet";
import "../../../../components/ha-svg-icon";

// The strip the collapsed sheet keeps visible until the header is measured
const COLLAPSED_HEIGHT = 85;

/**
 * @summary Holds the AI: a sidebar next to the editor on wide screens, which
 * collapses below the sidebar of a row, and a bottom sheet on narrow ones,
 * which the sheet of a row hides. Collapsed, its header switches the changes
 * of the AI on and off.
 *
 * @slot - The AI, which keeps its conversation while the sidebar is closed
 *
 * @fires ai-sidebar-closed - The user closed the sidebar
 * @fires ai-sidebar-expand - The user wants the collapsed sidebar back
 * @fires ai-sidebar-resized - The user resized the sidebar
 * @fires ai-clear-conversation - The user wants to start over
 * @fires ai-open-settings - The user wants to pick the AI in the settings
 * @fires ai-toggle-changes - Show or hide the last changes of the AI
 */
@customElement("ha-automation-ai-sidebar")
export class HaAutomationAiSidebar extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean }) public open = false;

  /** Hides the sheet for a while, e.g. for the sheet of a row. */
  @property({ type: Boolean }) public suspended = false;

  /** Only the header shows, below the sidebar of a row. */
  @property({ type: Boolean, reflect: true }) public collapsed = false;

  /** Whether the last request of the AI changed the automation. */
  @property({ type: Boolean }) public changes = false;

  /** Whether the editor shows the last changes of the AI. */
  @property({ type: Boolean, attribute: "showing-changes" })
  public showingChanges = false;

  /** Whether there is a conversation to clear. */
  @property({ type: Boolean, attribute: "can-clear" }) public canClear = false;

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  // The collapsed sheet keeps the header visible
  @state() private _headerHeight?: number;

  @query(".header") private _header?: HTMLElement;

  @query("ha-snap-bottom-sheet") private _sheet?: HaSnapBottomSheet;

  // The sheet the position was last applied to, a new one starts at it
  private _positionedSheet?: HaSnapBottomSheet;

  // Where the sheet rests, so it comes back there after it was suspended
  @state() private _position: BottomSheetPosition = "half";

  // Resizes like the sidebar of a row, which shares the width
  @state() private _resizing = false;

  private _resizeStartX?: number;

  private _resizeStartWidth = 0;

  /** Shows the content of the bottom sheet, if it is collapsed. */
  public expand() {
    if (this._sheet?.position === "collapsed") {
      this._sheet.snapTo("half");
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    const headerHeight = this._header?.offsetHeight;
    if (this.narrow && headerHeight && headerHeight !== this._headerHeight) {
      this._headerHeight = headerHeight;
    }
    if (this._sheet && this._sheet !== this._positionedSheet) {
      this._positionedSheet = this._sheet;
      this._sheet.snapTo(this._position);
    }
  }

  protected render() {
    const content = html`<div
      class="content"
      @ai-request-started=${this.expand}
      @ai-request-finished=${this._requestFinished}
    >
      ${this._renderHeader()}
      <div class="body" ?hidden=${this.collapsed && !this.narrow}>
        <slot></slot>
      </div>
    </div>`;
    if (!this.narrow) {
      return html`${
          this.collapsed
            ? nothing
            : html`<div
                class="handle ${this._resizing ? "resizing" : ""}"
                tabindex="0"
                role="separator"
                aria-orientation="vertical"
                aria-label=${this._localize(
                  "ui.panel.config.automation.editor.ai.resize"
                )}
                @pointerdown=${this._resizeStart}
                @pointermove=${this._resizeMove}
                @pointerup=${this._resizeEnd}
                @pointercancel=${this._resizeEnd}
                @dblclick=${this._resizeReset}
                @keydown=${this._resizeKey}
                @focus=${this._showHandle}
                @blur=${this._resizeEnd}
              >
                <div class="indicator ${this._resizing ? "" : "hidden"}"></div>
              </div>`
        }<ha-card outlined>${content}</ha-card>`;
    }
    // The AI stays in the light DOM meanwhile, so it keeps its conversation
    if (!this.open || this.suspended) {
      return nothing;
    }
    return html`
      <ha-snap-bottom-sheet
        .minHeight=${this._headerHeight ?? COLLAPSED_HEIGHT}
        .label=${this._localize("ui.panel.config.automation.editor.ai.title")}
        @bottom-sheet-resized=${this._sheetResized}
        @bottom-sheet-closed=${this._sheetClosed}
      >
        ${content}
      </ha-snap-bottom-sheet>
    `;
  }

  private _renderHeader() {
    const collapsed = this.narrow
      ? this._position === "collapsed"
      : this.collapsed;
    // Expanded, the actions above the prompt have it
    const changesButton = collapsed && (this.changes || this.showingChanges);
    return html`<div class="header">
      <ha-dialog-header>
        ${
          this.collapsed && !this.narrow
            ? html`<ha-icon-button
                slot="navigationIcon"
                .label=${this._localize(
                  "ui.panel.config.automation.editor.ai.expand"
                )}
                .path=${mdiChevronUp}
                @click=${this._expandRequested}
              ></ha-icon-button>`
            : html`<ha-icon-button
                slot="navigationIcon"
                .label=${this._localize("ui.common.close")}
                .path=${mdiClose}
                @click=${this._close}
              ></ha-icon-button>`
        }
        <span slot="title"
          >${this._localize("ui.panel.config.automation.editor.ai.title")}</span
        >
        ${
          changesButton
            ? html`<ha-icon-button
                slot="actionItems"
                class=${classMap({ active: this.showingChanges })}
                .label=${this._localize(
                  `ui.panel.config.automation.editor.ai.${this.showingChanges ? "hide_changes" : "show_changes"}`
                )}
                .path=${mdiPlusMinusVariant}
                @click=${this._toggleChanges}
              ></ha-icon-button>`
            : nothing
        }
        ${
          this.collapsed && !this.narrow
            ? nothing
            : html`<ha-dropdown
                slot="actionItems"
                placement="bottom-end"
                @wa-select=${this._menuSelected}
              >
                <ha-icon-button
                  slot="trigger"
                  .label=${this._localize("ui.common.menu")}
                  .path=${mdiDotsVertical}
                ></ha-icon-button>
                <ha-dropdown-item value="clear" .disabled=${!this.canClear}>
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiDeleteSweepOutline}
                  ></ha-svg-icon>
                  ${this._localize(
                    "ui.panel.config.automation.editor.ai.clear_conversation"
                  )}
                </ha-dropdown-item>
                <ha-dropdown-item value="settings">
                  <ha-svg-icon slot="icon" .path=${mdiCogOutline}></ha-svg-icon>
                  ${this._localize(
                    "ui.panel.config.automation.editor.ai.settings"
                  )}
                </ha-dropdown-item>
              </ha-dropdown>`
        }
      </ha-dialog-header>
    </div>`;
  }

  private _menuSelected(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item?.value;
    if (action === "clear") {
      fireEvent(this, "ai-clear-conversation");
    } else if (action === "settings") {
      fireEvent(this, "ai-open-settings");
    }
  }

  private _isRtl() {
    return getComputedStyle(this).direction === "rtl";
  }

  private _resizeStart(ev: PointerEvent) {
    // Keeps the browser from scrolling or selecting while dragging
    ev.preventDefault();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this._resizing = true;
    this._resizeStartX = ev.clientX;
    this._resizeStartWidth = this.offsetWidth;
  }

  private _resizeMove(ev: PointerEvent) {
    if (this._resizeStartX === undefined) {
      return;
    }
    const delta = this._resizeStartX - ev.clientX;
    fireEvent(this, "ai-sidebar-resized", {
      widthPx: this._resizeStartWidth + (this._isRtl() ? -delta : delta),
    });
  }

  private _resizeEnd() {
    this._resizeStartX = undefined;
    this._resizing = false;
  }

  private _showHandle() {
    this._resizing = true;
  }

  private _resizeReset(ev: MouseEvent) {
    ev.preventDefault();
    this._resizeEnd();
    fireEvent(this, "ai-sidebar-resized", { widthPx: undefined });
  }

  // The arrows make it wider and narrower, like the sidebar of a row
  private _resizeKey(ev: KeyboardEvent) {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    const wider = (ev.key === "ArrowLeft") !== this._isRtl();
    fireEvent(this, "ai-sidebar-resized", {
      widthPx: this.offsetWidth + (wider ? 10 : -10),
    });
  }

  private _expandRequested() {
    fireEvent(this, "ai-sidebar-expand");
  }

  private _toggleChanges() {
    fireEvent(this, "ai-toggle-changes");
  }

  private _close() {
    if (this._sheet) {
      this._sheet.closeSheet();
      return;
    }
    fireEvent(this, "ai-sidebar-closed");
  }

  private _sheetClosed() {
    this._position = "half";
    fireEvent(this, "ai-sidebar-closed");
  }

  private _sheetResized() {
    this._position = this._sheet?.position ?? this._position;
  }

  // Out of the way, so the user sees the changed automation
  private _requestFinished(
    ev: HASSDomEvent<HASSDomEvents["ai-request-finished"]>
  ) {
    if (ev.detail.config) {
      this._sheet?.snapTo("collapsed");
    }
  }

  static styles = css`
    :host {
      display: block;
    }
    /* Like the handle of the sidebar of a row */
    .handle {
      position: absolute;
      margin-inline-start: -11px;
      height: calc(100% - 2 * var(--ha-card-border-radius, 12px));
      width: 24px;
      z-index: 7;
      cursor: ew-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--ha-card-border-radius, 12px) 0;
      touch-action: none;
    }
    .handle.resizing {
      cursor: grabbing;
    }
    .handle:focus-visible {
      outline: none;
    }
    .handle .indicator {
      background-color: var(--primary-color);
      height: 100%;
      width: 4px;
      border-radius: var(--ha-border-radius-pill);
      transition:
        transform 180ms ease-in-out,
        opacity 180ms ease-in-out;
    }
    .handle .indicator.hidden {
      transform: scale3d(0, 1, 1);
      opacity: 0;
    }
    :host([narrow]) {
      /* Centers the sheet on wide screens */
      --ha-bottom-sheet-inset-left: max(
        var(--safe-area-inset-left, 0px),
        calc((100vw - 720px) / 2)
      );
      --ha-bottom-sheet-inset-right: max(
        var(--safe-area-inset-right, 0px),
        calc((100vw - 720px) / 2)
      );
      --ha-bottom-sheet-handle-padding: var(--ha-space-2);
    }
    ha-card {
      height: 100%;
      overflow: hidden;
    }
    .content {
      display: flex;
      flex-direction: column;
      height: 100%;
      flex: 1;
      min-height: 0;
    }
    .body {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .body[hidden] {
      display: none;
    }
    ::slotted(*) {
      flex: 1;
      min-height: 0;
    }
    :host([collapsed]:not([narrow])) .header {
      border-bottom: none;
    }
    /* Like the button above the prompt while the changes show */
    ha-icon-button.active {
      color: var(--primary-color);
      background-color: var(--ha-color-fill-primary-normal-resting);
      border-radius: var(--ha-border-radius-circle);
    }
    .header {
      border-bottom: 1px solid var(--divider-color);
      flex-shrink: 0;
    }
    /* Room for the handle of the sheet */
    :host([narrow]) .header {
      padding-top: var(--ha-space-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-ai-sidebar": HaAutomationAiSidebar;
  }

  interface HASSDomEvents {
    "ai-sidebar-closed": undefined;
    "ai-sidebar-expand": undefined;
    "ai-clear-conversation": undefined;
    "ai-open-settings": undefined;
    /** Without a width, it goes back to the default width. */
    "ai-sidebar-resized": { widthPx?: number };
  }
}
