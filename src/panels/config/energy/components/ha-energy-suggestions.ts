import { mdiFire, mdiFlash, mdiLightbulbOnOutline, mdiWater } from "@mdi/js";
import type { ContextType } from "@lit/context";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consume } from "../../../../common/decorators/consume";
import { consumeEntityStates } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { getEntityAreaId } from "../../../../common/entity/context/get_entity_context";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../components/ha-select";
import "../../../../components/ha-svg-icon";
import {
  apiContext,
  areasContext,
  connectionContext,
  devicesContext,
  entitiesContext,
  formattersContext,
  internationalizationContext,
} from "../../../../data/context";
import type { EnergyPreferences } from "../../../../data/energy";
import type {
  EnergyMeterSuggestion,
  EnergySuggestionSlot,
  EnergySuggestionTab,
} from "../../../../data/energy_suggestions";
import {
  addEnergySuggestion,
  computeEnergySuggestions,
  updateDismissedSuggestions,
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

const TAB_ICONS: Record<EnergySuggestionTab, string> = {
  electricity: mdiFlash,
  gas: mdiFire,
  water: mdiWater,
};

@customElement("ha-energy-suggestions")
export class EnergySuggestions extends LitElement {
  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  // Saving is left to the page, which also refreshes its energy data.
  @property({ attribute: false }) public save!: (
    preferences: EnergyPreferences
  ) => Promise<EnergyPreferences>;

  @property() public tab: EnergySuggestionTab = "electricity";

  @state() private _statistics?: StatisticsMetaData[];

  @state() private _dismissed?: string[];

  @state() private _slots: Record<string, EnergySuggestionSlot> = {};

  @state() private _busy = false;

  @state() private _loadFailed = false;

  // Read by the @consumeEntityStates decorator below.
  @state() protected _statisticIds: string[] = [];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  // Only the loaded statistics matter, so other state changes don't recompute.
  @state()
  @consumeEntityStates({ entityIdPath: ["_statisticIds"] })
  private _states: HomeAssistant["states"] = {};

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private _devices!: ContextType<typeof devicesContext>;

  @state()
  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  private _computeSuggestions = memoizeOne(
    (
      statistics: StatisticsMetaData[],
      preferences: EnergyPreferences,
      dismissed: string[],
      states: HomeAssistant["states"],
      tab: EnergySuggestionTab
    ) =>
      computeEnergySuggestions({
        statistics,
        preferences,
        dismissed,
        states,
      }).filter((suggestion) => suggestion.tab === tab)
  );

  connectedCallback() {
    super.connectedCallback();
    if (!this._statistics) {
      this._load();
    }
  }

  private async _load() {
    this._loadFailed = false;
    try {
      const [statistics, userData] = await Promise.all([
        getStatisticIds(this._api, "sum"),
        fetchFrontendUserData(this._connection.connection, "energy"),
      ]);
      this._statistics = statistics;
      this._statisticIds = statistics.map((meta) => meta.statistic_id);
      this._dismissed = userData?.dismissed_suggestions ?? [];
    } catch (_err) {
      this._loadFailed = true;
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (this._loadFailed) {
      return html`
        <ha-card>
          <div class="card-content">
            <ha-alert alert-type="error">
              ${this._i18n.localize(
                "ui.panel.config.energy.suggestions.load_failed"
              )}
              <ha-button slot="action" size="s" @click=${this._load}>
                ${this._i18n.localize("ui.common.retry")}
              </ha-button>
            </ha-alert>
          </div>
        </ha-card>
      `;
    }
    if (!this._statistics || !this._dismissed) {
      return nothing;
    }
    const suggestions = this._computeSuggestions(
      this._statistics,
      this.preferences,
      this._dismissed,
      this._states,
      this.tab
    );
    if (!suggestions.length) {
      return nothing;
    }

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiLightbulbOnOutline}></ha-svg-icon>
          ${this._i18n.localize("ui.panel.config.energy.suggestions.title", {
            count: suggestions.length,
          })}
        </h1>
        <div class="card-content">
          <p>
            ${this._i18n.localize("ui.panel.config.energy.suggestions.sub")}
          </p>
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
    const slot = this._slotFor(suggestion);
    const label = getStatisticLabel(
      this._states,
      this._formatters.formatEntityName,
      suggestion.statisticId,
      this._statistics!.find(
        (meta) => meta.statistic_id === suggestion.statisticId
      )
    );
    const areaId = getEntityAreaId(
      suggestion.statisticId,
      this._entities,
      this._devices
    );
    const area = areaId ? this._areas[areaId] : undefined;

    return html`
      <div class="suggestion">
        <ha-svg-icon .path=${TAB_ICONS[suggestion.tab]}></ha-svg-icon>
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
          ${
            suggestion.slots.length > 1
              ? html`<ha-select
                  .label=${this._i18n.localize(
                    "ui.panel.config.energy.suggestions.slot"
                  )}
                  .value=${slot}
                  .options=${suggestion.slots.map((value) => ({
                    value,
                    label: this._i18n.localize(
                      `ui.panel.config.energy.suggestions.slots.${value}`
                    ),
                  }))}
                  .disabled=${this._busy}
                  .suggestion=${suggestion}
                  @selected=${this._slotSelected}
                ></ha-select>`
              : nothing
          }
          <ha-button
            size="s"
            .disabled=${this._busy || !slot}
            .suggestion=${suggestion}
            @click=${this._add}
            >${this._i18n.localize(
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
            >${this._i18n.localize(
              "ui.panel.config.energy.suggestions.dismiss"
            )}</ha-button
          >
        </div>
      </div>
    `;
  }

  // Nothing is preselected when the meter fits more than one slot.
  private _slotFor(
    suggestion: EnergyMeterSuggestion
  ): EnergySuggestionSlot | undefined {
    if (suggestion.slots.length === 1) {
      return suggestion.slots[0];
    }
    return this._slots[suggestion.statisticId];
  }

  private _slotSelected(ev: HaSelectSelectEvent<EnergySuggestionSlot>) {
    const suggestion: EnergyMeterSuggestion = (ev.currentTarget as any)
      .suggestion;
    this._slots = { ...this._slots, [suggestion.statisticId]: ev.detail.value };
  }

  private async _add(ev: Event) {
    const suggestion: EnergyMeterSuggestion = (ev.currentTarget as any)
      .suggestion;
    const slot = this._slotFor(suggestion);
    if (!slot) {
      return;
    }
    this._busy = true;
    try {
      const result = await this.save(
        addEnergySuggestion(this.preferences, suggestion.statisticId, slot)
      );
      fireEvent(this, "value-changed", { value: result });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this._i18n.localize(
          "ui.panel.config.energy.save_config_failed",
          {
            error: err.message,
          }
        ),
      });
    } finally {
      this._busy = false;
    }
  }

  private async _dismiss(ev: Event) {
    const suggestion: EnergyMeterSuggestion = (ev.currentTarget as any)
      .suggestion;
    const previous = this._dismissed!;
    this._busy = true;
    this._dismissed = updateDismissedSuggestions(
      previous,
      suggestion.statisticId,
      this._statistics!
    );
    try {
      await saveFrontendUserData(this._connection.connection, "energy", {
        dismissed_suggestions: this._dismissed,
      });
    } catch (err: any) {
      this._dismissed = previous;
      showAlertDialog(this, {
        title: this._i18n.localize(
          "ui.panel.config.energy.suggestions.dismiss_failed"
        ),
        text: err.message,
      });
    } finally {
      this._busy = false;
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
          flex-wrap: wrap;
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
