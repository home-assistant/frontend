import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiAppleKeyboardCommand,
  mdiDelete,
  mdiPlusCircleMultipleOutline,
  mdiRenameBox,
} from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";

import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-svg-icon";
import type { OptionSidebarConfig } from "../../../../data/automation";
import type { HomeAssistant } from "../../../../types";
import { isMac } from "../../../../util/is_mac";
import type HaAutomationConditionEditor from "../action/ha-automation-action-editor";
import { overflowStyles, sidebarEditorStyles } from "../styles";
import "./ha-automation-sidebar-card";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";

@customElement("ha-automation-sidebar-option")
export default class HaAutomationSidebarOption extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: OptionSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @query(".sidebar-editor")
  public editor?: HaAutomationConditionEditor;

  protected render() {
    const disabled = this.disabled;

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
      @wa-select=${this._handleDropdownSelect}
    >
      <span slot="title">${title}</span>
      <span slot="subtitle">${subtitle}</span>
      ${this.config.defaultOption
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
                <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
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
                <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
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
            </ha-dropdown-item>
          `}

      <div class="description">${description}</div>
    </ha-automation-sidebar-card>`;
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
      case "duplicate":
        this.config.duplicate();
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
