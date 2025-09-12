import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-resizable-bottom-sheet";
import type { HaResizableBottomSheet } from "../../../components/ha-resizable-bottom-sheet";
import {
  isCondition,
  isScriptField,
  isTrigger,
  type ActionSidebarConfig,
  type ConditionSidebarConfig,
  type ScriptFieldSidebarConfig,
  type SidebarConfig,
  type TriggerSidebarConfig,
} from "../../../data/automation";
import { isTriggerList } from "../../../data/trigger";
import type { HomeAssistant } from "../../../types";
import "./sidebar/ha-automation-sidebar-action";
import "./sidebar/ha-automation-sidebar-condition";
import "./sidebar/ha-automation-sidebar-option";
import "./sidebar/ha-automation-sidebar-script-field";
import "./sidebar/ha-automation-sidebar-script-field-selector";
import "./sidebar/ha-automation-sidebar-trigger";

@customElement("ha-automation-sidebar")
export default class HaAutomationSidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: SidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "sidebar-key" }) public sidebarKey?: string;

  @state() private _yamlMode = false;

  @query("ha-resizable-bottom-sheet")
  private _bottomSheetElement?: HaResizableBottomSheet;

  private _dragging = false;

  private _dragStartX = 0;

  private _initialSize = 0;

  connectedCallback() {
    super.connectedCallback();

    // register event listeners for drag handling
    document.addEventListener("mousemove", this._handleMouseMove);
    document.addEventListener("mouseup", this._handleMouseUp);
    document.addEventListener("touchmove", this._handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this._handleTouchEnd);
    document.addEventListener("touchcancel", this._handleTouchEnd);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    // unregister event listeners for drag handling
    document.removeEventListener("mousemove", this._handleMouseMove);
    document.removeEventListener("mouseup", this._handleMouseUp);
    document.removeEventListener("touchmove", this._handleTouchMove);
    document.removeEventListener("touchend", this._handleTouchEnd);
    document.removeEventListener("touchcancel", this._handleTouchEnd);
  }

  private _renderContent() {
    // get config type
    const type = this._getType();

    if (type === "trigger") {
      return html`
        <ha-automation-sidebar-trigger
          class="sidebar-content"
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .narrow=${this.narrow}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          .sidebarKey=${this.sidebarKey}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this.triggerCloseSidebar}
        ></ha-automation-sidebar-trigger>
      `;
    }
    if (type === "condition") {
      return html`
        <ha-automation-sidebar-condition
          class="sidebar-content"
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .narrow=${this.narrow}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          .sidebarKey=${this.sidebarKey}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this.triggerCloseSidebar}
        ></ha-automation-sidebar-condition>
      `;
    }
    if (type === "action") {
      return html`
        <ha-automation-sidebar-action
          class="sidebar-content"
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .narrow=${this.narrow}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          .sidebarKey=${this.sidebarKey}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this.triggerCloseSidebar}
        ></ha-automation-sidebar-action>
      `;
    }
    if (type === "option") {
      return html`
        <ha-automation-sidebar-option
          class="sidebar-content"
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .narrow=${this.narrow}
          .disabled=${this.disabled}
          @close-sidebar=${this.triggerCloseSidebar}
        ></ha-automation-sidebar-option>
      `;
    }
    if (type === "script-field-selector") {
      return html`
        <ha-automation-sidebar-script-field-selector
          class="sidebar-content"
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .narrow=${this.narrow}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          .sidebarKey=${this.sidebarKey}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this.triggerCloseSidebar}
        ></ha-automation-sidebar-script-field-selector>
      `;
    }
    if (type === "script-field") {
      return html`
        <ha-automation-sidebar-script-field
          class="sidebar-content"
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .narrow=${this.narrow}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          .sidebarKey=${this.sidebarKey}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this.triggerCloseSidebar}
        ></ha-automation-sidebar-script-field>
      `;
    }

    return nothing;
  }

  protected render() {
    if (!this.config) {
      return nothing;
    }

    if (this.narrow) {
      return html`
        <ha-resizable-bottom-sheet @bottom-sheet-closed=${this._closeSidebar}>
          ${this._renderContent()}
        </ha-resizable-bottom-sheet>
      `;
    }

    return html`
      <div
        class="handle"
        @mousedown=${this._handleMouseDown}
        @touchstart=${this._handleTouchStart}
      ></div>
      ${this._renderContent()}
    `;
  }

  private _handleMouseDown = (ev: MouseEvent) => {
    // Prevent the browser from interpreting this as a scroll/PTR gesture.
    ev.preventDefault();
    this._startDrag(ev.clientX);
  };

  private _handleTouchStart = (ev: TouchEvent) => {
    // Prevent the browser from interpreting this as a scroll/PTR gesture.
    ev.preventDefault();
    this._startDrag(ev.touches[0].clientX);
  };

  private _startDrag(clientX: number) {
    this._dragging = true;
    this._dragStartX = clientX;
    this._initialSize = (this.offsetWidth / window.innerWidth) * 100;
    document.body.style.setProperty("cursor", "grabbing");
  }

  private _handleMouseMove = (ev: MouseEvent) => {
    if (!this._dragging) {
      return;
    }
    this._updateSize(ev.clientX);
  };

  private _handleTouchMove = (ev: TouchEvent) => {
    if (!this._dragging) {
      return;
    }
    ev.preventDefault(); // Prevent scrolling
    this._updateSize(ev.touches[0].clientX);
  };

  private _updateSize(clientX: number) {
    const deltaX = this._dragStartX - clientX;
    const viewportWidth = window.innerWidth;
    const deltaVw = (deltaX / viewportWidth) * 100;

    // Calculate new size and clamp between 30vh and 70vh
    let newSize = this._initialSize + deltaVw;
    newSize = Math.max(30, Math.min(70, newSize));

    requestAnimationFrame(() => {
      fireEvent(this, "sidebar-width-changed", { width: newSize });
    });
  }

  private _handleMouseUp = () => {
    this._endDrag();
  };

  private _handleTouchEnd = () => {
    this._endDrag();
  };

  private _endDrag() {
    if (!this._dragging) {
      return;
    }
    this._dragging = false;
    document.body.style.removeProperty("cursor");
  }

  private _getType() {
    if (
      (this.config as TriggerSidebarConfig)?.config &&
      (isTrigger((this.config as TriggerSidebarConfig)?.config) ||
        isTriggerList((this.config as TriggerSidebarConfig)?.config))
    ) {
      return "trigger";
    }
    if (isCondition((this.config as ConditionSidebarConfig)?.config)) {
      return "condition";
    }
    if (
      (this.config as ScriptFieldSidebarConfig)?.config &&
      isScriptField((this.config as ScriptFieldSidebarConfig)?.config)
    ) {
      return (this.config as ScriptFieldSidebarConfig)?.config.selector
        ? "script-field-selector"
        : "script-field";
    }

    // option is always a building block and doesn't have a config
    if (this.config && !(this.config as any)?.config) {
      return "option";
    }

    if ((this.config as ActionSidebarConfig)?.config.action) {
      return "action";
    }

    return undefined;
  }

  public triggerCloseSidebar(ev?: CustomEvent) {
    ev?.stopPropagation();
    if (this.narrow) {
      this._bottomSheetElement?.closeSheet();
      return;
    }

    this._closeSidebar();
  }

  private _closeSidebar() {
    this.config?.close(true);
  }

  private _toggleYamlMode = () => {
    (this.config as ActionSidebarConfig)?.toggleYamlMode();
  };

  static styles = css`
    :host {
      z-index: 6;
      outline: none;
      height: 100%;
      --ha-card-border-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
      border-radius: var(--ha-card-border-radius);
      --ha-bottom-sheet-border-width: 2px;
      --ha-bottom-sheet-border-style: solid;
      --ha-bottom-sheet-border-color: var(--primary-color);
    }

    @media all and (max-width: 870px) {
      .sidebar-content {
        max-height: 100%;
      }
    }

    .handle {
      position: absolute;
      left: -4;
      height: 100%;
      width: 8px;
      z-index: 7;
      cursor: ew-resize;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar": HaAutomationSidebar;
  }

  interface HASSDomEvents {
    "toggle-yaml-mode": undefined;
    "yaml-changed": {
      value: unknown;
    };
    "sidebar-width-changed": {
      width: number;
    };
  }
}
