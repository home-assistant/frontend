import { consume } from "@lit-labs/context";
import type { ActionDetail } from "@material/mwc-list";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiDrag,
  mdiPlus,
  mdiRenameBox,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { listenMediaQuery } from "../../../../../common/dom/media_query";
import { capitalizeFirstLetter } from "../../../../../common/string/capitalize-first-letter";
import "../../../../../components/ha-button";
import "../../../../../components/ha-button-menu";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-sortable";
import { Condition } from "../../../../../data/automation";
import { describeCondition } from "../../../../../data/automation_i18n";
import { fullEntitiesContext } from "../../../../../data/context";
import { EntityRegistryEntry } from "../../../../../data/entity_registry";
import {
  Action,
  ChooseAction,
  ChooseActionChoice,
} from "../../../../../data/script";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant, ItemPath } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

const preventDefault = (ev) => ev.preventDefault();

@customElement("ha-automation-action-choose")
export class HaChooseAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public path?: ItemPath;

  @property({ attribute: false }) public action!: ChooseAction;

  @state() private _showDefault = false;

  @state() private _expandedStates: boolean[] = [];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  @state() private _showReorder: boolean = false;

  private _expandLast = false;

  private _unsubMql?: () => void;

  public connectedCallback() {
    super.connectedCallback();
    this._unsubMql = listenMediaQuery("(min-width: 600px)", (matches) => {
      this._showReorder = matches;
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubMql?.();
    this._unsubMql = undefined;
  }

  public static get defaultConfig() {
    return { choose: [{ conditions: [], sequence: [] }] };
  }

  private _expandedChanged(ev) {
    this._expandedStates = this._expandedStates.concat();
    this._expandedStates[ev.target!.index] = ev.detail.expanded;
  }

  private _getDescription(option) {
    const conditions = ensureArray(option.conditions);
    if (!conditions || conditions.length === 0) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.no_conditions"
      );
    }
    let str = "";
    if (typeof conditions[0] === "string") {
      str += conditions[0];
    } else {
      str += describeCondition(conditions[0], this.hass, this._entityReg);
    }
    if (conditions.length > 1) {
      str += this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.option_description_additional",
        { numberOfAdditionalConditions: conditions.length - 1 }
      );
    }
    return str;
  }

  protected render() {
    const action = this.action;

    return html`
      <ha-sortable
        handle-selector=".handle"
        .disabled=${!this._showReorder || this.disabled}
        group="choose-options"
        .path=${[...(this.path ?? []), "choose"]}
        invert-swap
      >
        <div class="options">
          ${repeat(
            action.choose ? ensureArray(action.choose) : [],
            (option) => option,
            (option, idx) => html`
              <div class="option">
                <ha-card>
                  <ha-expansion-panel
                    .index=${idx}
                    leftChevron
                    @expanded-changed=${this._expandedChanged}
                  >
                    <h3 slot="header">
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.type.choose.option",
                        { number: idx + 1 }
                      )}:
                      ${option.alias ||
                      (this._expandedStates[idx]
                        ? ""
                        : this._getDescription(option))}
                    </h3>
                    ${this._showReorder && !this.disabled
                      ? html`
                          <div class="handle" slot="icons">
                            <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                          </div>
                        `
                      : nothing}

                    <ha-button-menu
                      slot="icons"
                      .idx=${idx}
                      @action=${this._handleAction}
                      @click=${preventDefault}
                      fixed
                    >
                      <ha-icon-button
                        slot="trigger"
                        .label=${this.hass.localize("ui.common.menu")}
                        .path=${mdiDotsVertical}
                      ></ha-icon-button>
                      <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.rename"
                        )}
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiRenameBox}
                        ></ha-svg-icon>
                      </mwc-list-item>

                      <mwc-list-item graphic="icon" .disabled=${this.disabled}>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.duplicate"
                        )}
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiContentDuplicate}
                        ></ha-svg-icon>
                      </mwc-list-item>

                      <mwc-list-item
                        graphic="icon"
                        .disabled=${this.disabled || idx === 0}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.move_up"
                        )}
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiArrowUp}
                        ></ha-svg-icon>
                      </mwc-list-item>

                      <mwc-list-item
                        graphic="icon"
                        .disabled=${this.disabled ||
                        idx === ensureArray(this.action.choose).length - 1}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.move_down"
                        )}
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiArrowDown}
                        ></ha-svg-icon>
                      </mwc-list-item>

                      <mwc-list-item
                        class="warning"
                        graphic="icon"
                        .disabled=${this.disabled}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.type.choose.remove_option"
                        )}
                        <ha-svg-icon
                          class="warning"
                          slot="graphic"
                          .path=${mdiDelete}
                        ></ha-svg-icon>
                      </mwc-list-item>
                    </ha-button-menu>

                    <div class="card-content">
                      <h4>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.type.choose.conditions"
                        )}:
                      </h4>
                      <ha-automation-condition
                        .path=${[
                          ...(this.path ?? []),
                          "choose",
                          idx,
                          "conditions",
                        ]}
                        .conditions=${ensureArray<string | Condition>(
                          option.conditions
                        )}
                        .disabled=${this.disabled}
                        .hass=${this.hass}
                        .idx=${idx}
                        @value-changed=${this._conditionChanged}
                      ></ha-automation-condition>
                      <h4>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.type.choose.sequence"
                        )}:
                      </h4>
                      <ha-automation-action
                        .path=${[
                          ...(this.path ?? []),
                          "choose",
                          idx,
                          "sequence",
                        ]}
                        .actions=${ensureArray(option.sequence) || []}
                        .disabled=${this.disabled}
                        .hass=${this.hass}
                        .idx=${idx}
                        @value-changed=${this._actionChanged}
                      ></ha-automation-action>
                    </div>
                  </ha-expansion-panel>
                </ha-card>
              </div>
            `
          )}
        </div>
      </ha-sortable>
      <ha-button
        outlined
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.add_option"
        )}
        .disabled=${this.disabled}
        @click=${this._addOption}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </ha-button>
      ${this._showDefault || action.default
        ? html`
            <h2>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.default"
              )}:
            </h2>
            <ha-automation-action
              .path=${[...(this.path ?? []), "default"]}
              .actions=${ensureArray(action.default) || []}
              .disabled=${this.disabled}
              @value-changed=${this._defaultChanged}
              .hass=${this.hass}
            ></ha-automation-action>
          `
        : html`<div class="link-button-row">
            <button
              class="link"
              @click=${this._addDefault}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.add_default"
              )}
            </button>
          </div>`}
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._renameAction(ev);
        break;
      case 1:
        this._duplicateOption(ev);
        break;
      case 2:
        this._moveUp(ev);
        break;
      case 3:
        this._moveDown(ev);
        break;
      case 4:
        this._removeOption(ev);
        break;
    }
  }

  private async _renameAction(ev: CustomEvent<ActionDetail>): Promise<void> {
    const index = (ev.target as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    const choice = choose[index];
    const alias = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.change_alias"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.alias"
      ),
      inputType: "string",
      placeholder: capitalizeFirstLetter(this._getDescription(choice)),
      defaultValue: choice.alias,
      confirmText: this.hass.localize("ui.common.submit"),
    });
    if (alias !== null) {
      if (alias === "") {
        delete choose[index].alias;
      } else {
        choose[index].alias = alias;
      }
      fireEvent(this, "value-changed", {
        value: { ...this.action, choose },
      });
    }
  }

  private _duplicateOption(ev) {
    const index = (ev.target as any).idx;
    this._createOption(deepClone(ensureArray(this.action.choose)[index]));
  }

  protected firstUpdated() {
    ensureArray(this.action.choose).forEach(() =>
      this._expandedStates.push(false)
    );
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (this._expandLast) {
      const nodes = this.shadowRoot!.querySelectorAll("ha-expansion-panel");
      nodes[nodes.length - 1].expanded = true;
      this._expandLast = false;
    }
  }

  private _addDefault() {
    this._showDefault = true;
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Condition[];
    const index = (ev.target as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose[index].conditions = value;
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    const index = (ev.target as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose[index].sequence = value;
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _addOption() {
    this._createOption({ conditions: [], sequence: [] });
  }

  private _createOption(opt: ChooseActionChoice) {
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose.push(opt);
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
    this._expandLast = true;
    this._expandedStates[choose.length - 1] = true;
  }

  private _moveUp(ev) {
    const index = (ev.target as any).idx;
    const newIndex = index - 1;
    this._move(index, newIndex);
  }

  private _moveDown(ev) {
    const index = (ev.target as any).idx;
    const newIndex = index + 1;
    this._move(index, newIndex);
  }

  private _move(index: number, newIndex: number) {
    const options = ensureArray(this.action.choose)!.concat();
    const item = options.splice(index, 1)[0];
    options.splice(newIndex, 0, item);

    const expanded = this._expandedStates.splice(index, 1)[0];
    this._expandedStates.splice(newIndex, 0, expanded);

    fireEvent(this, "value-changed", {
      value: { ...this.action, choose: options },
    });
  }

  private _removeOption(ev: CustomEvent) {
    const index = (ev.target as any).idx;
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete_confirm_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        const choose = this.action.choose
          ? [...ensureArray(this.action.choose)]
          : [];
        choose.splice(index, 1);
        this._expandedStates.splice(index, 1);
        fireEvent(this, "value-changed", {
          value: { ...this.action, choose },
        });
      },
    });
  }

  private _defaultChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._showDefault = true;
    const defaultAction = ev.detail.value as Action[];
    const newValue: ChooseAction = {
      ...this.action,
      default: defaultAction,
    };
    if (defaultAction.length === 0) {
      delete newValue.default;
    }
    fireEvent(this, "value-changed", { value: newValue });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .options {
          padding: 16px;
          margin: -16px -16px 0px -16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .options:not(:has(.option)) {
          margin: -16px;
        }
        .sortable-ghost {
          background: none;
          border-radius: var(--ha-card-border-radius, 12px);
        }
        .sortable-drag {
          background: none;
        }
        .add-card mwc-button {
          display: block;
          text-align: center;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        mwc-list-item.hidden {
          display: none;
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        ha-icon-button {
          inset-inline-start: initial;
          inset-inline-end: 0;
          direction: var(--direction);
        }
        ha-svg-icon {
          height: 20px;
        }
        .link-button-row {
          padding: 14px 14px 0 14px;
        }
        .card-content {
          padding: 0 16px 16px 16px;
        }
        .handle {
          padding: 12px;
          cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab;
        }
        .handle ha-svg-icon {
          pointer-events: none;
          height: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-choose": HaChooseAction;
  }
}
