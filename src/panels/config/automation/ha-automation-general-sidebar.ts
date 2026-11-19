import { mdiChevronRight, mdiClose, mdiStarFourPoints } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-snap-bottom-sheet";
import type {
  BottomSheetPosition,
  HaSnapBottomSheet,
} from "../../../components/ha-snap-bottom-sheet";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import "../../../components/ha-tab-group";
import "../../../components/ha-tab-group-tab";
import "../../../components/ha-textarea";
import "../../../components/input/ha-input";
import type { AutomationConfig } from "../../../data/automation";
import { haStyleScrollbar } from "../../../resources/styles";

export type AutomationGeneralSidebarTab = "info" | "ai";

export type AutomationInfoAction = "toggle" | "mode" | "more_info" | "settings";

// The strip the collapsed sheet keeps visible until the header is measured
const COLLAPSED_HEIGHT = 72;

/**
 * @summary The sidebar of the automation as a whole: its info, and the AI
 * that edits it. On wide screens it is next to the editor and the sidebar of
 * a row covers it. On narrow screens it is a bottom sheet that stays
 * collapsed below the editor, and the sheet of a row hides it.
 *
 * @slot ai - The AI, which stays while another tab shows
 *
 * @fires general-sidebar-tab-changed - The user picked another tab
 * @fires general-sidebar-closed - The user closed the sidebar
 * @fires automation-info-changed - The name or description changed
 * @fires automation-info-action - A row of the info asks for something
 */
@customElement("ha-automation-general-sidebar")
export class HaAutomationGeneralSidebar extends LitElement {
  @property({ attribute: false }) public config!: AutomationConfig;

  /** The automation entity, once the automation is saved. */
  @property({ attribute: false }) public stateObj?: HassEntity;

