import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-icon-button";
import "../../../components/ha-textfield";
import { HomeAssistant } from "../../../types";
import { EditorTarget } from "../editor/types";

@customElement("hui-input-list-editor")
export class HuiInputListEditor extends LitElement {
  @property() protected value?: string[];

  @property() protected hass?: HomeAssistant;

  @property() protected inputLabel?: string;

  protected render() {
    if (!this.value) {
      return nothing;
    }

    return html`
      ${this.value.map(
        (listEntry, index) => html`
          <ha-textfield
            .label=${this.inputLabel}
            .value=${listEntry}
            .configValue=${"entry"}
            .index=${index}
            @input=${this._valueChanged}
            @blur=${this._consolidateEntries}
            @keydown=${this._handleKeyDown}
            iconTrailing
            ><ha-icon-button
              slot="trailingIcon"
              class="clear-button"
              .path=${mdiClose}
              no-ripple
              @click=${this._removeEntry}
              .label=${this.hass!.localize("ui.common.clear")}
            >
            </ha-icon-button>
          </ha-textfield>
        `
      )}
      <ha-textfield
        .label=${this.inputLabel}
        @change=${this._addEntry}
      ></ha-textfield>
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

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.stopPropagation();
      this._consolidateEntries(ev);
    }
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

  static get styles(): CSSResultGroup {
    return css`
      ha-icon-button {
        margin-right: -24px;
        color: var(--secondary-text-color);
      }
      ha-textfield {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-list-editor": HuiInputListEditor;
  }
}
