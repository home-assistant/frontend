import {
  mdiChevronUp,
  mdiClose,
  mdiPlusMinusVariant,
  mdiStarFourPoints,
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
 * @fires ai-toggle-changes - Show or hide the last changes of the AI
 */
@customElement("ha-automation-ai-sidebar")
export class HaAutomationAiSidebar extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean }) public open = false;

  /** Hides the sheet for a while, e.g. for the sheet of a row. */
  @property({ type: Boolean }) public suspended = false;

  /** Whether the AI works on a request. */
  @property({ type: Boolean }) public working = false;

  /** Only the header shows, below the sidebar of a row. */
  @property({ type: Boolean, reflect: true }) public collapsed = false;

  /** Whether the last request of the AI changed the automation. */
  @property({ type: Boolean }) public changes = false;

  /** Whether the editor shows the last changes of the AI. */
  @property({ type: Boolean, attribute: "showing-changes" })
  public showingChanges = false;

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
      return html`<ha-card outlined>${content}</ha-card>`;
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
    const changesButton =
      collapsed && (this.changes || this.showingChanges) && !this.working;
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
        <div slot="actionItems" class="actions">
          ${
            changesButton
              ? html`<ha-icon-button
                  class=${classMap({ active: this.showingChanges })}
                  .label=${this._localize(
                    `ui.panel.config.automation.editor.ai.${this.showingChanges ? "hide_changes" : "show_changes"}`
                  )}
                  aria-pressed=${this.showingChanges ? "true" : "false"}
                  .path=${mdiPlusMinusVariant}
                  @click=${this._toggleChanges}
                ></ha-icon-button>`
              : nothing
          }
          <ha-svg-icon
            class=${classMap({ "ai-icon": true, working: this.working })}
            .path=${mdiStarFourPoints}
          ></ha-svg-icon>
        </div>
      </ha-dialog-header>
    </div>`;
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
    .actions {
      display: flex;
      align-items: center;
    }
    /* Like the button above the prompt while the changes show */
    .actions ha-icon-button.active {
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
    .ai-icon {
      --mdc-icon-size: 24px;
      padding: var(--ha-space-3);
      color: var(--primary-color);
    }
    /* Shines while the AI works on the request */
    .ai-icon.working {
      animation: ai-shine 1.8s ease-in-out infinite;
    }
    @keyframes ai-shine {
      0%,
      55%,
      100% {
        filter: drop-shadow(0 0 0 rgba(var(--rgb-primary-color), 0));
        transform: scale(1) rotate(0deg);
      }
      80% {
        filter: drop-shadow(0 0 8px rgba(var(--rgb-primary-color), 0.9));
        transform: scale(1.2) rotate(45deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ai-icon.working {
        animation: none;
        filter: drop-shadow(0 0 6px rgba(var(--rgb-primary-color), 0.9));
      }
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
  }
}
