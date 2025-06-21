import { customElement, property, state } from "lit/decorators";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat";
import { mdiDrag, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type {
  BlueprintClipboard,
  BlueprintInput,
  BlueprintInputSection,
} from "../../../../data/blueprint";
import "../../../../components/ha-sortable";
import "../../../../components/ha-button";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { nextRender } from "../../../../common/util/render-status";
import { storage } from "../../../../common/decorators/storage";
import type HaBlueprintInputRow from "./ha-blueprint-input-row";
import type { HaBlueprintInputSection } from "./types/ha-blueprint-input-section";
import { showNewInputDialog } from "../new-input-dialog/show-dialog-new-input";

import "./ha-blueprint-input-row";
import "./types/ha-blueprint-input-section";
import "./types/ha-blueprint-input-input";

@customElement("ha-blueprint-input")
export class HaBlueprintInput extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public inputs!: [
    string,
    BlueprintInput | BlueprintInputSection | null,
  ][];

  @property({ type: Boolean }) public disabled = false;

  @storage({
    key: "blueprintClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: BlueprintClipboard;

  @state() private _showReorder = false;

  private _focusLastInputOnChange = false;

  private _moveUp(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const newIndex = index - 1;
    this._move(index, newIndex);
  }

  private _moveDown(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const newIndex = index + 1;
    this._move(index, newIndex);
  }

  private _move(oldIndex: number, newIndex: number) {
    const inputs = this.inputs.concat();
    const item = inputs.splice(oldIndex, 1)[0];
    inputs.splice(newIndex, 0, item);
    this.inputs = inputs;
    fireEvent(this, "value-changed", { value: inputs });
  }

  private _inputMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    this._move(oldIndex, newIndex);
  }

  private async _inputAdded(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index, data } = ev.detail;
    const inputs = [
      ...this.inputs.slice(0, index),
      data,
      ...this.inputs.slice(index),
    ] as [string, BlueprintInput | BlueprintInputSection | null][];
    // Add input locally to avoid UI jump
    this.inputs = inputs;
    await nextRender();
    fireEvent(this, "value-changed", { value: this.inputs });
  }

  private async _inputRemoved(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index } = ev.detail;
    const input = this.inputs[index];
    // Remove input locally to avoid UI jump
    this.inputs = this.inputs.filter((c) => c !== input);
    await nextRender();
    // Ensure input is removed even after update
    const inputs = this.inputs.filter((c) => c !== input);
    fireEvent(this, "value-changed", { value: inputs });
  }

  private _inputChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const inputs = [...this.inputs];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;
    if (newValue === null) {
      inputs.splice(index, 1);
    } else {
      inputs[index] = newValue;
    }

    this.inputs = inputs;

    fireEvent(this, "value-changed", { value: inputs });
  }

  private _duplicateInput(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.inputs.concat(deepClone(this.inputs[index])),
    });
  }

  private async _addInput(id: string, type: "input" | "section") {
    const elClass = customElements.get(
      `ha-blueprint-input-${type}`
    ) as CustomElementConstructor & {
      defaultConfig: BlueprintInput | HaBlueprintInputSection | null;
    };
    const inputs = [...(this.inputs || []), [id, { ...elClass.defaultConfig }]];
    this._focusLastInputOnChange = true;
    fireEvent(this, "value-changed", { value: inputs });
  }

  private _showNewInputDialog() {
    showNewInputDialog(this, { onSubmit: this._addInput.bind(this) });
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("inputs")) {
      return;
    }

    let updatedInputs: BlueprintInput[] | undefined;
    if (!Array.isArray(this.inputs)) {
      updatedInputs = [this.inputs];
    }

    if (updatedInputs) {
      fireEvent(this, "value-changed", {
        value: updatedInputs,
      });
    } else if (this._focusLastInputOnChange) {
      this._focusLastInputOnChange = false;
      const row = this.shadowRoot!.querySelector<HaBlueprintInputRow>(
        "ha-blueprint-input-row:last-of-type"
      )!;
      row.updateComplete.then(() => {
        row.expand();
        row.scrollIntoView();
        row.focus();
      });
    }
  }

  protected render() {
    if (!Array.isArray(this.inputs)) {
      return nothing;
    }
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector="ha-blueprint-input-row"
        .disabled=${!this._showReorder || this.disabled}
        group="inputs"
        invert-swap
        @item-moved=${this._inputMoved}
        @item-added=${this._inputAdded}
        @item-removed=${this._inputRemoved}
      >
        <div class="inputs">
          ${repeat(
            this.inputs,
            ([id]) => id,
            (inputPair, idx) => html`
              <ha-blueprint-input-row
                .first=${idx === 0}
                .last=${idx === this.inputs.length - 1}
                .index=${idx}
                .input=${inputPair}
                .disabled=${this.disabled}
                @duplicate=${this._duplicateInput}
                @move-down=${this._moveDown}
                @move-up=${this._moveUp}
                @value-changed=${this._inputChanged}
                .hass=${this.hass}
              >
                ${this._showReorder && !this.disabled
                  ? html`
                      <div class="handle" slot="icons">
                        <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                      </div>
                    `
                  : nothing}
              </ha-blueprint-input-row>
            `
          )}
          <div class="buttons">
            <ha-button
              outlined
              .disabled=${this.disabled}
              .label=${this.hass.localize(
                "ui.panel.config.blueprint.editor.inputs.add"
              )}
              @click=${this._showNewInputDialog}
            >
              <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
            </ha-button>
          </div>
        </div>
      </ha-sortable>
    `;
  }

  static styles = css`
    .inputs {
      display: flex;
      flex-direction: column;
      padding: 16px;
      margin: -16px;
      gap: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-input": HaBlueprintInput;
  }
}
