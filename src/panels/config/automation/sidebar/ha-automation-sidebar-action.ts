import {
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-md-menu-item";
import { ACTION_BUILDING_BLOCKS } from "../../../../data/action";
import type { ActionSidebarConfig } from "../../../../data/automation";
import type { RepeatAction } from "../../../../data/script";
import type { HomeAssistant } from "../../../../types";
import type HaAutomationConditionEditor from "../action/ha-automation-action-editor";
import { getAutomationActionType } from "../action/ha-automation-action-row";
import { getRepeatType } from "../action/types/ha-automation-action-repeat";
import { sidebarEditorStyles } from "../styles";
import "../trigger/ha-automation-trigger-editor";
import "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-action")
export default class HaAutomationSidebarAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: ActionSidebarConfig;

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
          this.editor?.yamlEditor?.setValue(this.config.config.action);
        }
      }
    }
  }

  protected render() {
    const actionConfig = this.config.config.action;

    const disabled =
      this.disabled ||
      ("enabled" in actionConfig && actionConfig.enabled === false);

    const actionType = getAutomationActionType(actionConfig);

    const type =
      actionType !== "repeat"
        ? actionType
        : `repeat_${getRepeatType((actionConfig as RepeatAction).repeat)}`;

    const isBuildingBlock = ACTION_BUILDING_BLOCKS.includes(type || "");

    const subtitle = this.hass.localize(
      "ui.panel.config.automation.editor.actions.action"
    );

    const title =
      this.hass.localize(
        `ui.panel.config.automation.editor.actions.type.${type}.label` as LocalizeKeys
      ) || type;

    const description = isBuildingBlock
      ? this.hass.localize(
          `ui.panel.config.automation.editor.actions.type.${type}.description.picker` as LocalizeKeys
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

      <ha-md-menu-item slot="menu-items" .clickAction=${this.config.run}>
        ${this.hass.localize("ui.panel.config.automation.editor.actions.run")}
        <ha-svg-icon slot="start" .path=${mdiPlay}></ha-svg-icon>
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
        : html`<ha-automation-action-editor
            class="sidebar-editor"
            .hass=${this.hass}
            .action=${actionConfig}
            .yamlMode=${this.yamlMode}
            .uiSupported=${this.config.uiSupported}
            @value-changed=${this._valueChangedSidebar}
            sidebar
            narrow
            .disabled=${this.disabled}
            @ui-mode-not-available=${this._handleUiModeNotAvailable}
          ></ha-automation-action-editor>`}
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
          config: {
            action: ev.detail.value,
          },
        },
      });
    }
  }

  private _toggleYamlMode = () => {
    fireEvent(this, "toggle-yaml-mode");
  };

  static styles = sidebarEditorStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-action": HaAutomationSidebarAction;
  }
}
