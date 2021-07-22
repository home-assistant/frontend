import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import {
  CSSResult,
  css,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import "../../../../../components/ha-code-editor";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "./insteon-aldb-data-table";
import { Property } from "../../../../../data/insteon";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/ha-form";
import { InsteonPropertyDialogParams } from "./show-dialog-insteon-property";

@customElement("dialog-insteon-property")
class DialogInsteonProperty extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public narrow?: boolean;

  @internalProperty() private _record?: Property;

  @internalProperty() private _schema?: HaFormSchema;

  @internalProperty() private _title?: string;

  @internalProperty() private _callback?: (
    name: string,
    value: any
  ) => Promise<void>;

  @internalProperty() private _formData = {};

  public async showDialog(params: InsteonPropertyDialogParams): Promise<void> {
    this._record = params.record;
    this._formData[this._record.name] = this._record.value;
    this._schema = params.schema;
    this._callback = params.callback;
    this._title = params.title;
  }

  protected render(): TemplateResult {
    if (!this._record) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        hideActions
        @closing="${this._close}"
        .heading=${createCloseHeading(this.hass, this._title!)}
      >
        <div class="form">
          <ha-form
            .data=${this._formData}
            .schema=${[this._schema]}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <div class="buttons">
          <mwc-button @click=${this._dismiss} slot="secondaryAction">
            ${this.hass.localize("ui.dialogs.generic.cancel")}
          </mwc-button>
          <mwc-button @click=${this._submit} slot="primaryAction">
            ${this.hass.localize("ui.dialogs.generic.ok")}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  private _dismiss(): void {
    this._close();
  }

  private async _submit(): Promise<void> {
    if (!this._changeMade()) {
      this._close();
      return;
    }
    const record = this._record;
    record!.value = this._formData[this._record!.name];
    record!.modified = true;
    this._close();
    await this._callback!(record!.name, record!.value);
  }

  private _changeMade(): boolean {
    return this._record!.value !== this._formData[this._record!.name];
  }

  private _close(): void {
    this._record = undefined;
  }

  private _valueChanged(ev: CustomEvent) {
    this._formData = ev.detail.value;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        table {
          width: 100%;
        }
        ha-combo-box {
          width: 20px;
        }
        .title {
          width: 200px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-insteon-property": DialogInsteonProperty;
  }
}
