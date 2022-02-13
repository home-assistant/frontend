import "@material/mwc-button/mwc-button";
import { LitElement, TemplateResult, html, CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-dialog";
import { fireEvent } from "../../../common/dom/fire_event";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { updateStatisticsMetadata } from "../../../data/history";
import "../../../components/ha-formfield";
import "../../../components/ha-radio";
import { DialogStatisticsUnsupportedUnitMetaParams } from "./show-dialog-statistics-fix-unsupported-unit-meta";

@customElement("dialog-statistics-fix-unsupported-unit-meta")
export class DialogStatisticsFixUnsupportedUnitMetadata extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogStatisticsUnsupportedUnitMetaParams;

  public showDialog(params: DialogStatisticsUnsupportedUnitMetaParams): void {
    this._params = params;
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
        heading="Unsupported unit in recorded statistics"
      >
        <p>
          The unit ${this._params.issue.data.metadata_unit} of the statistics in
          your database for this entity is not a supported unit for the device
          class of the entity, ${this._params.issue.data.device_class}. It
          should be ${this._params.issue.data.supported_unit}.
        </p>
        <p>
          Do you want to update the unit of the history statistics to
          ${this._params.issue.data.supported_unit}?
        </p>

        <mwc-button
          slot="primaryAction"
          @click=${this._fixIssue}
          dialogInitialFocus
        >
          Fix
        </mwc-button>
        <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.close")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private async _fixIssue(): Promise<void> {
    await updateStatisticsMetadata(
      this.hass,
      this._params!.issue.data.statistic_id,
      this._params!.issue.data.supported_unit
    );
    this._params?.fixedCallback();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [haStyle, haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-statistics-fix-unsupported-unit-meta": DialogStatisticsFixUnsupportedUnitMetadata;
  }
}
