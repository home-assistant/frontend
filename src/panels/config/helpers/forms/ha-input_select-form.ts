import "@material/mwc-button/mwc-button";
import { mdiDelete, mdiDrag } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { guard } from "lit/directives/guard";
import { SortableEvent } from "sortablejs";
import Sortable from "sortablejs/modular/sortable.core.esm";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-picker";
import type { InputSelect } from "../../../../data/input_select";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-input_select-form")
class HaInputSelectForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: InputSelect;

  @state() private _attached = false;

  @state() private _renderEmptySortable = false;

  private _sortable?: Sortable;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
  }

  @state() private _reordering = true;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _options: string[] = [];

  @query("#option_input", true) private _optionInput?: PaperInputElement;

  set item(item: InputSelect) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._options = item.options || [];
    } else {
      this._name = "";
      this._icon = "";
      this._options = [];
    }
  }

  public focus() {
    this.updateComplete.then(() =>
      (
        this.shadowRoot?.querySelector("[dialogInitialFocus]") as HTMLElement
      )?.focus()
    );
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const nameInvalid = !this._name || this._name.trim() === "";

    return html`
      <div class="form">
        <paper-input
          .value=${this._name}
          .configValue=${"name"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          .errorMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          .invalid=${nameInvalid}
          dialogInitialFocus
        ></paper-input>
        <ha-icon-picker
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
        ></ha-icon-picker>
        <div class="options">
          ${this.hass!.localize(
            "ui.dialogs.helper_settings.input_select.options"
          )}:
          ${guard([this._options, this._renderEmptySortable], () =>
            this._renderEmptySortable
              ? html`
                  <paper-item>
                    ${this.hass!.localize(
                      "ui.dialogs.helper_settings.input_select.no_options"
                    )}
                  </paper-item>
                `
              : this._options.map(
                  (option, index) => html`
                    <paper-item class="option">
                      ${this._reordering
                        ? html`
                            <div class="reorderButtonWrapper">
                              <ha-svg-icon
                                .title=${this.hass!.localize(
                                  "ui.panel.lovelace.cards.shopping-list.drag_and_drop"
                                )}
                                class="reorderButton"
                                .path=${mdiDrag}
                              >
                              </ha-svg-icon>
                            </div>
                          `
                        : ""}
                      <paper-item class="option">
                        <paper-input
                          class="option_input"
                          label=${index}
                          autocapitalize="none"
                          autocomplete="off"
                          autocorrect="off"
                          spellcheck="false"
                          @value-changed=${this._inputValueChanged}
                          .value=${option}
                        >
                        </paper-input>
                        <ha-icon-button
                          .index=${index}
                          .label=${this.hass.localize(
                            "ui.dialogs.helper_settings.input_select.remove_option"
                          )}
                          @click=${this._removeOption}
                          .path=${mdiDelete}
                        ></ha-icon-button>
                      </paper-item>
                    </paper-item>
                  `
                )
          )}:
        </div>
        <div class="layout horizontal bottom">
          <paper-input
            class="flex-auto"
            id="option_input"
            .label=${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add_option"
            )}
            @keydown=${this._handleKeyAdd}
          ></paper-input>
          <mwc-button @click=${this._addOption}
            >${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add"
            )}</mwc-button
          >
        </div>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const attachedChanged = changedProps.has("_attached");
    const entitiesChanged = changedProps.has("_options");

    if (!entitiesChanged && !attachedChanged) {
      return;
    }

    if (attachedChanged && !this._attached) {
      // Tear down sortable, if available
      this._sortable?.destroy();
      this._sortable = undefined;
      return;
    }

    if (!this._sortable && this._options) {
      this._createSortable();
      return;
    }

    if (entitiesChanged) {
      this._handleEntitiesChanged();
    }
  }

  private async _handleEntitiesChanged() {
    this._renderEmptySortable = true;
    await this.updateComplete;
    const container = this.shadowRoot!.querySelector(".options")!;
    while (container.lastElementChild) {
      container.removeChild(container.lastElementChild);
    }
    this._renderEmptySortable = false;
  }

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newOptions = this._options!.concat();

    newOptions.splice(ev.newIndex!, 0, newOptions.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "value-changed", {
      value: { ...this._item, options: newOptions },
    });
  }

  private _createSortable() {
    this._sortable = new Sortable(this.shadowRoot!.querySelector(".options"), {
      animation: 150,
      fallbackClass: "sortable-fallback",
      handle: "ha-svg-icon",
      onEnd: async (evt: SortableEvent) => this._rowMoved(evt),
    });
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.keyCode !== 13) {
      return;
    }
    this._addOption();
  }

  private _addOption() {
    const input = this._optionInput;
    if (!input || !input.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this._item, options: [...this._options, input.value] },
    });
    input.value = "";
  }

  private async _removeOption(ev: Event) {
    const index = (ev.target as any).index;
    if (
      !(await showConfirmationDialog(this, {
        title: "Delete this item?",
        text: "Are you sure you want to delete this item?",
      }))
    ) {
      return;
    }
    const options = [...this._options];
    options.splice(index, 1);
    fireEvent(this, "value-changed", {
      value: { ...this._item, options },
    });
  }

  private _inputValueChanged(ev: CustomEvent) {
    const updatedValue = ev.detail.value;
    const labelIndex = (ev.target as any).label;

    const newValue = { ...this._item };
    (newValue.options as string[])[labelIndex] = updatedValue;

    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }
    ev.stopPropagation();
    const configValue = (ev.target as any).configValue;
    const value = ev.detail.value;
    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (!value) {
      delete newValue[configValue];
    } else {
      newValue[configValue] = ev.detail.value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .form {
          color: var(--primary-text-color);
        }
        paper-input.option_input {
          width: 100%;
        }
        .option {
          padding: 0;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
        }
        mwc-button {
          margin-left: 8px;
        }
        .reorderButtonWrapper {
          width: 48px;
          height: 48px;
        }
        .reorderButton {
          display: inline;
          padding-right: 8px;
          cursor: move;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input_select-form": HaInputSelectForm;
  }
}
