import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { AutomationRenameDialog } from "./show-dialog-automation-rename";

@customElement("ha-dialog-automation-rename")
class DialogAutomationRename extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  private _params!: AutomationRenameDialog;

  private _newName?: string;

  private _newDescription?: string;

  public showDialog(params: AutomationRenameDialog): void {
    this._opened = true;
    this._params = params;
    this._newName = params.config.alias || "";
    this._newDescription = params.config.description || "";
  }

  public closeDialog(): void {
    this._params.onClose();

    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.automation.editor.rename")
        )}
      >
        <ha-textfield
          dialogInitialFocus
          value=${this._newName}
          .placeholder=${this.hass.localize(
            "ui.panel.config.automation.editor.default_name"
          )}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.alias"
          )}
          type="string"
          @change=${this._valueChanged}
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
          @change=${this._valueChanged}
        ></ha-textarea>

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.dialogs.generic.cancel")}
        </mwc-button>
        <mwc-button @click=${this._save} slot="primaryAction">
          ${this.hass.localize("ui.panel.config.automation.editor.rename")}
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-automation-rename": DialogAutomationRename;
  }
}
