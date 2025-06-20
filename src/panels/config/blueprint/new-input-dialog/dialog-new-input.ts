import { customElement, property, state } from "lit/decorators";
import { html, LitElement, nothing } from "lit";
import memoizeOne from "memoize-one";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import type { ShowDialogNewInputParams } from "./show-dialog-new-input";
import type { SchemaUnion } from "../../../../components/ha-form/types";

import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-button";

@customElement("ha-dialog-new-input")
class DialogNewInput extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _data = { id: "", type: "input" };

  @state() private _onSubmit = (_: string, __: "input" | "section") => {
    // Empty on purpose - this is supposed to be overridden by parameters
  };

  private _schema = memoizeOne(
    () =>
      [
        {
          type: "string",
          name: "id",
          required: true,
        },
        {
          type: "select",
          name: "type",
          required: true,
          options: [
            [
              "input",
              this.hass.localize(
                "ui.panel.config.blueprint.editor.inputs.type.new.input"
              ),
            ],
            [
              "section",
              this.hass.localize(
                "ui.panel.config.blueprint.editor.inputs.type.new.section"
              ),
            ],
          ],
        },
      ] as const
  );

  showDialog(params: ShowDialogNewInputParams): void {
    this._onSubmit = params.onSubmit;
    this._opened = true;
    this._data.id = "";
    this._data.type = "input";
  }

  closeDialog(): boolean {
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    return true;
  }

  private _submit() {
    this._onSubmit(this._data.id, this._data.type as "input" | "section");
    this.closeDialog();
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._data = ev.detail.value;
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass.localize(
      `ui.panel.config.blueprint.editor.inputs.type.new.${schema.name}`
    );

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(`ui.panel.config.blueprint.dialog_new.header`)
        )}
      >
        <ha-form
          .hass=${this.hass}
          .schema=${this._schema()}
          .data=${this._data}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <ha-button
          @click=${this.closeDialog}
          dialogInitialFocus
          slot="secondaryAction"
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          .disabled=${!this._data.id}
          @click=${this._submit}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-new-input": DialogNewInput;
  }
}
