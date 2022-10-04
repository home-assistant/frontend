import "@material/mwc-button/mwc-button";
import { LitElement, TemplateResult, html, CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-dialog";
import { fireEvent } from "../../../common/dom/fire_event";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import {
  changeStatisticUnit,
  clearStatistics,
  updateStatisticsMetadata,
} from "../../../data/recorder";
import "../../../components/ha-formfield";
import "../../../components/ha-radio";
import type { DialogStatisticsUnitsChangedParams } from "./show-dialog-statistics-fix-units-changed";

@customElement("dialog-statistics-fix-units-changed")
export class DialogStatisticsFixUnitsChanged extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogStatisticsUnitsChangedParams;

  @state() private _action?: "update" | "clear" | "change";

  public showDialog(params: DialogStatisticsUnitsChangedParams): void {
    this._params = params;
    this._action = "update";
  }

  public closeDialog(): void {
    this._params = undefined;
    this._action = undefined;
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
        .heading=${this.hass.localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.units_changed.title"
        )}
      >
        <p>
          The unit of this entity changed, we can't store values in multiple
          units. <br />If the historic statistic values have a wrong unit, you
          can update the units of the old values. The values will not be
          updated.<br />Otherwise you can choose to delete all historic
          statistic values, and start over.
        </p>

        <h3>How do you want to fix this issue?</h3>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.units_changed.update",
            this._params.issue.data
          )}
        >
          <ha-radio
            value="update"
            name="action"
            .checked=${this._action === "update"}
            @change=${this._handleActionChanged}
            dialogInitialFocus
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            `ui.panel.developer-tools.tabs.statistics.fix_issue.units_changed.clear`
          )}
        >
          <ha-radio
            value="clear"
            name="action"
            .checked=${this._action === "clear"}
            @change=${this._handleActionChanged}
          ></ha-radio>
        </ha-formfield>
        ${this._params.issue.type === "units_changed_can_convert"
          ? html`<ha-formfield
              .label=${this.hass.localize(
                `ui.panel.developer-tools.tabs.statistics.fix_issue.units_changed.change`
              )}
            >
              <ha-radio
                value="change"
                name="action"
                .checked=${this._action === "change"}
                @change=${this._handleActionChanged}
              ></ha-radio>
            </ha-formfield>`
          : ""}

        <mwc-button slot="primaryAction" @click=${this._fixIssue}>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.fix"
          )}
        </mwc-button>
        <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.close")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _handleActionChanged(ev): void {
    this._action = ev.target.value;
  }

  private async _fixIssue(): Promise<void> {
    if (this._action === "clear") {
      await clearStatistics(this.hass, [this._params!.issue.data.statistic_id]);
    } else if (this._action === "update") {
      await updateStatisticsMetadata(
        this.hass,
        this._params!.issue.data.statistic_id,
        this._params!.issue.data.state_unit
      );
    } else if (this._action === "change") {
      await changeStatisticUnit(
        this.hass,
        this._params!.issue.data.statistic_id,
        this._params!.issue.data.metadata_unit,
        this._params!.issue.data.state_unit
      );
    }
    this._params?.fixedCallback();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [haStyle, haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-statistics-fix-units-changed": DialogStatisticsFixUnitsChanged;
  }
}
