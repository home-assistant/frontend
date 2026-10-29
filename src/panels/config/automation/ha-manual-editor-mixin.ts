import { provide } from "@lit/context";
import { mdiContentSave } from "@mdi/js";
import {
  html,
  type LitElement,
  type nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../../common/decorators/consume";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { replaceCurrentUrl } from "../../../common/navigate";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import {
  extractSearchParam,
  removeSearchParam,
} from "../../../common/url/search-params";
import {
  mapConfigPath,
  type ConfigChange,
} from "../../../common/util/config-change";
import {
  pathEquals,
  pathStartsWith,
  type ConfigPath,
} from "../../../common/util/config-path";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type { SidebarConfig } from "../../../data/automation";
import {
  dirtyStateContext,
  type DirtyStateContext,
} from "../../../data/context/dirty-state";
import type {
  Constructor,
  HomeAssistant,
  ValueChangedEvent,
} from "../../../types";
import { showToast } from "../../../util/toast";
import {
  AutomationRowRegistry,
  automationRowRegistryContext,
  type AutomationPathRow,
  type UndoStepMeta,
} from "./automation-path";
import "./ha-automation-sidebar";
import type HaAutomationSidebar from "./ha-automation-sidebar";
import { scrollRowIntoView } from "./scroll-row-into-view";

export const SIDEBAR_DEFAULT_WIDTH = 500;

export const PASTED_CONFIG_TOAST_ID = "pasted-config";

