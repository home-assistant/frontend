import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import memoizeOne from "memoize-one";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-button";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type {
  ScheduleBlockInfo,
  ScheduleBlockInfoDialogParams,
} from "./show-dialog-schedule-block-info";
import type { SchemaUnion } from "../../../../components/ha-form/types";

@customElement("dialog-schedule-block-info")
class DialogScheduleBlockInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: Record<string, string>;

  @state() private _data?: ScheduleBlockInfo;

  @state() private _params?: ScheduleBlockInfoDialogParams;

  @state() private _open = false;

  private _expand = false;

  private _schema = memoizeOne((expand: boolean) => [
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
    {
      name: "advanced_settings",
      type: "expandable" as const,
      flatten: true,
      expanded: expand,
      schema: [
        {
          name: "data",
          required: false,
          selector: { object: {} },
        },
      ],
    },
  ]);

  public showDialog(params: ScheduleBlockInfoDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._data = params.block;
    this._expand = !!params.block?.data;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass!.localize(
          "ui.dialogs.helper_settings.schedule.edit_schedule_block"
        )}
        @closed=${this._dialogClosed}
      >
        <div>
          <ha-form
            autofocus
            .hass=${this.hass}
            .schema=${this._schema(this._expand)}
            .data=${this._data}
            .error=${this._error}
            .computeLabel=${this._computeLabelCallback}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            @click=${this._deleteBlock}
            appearance="filled"
            variant="danger"
          >
            ${this.hass!.localize("ui.common.delete")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._updateBlock}>
            ${this.hass!.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
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

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "from":
        return this.hass!.localize("ui.dialogs.helper_settings.schedule.start");
      case "to":
        return this.hass!.localize("ui.dialogs.helper_settings.schedule.end");
      case "data":
        return this.hass!.localize("ui.dialogs.helper_settings.schedule.data");
      case "advanced_settings":
        return this.hass!.localize(
          "ui.dialogs.helper_settings.generic.advanced_settings"
        );
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
