import type { ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
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
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { ValueChangedEvent } from "../../../../types";
import type { EnergySettingsHomeDialogParams } from "./show-dialogs-energy";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import {
  configContext,
  internationalizationContext,
} from "../../../../data/context";

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

@customElement("dialog-energy-home-settings")
export class DialogEnergyHomeSettings extends DirtyStateProviderMixin<HomeSourceTypeEnergyPreference>()(
  DialogMixin<EnergySettingsHomeDialogParams>(LitElement)
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @state() private _source?: HomeSourceTypeEnergyPreference;

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

  @state() private _error?: string;

  connectedCallback() {
    super.connectedCallback();
    if (!this.params) {
      return;
    }
    this._source = this.params.source
      ? { ...this.params.source }
      : emptyHomeEnergyPreference();
    this._initDirtyTracking({ type: "deep" }, this._source);
    this._loadUnits();
  }

  private async _loadUnits() {
    const [energy, power] = await Promise.all([
      getSensorDeviceClassConvertibleUnits(this.params!.hass, "energy"),
      getSensorDeviceClassConvertibleUnits(this.params!.hass, "power"),
    ]);
    this._energy_units = energy.units;
    this._power_units = power.units;
  }

  protected render() {
    if (!this.params || !this._source) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        header-title=${this._i18n.localize(
          "ui.panel.config.energy.home.dialog.header"
        )}
        .preventScrimClose=${this.isDirtyState}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_to}
          .label=${this._i18n.localize(
            "ui.panel.config.energy.home.dialog.home_energy"
          )}
          @value-changed=${this._statisticChanged}
          .helper=${this._i18n.localize(
            "ui.panel.config.energy.home.dialog.entity_para",
            { unit: this._energy_units?.join(", ") || "" }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-input
          .label=${this._i18n.localize(
            "ui.panel.config.energy.home.dialog.display_name"
          )}
          type="text"
          .disabled=${!this._source.stat_energy_to}
          .value=${this._source.name || ""}
          .placeholder=${this._hassConfig.config.location_name}
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-statistic-picker
          .includeUnitClass=${powerUnitClasses}
          .value=${this._source.stat_rate}
          .label=${this._i18n.localize(
            "ui.panel.config.energy.home.dialog.home_power"
          )}
          @value-changed=${this._powerStatisticChanged}
          .helper=${this._i18n.localize(
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
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            @click=${this._save}
            .disabled=${
              !this._source.stat_energy_to ||
              (!!this.params.source && !this.isDirtyState)
            }
            slot="primaryAction"
          >
            ${this._i18n.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _statisticChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_to: ev.detail.value };
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
      await this.params!.saveCallback(this._source!);
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
