import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import { internationalizationContext } from "../../../../data/context";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { EditTriggerIdDialogParams } from "./show-edit-trigger-id";

@customElement("ha-automation-edit-trigger-id-dialog")
class HaAutomationEditTriggerIdDialog extends DialogMixin<EditTriggerIdDialogParams>(
  LitElement
) {
  @state() private _newId = "";

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  protected _i18n!: ContextType<typeof internationalizationContext>;

  connectedCallback() {
    super.connectedCallback();
    this._setInitialId();
  }

  private _setInitialId() {
    if (this.params?.id) {
      this._newId = this.params.id;
    }
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    const title = this._i18n.localize(
      `ui.panel.config.automation.editor.triggers.${
        this.params.id ? "edit_id" : "add_id"
      }`
    );

    return html`
      <ha-dialog open header-title=${title}>
        <ha-input
          autofocus
          .label=${this._i18n.localize(
            "ui.panel.config.automation.editor.triggers.id"
          )}
          .value=${this._newId}
          @input=${this._idChanged}
          @keydown=${this._handleKeyDown}
        ></ha-input>
        <ha-alert alert-type="info">
          ${this._i18n.localize(
            "ui.panel.config.automation.editor.triggers.id_description"
          )}
        </ha-alert>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._save}>
            ${this._i18n.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _idChanged(ev: InputEvent) {
    const target = ev.target as HaInput;
    this._newId = target.value ?? "";
  }

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      this._save();
    }
  }

  private _save(): void {
    const trimmed = this._newId.trim();
    this.params!.onUpdate(trimmed || undefined);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-input {
          width: 100%;
        }
        ha-alert {
          display: block;
          margin-top: var(--ha-space-6);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-edit-trigger-id-dialog": HaAutomationEditTriggerIdDialog;
  }
}
