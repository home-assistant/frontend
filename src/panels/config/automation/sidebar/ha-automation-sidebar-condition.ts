import {
  mdiAppleKeyboardCommand,
  mdiContentCopy,
  mdiContentCut,
  mdiDelete,
  mdiFlask,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { keyed } from "lit/directives/keyed";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import {
  testCondition,
  type ConditionSidebarConfig,
} from "../../../../data/automation";
import { CONDITION_BUILDING_BLOCKS } from "../../../../data/condition";
import { validateConfig } from "../../../../data/config";
import type { HomeAssistant } from "../../../../types";
import { isMac } from "../../../../util/is_mac";
import { showAlertDialog } from "../../../lovelace/custom-card-helpers";
import "../condition/ha-automation-condition-editor";
import type HaAutomationConditionEditor from "../condition/ha-automation-condition-editor";
import { overflowStyles, sidebarEditorStyles } from "../styles";
import "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-condition")
export default class HaAutomationSidebarCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: ConditionSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "sidebar-key" }) public sidebarKey?: string;

  @state() private _warnings?: string[];

  @state() private _testing = false;

  @state() private _testingResult?: boolean;

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
    // Reset testing state when condition changes
    if (changedProperties.has("sidebarKey")) {
      this._testing = false;
    }
  }

  protected render() {
    const rowDisabled =
      "enabled" in this.config.config && this.config.config.enabled === false;

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
      <span slot="subtitle"
        >${subtitle}${rowDisabled
          ? ` (${this.hass.localize("ui.panel.config.automation.editor.actions.disabled")})`
          : ""}</span
      >
      <ha-md-menu-item slot="menu-items" .clickAction=${this._testCondition}>
        <ha-svg-icon slot="start" .path=${mdiFlask}></ha-svg-icon>
        <div class="overflow-label">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.test"
          )}
          <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
        </div>
      </ha-md-menu-item>
      <ha-md-menu-item
        slot="menu-items"
        .clickAction=${this.config.rename}
        .disabled=${this.disabled}
      >
        <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
        <div class="overflow-label">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.rename"
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
        .clickAction=${this.config.duplicate}
        .disabled=${this.disabled}
      >
        <ha-svg-icon
          slot="start"
          .path=${mdiPlusCircleMultipleOutline}
        ></ha-svg-icon>
        <div class="overflow-label">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.duplicate"
          )}
          <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
        </div>
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
        .disabled=${this.disabled}
      >
        <ha-svg-icon
          slot="start"
          .path=${rowDisabled ? mdiPlayCircleOutline : mdiStopCircleOutline}
        ></ha-svg-icon>
        <div class="overflow-label">
          ${this.hass.localize(
            `ui.panel.config.automation.editor.actions.${rowDisabled ? "enable" : "disable"}`
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
      ${description && !this.yamlMode
        ? html`<div class="description">${description}</div>`
        : keyed(
            this.sidebarKey,
            html`<ha-automation-condition-editor
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
            ></ha-automation-condition-editor>`
          )}
      <div class="testing-wrapper">
        <div
          class="testing ${classMap({
            active: this._testing,
            pass: this._testingResult === true,
            error: this._testingResult === false,
            narrow: this.narrow,
          })}"
        >
          ${this._testingResult === undefined
            ? nothing
            : this.hass.localize(
                `ui.panel.config.automation.editor.conditions.testing_${
                  this._testingResult ? "pass" : "error"
                }`
              )}
        </div>
      </div>
    </ha-automation-sidebar-card>`;
  }

  private _testCondition = async () => {
    if (this._testing) {
      return;
    }
    this._testingResult = undefined;
    this._testing = true;
    const condition = this.config.config;

    try {
      const validateResult = await validateConfig(this.hass, {
        conditions: condition,
      });

      // Abort if condition changed.
      if (this.config.config !== condition) {
        this._testing = false;
        return;
      }

      if (!validateResult.conditions.valid) {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.automation.editor.conditions.invalid_condition"
          ),
          text: validateResult.conditions.error,
        });
        this._testing = false;
        return;
      }

      let result: { result: boolean };
      try {
        result = await testCondition(this.hass, condition);
      } catch (err: any) {
        if (this.config.config !== condition) {
          this._testing = false;
          return;
        }

        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.automation.editor.conditions.test_failed"
          ),
          text: err.message,
        });
        this._testing = false;
        return;
      }

      this._testingResult = result.result;
    } finally {
      setTimeout(() => {
        this._testing = false;
        this._testingResult = undefined;
      }, 2500);
    }
  };

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

  static styles = [
    sidebarEditorStyles,
    overflowStyles,
    css`
      ha-automation-sidebar-card {
        position: relative;
      }
      .testing-wrapper {
        position: absolute;
        top: 0px;
        right: 0px;
        left: 0px;
        margin: -1px;
        overflow: hidden;
        border-top-right-radius: var(
          --ha-card-border-radius,
          var(--ha-border-radius-lg)
        );
        border-top-left-radius: var(
          --ha-card-border-radius,
          var(--ha-border-radius-lg)
        );
        pointer-events: none;
        height: 100px;
      }
      .testing {
        --testing-color: var(--divider-color, #e0e0e0);
        text-transform: uppercase;
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-bold);
        background-color: var(--testing-color);
        color: var(--text-primary-color);
        max-height: 0px;
        transition:
          max-height 0.3s ease-in-out,
          padding-top 0.3s ease-in-out;
        text-align: center;
      }
      .testing.active.narrow {
        padding-top: 16px;
      }
      .testing.active {
        max-height: 100%;
      }
      .testing.error {
        --testing-color: var(--accent-color);
      }
      .testing.pass {
        --testing-color: var(--success-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-condition": HaAutomationSidebarCondition;
  }
}
