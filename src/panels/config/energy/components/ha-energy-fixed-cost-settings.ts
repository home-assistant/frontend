import { mdiCashClock, mdiDelete, mdiPlus } from "@mdi/js";
import type { ContextType } from "@lit/context";
import type { HassEntities } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../../common/decorators/consume";
import { preserveUnchangedEntityStatesRecord } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/automation/ha-automation-row";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import {
  configContext,
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type {
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  FixedCostEnergyPreference,
  FixedCostType,
} from "../../../../data/energy";
import { saveEnergyPreferences } from "../../../../data/energy";
import { getStatisticLabel } from "../../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantFormatters,
} from "../../../../types";
import { showEnergySettingsDialog } from "../dialogs/show-dialogs-energy";
import type { EnergyEditorConfig } from "../editors/energy-editor";
import "../ha-energy-editor-page";
import type { EnergyEditorPageConfig } from "../ha-energy-editor-page";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

type CostElement = HTMLElement & { cost: FixedCostEnergyPreference };

@customElement("ha-energy-fixed-cost-settings")
export class EnergyFixedCostSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public type!: FixedCostType;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  /** Path of the list page, editors open on pages under it instead of dialogs */
  @property({ attribute: false }) public listPath?: string;

  /** Shows the editor page of the item with this key, or `new` to add one */
  @property({ attribute: false }) public editKey?: string;

  @property({ type: Boolean }) public narrow = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, string>({
    transformer: ({ config }) => config.currency,
  })
  private _currency!: string;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"]
  >({
    transformer: ({ formatEntityName }) => formatEntityName,
  })
  private _formatEntityName!: HomeAssistantFormatters["formatEntityName"];

  // Only the amount entities, so other state changes don't render
  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: EnergyFixedCostSettings, states) {
      const amountStates: HassEntities = {};
      for (const cost of this._costs()) {
        const entityId = cost.entity_amount;
        if (entityId && states?.[entityId]) {
          amountStates[entityId] = states[entityId];
        }
      }
      return preserveUnchangedEntityStatesRecord(
        this._amountStates,
        amountStates
      );
    },
    watch: ["preferences", "type"],
  })
  private _amountStates?: HassEntities;

  protected render(): TemplateResult {
    if (this.listPath && this.editKey !== undefined) {
      return html`<ha-energy-editor-page
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this.listPath}
        .config=${this._editorPage(this.editKey)}
      ></ha-energy-editor-page>`;
    }

    const costs: FixedCostEnergyPreference[] = [];
    const validation: EnergyValidationIssue[][] = [];

    this.preferences.fixed_costs.forEach((cost, idx) => {
      if (cost.type !== this.type) {
        return;
      }
      costs.push(cost);

      const issues = this.validationResult?.fixed_costs[idx];
      if (issues) {
        validation.push(issues);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiCashClock}></ha-svg-icon>
          ${this._i18n.localize("ui.panel.config.energy.fixed_costs.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this._i18n.localize("ui.panel.config.energy.fixed_costs.sub")}
          </p>
          ${validation.map(
            (issues) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${issues}
              ></ha-energy-validation-result>
            `
          )}
          ${
            costs.length > 0
              ? html`
                  <div class="items">
                    ${costs.map(
                      (cost) => html`
                        <ha-card outlined>
                          <ha-automation-row
                            .cost=${cost}
                            .href=${this._editorHref(cost)}
                            @click=${this.listPath ? nothing : this._editCost}
                          >
                            <ha-svg-icon
                              slot="leading-icon"
                              .path=${mdiCashClock}
                            ></ha-svg-icon>
                            <div slot="header" class="row-header">
                              <span class="label">${cost.name}</span>
                              <span class="label secondary"
                                >${this._amountPerPeriod(cost)}</span
                              >
                            </div>
                            <ha-icon-button
                              slot="icons"
                              .label=${this._i18n.localize(
                                "ui.panel.config.energy.fixed_costs.delete_fixed_cost"
                              )}
                              .path=${mdiDelete}
                              .cost=${cost}
                              @click=${this._deleteCostClicked}
                              @keydown=${stopPropagation}
                            ></ha-icon-button>
                          </ha-automation-row>
                        </ha-card>
                      `
                    )}
                  </div>
                `
              : nothing
          }
          <ha-button
            .href=${this._editorHref()}
            @click=${this.listPath ? nothing : this._addCost}
            appearance="filled"
            size="s"
          >
            <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
            ${this._i18n.localize(
              "ui.panel.config.energy.fixed_costs.add_fixed_cost"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _costs(): FixedCostEnergyPreference[] {
    return (this.preferences?.fixed_costs ?? []).filter(
      (cost) => cost.type === this.type
    );
  }

  private _amountPerPeriod(cost: FixedCostEnergyPreference): string {
    const amount = cost.entity_amount
      ? getStatisticLabel(
          this._amountStates ?? {},
          this._formatEntityName,
          cost.entity_amount,
          undefined
        )
      : formatNumber(cost.number_amount ?? 0, this._i18n.locale, {
          style: "currency",
          currency: this._currency,
        });
    return this._i18n.localize(
      `ui.panel.config.energy.fixed_costs.amount_per_period.${cost.period}`,
      { amount }
    );
  }

  private _addCost() {
    this._openEditor();
  }

  private _editCost(ev: HASSDomCurrentTargetEvent<CostElement>) {
    this._openEditor(ev.currentTarget.cost);
  }

  private _openEditor(cost?: FixedCostEnergyPreference) {
    showEnergySettingsDialog(this, { editor: this._editorConfig(cost) });
  }

  private _editorHref(cost?: FixedCostEnergyPreference) {
    return this.listPath
      ? `${this.listPath}/fixed_cost/${cost ? encodeURIComponent(cost.id) : "new"}`
      : undefined;
  }

  private _editorConfig(cost?: FixedCostEnergyPreference): EnergyEditorConfig {
    return {
      kind: "fixed_cost",
      params: {
        cost: cost ? { ...cost } : undefined,
        type: this.type,
        saveCallback: (newCost) => this._saveCost(newCost),
      },
    };
  }

  private _costIndex(cost: FixedCostEnergyPreference) {
    return this.preferences.fixed_costs.findIndex(
      (item) => item.id === cost.id
    );
  }

  // Kept per item: a save replaces the preferences right before the page leaves
  private _editorPage = memoizeOne(
    (key: string): EnergyEditorPageConfig | undefined => {
      if (key === "new") {
        return this._pageConfig(this._editorConfig());
      }
      const cost = this._costs().find((item) => item.id === key);
      return cost && this._pageConfig(this._editorConfig(cost), cost);
    }
  );

  private _pageConfig(
    editor: EnergyEditorConfig,
    cost?: FixedCostEnergyPreference
  ): EnergyEditorPageConfig {
    if (!cost) {
      return {
        editor,
        title: this._i18n.localize(
          "ui.panel.config.energy.fixed_costs.add_fixed_cost"
        ),
      };
    }
    return {
      editor,
      title: cost.name,
      delete: {
        label: this._i18n.localize(
          "ui.panel.config.energy.fixed_costs.delete_fixed_cost"
        ),
        action: () => this._deleteCost(cost),
      },
    };
  }

  private async _saveCost(cost: FixedCostEnergyPreference) {
    const costs = [...this.preferences.fixed_costs];
    const index = this._costIndex(cost);
    if (index === -1) {
      costs.push(cost);
    } else {
      costs[index] = cost;
    }
    await this._savePreferences({ ...this.preferences, fixed_costs: costs });
  }

  private _deleteCostClicked(ev: HASSDomCurrentTargetEvent<CostElement>) {
    ev.stopPropagation();
    this._deleteCost(ev.currentTarget.cost);
  }

  private async _deleteCost(cost: FixedCostEnergyPreference): Promise<boolean> {
    if (
      !(await showConfirmationDialog(this, {
        title: this._i18n.localize(
          "ui.panel.config.energy.fixed_costs.delete_confirm_title"
        ),
        text: this._i18n.localize(
          "ui.panel.config.energy.fixed_costs.delete_confirm_text",
          { name: cost.name }
        ),
        confirmText: this._i18n.localize("ui.common.delete"),
        destructive: true,
      }))
    ) {
      return false;
    }

    const index = this._costIndex(cost);
    if (index === -1) {
      return false;
    }
    try {
      await this._savePreferences({
        ...this.preferences,
        fixed_costs: this.preferences.fixed_costs.filter(
          (_cost, idx) => idx !== index
        ),
      });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this._i18n.localize(
          "ui.panel.config.energy.save_config_failed",
          { error: err.message }
        ),
      });
      return false;
    }
    return true;
  }

  private async _savePreferences(preferences: EnergyPreferences) {
    const result = await saveEnergyPreferences(this.hass, preferences);
    fireEvent(this, "value-changed", { value: result });
    return result;
  }

  static get styles(): CSSResultGroup {
    return [haStyle, energyCardStyles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-fixed-cost-settings": EnergyFixedCostSettings;
  }
}
