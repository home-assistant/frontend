import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type { HomeSourceTypeEnergyPreference } from "../../../../data/energy";
import {
  emptyHomeEnergyPreference,
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
import type { EnergySettingsHomeDialogParams } from "./show-dialogs-energy";

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

@customElement("dialog-energy-home-settings")
export class DialogEnergyHomeSettings
  extends DirtyStateProviderMixin<HomeSourceTypeEnergyPreference>()(LitElement)
  implements HassDialog<EnergySettingsHomeDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsHomeDialogParams;

  @state() private _open = false;

  @state() private _source?: HomeSourceTypeEnergyPreference;

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

  @state() private _error?: string;

  public async showDialog(
    params: EnergySettingsHomeDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : emptyHomeEnergyPreference();
    const [energy, power] = await Promise.all([
      getSensorDeviceClassConvertibleUnits(this.hass, "energy"),
      getSensorDeviceClassConvertibleUnits(this.hass, "power"),
    ]);
    this._energy_units = energy.units;
    this._power_units = power.units;

    this._open = true;
    this._initDirtyTracking({ type: "deep" }, this._source);
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._params = undefined;
    this._source = undefined;
    this._error = undefined;
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
          "ui.panel.config.energy.home.dialog.header"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.home.dialog.home_energy"
          )}
          @value-changed=${this._statisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.home.dialog.entity_para",
            { unit: this._energy_units?.join(", ") || "" }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.home.dialog.display_name"
          )}
          type="text"
          .disabled=${!this._source.stat_energy_from}
          .value=${this._source.name || ""}
          .placeholder=${this.hass.config.location_name}
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitClass=${powerUnitClasses}
          .value=${this._source.stat_rate}
          .label=${this.hass.localize(
            "ui.panel.config.energy.home.dialog.home_power"
          )}
          @value-changed=${this._powerStatisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.home.dialog.entity_para",
            { unit: this._power_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

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
              (!!this._params.source && !this.isDirtyState)
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
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
    if (
      ev.detail.value &&
      isExternalStatistic(ev.detail.value) &&
      this._params?.statsMetadata &&
      !(ev.detail.value in this._params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this.hass.callWS, [
        ev.detail.value,
      ]);
      if (metadata) {
        this._params.statsMetadata[ev.detail.value] = metadata;
        this.requestUpdate("_params");
      }
    }
    this._updateDirtyState(this._source);
  }

  private _powerStatisticChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_rate: ev.detail.value };
    if (!this._source.stat_rate) {
      delete this._source.stat_rate;
    }
    this._updateDirtyState(this._source);
  }

  private _nameChanged(ev: InputEvent) {
    this._source = { ...this._source!, name: (ev.target as HaInput).value };
    if (!this._source.name) {
      delete this._source.name;
    }
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
          margin-bottom: var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-home-settings": DialogEnergyHomeSettings;
  }
}
