import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-button";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import {
  ScheduleBlockInfo,
  ScheduleBlockInfoDialogParams,
} from "./show-dialog-schedule-block-info";
import type { SchemaUnion } from "../../../../components/ha-form/types";

const SCHEMA = [
  {
    name: "from",
    required: true,
    selector: { time: { no_second: true } },
  },
  {
    name: "to",
    required: true,
    selector: { time: { no_second: true } },
  },
];

class DialogScheduleBlockInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: Record<string, string>;

  @state() private _data?: ScheduleBlockInfo;

  @state() private _params?: ScheduleBlockInfoDialogParams;

  public showDialog(params: ScheduleBlockInfoDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._data = params.block;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass!.localize(
            "ui.dialogs.helper_settings.schedule.edit_schedule_block"
          )
        )}
      >
        <div>
          <ha-form
            .hass=${this.hass}
            .schema=${SCHEMA}
            .data=${this._data}
            .error=${this._error}
            .computeLabel=${this._computeLabelCallback}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <ha-button
          slot="secondaryAction"
          class="warning"
          @click=${this._deleteBlock}
        >
          ${this.hass!.localize("ui.common.delete")}
        </ha-button>
        <ha-button slot="primaryAction" @click=${this._updateBlock}>
          ${this.hass!.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    this._error = undefined;
    this._data = ev.detail.value;
  }

  private _updateBlock() {
    try {
      this._params!.updateBlock!(this._data!);
      this.closeDialog();
    } catch (err: any) {
      this._error = { base: err ? err.message : "Unknown error" };
    }
  }

  private _deleteBlock() {
    try {
      this._params!.deleteBlock!();
      this.closeDialog();
    } catch (err: any) {
      this._error = { base: err ? err.message : "Unknown error" };
    }
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "from":
        return this.hass!.localize("ui.dialogs.helper_settings.schedule.start");
      case "to":
        return this.hass!.localize("ui.dialogs.helper_settings.schedule.end");
    }
    return "";
  };

  static get styles(): CSSResultGroup {
    return [haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-schedule-block-info": DialogScheduleBlockInfo;
  }
}

customElements.define("dialog-schedule-block-info", DialogScheduleBlockInfo);
