import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-textarea";
import "../../../../components/ha-textfield";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { AutomationRenameDialog } from "./show-dialog-automation-rename";

@customElement("ha-dialog-automation-rename")
class DialogAutomationRename extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _error?: string;

  private _params!: AutomationRenameDialog;

  private _newName?: string;

  private _newDescription?: string;

  public showDialog(params: AutomationRenameDialog): void {
    this._opened = true;
    this._params = params;
    this._newName =
      params.config.alias ||
      this.hass.localize("ui.panel.config.automation.editor.default_name");
    this._newDescription = params.config.description || "";
  }

  public closeDialog(): void {
    this._params.onClose();

    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            this._params.config.alias
              ? "ui.panel.config.automation.editor.rename"
              : "ui.panel.config.automation.editor.save"
          )
        )}
      >
        ${this._error
          ? html`<ha-alert alert-type="error"
              >${this.hass.localize(
                "ui.panel.config.automation.editor.missing_name"
              )}</ha-alert
            >`
          : ""}
        <ha-textfield
          dialogInitialFocus
          .value=${this._newName}
          .placeholder=${this.hass.localize(
            "ui.panel.config.automation.editor.default_name"
          )}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.alias"
          )}
          required
          type="string"
          @input=${this._valueChanged}
        ></ha-textfield>

        <ha-textarea
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.description.label"
          )}
          .placeholder=${this.hass.localize(
            "ui.panel.config.automation.editor.description.placeholder"
          )}
          name="description"
          autogrow
          .value=${this._newDescription}
          @input=${this._valueChanged}
        ></ha-textarea>

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.dialogs.generic.cancel")}
        </mwc-button>
        <mwc-button @click=${this._save} slot="primaryAction">
          ${this.hass.localize(
            this._params.config.alias
              ? "ui.panel.config.automation.editor.rename"
              : "ui.panel.config.automation.editor.save"
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    if (target.name === "description") {
      this._newDescription = target.value;
    } else {
      this._newName = target.value;
    }
  }

  private _save(): void {
    if (!this._newName) {
      this._error = "Name is required";
      return;
    }
    this._params.updateAutomation({
      ...this._params.config,
      alias: this._newName,
      description: this._newDescription,
    });
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-textfield,
        ha-textarea {
          display: block;
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-automation-rename": DialogAutomationRename;
  }
}
