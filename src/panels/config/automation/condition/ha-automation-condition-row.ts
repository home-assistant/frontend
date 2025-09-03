import { consume } from "@lit/context";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiContentCopy,
  mdiContentCut,
  mdiDelete,
  mdiDotsVertical,
  mdiFlask,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefaultStopPropagation } from "../../../../common/dom/prevent_default_stop_propagation";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-automation-row";
import type { HaAutomationRow } from "../../../../components/ha-automation-row";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-button-menu";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-md-menu-item";
import type {
  AutomationClipboard,
  Condition,
  ConditionSidebarConfig,
} from "../../../../data/automation";
import { testCondition } from "../../../../data/automation";
import { describeCondition } from "../../../../data/automation_i18n";
import {
  CONDITION_BUILDING_BLOCKS,
  CONDITION_ICONS,
} from "../../../../data/condition";
import { validateConfig } from "../../../../data/config";
import { fullEntitiesContext } from "../../../../data/context";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import "../ha-automation-editor-warning";
import { rowStyles } from "../styles";
import "./ha-automation-condition-editor";
import type HaAutomationConditionEditor from "./ha-automation-condition-editor";
import "./types/ha-automation-condition-and";
import "./types/ha-automation-condition-device";
import "./types/ha-automation-condition-not";
import "./types/ha-automation-condition-numeric_state";
import "./types/ha-automation-condition-or";
import "./types/ha-automation-condition-state";
import "./types/ha-automation-condition-sun";
import "./types/ha-automation-condition-template";
import "./types/ha-automation-condition-time";
import "./types/ha-automation-condition-trigger";
import "./types/ha-automation-condition-zone";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";

