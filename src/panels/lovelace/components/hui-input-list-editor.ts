import {
  html,
  css,
  LitElement,
  property,
  TemplateResult,
  CSSResult,
  customElement,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";

import { EditorTarget } from "../editor/types";

@customElement("hui-input-list-editor")
export class HuiInputListEditor extends LitElement {
  @property() protected value?: string[];
  @property() protected hass?: HomeAssistant;
  @property() protected inputLabel?: string;

  protected render(): TemplateResult {
    if (!this.value) {
      return html``;
    }

    return html`
      ${this.value.map((listEntry, index) => {
        return html`
          <paper-input
            label="${this.inputLabel}"
            .value="${listEntry}"
            .configValue="${"entry"}"
            .index="${index}"
            @value-changed="${this._valueChanged}"
            @blur="${this._consolidateEntries}"
            ><paper-icon-button
              slot="suffix"
              class="clear-button"
              icon="hass:close"
              no-ripple
              @click="${this._removeEntry}"
              >Clear</paper-icon-button
            ></paper-input
          >
        `;
      })}
      <paper-input
        label="${this.inputLabel}"
        @change="${this._addEntry}"
      ></paper-input>
    `;
  }

  private _addEntry(ev: Event): void {
    const target = ev.target! as EditorTarget;
    if (target.value === "") {
      return;
    }
    const newEntries = this.value!.concat(target.value as string);
    target.value = "";
    fireEvent(this, "value-changed", {
      value: newEntries,
    });
    (ev.target! as LitElement).blur();
  }

  private _valueChanged(ev: Event): void {
    ev.stopPropagation();
    const target = ev.target! as EditorTarget;
    const newEntries = this.value!.concat();
    newEntries[target.index!] = target.value!;
    fireEvent(this, "value-changed", {
      value: newEntries,
    });
  }

  private _consolidateEntries(ev: Event): void {
    const target = ev.target! as EditorTarget;
    if (target.value === "") {
      const newEntries = this.value!.concat();
      newEntries.splice(target.index!, 1);
      fireEvent(this, "value-changed", {
        value: newEntries,
      });
    }
  }

  private _removeEntry(ev: Event): void {
    const parent = (ev.currentTarget as any).parentElement;
    const newEntries = this.value!.concat();
    newEntries.splice(parent.index!, 1);
    fireEvent(this, "value-changed", {
      value: newEntries,
    });
  }

  static get styles(): CSSResult {
    return css`
      paper-input > paper-icon-button {
        width: 24px;
        height: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-list-editor": HuiInputListEditor;
  }
}
