import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type { EVSourceTypeEnergyPreference } from "../../../../data/energy";
import {
  computeEnergyLabel,
  emptyEVEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import {
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { EnergySettingsEVDialogParams } from "./show-dialogs-energy";

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

@customElement("dialog-energy-ev-settings")
export class DialogEnergyEVSettings
  extends DirtyStateProviderMixin<EVSourceTypeEnergyPreference>()(LitElement)
  implements HassDialog<EnergySettingsEVDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsEVDialogParams;

  @state() private _open = false;

  @state() private _source?: EVSourceTypeEnergyPreference;

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

  private _excludeListPower?: string[];

  public async showDialog(params: EnergySettingsEVDialogParams): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : emptyEVEnergyPreference();
    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;
    this._power_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "power")
    ).units;
    this._excludeList = this._params.ev_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
    this._excludeListPower = this._params.ev_sources
      .map((entry) => entry.stat_rate)
      .filter((id) => id && id !== this._source?.stat_rate) as string[];

    this._open = true;
    this._initDirtyTracking({ type: "deep" }, this._source!);
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._params = undefined;
    this._source = undefined;
    this._error = undefined;
    this._excludeList = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._source) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.ev.dialog.header"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <p>${this.hass.localize("ui.panel.config.energy.ev.dialog.intro")}</p>

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.ev.dialog.ev_energy"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.ev.dialog.selected_stat_intro",
            { unit: this._energy_units?.join(", ") || "" }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitClass=${powerUnitClasses}
          .value=${this._source.stat_rate}
          .label=${this.hass.localize(
            "ui.panel.config.energy.ev.dialog.ev_power"
          )}
          .excludeStatistics=${this._excludeListPower}
          @value-changed=${this._powerStatisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.ev.dialog.selected_stat_intro",
            { unit: this._power_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.ev.dialog.display_name"
          )}
          .disabled=${!this._source.stat_energy_from}
          .value=${this._source.name || ""}
          .placeholder=${
            this._source.stat_energy_from
              ? computeEnergyLabel(
                  this.hass,
                  this._source.stat_energy_from,
                  this._params?.statsMetadata?.[this._source.stat_energy_from]
                )
              : ""
          }
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            @click=${this.closeDialog}
            slot="secondaryAction"
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            @click=${this._save}
            .disabled=${
              !this._source.stat_energy_from ||
              (!!this._params?.source && !this.isDirtyState)
            }
            slot="primaryAction"
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _statisticChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_energy_from: ev.detail.value,
    };
    this._updateDirtyState(this._source);

    if (
      ev.detail.value &&
      isExternalStatistic(ev.detail.value) &&
      this._params?.statsMetadata &&
      !(ev.detail.value in this._params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this.hass, [
        ev.detail.value,
      ]);
      if (metadata) {
        this._params.statsMetadata[ev.detail.value] = metadata;
        this.requestUpdate("_params");
      }
    }
  }

  private _powerStatisticChanged(ev: ValueChangedEvent<string>) {
    const newSource = {
      ...this._source!,
      stat_rate: ev.detail.value,
    } as EVSourceTypeEnergyPreference;
    if (!newSource.stat_rate) {
      delete newSource.stat_rate;
    }
    this._source = newSource;
    this._updateDirtyState(this._source);
  }

  private _nameChanged(ev: InputEvent) {
    const newSource = {
      ...this._source!,
      name: (ev.target as HaInput).value,
    } as EVSourceTypeEnergyPreference;
    if (!newSource.name) {
      delete newSource.name;
    }
    this._source = newSource;
    this._updateDirtyState(this._source);
  }

  private async _save() {
    try {
      await this._params!.saveCallback(this._source!);
      this._markDirtyStateClean();
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-statistic-picker {
          display: block;
          width: 100%;
          margin-bottom: var(--ha-space-2);
        }
        ha-input {
          margin-top: var(--ha-space-4);
          --ha-input-padding-bottom: 0;
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-ev-settings": DialogEnergyEVSettings;
  }
}
