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
import { storage } from "../../../common/decorators/storage";
import { fireEvent } from "../../../common/dom/fire_event";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import {
  extractSearchParam,
  removeSearchParam,
} from "../../../common/url/search-params";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type { SidebarConfig } from "../../../data/automation";
import type {
  Constructor,
  HomeAssistant,
  ValueChangedEvent,
} from "../../../types";
import { showToast } from "../../../util/toast";
import "./ha-automation-sidebar";
import type HaAutomationSidebar from "./ha-automation-sidebar";

export const SIDEBAR_DEFAULT_WIDTH = 500;

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

    @property({ attribute: false }) public dirty = false;

    @state() protected pastedConfig?: TConfig;

    @state() protected sidebarConfig?: SidebarConfig;

    @state() protected sidebarKey = 0;

    @storage({
      key: "automation-sidebar-width",
      state: false,
      subscribe: false,
    })
    protected sidebarWidthPx = SIDEBAR_DEFAULT_WIDTH;

    @query("ha-automation-sidebar")
    protected sidebarElement?: HaAutomationSidebar;

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
          <div class="content-wrapper">
            <div
              class="content ${this.sidebarConfig && this.narrow
                ? "has-bottom-sheet"
                : ""}"
            >
              <slot name="alerts"></slot>
              ${this.renderContent()}
            </div>
            <div class="fab-positioner">
              <ha-button
                slot="fab"
                size="large"
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
      window.history.replaceState(
        null,
        "",
        constructUrlCurrentPath(removeSearchParam(param))
      );
    }

    protected async openSidebar(ev: CustomEvent<SidebarConfig>) {
      // deselect previous selected row
      this.sidebarConfig?.close?.();
      this.sidebarConfig = ev.detail;

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

    protected handleCloseSidebar() {
      this.sidebarConfig = undefined;
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
