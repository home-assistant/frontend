import { consume } from "@lit/context";
import {
  mdiAlertCircleCheck,
  mdiAppleKeyboardCommand,
  mdiArrowDown,
  mdiArrowUp,
  mdiContentCopy,
  mdiContentCut,
  mdiDelete,
  mdiDotsVertical,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import { dump } from "js-yaml";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../common/array/ensure-array";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefaultStopPropagation } from "../../../../common/dom/prevent_default_stop_propagation";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { handleStructError } from "../../../../common/structs/handle-errors";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/ha-automation-row";
import type { HaAutomationRow } from "../../../../components/ha-automation-row";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-button-menu";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-md-menu-item";
import "../../../../components/ha-service-icon";
import "../../../../components/ha-tooltip";
import {
  ACTION_BUILDING_BLOCKS,
  ACTION_COMBINED_BLOCKS,
  ACTION_ICONS,
  YAML_ONLY_ACTION_TYPES,
} from "../../../../data/action";
import type {
  ActionSidebarConfig,
  AutomationClipboard,
  Condition,
} from "../../../../data/automation";
import { CONDITION_BUILDING_BLOCKS } from "../../../../data/condition";
import { validateConfig } from "../../../../data/config";
import {
  floorsContext,
  fullEntitiesContext,
  labelsContext,
} from "../../../../data/context";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";
import type { FloorRegistryEntry } from "../../../../data/floor_registry";
import type { LabelRegistryEntry } from "../../../../data/label_registry";
import type {
  Action,
  NonConditionAction,
  RepeatAction,
} from "../../../../data/script";
import { getActionType, isAction } from "../../../../data/script";
import { describeAction } from "../../../../data/script_i18n";
import { callExecuteScript } from "../../../../data/service";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../types";
import { isMac } from "../../../../util/is_mac";
import { showToast } from "../../../../util/toast";
import "../ha-automation-editor-warning";
import { overflowStyles, rowStyles } from "../styles";
import "./ha-automation-action-editor";
import type HaAutomationActionEditor from "./ha-automation-action-editor";
import "./types/ha-automation-action-choose";
import "./types/ha-automation-action-condition";
import "./types/ha-automation-action-delay";
import "./types/ha-automation-action-device_id";
import "./types/ha-automation-action-event";
import "./types/ha-automation-action-if";
import "./types/ha-automation-action-parallel";
import { getRepeatType } from "./types/ha-automation-action-repeat";
import "./types/ha-automation-action-sequence";
import "./types/ha-automation-action-service";
import "./types/ha-automation-action-set_conversation_response";
import "./types/ha-automation-action-stop";
import "./types/ha-automation-action-wait_for_trigger";
import "./types/ha-automation-action-wait_template";

export const getAutomationActionType = memoizeOne(
  (action: Action | undefined) => {
    if (!action) {
      return undefined;
    }
    if ("action" in action) {
      return getActionType(action) as "action";
    }
    if (CONDITION_BUILDING_BLOCKS.some((key) => key in action)) {
      return "condition" as const;
    }
    return Object.keys(ACTION_ICONS).find(
      (option) => option in action
    ) as keyof typeof ACTION_ICONS;
  }
);

export interface ActionElement extends LitElement {
  action: Action;
  expandAll?: () => void;
  collapseAll?: () => void;
}

export const handleChangeEvent = (element: ActionElement, ev: CustomEvent) => {
  ev.stopPropagation();
  const name = (ev.target as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail?.value || (ev.target as any).value;

  if ((element.action[name] || "") === newVal) {
    return;
  }

  let newAction: Action;
  if (!newVal) {
    newAction = { ...element.action };
    delete newAction[name];
  } else {
    newAction = { ...element.action, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newAction });
};

@customElement("ha-automation-action-row")
export default class HaAutomationActionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: Action;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public root = false;

  @property({ type: Boolean }) public first?: boolean;

  @property({ type: Boolean }) public last?: boolean;

  @property({ type: Boolean }) public highlight?: boolean;

  @property({ type: Boolean, attribute: "sidebar" })
  public optionsInSidebar = false;

  @property({ type: Boolean, attribute: "sort-selected" })
  public sortSelected = false;

  @storage({
    key: "automationClipboard",
    state: false,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  @state()
  @consume({ context: labelsContext, subscribe: true })
  _labelReg!: LabelRegistryEntry[];

  @state()
  @consume({ context: floorsContext, subscribe: true })
  _floorReg!: Record<string, FloorRegistryEntry>;

  @state() private _uiModeAvailable = true;

  @state() private _yamlMode = false;

  @state() private _selected = false;

  @state() private _collapsed = true;

  @state() private _warnings?: string[];

  @query("ha-automation-action-editor")
  private _actionEditor?: HaAutomationActionEditor;

  @query("ha-automation-row")
  private _automationRowElement?: HaAutomationRow;

  get selected() {
    return this._selected;
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    if (this.root) {
      this._collapsed = false;
    }
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has("yamlMode")) {
      this._warnings = undefined;
    }
    if (!changedProperties.has("action")) {
      return;
    }
    const type = getAutomationActionType(this.action);
    this._uiModeAvailable =
      type !== undefined && !YAML_ONLY_ACTION_TYPES.has(type as any);
    if (!this._uiModeAvailable && !this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private _renderOverflowLabel(label: string, shortcut?: TemplateResult) {
    return html`
      <div class="overflow-label">
        ${label}
        ${this.optionsInSidebar && !this.narrow
          ? shortcut ||
            html`<span
              class="shortcut-placeholder ${isMac ? "mac" : ""}"
            ></span>`
          : nothing}
      </div>
    `;
  }

  private _renderRow() {
    const type = getAutomationActionType(this.action);

    return html`
      ${type === "service" && "action" in this.action && this.action.action
        ? html`
            <ha-service-icon
              slot="leading-icon"
              class="action-icon"
              .hass=${this.hass}
              .service=${this.action.action}
            ></ha-service-icon>
          `
        : html`
            <ha-svg-icon
              slot="leading-icon"
              class="action-icon"
              .path=${ACTION_ICONS[type!]}
            ></ha-svg-icon>
          `}
      <h3 slot="header">
        ${capitalizeFirstLetter(
          describeAction(
            this.hass,
            this._entityReg,
            this._labelReg,
            this._floorReg,
            this.action
          )
        )}
      </h3>

      <slot name="icons" slot="icons"></slot>

      ${type !== "condition" &&
      (this.action as NonConditionAction).continue_on_error === true
        ? html`<ha-svg-icon
              id="svg-icon"
              slot="icons"
              .path=${mdiAlertCircleCheck}
            ></ha-svg-icon>
            <ha-tooltip for="svg-icon">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.continue_on_error"
              )}
            </ha-tooltip>`
        : nothing}

      <ha-md-button-menu
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
        ></ha-icon-button>

        <ha-md-menu-item .clickAction=${this._runAction}>
          <ha-svg-icon slot="start" .path=${mdiPlay}></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize("ui.panel.config.automation.editor.actions.run")
          )}
        </ha-md-menu-item>
        <ha-md-menu-item
          .clickAction=${this._renameAction}
          .disabled=${this.disabled}
        >
          <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.rename"
            )
          )}
        </ha-md-menu-item>
        <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
        <ha-md-menu-item
          .clickAction=${this._duplicateAction}
          .disabled=${this.disabled}
        >
          <ha-svg-icon
            slot="start"
            .path=${mdiPlusCircleMultipleOutline}
          ></ha-svg-icon>

          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.actions.duplicate"
            )
          )}
        </ha-md-menu-item>

        <ha-md-menu-item
          .clickAction=${this._copyAction}
          .disabled=${this.disabled}
        >
          <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.copy"
            ),
            html`<span class="shortcut">
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
          )}
        </ha-md-menu-item>

        <ha-md-menu-item
          .clickAction=${this._cutAction}
          .disabled=${this.disabled}
        >
          <ha-svg-icon slot="start" .path=${mdiContentCut}></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.triggers.cut"
            ),
            html`<span class="shortcut">
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
          )}
        </ha-md-menu-item>

        ${!this.optionsInSidebar
          ? html`
              <ha-md-menu-item
                .clickAction=${this._moveUp}
                .disabled=${this.disabled || !!this.first}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.move_up"
                )}
                <ha-svg-icon slot="start" .path=${mdiArrowUp}></ha-svg-icon
              ></ha-md-menu-item>
              <ha-md-menu-item
                .clickAction=${this._moveDown}
                .disabled=${this.disabled || !!this.last}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.move_down"
                )}
                <ha-svg-icon slot="start" .path=${mdiArrowDown}></ha-svg-icon
              ></ha-md-menu-item>
            `
          : nothing}

        <ha-md-menu-item
          .clickAction=${this._toggleYamlMode}
          .disabled=${!this._uiModeAvailable || !!this._warnings}
        >
          <ha-svg-icon slot="start" .path=${mdiPlaylistEdit}></ha-svg-icon>
          ${this._renderOverflowLabel(
            this.hass.localize(
              `ui.panel.config.automation.editor.edit_${!this._yamlMode ? "yaml" : "ui"}`
            )
          )}
        </ha-md-menu-item>

        <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

        <ha-md-menu-item
          .clickAction=${this._onDisable}
          .disabled=${this.disabled}
        >
          <ha-svg-icon
            slot="start"
            .path=${this.action.enabled === false
              ? mdiPlayCircleOutline
              : mdiStopCircleOutline}
          ></ha-svg-icon>

          ${this._renderOverflowLabel(
            this.hass.localize(
              `ui.panel.config.automation.editor.actions.${this.action.enabled === false ? "enable" : "disable"}`
            )
          )}
        </ha-md-menu-item>
        <ha-md-menu-item
          class="warning"
          .clickAction=${this._onDelete}
          .disabled=${this.disabled}
        >
          <ha-svg-icon
            class="warning"
            slot="start"
            .path=${mdiDelete}
          ></ha-svg-icon>

          ${this._renderOverflowLabel(
            this.hass.localize(
              "ui.panel.config.automation.editor.actions.delete"
            ),
            html`<span class="shortcut">
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
          )}
        </ha-md-menu-item>
      </ha-md-button-menu>

      ${!this.optionsInSidebar
        ? html`${this._warnings
              ? html`<ha-automation-editor-warning
                  .localize=${this.hass.localize}
                  .warnings=${this._warnings}
                >
                </ha-automation-editor-warning>`
              : nothing}
            <ha-automation-action-editor
              .hass=${this.hass}
              .action=${this.action}
              .disabled=${this.disabled}
              .yamlMode=${this._yamlMode}
              .narrow=${this.narrow}
              .uiSupported=${this._uiSupported(type!)}
              @ui-mode-not-available=${this._handleUiModeNotAvailable}
            ></ha-automation-action-editor>`
        : nothing}
    `;
  }

  protected render() {
    if (!this.action) return nothing;

    const type = getAutomationActionType(this.action);

    const blockType =
      type === "repeat"
        ? `repeat_${getRepeatType((this.action as RepeatAction).repeat)}`
        : type;

    return html`
      <ha-card outlined>
        ${this.action.enabled === false
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
              .disabled=${this.action.enabled === false}
              .leftChevron=${[
                ...ACTION_BUILDING_BLOCKS,
                ...ACTION_COMBINED_BLOCKS,
              ].includes(blockType!) ||
              (blockType === "condition" &&
                CONDITION_BUILDING_BLOCKS.includes(
                  (this.action as Condition).condition
                ))}
              .collapsed=${this._collapsed}
              .selected=${this._selected}
              .highlight=${this.highlight}
              .buildingBlock=${[
                ...ACTION_BUILDING_BLOCKS,
                ...ACTION_COMBINED_BLOCKS,
              ].includes(blockType!)}
              .sortSelected=${this.sortSelected}
              @click=${this._toggleSidebar}
              @toggle-collapsed=${this._toggleCollapse}
              >${this._renderRow()}</ha-automation-row
            >`
          : html`
              <ha-expansion-panel left-chevron>
                ${this._renderRow()}
              </ha-expansion-panel>
            `}
      </ha-card>

      ${this.optionsInSidebar &&
      ([...ACTION_BUILDING_BLOCKS, ...ACTION_COMBINED_BLOCKS].includes(
        blockType!
      ) ||
        (blockType === "condition" &&
          CONDITION_BUILDING_BLOCKS.includes(
            (this.action as Condition).condition
          )))
        ? html`<ha-automation-action-editor
            class=${this._collapsed ? "hidden" : ""}
            .hass=${this.hass}
            .action=${this.action}
            .narrow=${this.narrow}
            .disabled=${this.disabled}
            .uiSupported=${this._uiSupported(type!)}
            indent
            .selected=${this._selected}
            @value-changed=${this._onValueChange}
          ></ha-automation-action-editor>`
        : nothing}
    `;
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
      action: deepClone(this.action),
    };
    copyToClipboard(dump(this.action));
  }

  private _onDisable = () => {
    const enabled = !(this.action.enabled ?? true);
    const value = { ...this.action, enabled };
    fireEvent(this, "value-changed", { value });

    if (this._selected && this.optionsInSidebar) {
      this.openSidebar(value); // refresh sidebar
    }

    if (this._yamlMode && !this.optionsInSidebar) {
      this._actionEditor?.yamlEditor?.setValue(value);
    }
  };

  private _runAction = async () => {
    requestAnimationFrame(() => {
      // @ts-ignore is supported in all browsers except firefox
      if (this.scrollIntoViewIfNeeded) {
        // @ts-ignore is supported in all browsers except firefox
        this.scrollIntoViewIfNeeded();
        return;
      }
      this.scrollIntoView();
    });
    const validated = await validateConfig(this.hass, {
      actions: this.action,
    });

    if (!validated.actions.valid) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.automation.editor.actions.invalid_action"
        ),
        text: validated.actions.error,
      });
      return;
    }

    try {
      await callExecuteScript(this.hass, this.action);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.automation.editor.actions.run_action_error"
        ),
        text: err.message || err,
      });
      return;
    }

    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.actions.run_action_success"
      ),
    });
  };

  private _onDelete = () => {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete_confirm_text"
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

  private _renameAction = async (): Promise<void> => {
    const alias = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.change_alias"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.automation.editor.actions.alias"
      ),
      inputType: "string",
      placeholder: capitalizeFirstLetter(
        describeAction(
          this.hass,
          this._entityReg,
          this._labelReg,
          this._floorReg,
          this.action,
          undefined,
          true
        )
      ),
      defaultValue: this.action.alias,
      confirmText: this.hass.localize("ui.common.submit"),
    });
    if (alias !== null) {
      const value = { ...this.action };
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
        this._actionEditor?.yamlEditor?.setValue(value);
      }
    }
  };

  private _duplicateAction = () => {
    fireEvent(this, "duplicate");
  };

  private _insertAfter = (value: Action | Action[]) => {
    if (ensureArray(value).some((val) => !isAction(val))) {
      return false;
    }
    fireEvent(this, "insert-after", { value });
    return true;
  };

  private _copyAction = () => {
    this._setClipboard();
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.actions.copied_to_clipboard"
      ),
      duration: 2000,
    });
  };

  private _cutAction = () => {
    this._setClipboard();
    fireEvent(this, "value-changed", { value: null });
    if (this._selected) {
      fireEvent(this, "close-sidebar");
    }
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.actions.cut_to_clipboard"
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

  private _toggleYamlMode = (item?: HTMLElement) => {
    if (this._yamlMode) {
      this._switchUiMode();
    } else {
      this._switchYamlMode();
    }

    if (!this.optionsInSidebar) {
      this.expand();
    } else if (item) {
      this.openSidebar();
    }
  };

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

  public openSidebar(action?: Action): void {
    const sidebarAction = action ?? this.action;
    const actionType = getAutomationActionType(sidebarAction);

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
        this._renameAction();
      },
      toggleYamlMode: () => {
        this._toggleYamlMode();
        this.openSidebar();
      },
      disable: this._onDisable,
      delete: this._onDelete,
      copy: this._copyAction,
      cut: this._cutAction,
      duplicate: this._duplicateAction,
      insertAfter: this._insertAfter,
      run: this._runAction,
      config: {
        action: sidebarAction,
      },
      uiSupported: actionType ? this._uiSupported(actionType) : false,
      yamlMode: this._yamlMode,
    } satisfies ActionSidebarConfig);
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
    if (this.optionsInSidebar) {
      this._collapsed = true;
      return;
    }

    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = false;
    });
  }

  public expandAll() {
    this.expand();

    this._actionEditor?.expandAll();
  }

  public collapseAll() {
    this.collapse();

    this._actionEditor?.collapseAll();
  }

  private _uiSupported = memoizeOne(
    (type: string) =>
      customElements.get(`ha-automation-action-${type}`) !== undefined
  );

  private _toggleCollapse() {
    this._collapsed = !this._collapsed;
  }

  public focus() {
    this._automationRowElement?.focus();
  }

  static styles = [rowStyles, overflowStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-row": HaAutomationActionRow;
  }
}
