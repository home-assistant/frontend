import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, queryAll } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { Option } from "../../../../data/script";
import { AutomationSortableListMixin } from "../ha-automation-sortable-list-mixin";
import { automationRowsStyles } from "../styles";
import "./ha-automation-option-row";
import type HaAutomationOptionRow from "./ha-automation-option-row";

@customElement("ha-automation-option")
export default class HaAutomationOption extends AutomationSortableListMixin<Option>(
  LitElement
) {
  @property({ attribute: false }) public options!: Option[];

  @property({ type: Boolean, attribute: "show-default" })
  public showDefaultActions = false;

  @queryAll("ha-automation-option-row")
  private _optionRowElements?: HaAutomationOptionRow[];

  protected get items(): Option[] {
    return this.options;
  }

  protected set items(items: Option[]) {
    this.options = items;
  }

  protected render() {
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector="ha-automation-option-row"
        .disabled=${this.disabled}
        group="options"
        invert-swap
        @item-moved=${this.itemMoved}
        @item-added=${this.itemAdded}
        @item-removed=${this.itemRemoved}
      >
        <div class="rows ${!this.optionsInSidebar ? "no-sidebar" : ""}">
          ${repeat(
            this.options,
            (option) => this.getKey(option),
            (option, idx) => html`
              <ha-automation-option-row
                .sortableData=${option}
                .index=${idx}
                .first=${idx === 0}
                .last=${idx === this.options.length - 1}
                .option=${option}
                .narrow=${this.narrow}
                .disabled=${this.disabled}
                @duplicate=${this.duplicateItem}
                @move-down=${this.moveDown}
                @move-up=${this.moveUp}
                @value-changed=${this.itemChanged}
                .hass=${this.hass}
                .optionsInSidebar=${this.optionsInSidebar}
                .sortSelected=${this.rowSortSelected === idx}
                @stop-sort-selection=${this.stopSortSelection}
              >
                ${!this.disabled
                  ? html`
                      <div
                        tabindex="0"
                        class="handle ${this.rowSortSelected === idx
                          ? "active"
                          : ""}"
                        slot="icons"
                        @keydown=${this.handleDragKeydown}
                        @click=${stopPropagation}
                        .index=${idx}
                      >
                        <ha-svg-icon
                          .path=${mdiDragHorizontalVariant}
                        ></ha-svg-icon>
                      </div>
                    `
                  : nothing}
              </ha-automation-option-row>
            `
          )}
          <div class="buttons">
            <ha-button
              appearance="filled"
              size="small"
              .disabled=${this.disabled}
              @click=${this._addOption}
            >
              <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.add_option"
              )}
            </ha-button>
            ${!this.showDefaultActions
              ? html`<ha-button
                  appearance="plain"
                  size="small"
                  .disabled=${this.disabled}
                  @click=${this._showDefaultActions}
                >
                  <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type.choose.add_default"
                  )}
                </ha-button>`
              : nothing}
          </div>
        </div>
      </ha-sortable>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (
      changedProps.has("options") &&
      (this.focusLastItemOnChange || this.focusItemIndexOnChange !== undefined)
    ) {
      const mode = this.focusLastItemOnChange ? "new" : "moved";

      const row = this.shadowRoot!.querySelector<HaAutomationOptionRow>(
        `ha-automation-option-row:${mode === "new" ? "last-of-type" : `nth-of-type(${this.focusItemIndexOnChange! + 1})`}`
      )!;

      this.focusLastItemOnChange = false;
      this.focusItemIndexOnChange = undefined;

      row.updateComplete.then(() => {
        if (this.narrow) {
          row.scrollIntoView({
            block: "start",
            behavior: "smooth",
          });
        }

        if (mode === "new") {
          row.expand();
        }

        if (this.optionsInSidebar) {
          row.openSidebar();
        } else {
          row.focus();
        }
      });
    }
  }

  public expandAll() {
    this._optionRowElements?.forEach((row) => row.expandAll());
  }

  public collapseAll() {
    this._optionRowElements?.forEach((row) => row.collapseAll());
  }

  private _addOption = () => {
    const options = this.options.concat({ conditions: [], sequence: [] });
    this.focusLastItemOnChange = true;
    fireEvent(this, "value-changed", { value: options });
  };

  private _showDefaultActions = () => {
    fireEvent(this, "show-default-actions");
  };

  static styles = [
    automationRowsStyles,
    css`
      :host([root]) .rows {
        padding-inline-end: 8px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-option": HaAutomationOption;
  }

  interface HASSDomEvents {
    "show-default-actions": undefined;
  }
}
