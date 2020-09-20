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
import { ALDBRecord } from "../../../../../data/insteon";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/ha-form";
import { InsteonALDBRecordDialogParams } from "./show-dialog-insteon-aldb-record";

@customElement("dialog-insteon-aldb-record")
class DialogInsteonALDBRecord extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public narrow?: boolean;

  @internalProperty() private _record?: ALDBRecord | undefined;

  @internalProperty() private _schema?: HaFormSchema;

  @internalProperty() private _callback?: (text: string) => Promise<void>;

  @internalProperty() private _errors?: { [key: string]: string };

  @internalProperty() private _data?: { [key: string]: any };

  public async showDialog(
    params: InsteonALDBRecordDialogParams
  ): Promise<void> {
    this._record = params.record;
    this._schema = params.schema;
    this._callback = params.callback;
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
        .heading=${createCloseHeading(this.hass, "Edit ALDB Record")}
      >
        <div class="form">
          <ha-form
            .data=${this._recordData()}
            .schema=${this._schema}
            .error=${this._errors}
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
    if (this._checkData()) {
      this._close();
      await this._callback!("Made change to: " + this._data!.mem_addr);
    } else {
      this._errors!["base"] = "Some checks failed";
    }
  }

  private _changeMade(): boolean {
    return (
      this._record?.in_use !== (this._data?.in_use as boolean) ||
      this._currentMode() !== (this._data?.mode as string) ||
      this._record?.target !== (this._data?.target as string) ||
      this._record?.group !== (this._data?.group as number) ||
      this._record?.data1 !== (this._data?.data1 as number) ||
      this._record?.data2 !== (this._data?.data2 as number) ||
      this._record?.data3 !== (this._data?.data3 as number)
    );
  }

  private _close(): void {
    this._record = undefined;
  }

  private _currentMode(): string {
    if (this._record!.mode === "C") {
      return "Controller";
    }
    return "Responder";
  }

  private _recordData() {
    return {
      mem_addr: this._record?.mem_addr,
      in_use: this._record?.in_use,
      target: this._record?.target,
      mode: this._currentMode(),
      group: this._record?.group,
      data1: this._record?.data1,
      data2: this._record?.data2,
      data3: this._record?.data3,
    };
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._data = ev.detail.value;
  }

  private _checkData(): boolean {
    let success = true;
    this._errors = {};
    const insteonAddressCheck = new RegExp(
      /[A-Fa-f0-9]{2}\.?[A-Fa-f0-9]{2}\.?[A-Fa-f0-9]{2}$/
    );
    if (!insteonAddressCheck.test(this._data?.target)) {
      this._errors["target"] = "Invalid address";
      success = false;
    }
    if (this._data?.group < 0 || this._data?.group > 255) {
      this._errors["group"] = "Invalid group value (0 - 255)";
      success = false;
    }
    if (this._data?.data1 < 0 || this._data?.data1 > 255) {
      this._errors["data1"] = "Invalid data1 value (0 - 255)";
      success = false;
    }
    if (this._data?.data2 < 0 || this._data?.data2 > 255) {
      this._errors["data2"] = "Invalid data2 value (0 - 255)";
      success = false;
    }
    if (this._data?.data3 < 0 || this._data?.data3 > 255) {
      this._errors["data3"] = "Invalid data3 value (0 - 255)";
      success = false;
    }
    return success;
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
    "dialog-insteon-aldb-record": DialogInsteonALDBRecord;
  }
}
