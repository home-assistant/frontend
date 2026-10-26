import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiCommentEditOutline,
  mdiDelete,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRenameBox,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";

import { fireEvent } from "../../../../common/dom/fire_event";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { OptionSidebarConfig } from "../../../../data/automation";
import { getRowNote } from "../../../../data/automation";
import type { HomeAssistant } from "../../../../types";
import { isMac } from "../../../../util/is_mac";
import "../ha-automation-note";
import { overflowStyles, sidebarEditorStyles } from "../styles";
import { getUiSupportWarnings, isConfigObject } from "../ui-support";
import "./ha-automation-sidebar-card";
import { renderCtrlOrCmd } from "../../../../common/keyboard/ctrl-or-cmd";

@customElement("ha-automation-sidebar-option")
export default class HaAutomationSidebarOption extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: OptionSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ type: Number, attribute: "sidebar-key" })
  public sidebarKey?: number;

  @state() private _warnings?: string[];

  @query(".sidebar-editor")
  public editor?: HaYamlEditor;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has("config")) {
      return;
    }
    this._warnings = undefined;
    this.yamlMode = !!this.config.yamlMode;
    if (this.yamlMode && this.config.config.option) {
      this.editor?.setValue(this.config.config.option);
      this._warnings = this._checkUiSupport(this.config.config.option);
    }
  }

  protected render() {
    const disabled = this.disabled;

    const note = getRowNote(this.config.note);

    const subtitle = this.hass.localize(
      "ui.panel.config.automation.editor.actions.type.choose.label"
    );

    const title = this.hass.localize(
      `ui.panel.config.automation.editor.actions.type.choose.${this.config.defaultOption ? "default_" : ""}option_label`
    );

    const description = this.hass.localize(
      `ui.panel.config.automation.editor.actions.type.choose.${this.config.defaultOption ? "default_" : ""}option_description`
    );

    return html`<ha-automation-sidebar-card
      .hass=${this.hass}
      .isWide=${this.isWide}
      .narrow=${this.narrow}
      .warnings=${this._warnings}
      @wa-select=${this._handleDropdownSelect}
    >
      <span slot="title">${title}</span>
      <span slot="subtitle">${subtitle}</span>
      ${
        this.config.defaultOption
          ? html`<span slot="overflow-menu"></span>`
          : html`
              <ha-dropdown-item
                slot="menu-items"
                value="rename"
                .disabled=${!!disabled}
              >
                <ha-svg-icon slot="icon" .path=${mdiRenameBox}></ha-svg-icon>
                <div class="overflow-label">
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.rename"
                  )}
                  <span
                    class="shortcut-placeholder ${isMac ? "mac" : ""}"
                  ></span>
                </div>
              </ha-dropdown-item>
              <ha-dropdown-item
                slot="menu-items"
                value="edit_note"
                .disabled=${!!disabled}
              >
                <ha-svg-icon
                  slot="icon"
                  .path=${mdiCommentEditOutline}
                ></ha-svg-icon>
                <div class="overflow-label">
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.note.${this.config.note ? "edit" : "add"}`
                  )}
                  <span
                    class="shortcut-placeholder ${isMac ? "mac" : ""}"
                  ></span>
                </div>
              </ha-dropdown-item>

              <ha-dropdown-item
                slot="menu-items"
                value="duplicate"
                .disabled=${this.disabled}
              >
                <ha-svg-icon
                  slot="icon"
                  .path=${mdiPlusCircleMultipleOutline}
                ></ha-svg-icon>
                <div class="overflow-label">
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.duplicate"
                  )}
                  <span
                    class="shortcut-placeholder ${isMac ? "mac" : ""}"
                  ></span>
                </div>
              </ha-dropdown-item>
              <ha-dropdown-item
                slot="menu-items"
                value="toggle_yaml_mode"
                .disabled=${!!this._warnings}
              >
                <ha-svg-icon slot="icon" .path=${mdiPlaylistEdit}></ha-svg-icon>
                <div class="overflow-label">
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.edit_${!this.yamlMode ? "yaml" : "ui"}`
                  )}
                  <span
                    class="shortcut-placeholder ${isMac ? "mac" : ""}"
                  ></span>
                </div>
              </ha-dropdown-item>
              <wa-divider slot="menu-items"></wa-divider>
              <ha-dropdown-item
                slot="menu-items"
                value="delete"
                .disabled=${this.disabled}
                variant="danger"
              >
                <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
                <div class="overflow-label">
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type.choose.remove_option"
                  )}
                  ${
                    !this.narrow
                      ? html`<span class="shortcut">
                          <span>${renderCtrlOrCmd(this.hass.localize)}</span>
                          <span>+</span>
                          <span
                            >${this.hass.localize(
                              "ui.panel.config.automation.editor.del"
                            )}</span
                          >
                        </span>`
                      : nothing
                  }
                </div>
              </ha-dropdown-item>
            `
      }
      ${
        this.yamlMode && this.config.config.option
          ? keyed(
              this.sidebarKey,
              html`<ha-yaml-editor
                class="sidebar-editor"
                .defaultValue=${this.config.config.option}
                .readOnly=${this.disabled}
                @value-changed=${this._yamlChanged}
              ></ha-yaml-editor>`
            )
          : html`<div class="description">${description}</div>`
      }
      ${
        !this.config.defaultOption && note && !this.yamlMode
          ? html`<ha-automation-note
              @edit-note=${this.config.editNote}
              .note=${note}
            ></ha-automation-note>`
          : nothing
      }
    </ha-automation-sidebar-card>`;
  }

  private _yamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    this.config.save(ev.detail.value);
    this._warnings = this._checkUiSupport(ev.detail.value);
  }

  private _checkUiSupport(option: unknown): string[] | undefined {
    if (!isConfigObject(option)) {
      return undefined;
    }
    return getUiSupportWarnings(
      this.hass.localize,
      "ha-automation-option-row",
      option
    );
  }

  private _handleDropdownSelect(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item?.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "rename":
        this.config.rename();
        break;
      case "edit_note":
        this.config.editNote();
        break;
      case "duplicate":
        this.config.duplicate();
        break;
      case "toggle_yaml_mode":
        fireEvent(this, "toggle-yaml-mode", { yamlMode: !this.yamlMode });
        break;
      case "delete":
        this.config.delete();
        break;
    }
  }

  static styles = [sidebarEditorStyles, overflowStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-option": HaAutomationSidebarOption;
  }
}
