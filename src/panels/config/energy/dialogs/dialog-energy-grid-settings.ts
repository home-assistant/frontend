import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-formfield";
import "../../../../components/ha-radio";
import "../../../../components/ha-textfield";
import "../../../../components/ha-wa-dialog";
import type { HaRadio } from "../../../../components/ha-radio";
import type {
  GridSourceTypeEnergyPreference,
  PowerConfig,
} from "../../../../data/energy";
import {
  emptyGridSourceEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import { isExternalStatistic } from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import "./ha-energy-power-config";
import {
  buildPowerExcludeList,
  getInitialPowerConfig,
  getPowerTypeFromConfig,
  type HaEnergyPowerConfig,
  type PowerType,
} from "./ha-energy-power-config";
import type { EnergySettingsGridDialogParams } from "./show-dialogs-energy";

const energyUnitClasses = ["energy"];

type CostType = "no_cost" | "stat" | "entity" | "number";

@customElement("dialog-energy-grid-settings")
export class DialogEnergyGridSettings
  extends LitElement
  implements HassDialog<EnergySettingsGridDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsGridDialogParams;

  @state() private _open = false;

  @state() private _source?: GridSourceTypeEnergyPreference;

  @state() private _powerType: PowerType = "none";

  @state() private _powerConfig: PowerConfig = {};

  @state() private _importCostType: CostType = "no_cost";

  @state() private _exportCostType: CostType = "no_cost";

  @state() private _energy_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

  private _excludeListPower?: string[];

  public async showDialog(
    params: EnergySettingsGridDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : emptyGridSourceEnergyPreference();

    // Initialize power type and config from existing source
    this._powerType = getPowerTypeFromConfig(
      params.source?.power_config,
      params.source?.stat_rate
    );
    this._powerConfig = getInitialPowerConfig(
      params.source?.power_config,
      params.source?.stat_rate
    );

    // Initialize import cost type
    if (params.source?.stat_cost) {
      this._importCostType = "stat";
    } else if (params.source?.entity_energy_price) {
      this._importCostType = "entity";
    } else if (
      params.source?.number_energy_price !== null &&
      params.source?.number_energy_price !== undefined
    ) {
      this._importCostType = "number";
    } else {
      this._importCostType = "no_cost";
    }

    // Initialize export cost type
    if (params.source?.stat_compensation) {
      this._exportCostType = "stat";
    } else if (params.source?.entity_energy_price_export) {
      this._exportCostType = "entity";
    } else if (
      params.source?.number_energy_price_export !== null &&
      params.source?.number_energy_price_export !== undefined
    ) {
      this._exportCostType = "number";
    } else {
      this._exportCostType = "no_cost";
    }

    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;

    // Build energy exclude list
    const allSources: string[] = [];
    this._params.grid_sources.forEach((entry) => {
      if (entry.stat_energy_from) allSources.push(entry.stat_energy_from);
      if (entry.stat_energy_to) allSources.push(entry.stat_energy_to);
    });
    this._excludeList = allSources.filter(
      (id) =>
        id !== this._source?.stat_energy_from &&
        id !== this._source?.stat_energy_to
    );

    // Build power exclude list using shared helper
    this._excludeListPower = buildPowerExcludeList(
      this._params.grid_sources,
      this._powerConfig,
      params.source?.stat_rate
    );

    this._open = true;
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._params = undefined;
    this._source = undefined;
    this._powerType = "none";
    this._powerConfig = {};
    this._importCostType = "no_cost";
    this._exportCostType = "no_cost";
    this._error = undefined;
    this._excludeList = undefined;
    this._excludeListPower = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._source) {
      return nothing;
    }

    const hasExport = !!this._source.stat_energy_to;

    // External statistics (from integrations) cannot use entity/number cost tracking
    const externalImportSource =
      this._source.stat_energy_from &&
      isExternalStatistic(this._source.stat_energy_from);
    const externalExportSource =
      this._source.stat_energy_to &&
      isExternalStatistic(this._source.stat_energy_to);

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.grid.dialog.header"
        )}
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.energy_from_grid"
          )}
          .excludeStatistics=${[
            ...(this._excludeList || []),
            this._source.stat_energy_to,
          ].filter((id): id is string => Boolean(id))}
          @value-changed=${this._statisticFromChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.energy_from_helper",
            { unit: this._energy_units?.join(", ") || "" }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_to}
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.energy_to_grid"
          )}
          .excludeStatistics=${[
            ...(this._excludeList || []),
            this._source.stat_energy_from,
          ].filter((id): id is string => Boolean(id))}
          @value-changed=${this._statisticToChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.energy_to_helper",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <p class="section-label">
          ${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.import_cost"
          )}
        </p>
        <p class="section-description">
          ${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.import_cost_para"
          )}
        </p>

        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.no_cost_tracking"
          )}
        >
          <ha-radio
            value="no_cost"
            name="importCostType"
            .checked=${this._importCostType === "no_cost"}
            @change=${this._handleImportCostTypeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.cost_stat"
          )}
        >
          <ha-radio
            value="stat"
            name="importCostType"
            .checked=${this._importCostType === "stat"}
            @change=${this._handleImportCostTypeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.cost_entity"
          )}
        >
          <ha-radio
            value="entity"
            name="importCostType"
            .checked=${this._importCostType === "entity"}
            .disabled=${externalImportSource}
            @change=${this._handleImportCostTypeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.cost_number"
          )}
        >
          <ha-radio
            value="number"
            name="importCostType"
            .checked=${this._importCostType === "number"}
            .disabled=${externalImportSource}
            @change=${this._handleImportCostTypeChanged}
          ></ha-radio>
        </ha-formfield>

        ${this._importCostType === "stat"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .value=${this._source.stat_cost}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.dialog.cost_stat_label"
                )}
                @value-changed=${this._statCostChanged}
              ></ha-statistic-picker>
            `
          : nothing}
        ${this._importCostType === "entity"
          ? html`
              <ha-entity-picker
                .hass=${this.hass}
                .value=${this._source.entity_energy_price}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.dialog.cost_entity_label"
                )}
                include-domains='["sensor", "input_number"]'
                @value-changed=${this._entityCostChanged}
              ></ha-entity-picker>
            `
          : nothing}
        ${this._importCostType === "number"
          ? html`
              <ha-textfield
                .value=${this._source.number_energy_price ?? ""}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.dialog.cost_number_label"
                )}
                type="number"
                step="any"
                @input=${this._numberCostChanged}
                .suffix=${`${this.hass.config.currency}/kWh`}
              ></ha-textfield>
            `
          : nothing}
        ${hasExport
          ? html`
              <p class="section-label">
                ${this.hass.localize(
                  "ui.panel.config.energy.grid.dialog.export_compensation"
                )}
              </p>
              <p class="section-description">
                ${this.hass.localize(
                  "ui.panel.config.energy.grid.dialog.export_compensation_para"
                )}
              </p>

              <ha-formfield
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.dialog.no_compensation_tracking"
                )}
              >
                <ha-radio
                  value="no_cost"
                  name="exportCostType"
                  .checked=${this._exportCostType === "no_cost"}
                  @change=${this._handleExportCostTypeChanged}
                ></ha-radio>
              </ha-formfield>
              <ha-formfield
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.dialog.compensation_stat"
                )}
              >
                <ha-radio
                  value="stat"
                  name="exportCostType"
                  .checked=${this._exportCostType === "stat"}
                  @change=${this._handleExportCostTypeChanged}
                ></ha-radio>
              </ha-formfield>
              <ha-formfield
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.dialog.compensation_entity"
                )}
              >
                <ha-radio
                  value="entity"
                  name="exportCostType"
                  .checked=${this._exportCostType === "entity"}
                  .disabled=${externalExportSource}
                  @change=${this._handleExportCostTypeChanged}
                ></ha-radio>
              </ha-formfield>
              <ha-formfield
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.dialog.compensation_number"
                )}
              >
                <ha-radio
                  value="number"
                  name="exportCostType"
                  .checked=${this._exportCostType === "number"}
                  .disabled=${externalExportSource}
                  @change=${this._handleExportCostTypeChanged}
                ></ha-radio>
              </ha-formfield>

              ${this._exportCostType === "stat"
                ? html`
                    <ha-statistic-picker
                      .hass=${this.hass}
                      .value=${this._source.stat_compensation}
                      .label=${this.hass.localize(
                        "ui.panel.config.energy.grid.dialog.compensation_stat_label"
                      )}
                      @value-changed=${this._statCompensationChanged}
                    ></ha-statistic-picker>
                  `
                : nothing}
              ${this._exportCostType === "entity"
                ? html`
                    <ha-entity-picker
                      .hass=${this.hass}
                      .value=${this._source.entity_energy_price_export}
                      .label=${this.hass.localize(
                        "ui.panel.config.energy.grid.dialog.compensation_entity_label"
                      )}
                      include-domains='["sensor", "input_number"]'
                      @value-changed=${this._entityCompensationChanged}
                    ></ha-entity-picker>
                  `
                : nothing}
              ${this._exportCostType === "number"
                ? html`
                    <ha-textfield
                      .value=${this._source.number_energy_price_export ?? ""}
                      .label=${this.hass.localize(
                        "ui.panel.config.energy.grid.dialog.compensation_number_label"
                      )}
                      type="number"
                      step="any"
                      @input=${this._numberCompensationChanged}
                      .suffix=${`${this.hass.config.currency}/kWh`}
                    ></ha-textfield>
                  `
                : nothing}
            `
          : nothing}

        <ha-energy-power-config
          .hass=${this.hass}
          .powerType=${this._powerType}
          .powerConfig=${this._powerConfig}
          .excludeList=${this._excludeListPower}
          localizeBaseKey="ui.panel.config.energy.grid.dialog"
          @power-config-changed=${this._handlePowerConfigChanged}
        ></ha-energy-power-config>

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
            .disabled=${!this._isValid()}
            slot="primaryAction"
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _isValid(): boolean {
    // Grid must have at least one of: import, export, or power
    const hasImport = !!this._source?.stat_energy_from;
    const hasExport = !!this._source?.stat_energy_to;
    const hasPower = this._powerType !== "none";

    if (!hasImport && !hasExport && !hasPower) {
      return false;
    }

    // Check power config validity (if power is configured)
    if (hasPower) {
      const powerConfigEl = this.shadowRoot?.querySelector(
        "ha-energy-power-config"
      ) as HaEnergyPowerConfig | null;
      if (powerConfigEl && !powerConfigEl.isValid()) {
        return false;
      }
    }

    return true;
  }

  private _statisticFromChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
    // Reset cost type if switching to external statistic with incompatible cost type
    if (
      ev.detail.value &&
      isExternalStatistic(ev.detail.value) &&
      (this._importCostType === "entity" || this._importCostType === "number")
    ) {
      this._importCostType = "no_cost";
      this._source = {
        ...this._source!,
        entity_energy_price: null,
        number_energy_price: null,
      };
    }
  }

  private _statisticToChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_energy_to: ev.detail.value || null,
    };
    // Clear export cost if export is removed
    if (!ev.detail.value) {
      this._exportCostType = "no_cost";
      this._source = {
        ...this._source!,
        stat_compensation: null,
        entity_energy_price_export: null,
        number_energy_price_export: null,
      };
    } else if (
      // Reset cost type if switching to external statistic with incompatible cost type
      isExternalStatistic(ev.detail.value) &&
      (this._exportCostType === "entity" || this._exportCostType === "number")
    ) {
      this._exportCostType = "no_cost";
      this._source = {
        ...this._source!,
        entity_energy_price_export: null,
        number_energy_price_export: null,
      };
    }
  }

  private _handleImportCostTypeChanged(ev: Event) {
    const input = ev.currentTarget as HaRadio;
    this._importCostType = input.value as CostType;
    // Clear other cost fields when switching types
    this._source = {
      ...this._source!,
      stat_cost: null,
      entity_energy_price: null,
      number_energy_price: null,
    };
  }

  private _handleExportCostTypeChanged(ev: Event) {
    const input = ev.currentTarget as HaRadio;
    this._exportCostType = input.value as CostType;
    // Clear other cost fields when switching types
    this._source = {
      ...this._source!,
      stat_compensation: null,
      entity_energy_price_export: null,
      number_energy_price_export: null,
    };
  }

  private _statCostChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_cost: ev.detail.value || null };
  }

  private _entityCostChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      entity_energy_price: ev.detail.value || null,
    };
  }

  private _numberCostChanged(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const value = input.value ? parseFloat(input.value) : null;
    this._source = { ...this._source!, number_energy_price: value };
  }

  private _statCompensationChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_compensation: ev.detail.value || null,
    };
  }

  private _entityCompensationChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      entity_energy_price_export: ev.detail.value || null,
    };
  }

  private _numberCompensationChanged(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const value = input.value ? parseFloat(input.value) : null;
    this._source = { ...this._source!, number_energy_price_export: value };
  }

  private _handlePowerConfigChanged(
    ev: CustomEvent<{ powerType: PowerType; powerConfig: PowerConfig }>
  ) {
    this._powerType = ev.detail.powerType;
    this._powerConfig = ev.detail.powerConfig;
  }

  private async _save() {
    try {
      const source: GridSourceTypeEnergyPreference = {
        type: "grid",
        stat_energy_from: this._source!.stat_energy_from,
        stat_energy_to: this._source!.stat_energy_to,
        stat_cost: this._source!.stat_cost,
        stat_compensation: this._source!.stat_compensation,
        entity_energy_price: this._source!.entity_energy_price,
        number_energy_price: this._source!.number_energy_price,
        entity_energy_price_export: this._source!.entity_energy_price_export,
        number_energy_price_export: this._source!.number_energy_price_export,
        cost_adjustment_day: this._source!.cost_adjustment_day,
      };

      // Only include power_config if a power type is selected
      if (this._powerType !== "none") {
        source.power_config = { ...this._powerConfig };
      }

      await this._params!.saveCallback(source);
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
        ha-statistic-picker,
        ha-entity-picker,
        ha-textfield {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
        ha-statistic-picker:last-of-type,
        ha-entity-picker:last-of-type,
        ha-textfield:last-of-type {
          margin-bottom: 0;
        }
        ha-formfield {
          display: block;
        }
        .section-label {
          margin-top: var(--ha-space-4);
          margin-bottom: var(--ha-space-2);
        }
        .section-description {
          margin-top: 0;
          margin-bottom: var(--ha-space-2);
          color: var(--secondary-text-color);
          font-size: 0.875em;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-grid-settings": DialogEnergyGridSettings;
  }
}
