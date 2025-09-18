import {
  mdiAppleKeyboardCommand,
  mdiContentCopy,
  mdiContentCut,
  mdiDelete,
  mdiIdentifier,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import type { TriggerSidebarConfig } from "../../../../data/automation";
import { isTriggerList } from "../../../../data/trigger";
import type { HomeAssistant } from "../../../../types";
import { isMac } from "../../../../util/is_mac";
import { overflowStyles, sidebarEditorStyles } from "../styles";
import "../trigger/ha-automation-trigger-editor";
import type HaAutomationTriggerEditor from "../trigger/ha-automation-trigger-editor";
import "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-trigger")
export default class HaAutomationSidebarTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: TriggerSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "sidebar-key" }) public sidebarKey?: string;

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

    return html`
      <ha-automation-sidebar-card
        .hass=${this.hass}
        .isWide=${this.isWide}
        .yamlMode=${this.yamlMode}
        .warnings=${this._warnings}
        .narrow=${this.narrow}
      >
        <span slot="title">${title}</span>
        <span slot="subtitle">${subtitle}</span>
        <ha-md-menu-item
          slot="menu-items"
          .clickAction=${this.config.rename}
          .disabled=${disabled || type === "list"}
        >
          <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.rename"
            )}
            <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
          </div>
        </ha-md-menu-item>
        ${!this.yamlMode &&
        !("id" in this.config.config) &&
        !this._requestShowId
          ? html`<ha-md-menu-item
              slot="menu-items"
              .clickAction=${this._showTriggerId}
              .disabled=${disabled || type === "list"}
            >
              <ha-svg-icon slot="start" .path=${mdiIdentifier}></ha-svg-icon>
              <div class="overflow-label">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.triggers.edit_id"
                )}
                <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
              </div>
            </ha-md-menu-item>`
          : nothing}

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
            "ui.panel.config.automation.editor.triggers.duplicate"
          )}
          <ha-svg-icon
            slot="start"
            .path=${mdiPlusCircleMultipleOutline}
          ></ha-svg-icon>
        </ha-md-menu-item>

        <ha-md-menu-item slot="menu-items" .clickAction=${this.config.copy}>
          <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.copy"
            )}
            ${!this.narrow
              ? html`<span class="shortcut">
                  <span
                    >${isMac
                      ? html`<ha-svg-icon
                          slot="start"
                          .path=${mdiAppleKeyboardCommand}
                        ></ha-svg-icon>`
                      : this.hass.localize(
                          "ui.panel.config.automation.editor.ctrl"
                        )}</span
                  >
                  <span>+</span>
                  <span>C</span>
                </span>`
              : nothing}
          </div>
        </ha-md-menu-item>

        <ha-md-menu-item
          slot="menu-items"
          .clickAction=${this.config.cut}
          .disabled=${this.disabled}
        >
          <ha-svg-icon slot="start" .path=${mdiContentCut}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.cut"
            )}
            ${!this.narrow
              ? html`<span class="shortcut">
                  <span
                    >${isMac
                      ? html`<ha-svg-icon
                          slot="start"
                          .path=${mdiAppleKeyboardCommand}
                        ></ha-svg-icon>`
                      : this.hass.localize(
                          "ui.panel.config.automation.editor.ctrl"
                        )}</span
                  >
                  <span>+</span>
                  <span>X</span>
                </span>`
              : nothing}
          </div>
        </ha-md-menu-item>
        <ha-md-menu-item
          slot="menu-items"
          .clickAction=${this._toggleYamlMode}
          .disabled=${!this.config.uiSupported || !!this._warnings}
        >
          <ha-svg-icon slot="start" .path=${mdiPlaylistEdit}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              `ui.panel.config.automation.editor.edit_${!this.yamlMode ? "yaml" : "ui"}`
            )}
            <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
          </div>
        </ha-md-menu-item>
        <ha-md-divider
          slot="menu-items"
          role="separator"
          tabindex="-1"
        ></ha-md-divider>
        <ha-md-menu-item
          slot="menu-items"
          .clickAction=${this.config.disable}
          .disabled=${type === "list"}
        >
          <ha-svg-icon
            slot="start"
            .path=${this.disabled ? mdiPlayCircleOutline : mdiStopCircleOutline}
          ></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              `ui.panel.config.automation.editor.actions.${disabled ? "enable" : "disable"}`
            )}
            <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
          </div>
        </ha-md-menu-item>
        <ha-md-menu-item
          slot="menu-items"
          .clickAction=${this.config.delete}
          .disabled=${this.disabled}
          class="warning"
        >
          <ha-svg-icon slot="start" .path=${mdiDelete}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.actions.delete"
            )}
            ${!this.narrow
              ? html`<span class="shortcut">
                  <span
                    >${isMac
                      ? html`<ha-svg-icon
                          slot="start"
                          .path=${mdiAppleKeyboardCommand}
                        ></ha-svg-icon>`
                      : this.hass.localize(
                          "ui.panel.config.automation.editor.ctrl"
                        )}</span
                  >
                  <span>+</span>
                  <span
                    >${this.hass.localize(
                      "ui.panel.config.automation.editor.del"
                    )}</span
                  >
                </span>`
              : nothing}
          </div>
        </ha-md-menu-item>
        ${keyed(
          this.sidebarKey,
          html`<ha-automation-trigger-editor
            class="sidebar-editor"
            .hass=${this.hass}
            .trigger=${this.config.config}
            @value-changed=${this._valueChangedSidebar}
            @yaml-changed=${this._yamlChangedSidebar}
            .uiSupported=${this.config.uiSupported}
            .showId=${this._requestShowId}
            .yamlMode=${this.yamlMode}
            .disabled=${this.disabled}
            @ui-mode-not-available=${this._handleUiModeNotAvailable}
            sidebar
          ></ha-automation-trigger-editor>`
        )}
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

  private _yamlChangedSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    this.config?.save?.(ev.detail.value);
  }

  private _toggleYamlMode = () => {
    fireEvent(this, "toggle-yaml-mode");
  };

  private _showTriggerId = () => {
    this._requestShowId = true;
  };

  static styles = [sidebarEditorStyles, overflowStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-trigger": HaAutomationSidebarTrigger;
  }
}
