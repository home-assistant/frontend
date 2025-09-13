import { mdiDrag, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, queryAll, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { nextRender } from "../../../../common/util/render-status";
import "../../../../components/ha-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { AutomationClipboard } from "../../../../data/automation";
import type { Option } from "../../../../data/script";
import type { HomeAssistant } from "../../../../types";
import { automationRowsStyles } from "../styles";
import "./ha-automation-option-row";
import type HaAutomationOptionRow from "./ha-automation-option-row";

@customElement("ha-automation-option")
export default class HaAutomationOption extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public options!: Option[];

  @property({ type: Boolean, attribute: "sidebar" }) public optionsInSidebar =
    false;

  @property({ type: Boolean, attribute: "show-default" })
  public showDefaultActions = false;

  @state() private _rowSortSelected?: number;

  @state()
  @storage({
    key: "automationClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  @queryAll("ha-automation-option-row")
  private _optionRowElements?: HaAutomationOptionRow[];

  private _focusLastOptionOnChange = false;

  private _focusOptionIndexOnChange?: number;

  private _optionsKeys = new WeakMap<Option, string>();

  protected render() {
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector="ha-automation-option-row"
        .disabled=${this.disabled}
        group="options"
        invert-swap
        @item-moved=${this._optionMoved}
        @item-added=${this._optionAdded}
        @item-removed=${this._optionRemoved}
      >
        <div class="rows ${!this.optionsInSidebar ? "no-sidebar" : ""}">
          ${repeat(
            this.options,
            (option) => this._getKey(option),
            (option, idx) => html`
              <ha-automation-option-row
                .sortableData=${option}
                .index=${idx}
                .first=${idx === 0}
                .last=${idx === this.options.length - 1}
                .option=${option}
                .narrow=${this.narrow}
                .disabled=${this.disabled}
                @duplicate=${this._duplicateOption}
                @move-down=${this._moveDown}
                @move-up=${this._moveUp}
                @value-changed=${this._optionChanged}
                .hass=${this.hass}
                .optionsInSidebar=${this.optionsInSidebar}
                .sortSelected=${this._rowSortSelected === idx}
                @stop-sort-selection=${this._stopSortSelection}
              >
                ${!this.disabled
                  ? html`
                      <div
                        tabindex="0"
                        class="handle ${this._rowSortSelected === idx
                          ? "active"
                          : ""}"
                        slot="icons"
                        @keydown=${this._handleDragKeydown}
                        .index=${idx}
                      >
                        <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
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
      (this._focusLastOptionOnChange ||
        this._focusOptionIndexOnChange !== undefined)
    ) {
      const mode = this._focusLastOptionOnChange ? "new" : "moved";

      const row = this.shadowRoot!.querySelector<HaAutomationOptionRow>(
        `ha-automation-option-row:${mode === "new" ? "last-of-type" : `nth-of-type(${this._focusOptionIndexOnChange! + 1})`}`
      )!;

      this._focusLastOptionOnChange = false;
      this._focusOptionIndexOnChange = undefined;

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
    this._focusLastOptionOnChange = true;
    fireEvent(this, "value-changed", { value: options });
  };

  private _getKey(option: Option) {
    if (!this._optionsKeys.has(option)) {
      this._optionsKeys.set(option, Math.random().toString());
    }

    return this._optionsKeys.get(option)!;
  }

  private _moveUp(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    if (!(ev.target as HaAutomationOptionRow).first) {
      const newIndex = index - 1;
      this._move(index, newIndex);
      if (this._rowSortSelected === index) {
        this._rowSortSelected = newIndex;
      }
      ev.target.focus();
    }
  }

  private _moveDown(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    if (!(ev.target as HaAutomationOptionRow).last) {
      const newIndex = index + 1;
      this._move(index, newIndex);
      if (this._rowSortSelected === index) {
        this._rowSortSelected = newIndex;
      }
      ev.target.focus();
    }
  }

  private _move(oldIndex: number, newIndex: number) {
    const options = this.options.concat();
    const item = options.splice(oldIndex, 1)[0];
    options.splice(newIndex, 0, item);
    this.options = options;
    fireEvent(this, "value-changed", { value: options });
  }

  private _optionMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    this._move(oldIndex, newIndex);
  }

  private async _optionAdded(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index, data } = ev.detail;
    const item = ev.detail.item as HaAutomationOptionRow;
    const selected = item.selected;

    const options = [
      ...this.options.slice(0, index),
      data,
      ...this.options.slice(index),
    ];
    // Add option locally to avoid UI jump
    this.options = options;
    if (selected) {
      this._focusOptionIndexOnChange = options.length === 1 ? 0 : index;
    }
    await nextRender();
    fireEvent(this, "value-changed", { value: this.options });
  }

  private async _optionRemoved(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index } = ev.detail;
    const option = this.options[index];
    // Remove option locally to avoid UI jump
    this.options = this.options.filter((o) => o !== option);
    await nextRender();
    // Ensure option is removed even after update
    const options = this.options.filter((o) => o !== option);
    fireEvent(this, "value-changed", { value: options });
  }

  private _optionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const options = [...this.options];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      options.splice(index, 1);
    } else {
      // Store key on new value.
      const key = this._getKey(options[index]);
      this._optionsKeys.set(newValue, key);

      options[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: options });
  }

  private _duplicateOption(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.options.toSpliced(
        index + 1,
        0,
        deepClone(this.options[index])
      ),
    });
  }

  private _showDefaultActions = () => {
    fireEvent(this, "show-default-actions");
  };

  private _handleDragKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.stopPropagation();
      this._rowSortSelected =
        this._rowSortSelected === undefined
          ? (ev.target as any).index
          : undefined;
    }
  }

  private _stopSortSelection() {
    this._rowSortSelected = undefined;
  }

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
