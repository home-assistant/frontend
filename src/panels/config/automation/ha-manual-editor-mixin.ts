import { provide } from "@lit/context";
import { mdiContentSave } from "@mdi/js";
import {
  html,
  nothing,
  type LitElement,
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
import { nextRender } from "../../../common/util/render-status";
import {
  extractSearchParam,
  removeSearchParam,
} from "../../../common/url/search-params";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type { SidebarConfig } from "../../../data/automation";
import type { ConfigValidationError } from "../../../data/config";
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
import "../../../components/ha-alert";
import {
  automationErrorsContext,
  errorOwner,
  errorText,
  NO_ERRORS,
} from "./automation-errors";
import {
  AutomationRowRegistry,
  automationRowRegistryContext,
  type AutomationPathRow,
} from "./automation-path";
import { scrollRowIntoView } from "./scroll-row-into-view";
import "./ha-automation-sidebar";
import type HaAutomationSidebar from "./ha-automation-sidebar";

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

    @provide({ context: automationErrorsContext })
    @property({ attribute: false })
    public configErrors: ConfigValidationError[] = NO_ERRORS;

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

    private _unsubscribeRows?: () => void;

    // Rows register while they render, so errors only count as without a
    // row once the rows had a frame to render
    @state() private _rowsRendered = false;

    public connectedCallback() {
      super.connectedCallback();
      window.addEventListener("paste", this.handlePaste);
      // Which errors have a row changes as rows render
      this._unsubscribeRows = this.rowRegistry.subscribe(() => {
        if (this.configErrors.length) {
          this.requestUpdate();
        }
      });
    }

    public disconnectedCallback() {
      window.removeEventListener("paste", this.handlePaste);
      this._unsubscribeRows?.();
      this._unsubscribeRows = undefined;
      super.disconnectedCallback();
    }

    private _renderUnownedErrors() {
      if (!this._rowsRendered) {
        return nothing;
      }
      const unowned = this.configErrors.filter(
        (error) => !errorOwner(this.rowRegistry, error)
      );
      return unowned.length
        ? html`<ha-alert alert-type="error" class="unowned-errors">
            ${unowned.map((error) => html`<p>${errorText(error)}</p>`)}
          </ha-alert>`
        : nothing;
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
              ${this._renderUnownedErrors()} ${this.renderContent()}
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
      nextRender().then(() => {
        this._rowsRendered = true;
      });

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

    /**
     * Expands the rows along the path of every error, then scrolls to the
     * first one and opens it in the sidebar. Does nothing while a row with an
     * error is open, so the user stays where they are.
     */
    public async revealErrors() {
      await this.updateComplete;
      const errorRows = () =>
        this.configErrors.map((error) =>
          this.rowRegistry.rowsAlong(error.path)
        );
      const owners = (rows: AutomationPathRow[][]) =>
        rows
          .map((along) => along[along.length - 1])
          .filter((owner) => owner !== undefined);
      let rows = errorRows();
      if (owners(rows).some((owner) => owner.selected)) {
        return;
      }
      const depthOf = (along: AutomationPathRow[][]) =>
        along.reduce((sum, path) => sum + path.length, 0);
      // Collapsed rows don't render their children, so expand one level at a
      // time until no deeper row shows up
      let depth = -1;
      while (depthOf(rows) > depth) {
        depth = depthOf(rows);
        rows.flat().forEach((row) => row.expand());
        // eslint-disable-next-line no-await-in-loop
        await nextRender();
        rows = errorRows();
      }
      // Errors aren't in config order, so take the topmost row
      const first = owners(rows).reduce<AutomationPathRow | undefined>(
        (top, row) =>
          !top ||
          row.getBoundingClientRect().top < top.getBoundingClientRect().top
            ? row
            : top,
        undefined
      );
      if (!first) {
        return;
      }
      first.openSidebar();
      await nextRender();
      scrollRowIntoView(first);
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
