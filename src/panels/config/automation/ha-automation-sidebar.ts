import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
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
import type HaAutomationConditionEditor from "./condition/ha-automation-condition-editor";
import "./sidebar/ha-automation-sidebar-action";
import "./sidebar/ha-automation-sidebar-condition";
import "./sidebar/ha-automation-sidebar-option";
import "./sidebar/ha-automation-sidebar-script-field";
import "./sidebar/ha-automation-sidebar-script-field-selector";
import "./sidebar/ha-automation-sidebar-trigger";
import type HaAutomationTriggerEditor from "./trigger/ha-automation-trigger-editor";

@customElement("ha-automation-sidebar")
export default class HaAutomationSidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: SidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @state() private _yamlMode = false;

  @query(".sidebar-editor")
  public editor?: HaAutomationTriggerEditor | HaAutomationConditionEditor;

  protected render() {
    if (!this.config) {
      return nothing;
    }

    // get config type
    const type = this._getType();

    if (type === "trigger") {
      return html`
        <ha-automation-sidebar-trigger
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this._closeSidebar}
        ></ha-automation-sidebar-trigger>
      `;
    }
    if (type === "condition") {
      return html`
        <ha-automation-sidebar-condition
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this._closeSidebar}
        ></ha-automation-sidebar-condition>
      `;
    }
    if (type === "action") {
      return html`
        <ha-automation-sidebar-action
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this._closeSidebar}
        ></ha-automation-sidebar-action>
      `;
    }
    if (type === "option") {
      return html`
        <ha-automation-sidebar-option
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .disabled=${this.disabled}
          @close-sidebar=${this._closeSidebar}
        ></ha-automation-sidebar-option>
      `;
    }
    if (type === "script-field-selector") {
      return html`
        <ha-automation-sidebar-script-field-selector
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this._closeSidebar}
        ></ha-automation-sidebar-script-field-selector>
      `;
    }
    if (type === "script-field") {
      return html`
        <ha-automation-sidebar-script-field
          .hass=${this.hass}
          .config=${this.config}
          .isWide=${this.isWide}
          .disabled=${this.disabled}
          .yamlMode=${this._yamlMode}
          @toggle-yaml-mode=${this._toggleYamlMode}
          @close-sidebar=${this._closeSidebar}
        ></ha-automation-sidebar-script-field>
      `;
    }

    return nothing;
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

    if ((this.config as ActionSidebarConfig)?.config) {
      return "action";
    }

    return undefined;
  }

  private _closeSidebar(ev: CustomEvent) {
    ev.stopPropagation();
    this.config?.close();
  }

  private _toggleYamlMode = () => {
    this._yamlMode = this.config!.toggleYamlMode();
    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
        yamlMode: this._yamlMode,
      },
    });
  };

  static styles = css`
    :host {
      height: 100%;
      --ha-card-border-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
      border-radius: var(--ha-card-border-radius);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar": HaAutomationSidebar;
  }

  interface HASSDomEvents {
    "toggle-yaml-mode": undefined;
  }
}
