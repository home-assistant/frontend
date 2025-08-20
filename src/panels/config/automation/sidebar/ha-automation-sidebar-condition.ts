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
import type { ConditionSidebarConfig } from "../../../../data/automation";
import { CONDITION_BUILDING_BLOCKS } from "../../../../data/condition";
import type { HomeAssistant } from "../../../../types";
import "../condition/ha-automation-condition-editor";
import type HaAutomationConditionEditor from "../condition/ha-automation-condition-editor";
import "./ha-automation-sidebar-card";
import type { SidebarOverflowMenu } from "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-condition")
export default class HaAutomationSidebarCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: ConditionSidebarConfig;

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
      html`<ha-automation-condition-editor
        class="sidebar-editor"
        .hass=${this.hass}
        .condition=${this.config.config}
        .yamlMode=${this.yamlMode}
        .uiSupported=${this.config.uiSupported}
        @value-changed=${this._valueChangedSidebar}
        .disabled=${this.disabled}
        @ui-mode-not-available=${this._handleUiModeNotAvailable}
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
    "ha-automation-sidebar-condition": HaAutomationSidebarCondition;
  }
}
