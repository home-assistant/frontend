import {
  mdiDotsVertical,
  mdiEye,
  mdiEyeOff,
  mdiFire,
  mdiFlash,
  mdiLightbulbOnOutline,
  mdiWater,
} from "@mdi/js";
import type { ContextType } from "@lit/context";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consume } from "../../../../common/decorators/consume";
import { fireEvent } from "../../../../common/dom/fire_event";
import { consumeEntityStates } from "../../../../common/decorators/consume-context-entry";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { getEntityAreaId } from "../../../../common/entity/context/get_entity_context";
import { createEnergyEditorQueryString } from "../../../../common/url/energy-editor-query-params";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-icon-button";
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
  computeEnergySuggestions,
  ENERGY_SUGGESTION_EDITORS,
  restoreDismissedSuggestion,
  updateDismissedSuggestions,
} from "../../../../data/energy_suggestions";
import {
  saveFrontendUserData,
  subscribeFrontendUserData,
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

  /** Path of the tab, the editor pages are under it */
  @property({ attribute: false }) public listPath!: string;

  @property() public tab: EnergySuggestionTab = "electricity";

  @state() private _statistics?: StatisticsMetaData[];

  @state() private _dismissed?: string[];

  // Dismissals not yet echoed by the subscription, so an older echo can't drop them
  @state() private _pendingDismissed: string[] = [];

  // Restores not yet echoed by the subscription
  @state() private _pendingRestored: string[] = [];

  @state() private _showDismissed = false;

  private _reportedUnreachable?: number;

  @state() private _slots: Record<string, EnergySuggestionSlot> = {};

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

  private _computeDismissed = memoizeOne(
    (
      statistics: StatisticsMetaData[],
      preferences: EnergyPreferences,
      dismissed: string[],
      states: HomeAssistant["states"],
      tab: EnergySuggestionTab
    ) =>
      computeEnergySuggestions({ statistics, preferences, states }).filter(
        (suggestion) =>
          suggestion.tab === tab && dismissed.includes(suggestion.statisticId)
      )
  );

  private _allDismissed = memoizeOne(
    (stored: string[], pending: string[], restored: string[]) =>
      [...stored, ...pending.filter((id) => !stored.includes(id))].filter(
        (id) => !restored.includes(id)
      )
  );

  private get _currentDismissed(): string[] {
    return this._allDismissed(
      this._dismissed!,
      this._pendingDismissed,
      this._pendingRestored
    );
  }

  // Kept live so a dismiss in another tab isn't overwritten by this one.
  private _unsubDismissed?: Promise<UnsubscribeFunc>;

  connectedCallback() {
    super.connectedCallback();
    this._load();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  private _unsubscribe() {
    this._unsubDismissed?.then((unsub) => unsub()).catch(() => undefined);
    this._unsubDismissed = undefined;
  }

  private async _load() {
    this._loadFailed = false;
    this._unsubDismissed ??= subscribeFrontendUserData(
      this._connection.connection,
      "energy",
      ({ value }) => {
        const dismissed = value?.dismissed_suggestions ?? [];
        this._dismissed = dismissed;
        this._pendingDismissed = this._pendingDismissed.filter(
          (id) => !dismissed.includes(id)
        );
        this._pendingRestored = this._pendingRestored.filter((id) =>
          dismissed.includes(id)
        );
      }
    );
    try {
      const [statistics] = await Promise.all([
        this._statistics ?? getStatisticIds(this._api, "sum"),
        this._unsubDismissed,
      ]);
      if (!this._statistics) {
        this._statistics = statistics;
        this._statisticIds = statistics
          .filter(
            (meta) =>
              meta.unit_class === "energy" || meta.unit_class === "volume"
          )
          .map((meta) => meta.statistic_id);
      }
    } catch (_err) {
      this._unsubscribe();
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
    const { suggestions, dismissedSuggestions, showDismissed } = this._view()!;
    if (!suggestions.length && !showDismissed) {
      return nothing;
    }

    return html`
      <ha-card>
        <div class="card-header">
          <h1>
            <ha-svg-icon .path=${mdiLightbulbOnOutline}></ha-svg-icon>
            ${
              suggestions.length
                ? this._i18n.localize(
                    "ui.panel.config.energy.suggestions.title",
                    { count: suggestions.length }
                  )
                : this._i18n.localize(
                    "ui.panel.config.energy.suggestions.dismissed_title"
                  )
            }
          </h1>
          ${
            dismissedSuggestions.length
              ? html`<ha-dropdown @wa-select=${this._handleMenuAction}>
                  <ha-icon-button
                    slot="trigger"
                    .label=${this._i18n.localize("ui.common.menu")}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>
                  <ha-dropdown-item value="toggle_dismissed">
                    <ha-svg-icon
                      slot="icon"
                      .path=${showDismissed ? mdiEyeOff : mdiEye}
                    ></ha-svg-icon>
                    ${
                      showDismissed
                        ? this._i18n.localize(
                            "ui.panel.config.energy.suggestions.hide_dismissed"
                          )
                        : this._i18n.localize(
                            "ui.panel.config.energy.suggestions.show_dismissed",
                            { count: dismissedSuggestions.length }
                          )
                    }
                  </ha-dropdown-item>
                </ha-dropdown>`
              : nothing
          }
        </div>
        <div class="card-content">
          <p>
            ${this._i18n.localize(
              suggestions.length
                ? "ui.panel.config.energy.suggestions.sub"
                : "ui.panel.config.energy.suggestions.dismissed_sub"
            )}
          </p>
          ${
            suggestions.length
              ? html`<div class="items-container">
                  ${repeat(
                    suggestions,
                    (suggestion) => suggestion.statisticId,
                    (suggestion) => this._renderSuggestion(suggestion, false)
                  )}
                </div>`
              : nothing
          }
          ${
            showDismissed
              ? html`${
                    suggestions.length
                      ? html`<h3>
                          ${this._i18n.localize(
                            "ui.panel.config.energy.suggestions.dismissed"
                          )}
                        </h3>`
                      : nothing
                  }
                  <div class="items-container">
                    ${repeat(
                      dismissedSuggestions,
                      (suggestion) => suggestion.statisticId,
                      (suggestion) => this._renderSuggestion(suggestion, true)
                    )}
                  </div>`
              : nothing
          }
        </div>
      </ha-card>
    `;
  }

  private _renderSuggestion(
    suggestion: EnergyMeterSuggestion,
    dismissed: boolean
  ) {
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
      <div class="suggestion" role="group" aria-label=${label}>
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
                  .suggestion=${suggestion}
                  @selected=${this._slotSelected}
                ></ha-select>`
              : nothing
          }
          <ha-button
            size="s"
            .disabled=${!slot}
            .href=${slot ? this._editorHref(suggestion, slot) : undefined}
            >${this._i18n.localize(
              "ui.panel.config.energy.suggestions.add"
            )}</ha-button
          >
          <ha-button
            size="s"
            appearance="plain"
            variant="neutral"
            .suggestion=${suggestion}
            @click=${dismissed ? this._restore : this._dismiss}
            >${this._i18n.localize(
              dismissed
                ? "ui.panel.config.energy.suggestions.restore"
                : "ui.panel.config.energy.suggestions.dismiss"
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

  private _editorHref(
    suggestion: EnergyMeterSuggestion,
    slot: EnergySuggestionSlot
  ) {
    const { kind, stat } = ENERGY_SUGGESTION_EDITORS[slot];
    return `${this.listPath}/${kind}/new?${createEnergyEditorQueryString({
      [stat]: suggestion.statisticId,
    })}`;
  }

  private async _dismiss(ev: Event) {
    const suggestion: EnergyMeterSuggestion = (ev.currentTarget as any)
      .suggestion;
    const statisticId = suggestion.statisticId;
    this._pendingDismissed = [...this._pendingDismissed, statisticId];
    try {
      await saveFrontendUserData(this._connection.connection, "energy", {
        dismissed_suggestions: updateDismissedSuggestions(
          this._currentDismissed,
          statisticId,
          this._statistics!
        ),
      });
    } catch (err: any) {
      this._pendingDismissed = this._pendingDismissed.filter(
        (id) => id !== statisticId
      );
      showAlertDialog(this, {
        title: this._i18n.localize(
          "ui.panel.config.energy.suggestions.dismiss_failed"
        ),
        text: err.message,
      });
    }
  }

  private _view() {
    if (this._loadFailed || !this._statistics || !this._dismissed) {
      return undefined;
    }
    const dismissed = this._currentDismissed;
    const suggestions = this._computeSuggestions(
      this._statistics,
      this.preferences,
      dismissed,
      this._states,
      this.tab
    );
    const dismissedSuggestions = this._computeDismissed(
      this._statistics,
      this.preferences,
      dismissed,
      this._states,
      this.tab
    );
    return {
      suggestions,
      dismissedSuggestions,
      showDismissed: this._showDismissed && dismissedSuggestions.length > 0,
    };
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    // Collapse again once nothing is dismissed, or on another tab
    if (
      this._showDismissed &&
      (changedProps.has("tab") || !this._view()?.dismissedSuggestions.length)
    ) {
      this._showDismissed = false;
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    const view = this._view();
    // Dismissed meters the page can't reach because the card is hidden
    const unreachable =
      view && !view.suggestions.length && !view.showDismissed
        ? view.dismissedSuggestions.length
        : 0;
    if (unreachable !== this._reportedUnreachable) {
      this._reportedUnreachable = unreachable;
      fireEvent(this, "energy-suggestions-unreachable-dismissed", {
        count: unreachable,
      });
    }
  }

  /** Show the dismissed meters, also when no suggestion is left. */
  public showDismissed(): void {
    this._showDismissed = true;
  }

  private _handleMenuAction(ev: HaDropdownSelectEvent) {
    if (ev.detail.item.value === "toggle_dismissed") {
      this._showDismissed = !this._showDismissed;
    }
  }

  private async _restore(ev: Event) {
    const suggestion: EnergyMeterSuggestion = (ev.currentTarget as any)
      .suggestion;
    const statisticId = suggestion.statisticId;
    const dismissed = restoreDismissedSuggestion(
      this._currentDismissed,
      statisticId
    );
    this._pendingRestored = [...this._pendingRestored, statisticId];
    try {
      await saveFrontendUserData(this._connection.connection, "energy", {
        dismissed_suggestions: dismissed,
      });
    } catch (err: any) {
      this._pendingRestored = this._pendingRestored.filter(
        (id) => id !== statisticId
      );
      showAlertDialog(this, {
        title: this._i18n.localize(
          "ui.panel.config.energy.suggestions.restore_failed"
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
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ha-space-2);
        }
        .card-header h1 {
          margin: 0;
          font: inherit;
          letter-spacing: inherit;
        }
        .card-header ha-icon-button {
          margin-block: calc(var(--ha-space-2) * -1);
          margin-inline-end: calc(var(--ha-space-2) * -1);
        }
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

  interface HASSDomEvents {
    "energy-suggestions-unreachable-dismissed": { count: number };
  }
}