export interface ConditionElement extends LitElement {
  condition: Condition;
  expandAll?: () => void;
  collapseAll?: () => void;
}

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

  @property({ attribute: false }) public condition!: Condition;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public root = false;

  @property({ type: Boolean }) public first?: boolean;

  @property({ type: Boolean }) public last?: boolean;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public highlight?: boolean;

  @property({ type: Boolean, attribute: "sort-selected" })
  public sortSelected = false;

  @state() private _collapsed = true;

  @state() private _warnings?: string[];

  @property({ type: Boolean, attribute: "sidebar" })
  public optionsInSidebar = false;

  @storage({
    key: "automationClipboard",
    state: false,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  @state() private _yamlMode = false;

  @state() private _testing = false;

  @state() private _testingResult?: boolean;

  @state() private _selected = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  @query("ha-automation-condition-editor")
  public conditionEditor?: HaAutomationConditionEditor;

  @query("ha-automation-row")
  private _automationRowElement?: HaAutomationRow;

  get selected() {
    return this._selected;
  }

  private _renderRow() {
    return html`
      <ha-svg-icon
        slot="leading-icon"
        class="condition-icon"
        .path=${CONDITION_ICONS[this.condition.condition]}
      ></ha-svg-icon>
      <h3 slot="header">
        ${capitalizeFirstLetter(
          describeCondition(this.condition, this.hass, this._entityReg)
        )}
      </h3>

      <slot name="icons" slot="icons"></slot>

      ${!this.optionsInSidebar
        ? html`<ha-md-button-menu
            quick
            slot="icons"
            @click=${preventDefaultStopPropagation}
            @keydown=${stopPropagation}
            @closed=${stopPropagation}
            positioning="fixed"
            anchor-corner="end-end"
            menu-corner="start-end"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            >
            </ha-icon-button>

            <ha-md-menu-item .clickAction=${this._testCondition}>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.test"
              )}
              <ha-svg-icon slot="start" .path=${mdiFlask}></ha-svg-icon>
            </ha-md-menu-item>
            <ha-md-menu-item
              .clickAction=${this._renameCondition}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.rename"
              )}
              <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

            <ha-md-menu-item
              .clickAction=${this._duplicateCondition}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.duplicate"
              )}
              <ha-svg-icon
                slot="start"
                .path=${mdiPlusCircleMultipleOutline}
              ></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._copyCondition}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.triggers.copy"
              )}
              <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._cutCondition}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.triggers.cut"
              )}
              <ha-svg-icon slot="start" .path=${mdiContentCut}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._moveUp}
              .disabled=${this.disabled || this.first}
            >
              ${this.hass.localize("ui.panel.config.automation.editor.move_up")}
              <ha-svg-icon slot="start" .path=${mdiArrowUp}></ha-svg-icon
            ></ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._moveDown}
              .disabled=${this.disabled || this.last}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.move_down"
              )}
              <ha-svg-icon slot="start" .path=${mdiArrowDown}></ha-svg-icon
            ></ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._toggleYamlMode}
              .disabled=${this._uiSupported(this.condition.condition) ||
              !!this._warnings}
            >
              ${this.hass.localize(
                `ui.panel.config.automation.editor.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon slot="start" .path=${mdiPlaylistEdit}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

            <ha-md-menu-item
              .clickAction=${this._onDisable}
              .disabled=${this.disabled}
            >
              ${this.condition.enabled === false
                ? this.hass.localize(
                    "ui.panel.config.automation.editor.actions.enable"
                  )
                : this.hass.localize(
                    "ui.panel.config.automation.editor.actions.disable"
                  )}
              <ha-svg-icon
                slot="start"
                .path=${this.condition.enabled === false
                  ? mdiPlayCircleOutline
                  : mdiStopCircleOutline}
              ></ha-svg-icon>
            </ha-md-menu-item>
            <ha-md-menu-item
              class="warning"
              .clickAction=${this._onDelete}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.delete"
              )}
              <ha-svg-icon
                class="warning"
                slot="start"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-md-menu-item>
          </ha-md-button-menu>`
        : nothing}
      ${!this.optionsInSidebar
        ? html`${this._warnings
              ? html`<ha-automation-editor-warning
                  .localize=${this.hass.localize}
                  .warnings=${this._warnings}
                >
                </ha-automation-editor-warning>`
              : nothing}
            <ha-automation-condition-editor
              .hass=${this.hass}
              .condition=${this.condition}
              .disabled=${this.disabled}
              .yamlMode=${this._yamlMode}
              .uiSupported=${this._uiSupported(this.condition.condition)}
              .narrow=${this.narrow}
              @ui-mode-not-available=${this._handleUiModeNotAvailable}
            ></ha-automation-condition-editor>`
        : nothing}
    `;
  }

  protected render() {
    if (!this.condition) {
      return nothing;
    }

    return html`
      <ha-card
        outlined
        class=${classMap({
          selected: this._selected,
          "building-block":
            this.optionsInSidebar &&
            CONDITION_BUILDING_BLOCKS.includes(this.condition.condition) &&
            !this._collapsed,
        })}
      >
        ${this.condition.enabled === false
          ? html`
              <div class="disabled-bar">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.disabled"
                )}
              </div>
            `
          : nothing}
        ${this.optionsInSidebar
          ? html`<ha-automation-row
              .disabled=${this.condition.enabled === false}
              .leftChevron=${CONDITION_BUILDING_BLOCKS.includes(
                this.condition.condition
              )}
              .collapsed=${this._collapsed}
              .selected=${this._selected}
              .highlight=${this.highlight}
              .buildingBlock=${CONDITION_BUILDING_BLOCKS.includes(
                this.condition.condition
              )}
              .sortSelected=${this.sortSelected}
              @click=${this._toggleSidebar}
              @toggle-collapsed=${this._toggleCollapse}
              @copy-row=${this._copyCondition}
              @cut-row=${this._cutCondition}
              @delete-row=${this._onDelete}
              >${this._renderRow()}</ha-automation-row
            >`
          : html`
              <ha-expansion-panel left-chevron>
                ${this._renderRow()}
              </ha-expansion-panel>
            `}
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

      ${this.optionsInSidebar &&
      CONDITION_BUILDING_BLOCKS.includes(this.condition.condition)
        ? html`<ha-automation-condition-editor
            class=${this._collapsed ? "hidden" : ""}
            .hass=${this.hass}
            .condition=${this.condition}
            .disabled=${this.disabled}
            .uiSupported=${this._uiSupported(this.condition.condition)}
            indent
            .selected=${this._selected}
            .narrow=${this.narrow}
            @value-changed=${this._onValueChange}
          ></ha-automation-condition-editor>`
        : nothing}
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    if (this.root) {
      this._collapsed = false;
    }
  }

  protected willUpdate(changedProperties) {
    // on yaml toggle --> clear warnings
    if (changedProperties.has("yamlMode")) {
      this._warnings = undefined;
    }
  }

  private _onValueChange(event: CustomEvent) {
    // reload sidebar if sort, deleted,... happend
    if (this._selected && this.optionsInSidebar) {
      this.openSidebar(event.detail.value);
    }
  }

  private _setClipboard() {
    this._clipboard = {
      ...this._clipboard,
      condition: deepClone(this.condition),
    };
    copyToClipboard(JSON.stringify(this.condition));
  }

  private _onDisable = () => {
    const enabled = !(this.condition.enabled ?? true);
    const value = { ...this.condition, enabled };
    fireEvent(this, "value-changed", { value });
    this.openSidebar(value); // refresh sidebar

    if (this._yamlMode && !this.optionsInSidebar) {
      this.conditionEditor?.yamlEditor?.setValue(value);
    }
  };

  private _onDelete = () => {
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
        if (this._selected) {
          fireEvent(this, "close-sidebar");
        }
      },
    });
  };

  private _switchUiMode() {
    this._yamlMode = false;
  }

  private _switchYamlMode() {
    this._yamlMode = true;
  }

  private _testCondition = async () => {
    if (this._testing) {
      return;
    }
    this._testingResult = undefined;
    this._testing = true;
    const condition = this.condition;
    requestAnimationFrame(() => {
      // @ts-ignore is supported in all browsers expect firefox
      if (this.scrollIntoViewIfNeeded) {
        // @ts-ignore is supported in all browsers expect firefox
        this.scrollIntoViewIfNeeded();
        return;
      }
      this.scrollIntoView();
    });

    try {
      const validateResult = await validateConfig(this.hass, {
        conditions: condition,
      });

      // Abort if condition changed.
      if (this.condition !== condition) {
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
  };

  private _renameCondition = async (): Promise<void> => {
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

      if (this._selected && this.optionsInSidebar) {
        this.openSidebar(value); // refresh sidebar
      } else if (this._yamlMode) {
        this.conditionEditor?.yamlEditor?.setValue(value);
      }
    }
  };

  private _duplicateCondition = () => {
    fireEvent(this, "duplicate");
  };

  private _copyCondition = () => {
    this._setClipboard();
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.conditions.copied_to_clipboard"
      ),
      duration: 2000,
    });
  };

  private _cutCondition = () => {
    this._setClipboard();
    fireEvent(this, "value-changed", { value: null });
    if (this._selected) {
      fireEvent(this, "close-sidebar");
    }
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.conditions.cut_to_clipboard"
      ),
      duration: 2000,
    });
  };

  private _moveUp = () => {
    fireEvent(this, "move-up");
  };

  private _moveDown = () => {
    fireEvent(this, "move-down");
  };

  private _toggleYamlMode = () => {
    if (this._yamlMode) {
      this._switchUiMode();
    } else {
      this._switchYamlMode();
    }

    if (!this.optionsInSidebar) {
      this.expand();
    }
  };

  public expand() {
    if (this.optionsInSidebar) {
      this._collapsed = false;
      return;
    }

    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  public collapse() {
    this._collapsed = true;
  }

  public expandAll() {
    this.expand();

    this.conditionEditor?.expandAll();
  }

  public collapseAll() {
    this.collapse();

    this.conditionEditor?.collapseAll();
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private _toggleSidebar(ev: Event) {
    ev?.stopPropagation();

    if (this._selected) {
      fireEvent(this, "request-close-sidebar");
      return;
    }
    this.openSidebar();
  }

  public openSidebar(condition?: Condition): void {
    const sidebarCondition = condition || this.condition;
    fireEvent(this, "open-sidebar", {
      save: (value) => {
        fireEvent(this, "value-changed", { value });
      },
      close: (focus?: boolean) => {
        this._selected = false;
        fireEvent(this, "close-sidebar");
        if (focus) {
          this.focus();
        }
      },
      rename: () => {
        this._renameCondition();
      },
      toggleYamlMode: () => {
        this._toggleYamlMode();
        this.openSidebar();
      },
      disable: this._onDisable,
      delete: this._onDelete,
      duplicate: this._duplicateCondition,
      copy: this._copyCondition,
      cut: this._cutCondition,
      test: this._testCondition,
      config: sidebarCondition,
      uiSupported: this._uiSupported(sidebarCondition.condition),
      yamlMode: this._yamlMode,
    } satisfies ConditionSidebarConfig);
    this._selected = true;
    this._collapsed = false;

    if (this.narrow) {
      window.setTimeout(() => {
        this.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }, 180); // duration of transition of added padding for bottom sheet
    }
  }

  private _uiSupported = memoizeOne(
    (type: string) =>
      customElements.get(`ha-automation-condition-${type}`) !== undefined
  );

  private _toggleCollapse() {
    this._collapsed = !this._collapsed;
  }

  public focus() {
    this._automationRowElement?.focus();
  }

  static get styles(): CSSResultGroup {
    return [
      rowStyles,
      css`
        .testing {
          position: absolute;
          top: 0px;
          right: 0px;
          left: 0px;
          text-transform: uppercase;
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-bold);
          background-color: var(--divider-color, #e0e0e0);
          color: var(--text-primary-color);
          max-height: 0px;
          overflow: hidden;
          transition: max-height 0.3s;
          text-align: center;
          border-top-right-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          border-top-left-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-row": HaAutomationConditionRow;
  }
}
