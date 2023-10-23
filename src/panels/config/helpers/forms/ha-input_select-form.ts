import "@material/mwc-list/mwc-list";
import { mdiDelete, mdiDrag } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { SortableEvent } from "sortablejs";
import { sortableStyles } from "../../../../resources/ha-sortable-style";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import type { InputSelect } from "../../../../data/input_select";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { SortableInstance } from "../../../../resources/sortable";

@customElement("ha-input_select-form")
class HaInputSelectForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: InputSelect;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _options: string[] = [];

  private _sortable?: SortableInstance;

  @query("#option_input", true) private _optionInput?: HaTextField;

  public connectedCallback() {
    super.connectedCallback();
    this._createSortable();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._destroySortable();
  }

  private async _createSortable() {
    const Sortable = (await import("../../../../resources/sortable")).default;
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

  private _dragged(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) return;

    const options = this._options.concat();
    const option = options.splice(ev.oldIndex!, 1)[0];
    options.splice(ev.newIndex!, 0, option);

    fireEvent(this, "value-changed", {
      value: { ...this._item, options },
    });
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

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
    this.updateComplete.then(
      () =>
        (
          this.shadowRoot?.querySelector("[dialogInitialFocus]") as HTMLElement
        )?.focus()
    );
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="form">
        <ha-textfield
          dialogInitialFocus
          autoValidate
          required
          .validationMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          .value=${this._name}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          .configValue=${"name"}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-icon-picker
          .hass=${this.hass}
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
        ></ha-icon-picker>
        <div class="header">
          ${this.hass!.localize(
            "ui.dialogs.helper_settings.input_select.options"
          )}:
        </div>
        <mwc-list class="options">
          ${this._options.length
            ? repeat(
                this._options,
                (option) => option,
                (option, index) => html`
                  <ha-list-item class="option" hasMeta>
                    <div class="optioncontent">
                      <div class="handle">
                        <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                      </div>
                      ${option}
                    </div>
                    <ha-icon-button
                      slot="meta"
                      .index=${index}
                      .label=${this.hass.localize(
                        "ui.dialogs.helper_settings.input_select.remove_option"
                      )}
                      @click=${this._removeOption}
                      .path=${mdiDelete}
                    ></ha-icon-button>
                  </ha-list-item>
                `
              )
            : html`
                <ha-list-item noninteractive>
                  ${this.hass!.localize(
                    "ui.dialogs.helper_settings.input_select.no_options"
                  )}
                </ha-list-item>
              `}
        </mwc-list>
        <div class="layout horizontal center">
          <ha-textfield
            class="flex-auto"
            id="option_input"
            .label=${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add_option"
            )}
            @keydown=${this._handleKeyAdd}
          ></ha-textfield>
          <ha-button @click=${this._addOption}
            >${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add"
            )}</ha-button
          >
        </div>
      </div>
    `;
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.key !== "Enter") {
      return;
    }
    this._addOption();
  }

  private _addOption() {
    const input = this._optionInput;
    if (!input?.value) {
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

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }
    ev.stopPropagation();
    const configValue = (ev.target as any).configValue;
    const value = ev.detail?.value || (ev.target as any).value;

    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (!value) {
      delete newValue[configValue];
    } else {
      newValue[configValue] = value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      sortableStyles,
      css`
        .form {
          color: var(--primary-text-color);
        }
        .option {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
          --mdc-icon-button-size: 24px;
          --mdc-ripple-color: transparent;
          --mdc-list-side-padding: 16px;
          cursor: default;
          background-color: var(--card-background-color);
        }
        mwc-button {
          margin-left: 8px;
        }
        ha-textfield {
          display: block;
          margin-bottom: 8px;
        }
        #option_input {
          margin-top: 8px;
        }
        .header {
          margin-top: 8px;
          margin-bottom: 8px;
        }
        .handle {
          cursor: move;
          padding-right: 12px;
        }
        .handle ha-svg-icon {
          pointer-events: none;
          height: 24px;
        }
        .optioncontent {
          display: flex;
          align-items: center;
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
