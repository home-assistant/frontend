import "@material/mwc-button/mwc-button";
import { mdiDeleteOutline, mdiPlus } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-aliases-editor")
class AliasesEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public aliases!: string[];

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    if (!this.aliases) {
      return nothing;
    }

    return html`
      ${this.aliases.map(
        (alias, index) => html`
          <div class="layout horizontal center-center row">
            <ha-textfield
              .disabled=${this.disabled}
              dialogInitialFocus=${index}
              .index=${index}
              class="flex-auto"
              .label=${this.hass!.localize("ui.dialogs.aliases.input_label", {
                number: index + 1,
              })}
              .value=${alias}
              ?data-last=${index === this.aliases.length - 1}
              @input=${this._editAlias}
              @keydown=${this._keyDownAlias}
            ></ha-textfield>
            <ha-icon-button
              .disabled=${this.disabled}
              .index=${index}
              slot="navigationIcon"
              label=${this.hass!.localize("ui.dialogs.aliases.remove_alias", {
                number: index + 1,
              })}
              @click=${this._removeAlias}
              .path=${mdiDeleteOutline}
            ></ha-icon-button>
          </div>
        `
      )}
      <div class="layout horizontal center-center">
        <mwc-button @click=${this._addAlias} .disabled=${this.disabled}>
          ${this.hass!.localize("ui.dialogs.aliases.add_alias")}
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </mwc-button>
      </div>
    `;
  }

  private async _addAlias() {
    this.aliases = [...this.aliases, ""];
    this._fireChanged(this.aliases);
    await this.updateComplete;
    const field = this.shadowRoot?.querySelector(`ha-textfield[data-last]`) as
      | HaTextField
      | undefined;
    field?.focus();
  }

  private async _editAlias(ev: Event) {
    const index = (ev.target as any).index;
    const aliases = [...this.aliases];
    aliases[index] = (ev.target as any).value;
    this._fireChanged(aliases);
  }

  private async _keyDownAlias(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.stopPropagation();
      this._addAlias();
    }
  }

  private async _removeAlias(ev: Event) {
    const index = (ev.target as any).index;
    const aliases = [...this.aliases];
    aliases.splice(index, 1);
    this._fireChanged(aliases);
  }

  private _fireChanged(value) {
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .row {
          margin-bottom: 8px;
        }
        ha-textfield {
          display: block;
        }
        ha-icon-button {
          display: block;
        }
        mwc-button {
          margin-left: 8px;
        }
        #alias_input {
          margin-top: 8px;
        }
        .alias {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
          --mdc-icon-button-size: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-aliases-editor": AliasesEditor;
  }
}
