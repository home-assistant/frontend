import "@material/mwc-button/mwc-button";
import { mdiDelete } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/ha-alert";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EntityAliasesDialogParams } from "./show-dialog-entity-aliases";

@customElement("dialog-entity-aliases")
class DialogEntityAliases extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _params?: EntityAliasesDialogParams;

  @state() private _aliases!: string[];

  @state() private _submitting = false;

  @query("#alias_input") private _aliasInput?: HaTextField;

  public async showDialog(params: EntityAliasesDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._aliases = this._params.entity.aliases;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    const entityId = this._params.entity.entity_id;
    const stateObj = entityId ? this.hass.states[entityId] : undefined;

    const name = (stateObj && computeStateName(stateObj)) || entityId;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize(
          "ui.dialogs.entity_registry.editor.aliases.heading",
          { name }
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert> `
            : ""}
          <div class="form">
            ${this._aliases.length
              ? this._aliases.map(
                  (alias, index) => html`
                    <mwc-list-item class="alias" hasMeta>
                      ${alias}
                      <ha-icon-button
                        slot="meta"
                        .index=${index}
                        .label=${this.hass.localize(
                          "ui.dialogs.entity_registry.editor.aliases.remove_alias"
                        )}
                        @click=${this._removeAlias}
                        .path=${mdiDelete}
                      ></ha-icon-button>
                    </mwc-list-item>
                  `
                )
              : html`
                  <mwc-list-item noninteractive>
                    ${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.aliases.no_aliases"
                    )}
                  </mwc-list-item>
                `}
            <div class="layout horizontal center">
              <ha-textfield
                class="flex-auto"
                id="alias_input"
                .label=${this.hass!.localize(
                  "ui.dialogs.entity_registry.editor.aliases.add_alias"
                )}
                @keydown=${this._handleKeyAdd}
              ></ha-textfield>
              <mwc-button @click=${this._addAlias}
                >${this.hass!.localize(
                  "ui.dialogs.entity_registry.editor.aliases.add"
                )}</mwc-button
              >
            </div>
          </div>
        </div>
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${this._submitting}
        >
          ${this.hass.localize(
            "ui.dialogs.entity_registry.editor.aliases.update"
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.keyCode !== 13) {
      return;
    }
    this._addAlias();
  }

  private _addAlias() {
    const input = this._aliasInput;
    if (!input?.value) {
      return;
    }
    this._aliases = [...this._aliases, input.value];
    input.value = "";
  }

  private async _removeAlias(ev: Event) {
    const index = (ev.target as any).index;
    if (
      !(await showConfirmationDialog(this, {
        destructive: true,
        title: this.hass.localize(
          "ui.dialogs.entity_registry.editor.aliases.remove.title",
          { name: this._aliases[index] }
        ),
        text: this.hass.localize(
          "ui.dialogs.entity_registry.editor.aliases.remove.text"
        ),
        confirmText: this.hass.localize(
          "ui.dialogs.entity_registry.editor.aliases.remove.confirm"
        ),
      }))
    ) {
      return;
    }
    const aliases = [...this._aliases];
    aliases.splice(index, 1);
    this._aliases = aliases;
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    try {
      await this._params!.updateEntry({
        aliases: this._aliases,
      });
      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize(
          "ui.dialogs.entity_registry.editor.aliases.unknown_error"
        );
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-textfield {
          display: block;
          margin-bottom: 8px;
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
    "dialog-entity-aliases": DialogEntityAliases;
  }
}
