import { mdiDelete, mdiPlaylistEdit } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import type { ScriptFieldSidebarConfig } from "../../../../data/automation";
import type { HomeAssistant } from "../../../../types";
import "../../script/ha-script-field-selector-editor";
import type HaAutomationConditionEditor from "../action/ha-automation-action-editor";
import "./ha-automation-sidebar-card";
import type { SidebarOverflowMenu } from "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-script-field-selector")
export default class HaAutomationSidebarScriptFieldSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: ScriptFieldSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @state() private _warnings?: string[];

  @query(".sidebar-editor")
  public editor?: HaAutomationConditionEditor;

  protected willUpdate(changedProperties) {
    if (changedProperties.has("config")) {
      this._warnings = undefined;
      if (this.config) {
        this.yamlMode = this.config.yamlMode;
        if (this.yamlMode) {
          this.editor?.yamlEditor?.setValue(this.config.config);
        }
      }
    }
  }

  protected render() {
    const subtitle = this.hass.localize(
      "ui.panel.config.script.editor.field.field_selector"
    );

    const title =
      this.hass.localize(
        `ui.components.selectors.selector.types.${Object.keys(this.config.config.field.selector)[0]}` as LocalizeKeys
      ) || Object.keys(this.config.config.field.selector)[0];

    const menuEntries: SidebarOverflowMenu = [
      {
        clickAction: this._toggleYamlMode,
        disabled: !!this._warnings,
        label: this.hass.localize(
          `ui.panel.config.automation.editor.edit_${!this.yamlMode ? "yaml" : "ui"}`
        ),
        icon: mdiPlaylistEdit,
      },
      "separator",
      {
        clickAction: this.config.delete,
        danger: true,
        disabled: this.disabled,
        label: this.hass.localize(
          "ui.panel.config.automation.editor.actions.delete"
        ),
        icon: mdiDelete,
      },
    ];

    return html`<ha-automation-sidebar-card
      .hass=${this.hass}
      .isWide=${this.isWide}
      .yamlMode=${this.yamlMode}
      .warnings=${this._warnings}
      .menuEntries=${menuEntries}
    >
      <span slot="title">${title}</span>
      <span slot="subtitle">${subtitle}</span>
      <ha-script-field-selector-editor
        class="sidebar-editor"
        .hass=${this.hass}
        .field=${this.config.config.field}
        .disabled=${this.disabled}
        @value-changed=${this._valueChangedSidebar}
        .yamlMode=${this.yamlMode}
      ></ha-script-field-selector-editor>
    </ha-automation-sidebar-card>`;
  }

  private _valueChangedSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    this.config?.save?.({
      ...this.config.config.field,
      key: this.config.config.key,
      ...ev.detail.value,
    });

    if (this.config) {
      fireEvent(this, "value-changed", {
        value: {
          ...this.config,
          config: {
            field: ev.detail.value,
            key: this.config.config.key,
            excludeKeys: this.config.config.excludeKeys,
            selector: true,
          },
        },
      });
    }
  }

  private _toggleYamlMode = () => {
    fireEvent(this, "toggle-yaml-mode");
  };

  static styles = css`
    .sidebar-editor {
      padding-top: 64px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-script-field-selector": HaAutomationSidebarScriptFieldSelector;
  }
}
