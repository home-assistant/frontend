import { consume } from "@lit-labs/context";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  mdiDotsVertical,
  mdiRenameBox,
  mdiSort,
  mdiContentDuplicate,
  mdiDelete,
  mdiPlus,
  mdiArrowUp,
  mdiArrowDown,
  mdiDrag,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { ActionDetail } from "@material/mwc-list";
import type { SortableEvent } from "sortablejs";
import type { SortableInstance } from "../../../../../resources/sortable";
import { describeAction } from "../../../../../data/script_i18n";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { capitalizeFirstLetter } from "../../../../../common/string/capitalize-first-letter";
import "../../../../../components/ha-textfield";
import {
  Action,
  ParallelAction,
  SequenceAction,
} from "../../../../../data/script";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, ItemPath } from "../../../../../types";
import "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fullEntitiesContext } from "../../../../../data/context";
import { EntityRegistryEntry } from "../../../../../data/entity_registry";
import { sortableStyles } from "../../../../../resources/ha-sortable-style";

const preventDefault = (ev) => ev.preventDefault();

@customElement("ha-automation-action-parallel")
export class HaParallelAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public path?: ItemPath;

  @property({ attribute: false }) public action!: ParallelAction;

  @state() private _expandedStates: boolean[] = [];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _expandLast = false;

  private _sortable?: SortableInstance;

  public static get defaultConfig() {
    return {
      parallel: [{ sequence: [] }],
    };
  }

  private _expandedChanged(ev) {
    this._expandedStates = this._expandedStates.concat();
    this._expandedStates[ev.target!.index] = ev.detail.expanded;
  }

  private _getDescription(sequence) {
    const actions = ensureArray(sequence.sequence);
    if (!actions || actions.length === 0) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.parallel.no_actions"
      );
    }
    if (actions.length === 1) {
      return describeAction(this.hass, this._entityReg, actions[0]);
    }

    return this.hass.localize(
      "ui.panel.config.automation.editor.actions.type.parallel.actions",
      { number: actions.length }
    );
  }

  protected render() {
    const action = this.action;

    action.parallel = (action.parallel ? ensureArray(action.parallel) : []).map(
      (sequenceAction) =>
        sequenceAction.sequence
          ? sequenceAction
          : { sequence: [sequenceAction] }
    );

    return html`
      ${action.parallel.map(
        (sequence, idx) =>
          html`<ha-card class="parallel">
            <ha-expansion-panel
              .index=${idx}
              leftChevron
              @expanded-changed=${this._expandedChanged}
            >
              <h3 slot="header">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.type.parallel.sequence",
                  { number: idx + 1 }
                )}:
                ${sequence.alias || this._getDescription(sequence)}
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
                      ensureArray(this.action.parallel).length - 1}
                    ></ha-icon-button>
                    <div class="handle" slot="icons">
                      <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    </div>
                  `
                : html`
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
                          "ui.panel.config.automation.editor.actions.re_order"
                        )}
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiSort}
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
                        class="warning"
                        graphic="icon"
                        .disabled=${this.disabled}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.type.parallel.remove_sequence"
                        )}
                        <ha-svg-icon
                          class="warning"
                          slot="graphic"
                          .path=${mdiDelete}
                        ></ha-svg-icon>
                      </mwc-list-item>
                    </ha-button-menu>
                  `}
              <div class="card-content">
                <h4>&nbsp;</h4>
                <ha-automation-action
                  nested
                  .actions=${ensureArray(sequence.sequence) || []}
                  .disabled=${this.disabled}
                  @value-changed=${this._actionChanged}
                  .hass=${this.hass}
                  .idx=${idx}
                  .path=${[...(this.path ?? []), "parallel"]}
                ></ha-automation-action>
              </div>
            </ha-expansion-panel>
          </ha-card>`
      )}
      <mwc-button
        outlined
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.parallel.add_sequence"
        )}
        .disabled=${this.disabled}
        @click=${this._addSequence}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </mwc-button>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._renameAction(ev);
        break;
      case 1:
        fireEvent(this, "re-order");
        break;
      case 2:
        this._duplicateParallel(ev);
        break;
      case 3:
        this._removeSequence(ev);
        break;
    }
  }

  private async _renameAction(ev: CustomEvent<ActionDetail>): Promise<void> {
    const index = (ev.target as any).idx;
    const parallel = this.action.parallel
      ? [...ensureArray(this.action.parallel)]
      : [];
    const current = parallel[index];
    const alias = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.parallel.change_alias"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.parallel.alias"
      ),
      inputType: "string",
      placeholder: capitalizeFirstLetter(this._getDescription(current)),
      defaultValue: current.alias,
      confirmText: this.hass.localize("ui.common.submit"),
    });
    if (alias !== null) {
      if (alias === "") {
        delete parallel[index].alias;
      } else {
        parallel[index].alias = alias;
      }
      fireEvent(this, "value-changed", {
        value: { ...this.action, parallel },
      });
    }
  }

  private _duplicateParallel(ev) {
    const index = (ev.target as any).idx;
    this._createSequence(deepClone(ensureArray(this.action.parallel)[index]));
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    const index = (ev.target as any).idx;
    const parallel = this.action.parallel
      ? [...ensureArray(this.action.parallel)]
      : [];
    parallel[index].sequence = value;
    fireEvent(this, "value-changed", {
      value: { ...this.action, parallel },
    });
  }

  protected firstUpdated() {
    ensureArray(this.action.parallel).forEach(() =>
      this._expandedStates.push(false)
    );
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

    if (this._expandLast) {
      const nodes = this.shadowRoot!.querySelectorAll("ha-expansion-panel");
      nodes[nodes.length - 1].expanded = true;
      this._expandLast = false;
    }
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
    const parallel = ensureArray(this.action.parallel)!.concat();
    const item = parallel.splice(index, 1)[0];
    parallel.splice(newIndex, 0, item);

    const expanded = this._expandedStates.splice(index, 1)[0];
    this._expandedStates.splice(newIndex, 0, expanded);

    fireEvent(this, "value-changed", {
      value: { ...this.action, parallel },
    });
  }

  private _addSequence() {
    this._createSequence({ sequence: [] });
  }

  private _createSequence(sequence: SequenceAction) {
    const parallel = this.action.parallel
      ? [...ensureArray(this.action.parallel)]
      : [];
    parallel.push(sequence);
    fireEvent(this, "value-changed", {
      value: { ...this.action, parallel },
    });
    this._expandLast = true;
    this._expandedStates[parallel.length - 1] = true;
  }

  private _removeSequence(ev: CustomEvent) {
    const index = (ev.target as any).idx;
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.parallel.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete_confirm_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        const parallel = this.action.parallel
          ? [...ensureArray(this.action.parallel)]
          : [];
        parallel.splice(index, 1);
        this._expandedStates.splice(index, 1);
        fireEvent(this, "value-changed", {
          value: { ...this.action, parallel },
        });
      },
    });
  }

  private async _createSortable() {
    const Sortable = (await import("../../../../../resources/sortable"))
      .default;
    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".parallel")!,
      {
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
      }
    );
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
          margin: 16px 0;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-parallel": HaParallelAction;
  }
}