  @property() public tab: AutomationGeneralSidebarTab = "info";

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "ai-available" })
  public aiAvailable = false;

  @property({ type: Boolean, attribute: "ai-working" })
  public aiWorking = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  /** Hides the sheet without losing the AI, e.g. for the sheet of a row. */
  @property({ type: Boolean }) public suspended = false;

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  // The collapsed sheet keeps the tabs visible
  @state() private _headerHeight?: number;

  @query(".header") private _header?: HTMLElement;

  @query("ha-snap-bottom-sheet") private _sheet?: HaSnapBottomSheet;

  // The sheet the position was last applied to, a new one starts at it
  private _positionedSheet?: HaSnapBottomSheet;

  // Where the sheet rests, so it comes back there after it was suspended
  private _position: BottomSheetPosition = "collapsed";

  /** Shows the content of the bottom sheet, if it is collapsed. */
  public expand() {
    if (this._sheet && this._sheet.position === "collapsed") {
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
    if (!this.narrow) {
      return html`<ha-card outlined>${this._renderContent()}</ha-card>`;
    }
    // The AI stays in the light DOM meanwhile, so it keeps its conversation
    if (this.suspended) {
      return nothing;
    }
    return html`
      <ha-snap-bottom-sheet
        .minHeight=${this._headerHeight ?? COLLAPSED_HEIGHT}
        .label=${this._localize(
          "ui.panel.config.automation.editor.general_sidebar.open"
        )}
        @bottom-sheet-resized=${this._sheetResized}
      >
        <div class="sheet">${this._renderContent()}</div>
      </ha-snap-bottom-sheet>
    `;
  }

  private _renderContent() {
    const tab = this.aiAvailable ? this.tab : "info";
    return html`
      <div class="header">
        ${
          // The sheet only collapses
          this.narrow
            ? nothing
            : html`<ha-icon-button
                .label=${this._localize("ui.common.close")}
                .path=${mdiClose}
                @click=${this._close}
              ></ha-icon-button>`
        }
        <ha-tab-group @wa-tab-show=${this._tabChanged} @click=${this.expand}>
          <ha-tab-group-tab slot="nav" panel="info" .active=${tab === "info"}>
            ${this._localize(
              "ui.panel.config.automation.editor.general_sidebar.info"
            )}
          </ha-tab-group-tab>
          ${
            this.aiAvailable
              ? html`<ha-tab-group-tab
                  slot="nav"
                  panel="ai"
                  .active=${tab === "ai"}
                >
                  <ha-svg-icon
                    class=${classMap({
                      "ai-icon": true,
                      working: this.aiWorking,
                    })}
                    .path=${mdiStarFourPoints}
                  ></ha-svg-icon>
                  ${this._localize(
                    "ui.panel.config.automation.editor.general_sidebar.ai"
                  )}
                </ha-tab-group-tab>`
              : nothing
          }
        </ha-tab-group>
      </div>
      <div class="info ha-scrollbar" ?hidden=${tab !== "info"}>
        ${this._renderInfo()}
      </div>
      <div
        class="ai"
        ?hidden=${tab !== "ai"}
        @ai-request-started=${this.expand}
        @ai-request-finished=${this._aiRequestFinished}
      >
        <slot name="ai"></slot>
      </div>
    `;
  }

  private _renderInfo() {
    const enabled = this.stateObj?.state !== "off";
    const mode = this.config.mode ?? "single";
    return html`
      <ha-input
        .label=${this._localize("ui.panel.config.automation.editor.alias")}
        .placeholder=${this._localize(
          "ui.panel.config.automation.editor.default_name"
        )}
        .value=${this.config.alias ?? ""}
        .disabled=${this.disabled}
        required
        name="alias"
        @change=${this._infoChanged}
      ></ha-input>
      <ha-textarea
        .label=${this._localize(
          "ui.panel.config.automation.editor.description.label"
        )}
        .placeholder=${this._localize(
          "ui.panel.config.automation.editor.description.placeholder"
        )}
        .value=${this.config.description ?? ""}
        .disabled=${this.disabled}
        resize="auto"
        name="description"
        @change=${this._infoChanged}
      ></ha-textarea>
      <div class="rows">
        <label class="row">
          <span class="text">
            <span class="primary">
              ${this._localize(
                "ui.panel.config.automation.editor.general_sidebar.status"
              )}
            </span>
            <span class="secondary">
              ${this._localize(
                `ui.panel.config.automation.editor.general_sidebar.${enabled ? "enabled" : "disabled"}`
              )}
            </span>
          </span>
          <ha-switch
            .checked=${enabled}
            .disabled=${!this.stateObj}
            @change=${this._action}
            data-action="toggle"
          ></ha-switch>
        </label>
        ${
          "use_blueprint" in this.config
            ? nothing
            : this._renderRow(
                "mode",
                this._localize(
                  "ui.panel.config.automation.editor.general_sidebar.mode"
                ),
                this._localize(
                  `ui.panel.config.automation.editor.modes.${mode}`
                ),
                this.disabled
              )
        }
        ${this._renderRow(
          "more_info",
          this._localize("ui.panel.config.automation.editor.show_info"),
          undefined,
          !this.stateObj
        )}
        ${this._renderRow(
          "settings",
          this._localize("ui.panel.config.automation.picker.show_settings"),
          undefined,
          !this.stateObj
        )}
      </div>
    `;
  }

  private _renderRow(
    action: AutomationInfoAction,
    primary: string,
    secondary: string | undefined,
    disabled: boolean
  ) {
    return html`
      <button
        class="row"
        data-action=${action}
        ?disabled=${disabled}
        @click=${this._action}
      >
        <span class="text">
          <span class="primary">${primary}</span>
          ${secondary ? html`<span class="secondary">${secondary}</span>` : ""}
        </span>
        <ha-svg-icon class="chevron" .path=${mdiChevronRight}></ha-svg-icon>
      </button>
    `;
  }

  private _tabChanged(ev: HASSDomEvent<{ name: AutomationGeneralSidebarTab }>) {
    if (ev.detail.name !== this.tab) {
      fireEvent(this, "general-sidebar-tab-changed", { tab: ev.detail.name });
    }
  }

  private _close() {
    fireEvent(this, "general-sidebar-closed");
  }

  private _sheetResized() {
    this._position = this._sheet?.position ?? this._position;
  }

  // Out of the way, so the user sees the changed automation
  private _aiRequestFinished(
    ev: HASSDomEvent<HASSDomEvents["ai-request-finished"]>
  ) {
    if (ev.detail.config) {
      this._sheet?.snapTo("collapsed");
    }
  }

  private _infoChanged(ev: Event) {
    const field = ev.target as HTMLInputElement;
    const value = field.value.trim();
    fireEvent(this, "automation-info-changed", {
      [field.name]: value || undefined,
    });
  }

  private _action(ev: Event) {
    const action = (ev.currentTarget as HTMLElement).dataset
      .action as AutomationInfoAction;
    fireEvent(this, "automation-info-action", { action });
  }

  static styles = [
    haStyleScrollbar,
    css`
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
        /* The grab area of the handle stays above the tabs */
        --ha-bottom-sheet-handle-padding: 0px;
      }
      :host([narrow]) .header {
        padding-top: var(--ha-space-5);
      }
      .sheet {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
      }
      [hidden] {
        display: none !important;
      }
      /* Like the sidebar of a row, which covers this one */
      ha-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .header {
        display: flex;
        align-items: center;
        gap: var(--ha-space-1);
        padding-inline: var(--ha-space-1);
        border-bottom: 1px solid var(--divider-color);
        flex-shrink: 0;
      }
      ha-tab-group {
        flex: 1;
        min-width: 0;
      }
      ha-tab-group-tab::part(base) {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
      }
      .ai-icon {
        --mdc-icon-size: 18px;
        color: var(--primary-color);
      }
      /* Shines while the AI works, also when another tab shows */
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
          filter: drop-shadow(0 0 6px rgba(var(--rgb-primary-color), 0.9));
          transform: scale(1.2) rotate(45deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ai-icon.working {
          animation: none;
          filter: drop-shadow(0 0 4px rgba(var(--rgb-primary-color), 0.9));
        }
      }
      .info {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: var(--ha-space-4);
        display: flex;
        flex-direction: column;
        /* The name keeps room below it for its error */
        gap: var(--ha-space-2);
      }
      .ai {
        flex: 1;
        min-height: 0;
      }
      .rows {
        margin-top: var(--ha-space-2);
        display: flex;
        flex-direction: column;
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-lg);
        overflow: hidden;
      }
      .row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        min-height: 56px;
        padding: var(--ha-space-2) var(--ha-space-3);
        box-sizing: border-box;
        border: none;
        border-top: 1px solid var(--divider-color);
        background: none;
        color: var(--primary-text-color);
        font: inherit;
        text-align: start;
        cursor: pointer;
      }
      .row:first-child {
        border-top: none;
      }
      button.row:hover:not(:disabled),
      button.row:focus-visible {
        background-color: var(--ha-color-fill-neutral-quiet-hover);
        outline: none;
      }
      .row:disabled {
        cursor: default;
        color: var(--disabled-text-color);
      }
      .text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .secondary {
        font-size: var(--ha-font-size-s);
        color: var(--secondary-text-color);
      }
      .chevron {
        color: var(--secondary-text-color);
        flex-shrink: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-general-sidebar": HaAutomationGeneralSidebar;
  }

  interface HASSDomEvents {
    "general-sidebar-tab-changed": { tab: AutomationGeneralSidebarTab };
    "general-sidebar-closed": undefined;
    "automation-info-changed": Partial<
      Pick<AutomationConfig, "alias" | "description">
    >;
    "automation-info-action": { action: AutomationInfoAction };
  }
}
