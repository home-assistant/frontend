import {
  mdiDelete,
  mdiIdentifier,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import type { TriggerSidebarConfig } from "../../../../data/automation";
import { isTriggerList } from "../../../../data/trigger";
import type { HomeAssistant } from "../../../../types";
import "../trigger/ha-automation-trigger-editor";
import type HaAutomationTriggerEditor from "../trigger/ha-automation-trigger-editor";
import "./ha-automation-sidebar-card";
import type { SidebarOverflowMenu } from "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-trigger")
export default class HaAutomationSidebarTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: TriggerSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @state() private _requestShowId = false;

  @state() private _warnings?: string[];

  @query(".sidebar-editor")
  public editor?: HaAutomationTriggerEditor;

  protected willUpdate(changedProperties) {
    if (changedProperties.has("config")) {
      this._requestShowId = false;
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
    const type = isTriggerList(this.config.config)
      ? "list"
      : this.config.config.trigger;

    const subtitle = this.hass.localize(
      "ui.panel.config.automation.editor.triggers.trigger"
    );

    const title = this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.${type}.label`
    );

    const menuEntries: SidebarOverflowMenu = [
      {
        clickAction: this.config.rename,
        disabled: disabled || type === "list",
        label: this.hass.localize(
          "ui.panel.config.automation.editor.triggers.rename"
        ),
        icon: mdiRenameBox,
      },
    ];

    if (
      !this.yamlMode &&
      !("id" in this.config.config) &&
      !this._requestShowId
    ) {
      menuEntries.push({
        clickAction: this._showTriggerId,
        disabled: disabled || type === "list",
        label: this.hass.localize(
          "ui.panel.config.automation.editor.triggers.edit_id"
        ),
        icon: mdiIdentifier,
      });
    }

    menuEntries.push({
      clickAction: this._toggleYamlMode,
      disabled: !this.config.uiSupported || !!this._warnings,
      label: this.hass.localize(
        `ui.panel.config.automation.editor.edit_${!this.yamlMode ? "yaml" : "ui"}`
      ),
      icon: mdiPlaylistEdit,
    });
    menuEntries.push("separator");
    menuEntries.push({
      clickAction: this.config.disable,
      disabled: disabled || type === "list",
      label: this.hass.localize(
        `ui.panel.config.automation.editor.actions.${disabled ? "enable" : "disable"}`
      ),
      icon: this.disabled ? mdiPlayCircleOutline : mdiStopCircleOutline,
    });
    menuEntries.push({
      clickAction: this.config.delete,
      danger: true,
      disabled: this.disabled,
      label: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete"
      ),
      icon: mdiDelete,
    });

    return html`
      <ha-automation-sidebar-card
        .hass=${this.hass}
        .isWide=${this.isWide}
        .yamlMode=${this.yamlMode}
        .warnings=${this._warnings}
        .menuEntries=${menuEntries}
      >
        <span slot="title">${title}</span>
        <span slot="subtitle">${subtitle}</span>
        <ha-automation-trigger-editor
          class="sidebar-editor"
          .hass=${this.hass}
          .trigger=${this.config.config}
          @value-changed=${this._valueChangedSidebar}
          .uiSupported=${this.config.uiSupported}
          .showId=${this._requestShowId}
          .yamlMode=${this.yamlMode}
          .disabled=${this.disabled}
          @ui-mode-not-available=${this._handleUiModeNotAvailable}
        ></ha-automation-trigger-editor>
      </ha-automation-sidebar-card>
    `;
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

  private _showTriggerId = () => {
    this._requestShowId = true;
  };

  static styles = css`
    .sidebar-editor {
      padding-top: 64px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-trigger": HaAutomationSidebarTrigger;
  }
}
