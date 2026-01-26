import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiAppleKeyboardCommand,
  mdiChevronRight,
  mdiDelete,
  mdiIdentifier,
  mdiPlaylistEdit,
  mdiRenameBox,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import { join } from "lit/directives/join";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import { isMac } from "../../../../util/is_mac";
import { overflowStyles, sidebarEditorStyles } from "../styles";
import type { BlueprintInputSection } from "../../../../data/blueprint";
import { isInputSection } from "../../../../data/blueprint";
import type { HaDropdownItem } from "../../../../components/ha-dropdown-item";
import type { BlueprintInputSidebarConfig } from "../../../../data/automation";
import type { HomeAssistant } from "../../../../types";
import type HaBlueprintInputEditor from "../../../developer-tools/blueprints/input/ha-blueprint-input-editor";
import "../trigger/ha-automation-trigger-editor";
import "./ha-automation-sidebar-card";
import "../../../../components/ha-dropdown-item";
import "../../../developer-tools/blueprints/input/ha-blueprint-input-editor";

@customElement("ha-automation-sidebar-blueprint-input")
export default class HaAutomationSidebarBlueprintInput extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: BlueprintInputSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Number, attribute: "sidebar-key" })
  public sidebarKey?: number;

  @state() private _requestShowId = false;

  @state() private _warnings?: string[];

  @state() private _path?: string[];

  @query(".sidebar-editor")
  public editor?: HaBlueprintInputEditor;

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

      if (changedProperties.get("config")?.id !== this.config?.id) {
        this._path = [];
      }
    }
  }

  private _getTitle() {
    const input = this.config.config;
    const isSection = isInputSection(input);
    if (isSection) {
      return this.hass.localize(
        `ui.panel.developer-tools.tabs.blueprints.editor.inputs.editor.section`
      );
    }

    const selector = input.selector ?? { text: {} };
    const selectorType = Object.keys(selector)[0] as keyof typeof selector;
    return this.hass.localize(
      `ui.components.selectors.selector.types.${selectorType}`
    );
  }

  private _getSubtitle() {
    const isSection = isInputSection(this.config.config);
    return this.hass.localize(
      `ui.panel.developer-tools.tabs.blueprints.editor.inputs.editor.${isSection ? "section" : "single"}`
    );
  }

  private _openInputGroup = (i: number) => () => {
    if (!this._path) {
      return;
    }

    this._path = this._path.slice(0, i);
  };

  private _openInputGroupPath(ev: CustomEvent<string[]>) {
    this._path = ev.detail;
  }

  protected render() {
    const config = this._path
      ? this._path.reduce(
          (acc, x) => (acc as BlueprintInputSection).input[x]!,
          this.config.config
        )
      : this.config.config;

    return html`
      <ha-automation-sidebar-card
        .hass=${this.hass}
        .isWide=${this.isWide}
        .yamlMode=${this.yamlMode}
        .warnings=${this._warnings}
        .narrow=${this.narrow}
        @wa-select=${this._handleDropdownSelect}
      >
        <span slot="title">${this._getTitle()}</span>
        <span slot="subtitle">${this._getSubtitle()}</span>
        <ha-dropdown-item slot="menu-items" value="rename">
          <ha-svg-icon slot="icon" .path=${mdiRenameBox}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.rename"
            )}
            <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
          </div>
        </ha-dropdown-item>

        ${!this.yamlMode &&
        !("id" in this.config.config) &&
        !this._requestShowId
          ? html`<ha-dropdown-item slot="menu-items" value="show_id">
              <ha-svg-icon slot="icon" .path=${mdiIdentifier}></ha-svg-icon>
              <div class="overflow-label">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.triggers.edit_id"
                )}
                <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
              </div>
            </ha-dropdown-item>`
          : nothing}

        <wa-divider slot="menu-items"></wa-divider>
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
            <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
          </div>
        </ha-dropdown-item>
        <wa-divider slot="menu-items"></wa-divider>
        <ha-dropdown-item slot="menu-items" value="delete" variant="danger">
          <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.actions.delete"
            )}
            ${!this.narrow
              ? html`<span class="shortcut">
                  <span
                    >${isMac
                      ? html`<ha-svg-icon
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

        <div class="breadcrumbs">
          ${this._path && this._path.length > 0
            ? join(
                [this.config.id, ...this._path].map(
                  (pathPart, i) => html`
                    <ha-button
                      appearance="plain"
                      @click=${this._openInputGroup(i)}
                      >${pathPart}</ha-button
                    >
                  `
                ),
                html`<ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>`
              )
            : nothing}
        </div>

        ${keyed(
          this.sidebarKey,
          html`<ha-blueprint-input-editor
            class="sidebar-editor"
            .hass=${this.hass}
            .narrow=${this.narrow}
            .input=${config}
            .path=${this._path}
            .yamlMode=${this.yamlMode}
            @open-input-group-path=${this._openInputGroupPath}
            @value-changed=${this._valueChangedSidebar}
            @yaml-changed=${this._yamlChangedSidebar}
            @ui-mode-not-available=${this._handleUiModeNotAvailable}
          ></ha-blueprint-input-editor>`
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

  private _handleDropdownSelect(ev: CustomEvent<{ item: HaDropdownItem }>) {
    const action = ev.detail?.item?.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "rename":
        this.config.rename();
        break;
      case "show_id":
        this._showTriggerId();
        break;
      case "toggle_yaml_mode":
        this._toggleYamlMode();
        break;
      case "delete":
        this.config.delete();
        break;
    }
  }

  static styles = [
    sidebarEditorStyles,
    overflowStyles,
    css`
      .breadcrumbs {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        overflow-x: auto;
      }

      .breadcrumbs > ha-button,
      .breadcrumbs > ha-svg-icon {
        flex-shrink: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-blueprint-input": HaAutomationSidebarBlueprintInput;
  }

  interface HASSDomEvents {
    "open-input-group-path": string[];
  }
}
