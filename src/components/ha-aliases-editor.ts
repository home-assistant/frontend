import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import "./input/ha-input-multi";

@customElement("ha-aliases-editor")
class AliasesEditor extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

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
        .label=${this._localize("ui.dialogs.aliases.label")}
        .removeLabel=${this._localize("ui.dialogs.aliases.remove")}
        .addLabel=${this._localize("ui.dialogs.aliases.add")}
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
