import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./input/ha-input-multi";

@customElement("ha-aliases-editor")
class AliasesEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Array }) public aliases!: string[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public sortable = false;

  protected render() {
    if (!this.aliases) {
      return nothing;
    }

    return html`
      <ha-input-multi
        .value=${this.aliases}
        .disabled=${this.disabled}
        .sortable=${this.sortable}
        update-on-blur
        .label=${this.hass!.localize("ui.dialogs.aliases.label")}
        .removeLabel=${this.hass!.localize("ui.dialogs.aliases.remove")}
        .addLabel=${this.hass!.localize("ui.dialogs.aliases.add")}
        item-index
        @value-changed=${this._aliasesChanged}
      >
      </ha-input-multi>
    `;
  }

  private _aliasesChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-aliases-editor": AliasesEditor;
  }
}