export const ManualEditorMixin = <TConfig>(
  superClass: Constructor<LitElement>
) => {
  class ManualEditorClass extends superClass {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

    @property({ type: Boolean }) public narrow = false;

    @property({ type: Boolean }) public disabled = false;

    @property({ type: Boolean }) public saving = false;

    @property({ attribute: false }) public config!: TConfig;

    @consume({ context: dirtyStateContext, subscribe: true })
    @state()
    private _dirtyState?: DirtyStateContext;

    protected get dirty(): boolean {
      return this._dirtyState?.isDirty ?? false;
    }

    @state() protected pastedConfig?: TConfig;

    @state() protected sidebarConfig?: SidebarConfig;

    @state() protected sidebarKey = 0;

    @state() private _bottomSheetHeight?: number;

    @storage({
      key: "automation-sidebar-width",
      state: false,
      subscribe: false,
    })
    protected sidebarWidthPx = SIDEBAR_DEFAULT_WIDTH;

    @query("ha-automation-sidebar")
    protected sidebarElement?: HaAutomationSidebar;

    @provide({ context: automationRowRegistryContext })
    protected rowRegistry = new AutomationRowRegistry();

    // Undo and redo can remove the row the sidebar edits
    private _sidebarRow?: Element;

    private _revealCount = 0;

    // Lists show a drag before they report it, so during a drag the path the
    // sidebar row had before it counts
    private _dragSidebarPath?: ConfigPath;

    declare protected collapsableElements?: NodeListOf<
      Element & {
        expandAll(): void;
        collapseAll(): void;
      }
    >;

    private _prevSidebarWidthPx?: number;

    protected handlePaste = async (_ev: ClipboardEvent): Promise<void> => {
      throw new Error("Not implemented");
    };

    public connectedCallback() {
      super.connectedCallback();
      window.addEventListener("paste", this.handlePaste);
    }

    public disconnectedCallback() {
      window.removeEventListener("paste", this.handlePaste);
      super.disconnectedCallback();
    }

    protected renderContent(): TemplateResult | typeof nothing {
      throw new Error("Not implemented");
    }

    protected saveConfig() {
      throw new Error("Not implemented");
    }

    protected render() {
      return html`
        <div
          class=${classMap({
            "has-sidebar": this.sidebarConfig && !this.narrow,
          })}
        >
          <div
            class="content-wrapper ${
              this.sidebarConfig && this.narrow ? "has-bottom-sheet" : ""
            }"
            style=${styleMap({
              "--automation-bottom-sheet-settled-height":
                this._bottomSheetHeight === undefined
                  ? undefined
                  : `${this._bottomSheetHeight}px`,
            })}
          >
            <div class="content">
              <slot name="alerts"></slot>
              ${this.renderContent()}
            </div>
            <div class="fab-positioner">
              <ha-button
                slot="fab"
                size="l"
                class=${this.dirty ? "dirty" : ""}
                .disabled=${this.saving}
                @click=${this.saveConfig}
              >
                <ha-svg-icon slot="start" .path=${mdiContentSave}></ha-svg-icon>
                ${this.hass.localize("ui.common.save")}
              </ha-button>
            </div>
          </div>
          <div class="sidebar-positioner">
            <ha-automation-sidebar
              tabindex="-1"
              class=${classMap({ hidden: !this.sidebarConfig })}
              .isWide=${this.isWide}
              .hass=${this.hass}
              .narrow=${this.narrow}
              .config=${this.sidebarConfig}
              .disabled=${this.disabled}
              .sidebarKey=${this.sidebarKey}
              @value-changed=${this.sidebarConfigChanged}
              @sidebar-resized=${this.resizeSidebar}
              @sidebar-resizing-stopped=${this.stopResizeSidebar}
              @sidebar-reset-size=${this.resetSidebarWidth}
              @bottom-sheet-resized=${this._handleBottomSheetResized}
            ></ha-automation-sidebar>
          </div>
        </div>
      `;
    }

    protected firstUpdated(changedProps: PropertyValues<this>): void {
      super.firstUpdated(changedProps);

      this.style.setProperty(
        "--sidebar-dynamic-width",
        `${this.sidebarWidthPx}px`
      );

      const expanded = extractSearchParam("expanded");
      if (expanded === "1") {
        this.clearParam("expanded");
        this.expandAll();
      }
    }

    protected clearParam(param: string) {
      replaceCurrentUrl(constructUrlCurrentPath(removeSearchParam(param)));
    }

    protected async openSidebar(ev: CustomEvent<SidebarConfig>) {
      // deselect previous selected row
      this.sidebarConfig?.close?.();
      this.sidebarConfig = ev.detail;
      this._sidebarRow = ev.composedPath()[0] as Element;
      // The sheet opens items at half height, so make room before rows scroll
      this._bottomSheetHeight = undefined;
      this.dispatchEvent(
        new CustomEvent("sidebar-config-changed", {
          detail: { value: this.sidebarConfig },
          bubbles: true,
          composed: true,
        })
      );

      // be sure the sidebar editor is recreated
      this.sidebarKey++;

      await this.sidebarElement?.updateComplete;
      this.sidebarElement?.focus();
    }

    protected sidebarConfigChanged(ev: ValueChangedEvent<SidebarConfig>) {
      ev.stopPropagation();
      if (!this.sidebarConfig) {
        return;
      }

      this.sidebarConfig = {
        ...this.sidebarConfig,
        ...ev.detail.value,
      };
      this.dispatchEvent(
        new CustomEvent("sidebar-config-changed", {
          detail: { value: this.sidebarConfig },
          bubbles: true,
          composed: true,
        })
      );
    }

    public get sidebarOpen(): boolean {
      return !!this.sidebarConfig;
    }

    public triggerCloseSidebar() {
      if (this.sidebarConfig) {
        if (this.sidebarElement) {
          this.sidebarElement.triggerCloseSidebar();
          return;
        }
        this.sidebarConfig?.close();
        this.sidebarKey = 0;
      }
    }

    /**
     * The paths of the row the sidebar shows before and after the changes,
     * when they are about it, e.g. it was edited or moved. Call it before the
     * changes rendered, while the row is registered at its path from before.
     */
    public dragStarted() {
      this._dragSidebarPath =
        this._sidebarRow &&
        this.rowRegistry.pathOf(this._sidebarRow as AutomationPathRow);
    }

    public dragEnded() {
      this._dragSidebarPath = undefined;
    }

    public findSidebarRow(changes: ConfigChange[]): UndoStepMeta["sidebarRow"] {
      const row = this._sidebarRow as AutomationPathRow | undefined;
      const path =
        row && (this._dragSidebarPath ?? this.rowRegistry.pathOf(row));
      if (!path) {
        return undefined;
      }
      const isAbout = changes.some((change) => {
        if (change.op === "move") {
          // Swapped neighbours are found as the other one moving
          const swapped =
            pathEquals(change.path, path) &&
            pathEquals(change.from.slice(0, -1), path.slice(0, -1)) &&
            Math.abs(
              (change.from[change.from.length - 1] as number) -
                (path[path.length - 1] as number)
            ) === 1;
          return swapped || pathStartsWith(change.from, path);
        }
        // An item added at its path is a new row before it
        if (change.op === "add") {
          return (
            change.path.length > path.length &&
            pathStartsWith(change.path, path)
          );
        }
        // A replaced value around the row may still hold it unchanged
        return (
          pathStartsWith(change.path, path) ||
          (change.op === "remove" && pathStartsWith(path, change.path))
        );
      });
      return isAbout
        ? { undo: path, redo: mapConfigPath(path, changes) }
        : undefined;
    }

    /**
     * Shows the row a change from undo or redo is about, so the user sees
     * what changed. Takes the most likely path first and keeps an already
     * selected row, and its sidebar, open. Opens the sidebar only with
     * `openSidebar`, so a change made with a closed sidebar doesn't open it.
     */
    public async revealPaths(paths: ConfigPath[], openSidebar: boolean) {
      const reveal = ++this._revealCount;
      // Rows register their paths once they rendered the changed config
      await nextRender();
      // A later undo or redo has its own rows to show
      if (reveal !== this._revealCount) {
        return;
      }
      const candidates = paths
        .map((path) => this.rowRegistry.rowsAlong(path))
        .filter((rows) => rows.length);
      const rows =
        candidates.find((along) => along[along.length - 1].selected) ??
        candidates[0];
      const row = rows?.pop();
      if (row && rows?.length) {
        rows.forEach((ancestor) => ancestor.expand());
        await nextRender();
        if (reveal !== this._revealCount) {
          return;
        }
      }
      // Only the row itself, a parent block's sidebar would be about another
      if (
        row &&
        openSidebar &&
        !row.selected &&
        pathEquals(this.rowRegistry.pathOf(row) ?? [], paths[0])
      ) {
        row.openSidebar();
        // On narrow screens openSidebar scrolls once the bottom sheet opened
        if (!this.narrow) {
          scrollRowIntoView(row);
        }
        return;
      }
      // Rows unregister when removed, and only registered rows refresh
      // their sidebar when their config changes
      if (
        this.sidebarConfig &&
        !this.rowRegistry.pathOf(this._sidebarRow as AutomationPathRow)
      ) {
        // A removed row's close event can't reach the editor anymore
        if (this._sidebarRow?.isConnected) {
          this.triggerCloseSidebar();
        } else {
          this.handleCloseSidebar();
        }
      }
      if (row) {
        scrollRowIntoView(row);
      }
    }

    public get canToggleSidebarYamlMode(): boolean {
      return !!this.sidebarElement?.canToggleYamlMode;
    }

    public toggleSidebarYamlMode() {
      this.sidebarElement?.toggleYamlMode();
    }

    private _handleBottomSheetResized(
      ev: HASSDomEvent<HASSDomEvents["bottom-sheet-resized"]>
    ) {
      this._bottomSheetHeight = ev.detail.height;
    }

    protected handleCloseSidebar() {
      this.sidebarConfig = undefined;
      this._sidebarRow = undefined;
      this._bottomSheetHeight = undefined;
      this.dispatchEvent(
        new CustomEvent("sidebar-config-changed", {
          detail: { value: undefined },
          bubbles: true,
          composed: true,
        })
      );
    }

    protected replaceExistingConfig(config: TConfig) {
      this.pastedConfig = config;

      this.showPastedToastWithUndo();

      fireEvent(this, "value-changed", {
        value: {
          ...config,
        },
      });
    }

    protected showPastedToastWithUndo() {
      // Override in subclass with appropriate localize key
    }

    public resetPastedConfig() {
      this.pastedConfig = undefined;

      showToast(this, {
        id: PASTED_CONFIG_TOAST_ID,
        message: "",
        duration: 0,
      });
    }

    public expandAll() {
      this.collapsableElements?.forEach((element) => {
        element.expandAll();
      });
    }

    public collapseAll() {
      this.collapsableElements?.forEach((element) => {
        element.collapseAll();
      });
    }

    protected tryInsertAfterSelected(config: any): boolean {
      if (this.sidebarConfig && "insertAfter" in this.sidebarConfig) {
        return this.sidebarConfig.insertAfter(config as any);
      }
      return false;
    }

    public copySelectedRow() {
      if (this.sidebarConfig && "copy" in this.sidebarConfig) {
        this.sidebarConfig.copy();
      }
    }

    public cutSelectedRow() {
      if (this.sidebarConfig && "cut" in this.sidebarConfig) {
        this.sidebarConfig.cut();
      }
    }

    public deleteSelectedRow() {
      if (this.sidebarConfig && "delete" in this.sidebarConfig) {
        this.sidebarConfig.delete();
      }
    }

    protected resizeSidebar(ev) {
      ev.stopPropagation();
      const delta = ev.detail.deltaInPx as number;

      // set initial resize width to add / reduce delta from it
      if (!this._prevSidebarWidthPx) {
        this._prevSidebarWidthPx =
          this.sidebarElement?.clientWidth || SIDEBAR_DEFAULT_WIDTH;
      }

      const widthPx = delta + this._prevSidebarWidthPx;

      this.sidebarWidthPx = widthPx;

      this.style.setProperty(
        "--sidebar-dynamic-width",
        `${this.sidebarWidthPx}px`
      );
    }

    protected stopResizeSidebar(ev) {
      ev.stopPropagation();
      this._prevSidebarWidthPx = undefined;
    }

    protected resetSidebarWidth(ev: Event) {
      ev.stopPropagation();
      this._prevSidebarWidthPx = undefined;
      this.sidebarWidthPx = SIDEBAR_DEFAULT_WIDTH;
      this.style.setProperty(
        "--sidebar-dynamic-width",
        `${this.sidebarWidthPx}px`
      );
    }
  }
  return ManualEditorClass;
};
