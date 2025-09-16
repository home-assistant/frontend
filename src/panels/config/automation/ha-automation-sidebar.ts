import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
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

    return this._renderContent();
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
  }
}
