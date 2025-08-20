import {
  mdiDelete,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import { ACTION_BUILDING_BLOCKS } from "../../../../data/action";
import type { ActionSidebarConfig } from "../../../../data/automation";
import type { RepeatAction } from "../../../../data/script";
import type { HomeAssistant } from "../../../../types";
import type HaAutomationConditionEditor from "../action/ha-automation-action-editor";
import { getAutomationActionType } from "../action/ha-automation-action-row";
import { getRepeatType } from "../action/types/ha-automation-action-repeat";
import "../trigger/ha-automation-trigger-editor";
import "./ha-automation-sidebar-card";
import type { SidebarOverflowMenu } from "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-action")
export default class HaAutomationSidebarAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: ActionSidebarConfig;

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
    const disabled = this.disabled || this.config.config.enabled;

    const actionType = getAutomationActionType(this.config.config);

    const type =
      actionType !== "repeat"
        ? actionType
        : `repeat_${getRepeatType((this.config.config as RepeatAction).repeat)}`;

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

    const menuEntries: SidebarOverflowMenu = [
      {
        clickAction: this.config.rename,
        disabled: disabled,
        label: this.hass.localize(
          "ui.panel.config.automation.editor.triggers.rename"
        ),
        icon: mdiRenameBox,
      },
      {
        clickAction: this._toggleYamlMode,
        disabled: !this.config.uiSupported || !!this._warnings,
        label: this.hass.localize(
          `ui.panel.config.automation.editor.edit_${!this.yamlMode ? "yaml" : "ui"}`
        ),
        icon: mdiPlaylistEdit,
      },
      "separator",
      {
        clickAction: this.config.disable,
        disabled: disabled,
        label: this.hass.localize(
          `ui.panel.config.automation.editor.actions.${disabled ? "enable" : "disable"}`
        ),
        icon: this.disabled ? mdiPlayCircleOutline : mdiStopCircleOutline,
      },
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
      ${description ||
      html`<ha-automation-action-editor
        class="sidebar-editor"
        .hass=${this.hass}
        .action=${this.config.config}
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
          config: ev.detail.value,
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
    "ha-automation-sidebar-action": HaAutomationSidebarAction;
  }
}
