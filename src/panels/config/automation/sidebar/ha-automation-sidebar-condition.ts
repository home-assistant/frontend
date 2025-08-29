import {
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiFlask,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import type { ConditionSidebarConfig } from "../../../../data/automation";
import { CONDITION_BUILDING_BLOCKS } from "../../../../data/condition";
import type { HomeAssistant } from "../../../../types";
import "../condition/ha-automation-condition-editor";
import type HaAutomationConditionEditor from "../condition/ha-automation-condition-editor";
import { sidebarEditorStyles } from "../styles";
import "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-condition")
export default class HaAutomationSidebarCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: ConditionSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ type: Boolean }) public narrow = false;

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
    const disabled =
      this.disabled ||
      ("enabled" in this.config.config && this.config.config.enabled === false);

    const type = this.config.config.condition;

    const isBuildingBlock = CONDITION_BUILDING_BLOCKS.includes(type);

    const subtitle = this.hass.localize(
      "ui.panel.config.automation.editor.conditions.condition"
    );

    const title =
      this.hass.localize(
        `ui.panel.config.automation.editor.conditions.type.${type}.label`
      ) || type;

    const description = isBuildingBlock
      ? this.hass.localize(
          `ui.panel.config.automation.editor.conditions.type.${type}.description.picker`
        )
      : "";

    return html`<ha-automation-sidebar-card
      .hass=${this.hass}
      .isWide=${this.isWide}
      .yamlMode=${this.yamlMode}
      .warnings=${this._warnings}
      .narrow=${this.narrow}
    >
      <span slot="title">${title}</span>
      <span slot="subtitle">${subtitle}</span>
      <ha-md-menu-item slot="menu-items" .clickAction=${this.config.test}>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.test"
        )}
        <ha-svg-icon slot="start" .path=${mdiFlask}></ha-svg-icon>
      </ha-md-menu-item>
      <ha-md-menu-item
        slot="menu-items"
        .clickAction=${this.config.rename}
        .disabled=${!!disabled}
      >
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.rename"
        )}
        <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
      </ha-md-menu-item>

      <ha-md-divider
        slot="menu-items"
        role="separator"
        tabindex="-1"
      ></ha-md-divider>

      <ha-md-menu-item
        slot="menu-items"
        .clickAction=${this.config.duplicate}
        .disabled=${this.disabled}
      >
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.duplicate"
        )}
        <ha-svg-icon slot="start" .path=${mdiContentDuplicate}></ha-svg-icon>
      </ha-md-menu-item>

      <ha-md-menu-item
        slot="menu-items"
        .clickAction=${this.config.copy}
        .disabled=${this.disabled}
      >
        ${this.hass.localize("ui.panel.config.automation.editor.triggers.copy")}
        <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
      </ha-md-menu-item>

      <ha-md-menu-item
        slot="menu-items"
        .clickAction=${this.config.cut}
        .disabled=${this.disabled}
      >
        ${this.hass.localize("ui.panel.config.automation.editor.triggers.cut")}
        <ha-svg-icon slot="start" .path=${mdiContentCut}></ha-svg-icon>
      </ha-md-menu-item>
      <ha-md-menu-item
        slot="menu-items"
        .clickAction=${this._toggleYamlMode}
        .disabled=${!this.config.uiSupported || !!this._warnings}
      >
        ${this.hass.localize(
          `ui.panel.config.automation.editor.edit_${!this.yamlMode ? "yaml" : "ui"}`
        )}
        <ha-svg-icon slot="start" .path=${mdiPlaylistEdit}></ha-svg-icon>
      </ha-md-menu-item>
      <ha-md-divider
        slot="menu-items"
        role="separator"
        tabindex="-1"
      ></ha-md-divider>
      <ha-md-menu-item slot="menu-items" .clickAction=${this.config.disable}>
        ${this.hass.localize(
          `ui.panel.config.automation.editor.actions.${disabled ? "enable" : "disable"}`
        )}
        <ha-svg-icon
          slot="start"
          .path=${this.disabled ? mdiPlayCircleOutline : mdiStopCircleOutline}
        ></ha-svg-icon>
      </ha-md-menu-item>
      <ha-md-menu-item
        slot="menu-items"
        .clickAction=${this.config.delete}
        .disabled=${this.disabled}
        class="warning"
      >
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.delete"
        )}
        <ha-svg-icon slot="start" .path=${mdiDelete}></ha-svg-icon>
      </ha-md-menu-item>
      ${description && !this.yamlMode
        ? html`<div class="description">${description}</div>`
        : html`<ha-automation-condition-editor
            class="sidebar-editor"
            .hass=${this.hass}
            .condition=${this.config.config}
            .yamlMode=${this.yamlMode}
            .uiSupported=${this.config.uiSupported}
            @value-changed=${this._valueChangedSidebar}
            @yaml-changed=${this._yamlChangedSidebar}
            .disabled=${this.disabled}
            @ui-mode-not-available=${this._handleUiModeNotAvailable}
            sidebar
          ></ha-automation-condition-editor> `}
    </ha-automation-sidebar-card>`;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this.yamlMode) {
      this.yamlMode = true;
    }
  }

  private _valueChangedSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    this.config?.save?.(ev.detail.value);

    if (this.config) {
      fireEvent(this, "value-changed", {
        value: {
          ...this.config,
          config: ev.detail.value,
        },
      });
    }
  }

  private _yamlChangedSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    this.config?.save?.(ev.detail.value);
  }

  private _toggleYamlMode = () => {
    fireEvent(this, "toggle-yaml-mode");
  };

  static styles = sidebarEditorStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-condition": HaAutomationSidebarCondition;
  }
}
