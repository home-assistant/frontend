import "@material/mwc-button/mwc-button";
import { LitElement, TemplateResult, html, CSSResultGroup, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../components/ha-dialog";
import { fireEvent } from "../../../common/dom/fire_event";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../../../components/ha-formfield";
import "../../../components/ha-radio";
import "../../../components/ha-form/ha-form";
import type { DialogStatisticsAdjustSumParams } from "./show-dialog-statistics-adjust-sum";
import type {
  HaFormBaseSchema,
  HaFormSchema,
} from "../../../components/ha-form/types";
import { adjustStatisticsSum } from "../../../data/history";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { showToast } from "../../../util/toast";

let lastMoment: string | undefined;

@customElement("dialog-statistics-adjust-sum")
export class DialogStatisticsFixUnsupportedUnitMetadata extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogStatisticsAdjustSumParams;

  @state() private _data?: {
    moment: string;
    amount: number;
  };

  @state() private _busy = false;

  public showDialog(params: DialogStatisticsAdjustSumParams): void {
    this._params = params;
    this._busy = false;
    const now = new Date();
    this._data = {
      moment:
        lastMoment ||
        `${now.getFullYear()}-${
          now.getMonth() + 1
        }-${now.getDate()} ${now.getHours()}:00:00`,
      amount: 0,
    };
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        heading="Adjust sum for a specific time."
      >
        <div class="card-content">
          Adjust statistics if it incorrectly counted values that were already
          counted. When adjusted, all subsequent values will be re-calculted
          from the new value. This feature is limited to hourly statistics.
        </div>
        <ha-form
          .hass=${this.hass}
          .schema=${this._getSchema(this._params.statistic)}
          .data=${this._data}
          .computeLabel=${this._computeLabel}
          .disabled=${this._busy}
          @value-changed=${this._valueChanged}
        ></ha-form>

        <mwc-button
          slot="primaryAction"
          @click=${this._fixIssue}
          dialogInitialFocus
          label="Adjust"
        ></mwc-button>
        <mwc-button
          slot="secondaryAction"
          dialogAction="cancel"
          .label=${this.hass.localize("ui.common.close")}
        ></mwc-button>
      </ha-dialog>
    `;
  }

  private _getSchema = memoizeOne((statistic): HaFormSchema[] => [
    {
      type: "constant",
      name: "name",
      value: statistic.name || statistic.statistic_id,
    },
    {
      name: "moment",
      required: true,
      selector: {
        datetime: {},
      },
    },
    {
      name: "amount",
      required: true,
      default: 0,
      selector: {
        number: {
          mode: "box",
          step: 0.1,
          unit_of_measurement: statistic.unit_of_measurement,
        },
      },
    },
  ]);

  private _computeLabel(value: HaFormBaseSchema) {
    switch (value.name) {
      case "name":
        return "Statistic";
      case "moment":
        return "Moment to adjust";
      case "amount":
        return "Amount";
      default:
        return value.name;
    }
  }

  private _valueChanged(ev) {
    const newData = ev.detail.value;

    // If we change the amount, let's truncate the moment to the whole
    // hour as that's how statistics adjustment works.
    if (this._data && this._data.amount !== newData.amount && newData.moment) {
      const parts = newData.moment.split(" ");
      const timeParts = parts[1].split(":");
      newData.moment = `${parts[0]} ${timeParts[0]}:00:00`;
    }
    this._data = newData;
  }

  private async _fixIssue(): Promise<void> {
    this._busy = true;
    try {
      await adjustStatisticsSum(
        this.hass,
        this._params!.statistic.statistic_id,
        this._data!.moment,
        this._data!.amount
      );
    } catch (err: any) {
      this._busy = false;
      showAlertDialog(this, {
        text: `Error adjusting sum: ${err.message || err}`,
      });
      return;
    }
    showToast(this, {
      message: "Statistic sum adjusted",
    });
    lastMoment = this._data!.moment;
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        div {
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-statistics-adjust-sum": DialogStatisticsFixUnsupportedUnitMetadata;
  }
}
