import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-alert";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import {
  configContext,
  entitiesContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type { HomeSourceTypeEnergyPreference } from "../../../../data/energy";
import {
  computeEnergyLabel,
  emptyHomeEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { IntegralUnits } from "../dialogs/energy-integral";
import { confirmIntegrals, integralUnits } from "../dialogs/energy-integral";
import type {
  EnergyEditorStatus,
  EnergyHomeSourceEditorParams,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

@customElement("ha-energy-home-source-editor")
export class HaEnergyHomeSourceEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<HomeSourceTypeEnergyPreference>()(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public params!: EnergyHomeSourceEditorParams;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  // Kept current without rendering on every state change
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<ContextType<typeof statesContext>, string>({
    transformer: function (this: HaEnergyHomeSourceEditor, states) {
      const statRate = this._source?.stat_rate;
      return statRate
        ? states?.[statRate]?.attributes.unit_of_measurement
        : undefined;
    },
    watch: ["_source"],
  })
  private _rateUnit?: string;

  @state() private _source?: HomeSourceTypeEnergyPreference;

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("params")) {
      this._error = undefined;
      this._saving = false;
      this._source = this.params.source
        ? { ...this.params.source }
        : emptyHomeEnergyPreference();
      this._initDirtyTracking({ type: "deep" }, this._source);
      this._loadUnits();
    }
  }

  private async _loadUnits() {
    const [energy, power] = await Promise.all([
      getSensorDeviceClassConvertibleUnits(this.hass, "energy"),
      getSensorDeviceClassConvertibleUnits(this.hass, "power"),
    ]);
    this._energy_units = energy.units;
    this._power_units = power.units;
  }

  protected get editorStatus(): EnergyEditorStatus {
    return {
      dirty: this.isDirtyState,
      valid: !!(this._source?.stat_energy_to || this._integralUnits()),
      saving: this._saving,
    };
  }

  protected render() {
    if (!this._source) {
      return nothing;
    }

    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      <div class="group">
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_to}
          .label=${this._i18n.localize(
            "ui.panel.config.energy.home.dialog.home_energy"
          )}
          @value-changed=${this._statisticChanged}
          .disabled=${this._saving}
          .helper=${this._i18n.localize(
            "ui.panel.config.energy.home.dialog.entity_para",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        <ha-input
          .label=${this._i18n.localize(
            "ui.panel.config.energy.home.dialog.display_name"
          )}
          type="text"
          .disabled=${
            !(this._source.stat_energy_to || this._source.stat_rate) ||
            this._saving
          }
          .value=${this._source.name || ""}
          .placeholder=${this._hassConfig.config.location_name}
          @input=${this._nameChanged}
        >
        </ha-input>
      </div>

      <wa-divider></wa-divider>

      <ha-statistic-picker
        .includeUnitClass=${powerUnitClasses}
        .value=${this._source.stat_rate}
        .label=${this._i18n.localize(
          "ui.panel.config.energy.home.dialog.home_power"
        )}
        @value-changed=${this._powerStatisticChanged}
        .disabled=${this._saving}
        .helper=${this._i18n.localize(
          "ui.panel.config.energy.home.dialog.entity_para",
          { unit: this._power_units?.join(", ") || "" }
        )}
      ></ha-statistic-picker>
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

  private _integralUnits(): IntegralUnits | undefined {
    return this._energy_units
      ? integralUnits(this._rateUnit, this._energy_units)
      : undefined;
  }

  public async save(): Promise<boolean> {
    // The editor can be replaced while saving, but a created helper must still
    // be saved with the submitted source
    const params = this.params;
    let source = this._source!;
    const isCurrent = () => this.params === params && this.isConnected;
    this._error = undefined;
    this._saving = true;
    try {
      if (!source.stat_energy_to) {
        const statEnergyTo = await this._energyFromPower(source);
        if (!statEnergyTo) {
          return false;
        }
        source = { ...source, stat_energy_to: statEnergyTo };
        if (isCurrent()) {
          // Keep edits made meanwhile, only fill in the new energy sensor
          this._source = { ...this._source!, stat_energy_to: statEnergyTo };
          this._updateDirtyState(this._source);
        }
      }
      await params.saveCallback(source);
      if (isCurrent()) {
        this._markDirtyStateClean();
      }
      return true;
    } catch (err: any) {
      if (isCurrent()) {
        this._error = err.message;
      }
      return false;
    } finally {
      if (isCurrent()) {
        this._saving = false;
      }
    }
  }

  private async _energyFromPower(
    draft: HomeSourceTypeEnergyPreference
  ): Promise<string | undefined> {
    const statRate = draft.stat_rate!;
    const units = this._integralUnits();
    if (!units) {
      return undefined;
    }
    const sensors = await confirmIntegrals(this, this.hass, {
      deviceClass: "energy",
      states: this._states,
      entities: this._entities,
      requests: [
        {
          rate: statRate,
          units,
          name: this._i18n.localize(
            "ui.panel.config.energy.integral.energy.sensor_name",
            {
              name: computeEnergyLabel(
                this._states,
                this.hass.formatEntityName,
                statRate,
                undefined,
                draft.name
              ),
            }
          ),
        },
      ],
      intro: this._i18n.localize(
        "ui.panel.config.energy.home.dialog.energy_sensor_needed"
      ),
    });
    return sensors?.[0];
  }

  static get styles(): CSSResultGroup {
    return energyEditorStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-home-source-editor": HaEnergyHomeSourceEditor;
  }
}
