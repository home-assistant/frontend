import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-dialog";
import "../../../components/ha-button";
import "../../../components/ha-formfield";
import "../../../components/ha-radio";
import {
  clearStatistics,
  getStatisticLabel,
  updateStatisticsMetadata,
} from "../../../data/recorder";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
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
    this._cancel();
  }

  private _closeDialog(): void {
    this._params = undefined;
    this._action = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this._closeDialog}
        .heading=${this.hass.localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.units_changed.title"
        )}
      >
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.units_changed.info_text_1",
            {
              name: getStatisticLabel(
                this.hass,
                this._params.issue.data.statistic_id,
                undefined
              ),
              statistic_id: this._params.issue.data.statistic_id,
              current_unit: this._params.issue.data.state_unit,
              previous_unit: this._params.issue.data.metadata_unit,
            }
          )}<br />
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.units_changed.info_text_2"
          )}<br />
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.units_changed.info_text_3"
          )}
        </p>

        <h3>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.units_changed.how_to_fix"
          )}
        </h3>
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

        <ha-button
          appearance="plain"
          slot="primaryAction"
          @click=${this._cancel}
        >
          ${this.hass.localize("ui.common.close")}
        </ha-button>
        <ha-button slot="primaryAction" @click=${this._fixIssue}>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.fix"
          )}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _handleActionChanged(ev): void {
    this._action = ev.target.value;
  }

  private _cancel(): void {
    this._params?.cancelCallback!();
    this._closeDialog();
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
    }
    this._params?.fixedCallback!();
    this._closeDialog();
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
