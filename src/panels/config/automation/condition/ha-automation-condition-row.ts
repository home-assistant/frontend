import { consume } from "@lit-labs/context";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import {
  mdiCheck,
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiFlask,
  mdiPlayCircleOutline,
  mdiRenameBox,
  mdiSort,
  mdiStopCircleOutline,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import type { AutomationClipboard } from "../../../../data/automation";
import { Condition, testCondition } from "../../../../data/automation";
import { describeCondition } from "../../../../data/automation_i18n";
import { CONDITION_TYPES } from "../../../../data/condition";
import { validateConfig } from "../../../../data/config";
import { fullEntitiesContext } from "../../../../data/context";
import { EntityRegistryEntry } from "../../../../data/entity_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-condition-editor";

export interface ConditionElement extends LitElement {
  condition: Condition;
}

const preventDefault = (ev) => ev.preventDefault();

export const handleChangeEvent = (
  element: ConditionElement,
  ev: CustomEvent
) => {
  ev.stopPropagation();
  const name = (ev.currentTarget as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail?.value || (ev.currentTarget as any)?.value;

  if ((element.condition[name] || "") === newVal) {
    return;
  }

  let newCondition: Condition;
  if (!newVal) {
    newCondition = { ...element.condition };
    delete newCondition[name];
  } else {
    newCondition = { ...element.condition, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newCondition });
};

@customElement("ha-automation-condition-row")
export default class HaAutomationConditionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: Condition;

  @property({ type: Boolean }) public hideMenu = false;

  @property({ type: Boolean }) public reOrderMode = false;

  @property({ type: Boolean }) public disabled = false;

  @storage({
    key: "automationClipboard",
    state: false,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  @state() private _yamlMode = false;

  @state() private _warnings?: string[];

  @state() private _testing = false;

  @state() private _testingResult?: boolean;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  protected render() {
    if (!this.condition) {
      return nothing;
    }
    return html`
      <ha-card outlined>
        ${this.condition.enabled === false
          ? html`<div class="disabled-bar">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.disabled"
              )}
            </div>`
          : ""}

        <ha-expansion-panel leftChevron>
          <h3 slot="header">
            <ha-svg-icon
              class="condition-icon"
              .path=${CONDITION_TYPES[this.condition.condition]}
            ></ha-svg-icon>
            ${capitalizeFirstLetter(
              describeCondition(this.condition, this.hass, this._entityReg)
            )}
          </h3>

          <slot name="icons" slot="icons"></slot>
          ${this.hideMenu
            ? ""
            : html`
                <ha-button-menu
                  slot="icons"
                  @action=${this._handleAction}
                  @click=${preventDefault}
                  fixed
                >
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass.localize("ui.common.menu")}
                    .path=${mdiDotsVertical}
                  >
                  </ha-icon-button>

                  <mwc-list-item graphic="icon">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.conditions.test"
                    )}
                    <ha-svg-icon slot="graphic" .path=${mdiFlask}></ha-svg-icon>
                  </mwc-list-item>
                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.conditions.rename"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiRenameBox}
                    ></ha-svg-icon>
                  </mwc-list-item>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.conditions.re_order"
                    )}
                    <ha-svg-icon slot="graphic" .path=${mdiSort}></ha-svg-icon>
                  </mwc-list-item>

                  <li divider role="separator"></li>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.actions.duplicate"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiContentDuplicate}
                    ></ha-svg-icon>
                  </mwc-list-item>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.copy"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiContentCopy}
                    ></ha-svg-icon>
                  </mwc-list-item>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.cut"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiContentCut}
                    ></ha-svg-icon>
                  </mwc-list-item>

                  <li divider role="separator"></li>

                  <mwc-list-item graphic="icon">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.edit_ui"
                    )}
                    ${!this._yamlMode
                      ? html`<ha-svg-icon
                          class="selected_menu_item"
                          slot="graphic"
                          .path=${mdiCheck}
                        ></ha-svg-icon>`
                      : ``}
                  </mwc-list-item>

                  <mwc-list-item graphic="icon">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.edit_yaml"
                    )}
                    ${this._yamlMode
                      ? html`<ha-svg-icon
                          class="selected_menu_item"
                          slot="graphic"
                          .path=${mdiCheck}
                        ></ha-svg-icon>`
                      : ``}
                  </mwc-list-item>

                  <li divider role="separator"></li>

                  <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                    ${this.condition.enabled === false
                      ? this.hass.localize(
                          "ui.panel.config.automation.editor.actions.enable"
                        )
                      : this.hass.localize(
                          "ui.panel.config.automation.editor.actions.disable"
                        )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${this.condition.enabled === false
                        ? mdiPlayCircleOutline
                        : mdiStopCircleOutline}
                    ></ha-svg-icon>
                  </mwc-list-item>
                  <mwc-list-item
                    class="warning"
                    graphic="icon"
                    .disabled=${this.disabled}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.actions.delete"
                    )}
                    <ha-svg-icon
                      class="warning"
                      slot="graphic"
                      .path=${mdiDelete}
                    ></ha-svg-icon>
                  </mwc-list-item>
                </ha-button-menu>
              `}

          <div
            class=${classMap({
              "card-content": true,
              disabled: this.condition.enabled === false,
            })}
          >
            ${this._warnings
              ? html`<ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.errors.config.editor_not_supported"
                  )}
                >
                  ${this._warnings!.length > 0 &&
                  this._warnings![0] !== undefined
                    ? html` <ul>
                        ${this._warnings!.map(
                          (warning) => html`<li>${warning}</li>`
                        )}
                      </ul>`
                    : ""}
                  ${this.hass.localize(
                    "ui.errors.config.edit_in_yaml_supported"
                  )}
                </ha-alert>`
              : ""}
            <ha-automation-condition-editor
              @ui-mode-not-available=${this._handleUiModeNotAvailable}
              @value-changed=${this._handleChangeEvent}
              .yamlMode=${this._yamlMode}
              .disabled=${this.disabled}
              .hass=${this.hass}
              .condition=${this.condition}
              .reOrderMode=${this.reOrderMode}
            ></ha-automation-condition-editor>
          </div>
        </ha-expansion-panel>
        <div
          class="testing ${classMap({
            active: this._testing,
            pass: this._testingResult === true,
            error: this._testingResult === false,
          })}"
        >
          ${this._testingResult
            ? this.hass.localize(
                "ui.panel.config.automation.editor.conditions.testing_pass"
              )
            : this.hass.localize(
                "ui.panel.config.automation.editor.conditions.testing_error"
              )}
        </div>
      </ha-card>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    // Prevent possible parent action-row from switching to yamlMode
    ev.stopPropagation();
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private _handleChangeEvent(ev: CustomEvent) {
    if (ev.detail.yaml) {
      this._warnings = undefined;
    }
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._testCondition();
        break;
      case 1:
        await this._renameCondition();
        break;
      case 2:
        fireEvent(this, "re-order");
        break;
      case 3:
        fireEvent(this, "duplicate");
        break;
      case 4:
        this._setClipboard();
        break;
      case 5:
        this._setClipboard();
        fireEvent(this, "value-changed", { value: null });
        break;
      case 6:
        this._switchUiMode();
        this.expand();
        break;
      case 7:
        this._switchYamlMode();
        this.expand();
        break;
      case 8:
        this._onDisable();
        break;
      case 9:
        this._onDelete();
        break;
    }
  }

  private _setClipboard() {
    this._clipboard = {
      ...this._clipboard,
      condition: deepClone(this.condition),
    };
  }

  private _onDisable() {
    const enabled = !(this.condition.enabled ?? true);
    const value = { ...this.condition, enabled };
    fireEvent(this, "value-changed", { value });
  }

  private _onDelete() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.conditions.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.editor.conditions.delete_confirm_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  }

  private _switchUiMode() {
    this._warnings = undefined;
    this._yamlMode = false;
  }

  private _switchYamlMode() {
    this._warnings = undefined;
    this._yamlMode = true;
  }

  private async _testCondition() {
    if (this._testing) {
      return;
    }
    this._testingResult = undefined;
    this._testing = true;
    const condition = this.condition;

    try {
      const validateResult = await validateConfig(this.hass, {
        condition,
      });

      // Abort if condition changed.
      if (this.condition !== condition) {
        this._testing = false;
        return;
      }

      if (!validateResult.condition.valid) {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.automation.editor.conditions.invalid_condition"
          ),
          text: validateResult.condition.error,
        });
        this._testing = false;
        return;
      }

      let result: { result: boolean };
      try {
        result = await testCondition(this.hass, condition);
      } catch (err: any) {
        if (this.condition !== condition) {
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
      }, 2500);
    }
  }

  private async _renameCondition(): Promise<void> {
    const alias = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.conditions.change_alias"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.automation.editor.conditions.alias"
      ),
      inputType: "string",
      placeholder: capitalizeFirstLetter(
        describeCondition(this.condition, this.hass, this._entityReg, true)
      ),
      defaultValue: this.condition.alias,
      confirmText: this.hass.localize("ui.common.submit"),
    });
    if (alias !== null) {
      const value = { ...this.condition };
      if (alias === "") {
        delete value.alias;
      } else {
        value.alias = alias;
      }
      fireEvent(this, "value-changed", {
        value,
      });
    }
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-button-menu {
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        .condition-icon {
          display: none;
        }
        @media (min-width: 870px) {
          .condition-icon {
            display: inline-block;
            color: var(--secondary-text-color);
            opacity: 0.9;
            margin-right: 8px;
          }
        }
        .card-content {
          padding: 16px;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius);
          border-top-left-radius: var(--ha-card-border-radius);
        }
        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        .testing {
          position: absolute;
          top: 0px;
          right: 0px;
          left: 0px;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 14px;
          background-color: var(--divider-color, #e0e0e0);
          color: var(--text-primary-color);
          max-height: 0px;
          overflow: hidden;
          transition: max-height 0.3s;
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius, 12px);
          border-top-left-radius: var(--ha-card-border-radius, 12px);
        }
        .testing.active {
          max-height: 100px;
        }
        .testing.error {
          background-color: var(--accent-color);
        }
        .testing.pass {
          background-color: var(--success-color);
        }
        .selected_menu_item {
          color: var(--primary-color);
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-row": HaAutomationConditionRow;
  }
}
