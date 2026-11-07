import {
  mdiBatteryHigh,
  mdiFire,
  mdiHomeExportOutline,
  mdiHomeImportOutline,
  mdiLightbulbOnOutline,
  mdiPowerPlug,
  mdiSolarPower,
  mdiWater,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { getEntityAreaId } from "../../../../common/entity/context/get_entity_context";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../components/ha-select";
import "../../../../components/ha-svg-icon";
import type { EnergyPreferences } from "../../../../data/energy";
import { saveEnergyPreferences } from "../../../../data/energy";
import type {
  EnergyMeterSuggestion,
  EnergySuggestionSlot,
  EnergySuggestionTab,
} from "../../../../data/energy_suggestions";
import {
  addEnergySuggestion,
  computeEnergySuggestions,
  suggestionStatisticIds,
  suggestionTab,
} from "../../../../data/energy_suggestions";
import {
  fetchFrontendUserData,
  saveFrontendUserData,
} from "../../../../data/frontend";
import type { StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import { getStatisticIds } from "../../../../data/recorder_statistic_ids";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { energyCardStyles } from "./styles";

const SLOT_ICONS: Record<EnergySuggestionSlot, string> = {
  grid_import: mdiHomeImportOutline,
  grid_export: mdiHomeExportOutline,
  solar: mdiSolarPower,
  battery: mdiBatteryHigh,
  gas: mdiFire,
  water: mdiWater,
  device: mdiPowerPlug,
};

@customElement("ha-energy-suggestions")
export class EnergySuggestions extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property() public tab: EnergySuggestionTab = "electricity";

  @state() private _statistics?: StatisticsMetaData[];

  @state() private _dismissed?: string[];

  @state() private _slots: Record<string, EnergySuggestionSlot> = {};

  @state() private _busy = false;

  private _computeSuggestions = memoizeOne(
    (
      statistics: StatisticsMetaData[],
      preferences: EnergyPreferences,
      dismissed: string[],
      states: HomeAssistant["states"],
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      tab: EnergySuggestionTab
    ) =>
      computeEnergySuggestions({
        statistics,
        preferences,
        dismissed,
        states,
        entities,
        devices,
      }).filter((suggestion) => suggestionTab(suggestion.slot) === tab)
  );

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._load();
  }

  private async _load() {
    const [statistics, userData] = await Promise.all([
      getStatisticIds(this.hass, "sum"),
      fetchFrontendUserData(this.hass.connection, "energy"),
    ]);
    this._statistics = statistics;
    this._dismissed = userData?.dismissed_suggestions ?? [];
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._statistics || !this._dismissed) {
      return nothing;
    }
    const suggestions = this._computeSuggestions(
      this._statistics,
      this.preferences,
      this._dismissed,
      this.hass.states,
      this.hass.entities,
      this.hass.devices,
      this.tab
    );
    if (!suggestions.length) {
      return nothing;
    }

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiLightbulbOnOutline}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.suggestions.title", {
            count: suggestions.length,
          })}
        </h1>
        <div class="card-content">
          <p>${this.hass.localize("ui.panel.config.energy.suggestions.sub")}</p>
          <div class="items-container">
            ${repeat(
              suggestions,
              (suggestion) => suggestion.statisticId,
              (suggestion) => this._renderSuggestion(suggestion)
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderSuggestion(suggestion: EnergyMeterSuggestion) {
    const slot = this._slots[suggestion.statisticId] ?? suggestion.slot;
    const label = suggestionStatisticIds(suggestion)
      .map((statisticId) =>
        getStatisticLabel(
          this.hass.states,
          this.hass.formatEntityName,
          statisticId,
          this._statistics!.find((meta) => meta.statistic_id === statisticId)
        )
      )
      .join(" + ");
    const areaId = getEntityAreaId(
      suggestion.statisticId,
      this.hass.entities,
      this.hass.devices
    );
    const area = areaId ? this.hass.areas[areaId] : undefined;

    return html`
      <div class="suggestion">
        <ha-svg-icon .path=${SLOT_ICONS[slot]}></ha-svg-icon>
        <div class="content">
          <span class="label">${label}</span>
          ${
            area
              ? html`<span class="label secondary"
                  >${computeAreaName(area)}</span
                >`
              : nothing
          }
        </div>
        <div class="actions">
          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.energy.suggestions.slot"
            )}
            .value=${slot}
            .options=${suggestion.slots.map((value) => ({
              value,
              label: this.hass.localize(
                `ui.panel.config.energy.suggestions.slots.${value}`
              ),
            }))}
            .disabled=${this._busy || suggestion.slots.length < 2}
            .suggestion=${suggestion}
            @selected=${this._slotSelected}
          ></ha-select>
          <ha-button
            size="s"
            .disabled=${this._busy}
            .suggestion=${suggestion}
            @click=${this._add}
            >${this.hass.localize(
              "ui.panel.config.energy.suggestions.add"
            )}</ha-button
          >
          <ha-button
            size="s"
            appearance="plain"
            variant="neutral"
            .disabled=${this._busy}
            .suggestion=${suggestion}
            @click=${this._dismiss}
            >${this.hass.localize(
              "ui.panel.config.energy.suggestions.dismiss"
            )}</ha-button
          >
        </div>
      </div>
    `;
  }

  private _slotSelected(ev: HaSelectSelectEvent<EnergySuggestionSlot>) {
    const suggestion: EnergyMeterSuggestion = (ev.currentTarget as any)
      .suggestion;
    this._slots = { ...this._slots, [suggestion.statisticId]: ev.detail.value };
  }

  private async _add(ev: Event) {
    const suggestion: EnergyMeterSuggestion = (ev.currentTarget as any)
      .suggestion;
    this._busy = true;
    try {
      const result = await saveEnergyPreferences(
        this.hass,
        addEnergySuggestion(
          this.preferences,
          suggestion,
          this._slots[suggestion.statisticId]
        )
      );
      fireEvent(this, "value-changed", { value: result });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.save_config_failed", {
          error: err.message,
        }),
      });
    } finally {
      this._busy = false;
    }
  }

  private async _dismiss(ev: Event) {
    const suggestion: EnergyMeterSuggestion = (ev.currentTarget as any)
      .suggestion;
    const previous = this._dismissed!;
    this._dismissed = [...previous, ...suggestionStatisticIds(suggestion)];
    try {
      await saveFrontendUserData(this.hass.connection, "energy", {
        dismissed_suggestions: this._dismissed,
      });
    } catch (err: any) {
      this._dismissed = previous;
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.energy.suggestions.dismiss_failed"
        ),
        text: err.message,
      });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      energyCardStyles,
      css`
        .suggestion {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--ha-space-2) var(--ha-space-4);
          padding: var(--ha-space-1) var(--ha-space-2);
        }
        .suggestion > ha-svg-icon {
          color: var(--secondary-text-color);
          flex-shrink: 0;
        }
        .content {
          flex: 1 1 200px;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .secondary {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
        .actions {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          margin-inline-start: auto;
        }
        ha-select {
          width: 200px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-suggestions": EnergySuggestions;
  }
}
