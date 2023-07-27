import { consume } from "@lit-labs/context";
import type { SortableEvent } from "sortablejs";
import { mdiDelete, mdiPlus, mdiArrowUp, mdiArrowDown, mdiDrag } from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import {
  loadSortable,
  SortableInstance,
} from "../../../../../resources/sortable.ondemand";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-icon-button";
import { Condition } from "../../../../../data/automation";
import {
  Action,
  ChooseAction,
  ChooseActionChoice,
} from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";
import { describeCondition } from "../../../../../data/automation_i18n";
import { fullEntitiesContext } from "../../../../../data/context";
import { EntityRegistryEntry } from "../../../../../data/entity_registry";
import { sortableStyles } from "../../../../../resources/ha-sortable-style";

@customElement("ha-automation-action-choose")
export class HaChooseAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public action!: ChooseAction;

  @property({ type: Boolean }) public reOrderMode = false;

  @state() private _showDefault = false;

  @state() private _expandedStates: boolean[] = [];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _expandLast = false;

  private _sortable?: SortableInstance;

  private _optionKeys = new WeakMap<ChooseActionChoice, string>();

  public static get defaultConfig() {
    return { choose: [{ conditions: [], sequence: [] }] };
  }

  private isExpanded(i: number) {
    const nodes = this.shadowRoot!.querySelectorAll("ha-expansion-panel");
    if (nodes[i]) {
      return nodes[i].expanded;
    }
    return false;
  }

  private _expandedChanged() {
    this._expandedStates = this._expandedStates.concat();
  }

  private _getDescription(option, idx: number) {
    if (this.isExpanded(idx)) {
      return "";
    }
    if (!option.conditions || option.conditions.length === 0) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.no_conditions"
      );
    }
    let str = "";
    if (typeof option.conditions[0] === "string") {
      str += option.conditions[0];
    } else {
      str += describeCondition(
        option.conditions[0],
        this.hass,
        this._entityReg
      );
    }
    if (option.conditions.length > 1) {
      str += this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.option_description_additional",
        "numberOfAdditionalConditions",
        option.conditions.length - 1
      );
    }
    return str;
  }

  protected render() {
    const action = this.action;

    return html`
      <div class="options">
        ${repeat(
          action.choose ? ensureArray(action.choose) : [],
          (option) => this._getKey(option),
          (option, idx) =>
            html`<ha-card>
              <ha-expansion-panel
                leftChevron
                @expanded-changed=${this._expandedChanged}
              >
                <h3 slot="header">
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type.choose.option",
                    "number",
                    idx + 1
                  )}:
                  ${this._getDescription(option, idx)}
                </h3>
                ${this.reOrderMode
                  ? html`
                      <ha-icon-button
                        .index=${idx}
                        slot="icons"
                        .label=${this.hass.localize(
                          "ui.panel.config.automation.editor.move_up"
                        )}
                        .path=${mdiArrowUp}
                        @click=${this._moveUp}
                        .disabled=${idx === 0}
                      ></ha-icon-button>
                      <ha-icon-button
                        .index=${idx}
                        slot="icons"
                        .label=${this.hass.localize(
                          "ui.panel.config.automation.editor.move_down"
                        )}
                        .path=${mdiArrowDown}
                        @click=${this._moveDown}
                        .disabled=${idx ===
                        ensureArray(this.action.choose).length - 1}
                      ></ha-icon-button>
                      <div class="handle" slot="icons">
                        <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                      </div>
                    `
                  : html`
                      <ha-icon-button
                        slot="icons"
                        .idx=${idx}
                        .disabled=${this.disabled}
                        @click=${this._removeOption}
                        .label=${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.type.choose.remove_option"
                        )}
                        .path=${mdiDelete}
                      ></ha-icon-button>
                    `}
                <div class="card-content">
                  <h4>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.actions.type.choose.conditions"
                    )}:
                  </h4>
                  <ha-automation-condition
                    nested
                    .conditions=${ensureArray<string | Condition>(
                      option.conditions
                    )}
                    .reOrderMode=${this.reOrderMode}
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
                    nested
                    .actions=${ensureArray(option.sequence) || []}
                    .reOrderMode=${this.reOrderMode}
                    .disabled=${this.disabled}
                    .hass=${this.hass}
                    .idx=${idx}
                    @value-changed=${this._actionChanged}
                  ></ha-automation-action>
                </div>
              </ha-expansion-panel>
            </ha-card>`
        )}
      </div>
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
              nested
              .actions=${ensureArray(action.default) || []}
              .reOrderMode=${this.reOrderMode}
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

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("reOrderMode")) {
      if (this.reOrderMode) {
        this._createSortable();
      } else {
        this._destroySortable();
      }
    }

    const nodes = this.shadowRoot!.querySelectorAll("ha-expansion-panel");
    if (this._expandedStates.length !== nodes.length) {
      this._expandedStates = [];
    }
    let update = false;
    for (let i = 0; i < nodes.length; i++) {
      if (this._expandLast && i === nodes.length - 1) {
        nodes[i].expanded = true;
        update = true;
      }
      if (this._expandedStates[i] !== nodes[i].expanded) {
        this._expandedStates[i] = nodes[i].expanded;
        update = true;
      }
    }
    if (update) {
      this._expandedStates = this._expandedStates.concat();
    }
    this._expandLast = false;
  }

  private _getKey(option: ChooseActionChoice) {
    if (!this._optionKeys.has(option)) {
      this._optionKeys.set(option, Math.random().toString());
    }

    return this._optionKeys.get(option)!;
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
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose.push({ conditions: [], sequence: [] });
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
    this._expandLast = true;
  }

  private _moveUp(ev) {
    const index = (ev.target as any).index;
    const newIndex = index - 1;
    this._move(index, newIndex);
  }

  private _moveDown(ev) {
    const index = (ev.target as any).index;
    const newIndex = index + 1;
    this._move(index, newIndex);
  }

  private _dragged(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) return;
    this._move(ev.oldIndex!, ev.newIndex!);
  }

  private _move(index: number, newIndex: number) {
    const options = ensureArray(this.action.choose)!.concat();
    const item = options.splice(index, 1)[0];
    options.splice(newIndex, 0, item);
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose: options },
    });
  }

  private _removeOption(ev: CustomEvent) {
    const index = (ev.currentTarget as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose.splice(index, 1);
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _defaultChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        default: value,
      },
    });
  }

  private async _createSortable() {
    const Sortable = await loadSortable();
    this._sortable = new Sortable(this.shadowRoot!.querySelector(".options")!, {
      animation: 150,
      fallbackClass: "sortable-fallback",
      handle: ".handle",
      onChoose: (evt: SortableEvent) => {
        (evt.item as any).placeholder =
          document.createComment("sort-placeholder");
        evt.item.after((evt.item as any).placeholder);
      },
      onEnd: (evt: SortableEvent) => {
        // put back in original location
        if ((evt.item as any).placeholder) {
          (evt.item as any).placeholder.replaceWith(evt.item);
          delete (evt.item as any).placeholder;
        }
        this._dragged(evt);
      },
    });
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      sortableStyles,
      css`
        ha-card {
          margin: 0 0 16px 0;
        }
        .add-card mwc-button {
          display: block;
          text-align: center;
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
          cursor: move;
          padding: 12px;
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
